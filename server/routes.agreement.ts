import type { Express } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { formatCurrency } from "@shared/formatters";

/**
 * Agreement Pack API Routes
 * - GET /api/agreements/:quoteId - Fetch composed agreement data
 * - POST /api/agreements/:quoteId/sign - Digital signature handling
 */

// Payment schedule schema
const paymentScheduleSchema = z.array(z.object({
  label: z.string(),
  percent: z.number(),
  amount: z.number(),
}));

// Sign agreement schema
const signAgreementSchema = z.object({
  clientName: z.string().optional(),
  trecasa: z.boolean().optional(),
});

export function registerAgreementRoutes(app: Express) {
  
  /**
   * GET /api/agreements/:quoteId
   * Fetch and compose agreement data with totals, materials, brands
   */
  app.get('/api/agreements/:quoteId', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.quoteId);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      
      // Ensure user owns this quotation
      if (quotation.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Fetch items
      const [interiorItems, fcItems, otherItems] = await Promise.all([
        storage.getInteriorItems(req.params.quoteId),
        storage.getFalseCeilingItems(req.params.quoteId),
        storage.getOtherItems(req.params.quoteId),
      ]);
      
      // Group interior items by room
      const roomGroups: Record<string, any[]> = {};
      const roomOrder = ['Kitchen', 'Living', 'Dining', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4', 'Foyer', 'Utility', 'Puja', 'Bathroom', 'Others'];
      
      interiorItems.forEach(item => {
        if (!roomGroups[item.roomType]) {
          roomGroups[item.roomType] = [];
        }
        roomGroups[item.roomType].push(item);
      });
      
      // Calculate room subtotals
      const roomTotals = Object.entries(roomGroups).map(([roomType, items]) => {
        const subtotal = items.reduce((sum, item) => {
          const price = parseFloat(item.totalPrice || "0");
          return sum + price;
        }, 0);
        
        return { roomType, subtotal, items };
      });
      
      // Sort rooms by predefined order
      roomTotals.sort((a, b) => {
        const indexA = roomOrder.indexOf(a.roomType);
        const indexB = roomOrder.indexOf(b.roomType);
        if (indexA === -1 && indexB === -1) return a.roomType.localeCompare(b.roomType);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
      
      // Group FC items by room
      const fcRoomGroups: Record<string, any[]> = {};
      fcItems.forEach(item => {
        if (!fcRoomGroups[item.roomType]) {
          fcRoomGroups[item.roomType] = [];
        }
        fcRoomGroups[item.roomType].push(item);
      });
      
      const fcRoomTotals = Object.entries(fcRoomGroups).map(([roomType, items]) => {
        const subtotal = items.reduce((sum, item) => {
          const price = parseFloat(item.totalPrice || "0");
          return sum + price;
        }, 0);
        
        return { roomType, subtotal, items };
      });
      
      // Sort FC rooms
      fcRoomTotals.sort((a, b) => {
        const indexA = roomOrder.indexOf(a.roomType);
        const indexB = roomOrder.indexOf(b.roomType);
        if (indexA === -1 && indexB === -1) return a.roomType.localeCompare(b.roomType);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
      
      // Calculate totals
      const interiorsSubtotal = roomTotals.reduce((sum, room) => sum + room.subtotal, 0);
      const fcSubtotal = fcRoomTotals.reduce((sum, room) => sum + room.subtotal, 0);
      const grandSubtotal = interiorsSubtotal + fcSubtotal;
      
      // Apply discount
      const discountType = quotation.discountType || "percent";
      const discountValue = parseFloat(quotation.discountValue || "0");
      let discountAmount = 0;
      
      if (discountType === "percent") {
        discountAmount = (grandSubtotal * discountValue) / 100;
      } else {
        discountAmount = discountValue;
      }
      
      const afterDiscount = grandSubtotal - discountAmount;
      
      // Apply GST (default 18%)
      const gstRate = 18;
      const gstAmount = (afterDiscount * gstRate) / 100;
      const finalTotal = afterDiscount + gstAmount;
      
      // Gather unique materials/brands
      const materialsSet = new Set<string>();
      const finishesSet = new Set<string>();
      const hardwareSet = new Set<string>();
      
      interiorItems.forEach(item => {
        if (item.material && item.material !== 'Generic Ply') {
          materialsSet.add(item.material);
        }
        if (item.finish && item.finish !== 'Generic Laminate') {
          finishesSet.add(item.finish);
        }
        if (item.hardware && item.hardware !== 'Nimmi') {
          hardwareSet.add(item.hardware);
        }
      });
      
      const materials = Array.from(materialsSet).sort();
      const finishes = Array.from(finishesSet).sort();
      const hardware = Array.from(hardwareSet).sort();
      
      // Default payment schedule (10%, 60%, 25%, 5%)
      const paymentSchedule = [
        { label: 'Token Advance – 10%', percent: 10, amount: Math.round(finalTotal * 0.10) },
        { label: 'Design Finalisation – 60%', percent: 60, amount: Math.round(finalTotal * 0.60) },
        { label: 'Mid Execution – 25%', percent: 25, amount: Math.round(finalTotal * 0.25) },
        { label: 'After Handover – 5%', percent: 5, amount: Math.round(finalTotal * 0.05) },
      ];
      
      // Prepare response
      const agreementData = {
        quotation: {
          id: quotation.id,
          quoteId: quotation.quoteId,
          projectName: quotation.projectName,
          projectType: quotation.projectType,
          clientName: quotation.clientName,
          clientEmail: quotation.clientEmail,
          clientPhone: quotation.clientPhone,
          projectAddress: quotation.projectAddress,
          buildType: quotation.buildType,
          createdAt: quotation.createdAt,
        },
        interiors: {
          rooms: roomTotals,
          subtotal: interiorsSubtotal,
        },
        falseCeiling: {
          rooms: fcRoomTotals,
          subtotal: fcSubtotal,
        },
        financials: {
          interiorsSubtotal,
          fcSubtotal,
          grandSubtotal,
          discount: {
            type: discountType,
            value: discountValue,
            amount: discountAmount,
          },
          gstRate,
          gstAmount,
          finalTotal,
        },
        materials: {
          coreMaterials: materials,
          finishes,
          hardware,
        },
        paymentSchedule,
        signatures: quotation.signoff || {
          client: { name: '', signedAt: undefined },
          trecasa: { name: '', signedAt: undefined },
          accepted: false,
        },
      };
      
      res.json(agreementData);
      
    } catch (error) {
      console.error("Error fetching agreement:", error);
      res.status(500).json({ message: "Failed to fetch agreement" });
    }
  });
  
  /**
   * POST /api/agreements/:quoteId/sign
   * Handle digital signatures
   */
  app.post('/api/agreements/:quoteId/sign', isAuthenticated, async (req: any, res) => {
    try {
      const body = signAgreementSchema.parse(req.body);
      
      const quotation = await storage.getQuotation(req.params.quoteId);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      
      // Ensure user owns this quotation
      if (quotation.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Update signoff
      const currentSignoff = quotation.signoff || {
        client: {},
        trecasa: {},
        accepted: false,
      };
      
      if (body.clientName) {
        currentSignoff.client.name = body.clientName;
        currentSignoff.client.signedAt = Date.now();
      }
      
      if (body.trecasa) {
        currentSignoff.trecasa.name = "Trecasa Design Studio";
        currentSignoff.trecasa.title = "Authorized Signatory";
        currentSignoff.trecasa.signedAt = Date.now();
      }
      
      // Update quotation
      await storage.updateQuotation(req.params.quoteId, {
        signoff: currentSignoff,
      });
      
      res.json({ success: true, signoff: currentSignoff });
      
    } catch (error) {
      console.error("Error signing agreement:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to sign agreement" });
    }
  });
}
