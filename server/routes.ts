// Referenced from javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertQuotationSchema, insertInteriorItemSchema, insertFalseCeilingItemSchema, insertOtherItemSchema, validatedQuotationSchema, validatedInteriorItemSchema, validatedFalseCeilingItemSchema, applyTemplateSchema, type ApplyTemplateResponse, templates, templateRooms, templateItems, rates, interiorItems, falseCeilingItems, globalRules, auditLog, brands, insertChangeOrderSchema, insertChangeOrderItemSchema, changeOrders, changeOrderItems, insertProjectSchema, insertProjectExpenseSchema, projects, projectExpenses, insertBusinessExpenseSchema, businessExpenses } from "@shared/schema";
import { z } from "zod";
import { generateQuoteId } from "./utils/generateQuoteId";
import { createQuoteBackupZip, createAllDataBackupZip, backupDatabaseToFiles, buildQuoteZip } from "./lib/backup";
import { generateRenderToken, verifyRenderToken } from "./lib/render-token";
import { seedRates } from "./seed/rates.seed";
import { seedTemplates } from "./seed/templates.seed";
import { seedBrands } from "./seed/brands.seed";
import { seedPaintingFc } from "./seed/paintingFc.seed";
import { seedGlobalRules } from "./seed/globalRules.seed";
import { registerAdminRatesRoutes } from "./routes.admin.rates";
import { registerAdminTemplatesRoutes } from "./routes.admin.templates";
import { registerAdminBrandsRoutes } from "./routes.admin.brands";
import { registerAdminPaintingFcRoutes } from "./routes.admin.paintingFc";
import { registerAdminGlobalRulesRoutes } from "./routes.admin.globalRules";
import { registerAdminAuditRoutes } from "./routes.admin.audit";
import { registerClientQuoteRoutes } from "./routes/client-quote";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Seed default data on first run
  await seedRates();
  await seedTemplates();
  await seedBrands();
  await seedPaintingFc();
  await seedGlobalRules();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Quotation routes
  app.get('/api/quotations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quotations = await storage.getQuotations(userId);
      res.json(quotations);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      res.status(500).json({ message: "Failed to fetch quotations" });
    }
  });

  app.get('/api/quotations/:id', async (req: any, res) => {
    try {
      // Check for render token first (for Puppeteer), then fall back to session auth
      const token = req.query.renderToken as string;
      const isRenderMode = token && verifyRenderToken(token, req.params.id);
      
      if (!isRenderMode && !req.isAuthenticated?.()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      
      // Ensure user owns this quotation (skip check in render mode)
      if (!isRenderMode && quotation.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(quotation);
    } catch (error) {
      console.error("Error fetching quotation:", error);
      res.status(500).json({ message: "Failed to fetch quotation" });
    }
  });

  app.post('/api/quotations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quoteId = generateQuoteId();
      
      // Initialize default terms
      const defaultTerms = {
        interiors: {
          useDefault: true,
          templateId: "default_interiors",
          customText: "",
          vars: {
            validDays: 15,
            warrantyMonths: 12,
            paymentSchedule: "50% booking, 40% mid, 10% handover"
          }
        },
        falseCeiling: {
          useDefault: true,
          templateId: "default_false_ceiling",
          customText: "",
          vars: {
            validDays: 15,
            warrantyMonths: 12,
            paymentSchedule: "50% booking, 40% mid, 10% handover"
          }
        }
      };
      
      // Initialize default signoff
      const defaultSignoff = {
        client: {
          name: req.body.clientName || "",
          signature: "",
          signedAt: undefined
        },
        trecasa: {
          name: "Authorized Signatory",
          title: "For TRECASA DESIGN STUDIO",
          signature: "",
          signedAt: undefined
        },
        accepted: false,
        acceptedAt: undefined
      };
      
      const validatedData = validatedQuotationSchema.parse({ 
        ...req.body, 
        userId, 
        quoteId,
        terms: defaultTerms,
        signoff: defaultSignoff
      });
      const quotation = await storage.createQuotation(validatedData);
      
      // Create initial version snapshot
      const { createVersionSnapshot, generateChangeSummary } = await import('./lib/version-history');
      const summary = generateChangeSummary('create', null, quotation);
      await createVersionSnapshot(storage, quotation.id, userId, 'create', summary);
      
      res.status(201).json(quotation);
    } catch (error) {
      console.error("Error creating quotation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      res.status(400).json({ message: "Failed to create quotation" });
    }
  });

  app.patch('/api/quotations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      if (quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Determine change type based on what was updated
      let changeType: 'update_info' | 'update_pricing' | 'status_change' = 'update_info';
      if (req.body.status !== undefined && req.body.status !== quotation.status) {
        changeType = 'status_change';
      } else if (req.body.discountType !== undefined || req.body.discountValue !== undefined) {
        changeType = 'update_pricing';
      }
      
      const updated = await storage.updateQuotation(req.params.id, req.body);
      
      // Recalculate totals if discount fields were updated
      if (req.body.discountType !== undefined || req.body.discountValue !== undefined) {
        const { recalculateQuotationTotals } = await import('./lib/totals');
        await recalculateQuotationTotals(req.params.id, storage);
      }
      
      // Create version snapshot
      const { createVersionSnapshot, generateChangeSummary } = await import('./lib/version-history');
      const summary = generateChangeSummary(changeType, quotation, { ...quotation, ...req.body });
      await createVersionSnapshot(storage, req.params.id, req.user.claims.sub, changeType, summary);
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating quotation:", error);
      res.status(400).json({ message: "Failed to update quotation" });
    }
  });

  app.delete('/api/quotations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      if (quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteQuotation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quotation:", error);
      res.status(500).json({ message: "Failed to delete quotation" });
    }
  });

  // Get version history for a quotation
  app.get('/api/quotations/:id/versions', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      if (quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const versions = await storage.getQuotationVersions(req.params.id);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching version history:", error);
      res.status(500).json({ message: "Failed to fetch version history" });
    }
  });

  // Duplicate quotation with all items
  app.post('/api/quotations/:id/duplicate', isAuthenticated, async (req: any, res) => {
    try {
      const originalQuotation = await storage.getQuotation(req.params.id);
      if (!originalQuotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      if (originalQuotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Generate new quote ID
      const newQuoteId = generateQuoteId();

      // Create duplicate quotation with new quote ID
      const { id, createdAt, updatedAt, ...quotationData } = originalQuotation;
      const duplicateQuotation = await storage.createQuotation({
        ...quotationData,
        quoteId: newQuoteId,
        projectName: `${quotationData.projectName} (Copy)`,
        status: "draft", // Reset status to draft
      });

      // Get and duplicate all interior items
      const interiorItemsList = await storage.getInteriorItems(req.params.id);
      for (const item of interiorItemsList) {
        const { id, createdAt, ...itemData } = item;
        await storage.createInteriorItem({
          ...itemData,
          quotationId: duplicateQuotation.id,
        });
      }

      // Get and duplicate all false ceiling items
      const fcItemsList = await storage.getFalseCeilingItems(req.params.id);
      for (const item of fcItemsList) {
        const { id, createdAt, ...itemData } = item;
        await storage.createFalseCeilingItem({
          ...itemData,
          quotationId: duplicateQuotation.id,
        });
      }

      // Get and duplicate all other items
      const otherItemsList = await storage.getOtherItems(req.params.id);
      for (const item of otherItemsList) {
        const { id, createdAt, ...itemData } = item;
        await storage.createOtherItem({
          ...itemData,
          quotationId: duplicateQuotation.id,
        });
      }

      // Recalculate totals for the duplicated quotation
      const { recalculateQuotationTotals } = await import('./lib/totals');
      await recalculateQuotationTotals(duplicateQuotation.id, storage);

      res.status(201).json(duplicateQuotation);
    } catch (error) {
      console.error("Error duplicating quotation:", error);
      res.status(500).json({ message: "Failed to duplicate quotation" });
    }
  });

  // Apply template to quotation (create rooms and items)
  app.post('/api/quotations/:id/apply-template', isAuthenticated, async (req: any, res) => {
    try {
      const quotationId = req.params.id;
      
      // Check quotation ownership
      const quotation = await storage.getQuotation(quotationId);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      if (quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Validate request
      const { templateId, mode } = applyTemplateSchema.parse(req.body);
      
      // Load template with rooms and items
      const [template] = await db.select().from(templates).where(eq(templates.id, templateId));
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      const rooms = await db.select().from(templateRooms)
        .where(eq(templateRooms.templateId, templateId))
        .orderBy(templateRooms.sortOrder);
      
      const roomsWithItems = await Promise.all(
        rooms.map(async (room) => {
          const items = await db.select().from(templateItems)
            .where(eq(templateItems.templateRoomId, room.id))
            .orderBy(templateItems.sortOrder);
          return { ...room, items };
        })
      );
      
      // If reset mode, delete existing interior items
      if (mode === "reset") {
        await db.delete(interiorItems).where(eq(interiorItems.quotationId, quotationId));
      }
      
      // Load existing items to check for duplicates
      const existingItems = await db.select().from(interiorItems)
        .where(eq(interiorItems.quotationId, quotationId));
      
      // Load active rates for validation
      const activeRates = await db.select().from(rates).where(eq(rates.isActive, true));
      const activeRateKeys = new Set(activeRates.map(r => r.itemKey));
      
      // Track stats
      let itemsAdded = 0;
      const skipped: string[] = [];
      
      // Apply template items
      for (const room of roomsWithItems) {
        const roomName = room.roomName;
        
        for (const templateItem of room.items) {
          // Check if rate exists and is active
          if (!activeRateKeys.has(templateItem.itemKey)) {
            skipped.push(`${roomName} → ${templateItem.displayName} (${templateItem.itemKey})`);
            continue;
          }
          
          // Check if item already exists (match by roomType + itemKey)
          const exists = existingItems.some(item => 
            item.roomType?.toLowerCase() === roomName.toLowerCase() && 
            item.description?.toLowerCase() === templateItem.displayName.toLowerCase()
          );
          
          if (!exists) {
            // Create new interior item with quotation's buildType
            // Wall highlights/paneling always use handmade, others use quotation's buildType
            const itemBuildType = templateItem.isWallHighlightOrPanel 
              ? "handmade" 
              : (quotation.buildType || "handmade");
            
            await db.insert(interiorItems).values({
              quotationId,
              roomType: roomName,
              description: templateItem.displayName,
              calc: templateItem.unit, // Map unit to calc (SFT→SQFT handled by schema default)
              buildType: itemBuildType,
              material: "Generic Ply", // Default
              finish: "Generic Laminate", // Default
              hardware: "Nimmi", // Default
              length: null,
              height: null,
              width: null,
              sqft: null,
              unitPrice: null,
              totalPrice: null,
            });
            
            itemsAdded++;
          }
        }
      }
      
      const response: ApplyTemplateResponse = {
        ok: true,
        applied: {
          roomsAdded: 0, // We're using roomType field, not separate rooms
          itemsAdded,
        },
        skipped: skipped.length > 0 ? skipped : undefined,
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error applying template:", error);
      res.status(500).json({ message: "Failed to apply template" });
    }
  });

  // Apply FC defaults to quotation (mirror interior rooms + FC Others)
  app.post('/api/quotations/:id/apply-fc-defaults', isAuthenticated, async (req: any, res) => {
    try {
      const quotationId = req.params.id;
      
      // Check quotation ownership
      const quotation = await storage.getQuotation(quotationId);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      if (quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get all unique room types from interior items
      const interiorRooms = await db.select().from(interiorItems)
        .where(eq(interiorItems.quotationId, quotationId));
      
      const uniqueRoomTypes = Array.from(new Set(interiorRooms.map(item => item.roomType).filter(Boolean)));
      
      // Get existing FC items
      const existingFcItems = await db.select().from(falseCeilingItems)
        .where(eq(falseCeilingItems.quotationId, quotationId));
      
      let itemsAdded = 0;
      
      // Create FC line for each interior room (if not exists)
      for (const roomType of uniqueRoomTypes) {
        const exists = existingFcItems.some(item => 
          item.roomType?.toLowerCase() === roomType?.toLowerCase()
        );
        
        if (!exists) {
          await db.insert(falseCeilingItems).values({
            quotationId,
            roomType,
            description: `${roomType} False Ceiling`,
            length: null,
            width: null,
            area: null,
            unitPrice: null,
            totalPrice: null,
          });
          itemsAdded++;
        }
      }
      
      res.json({
        ok: true,
        applied: {
          roomsAdded: 0,
          itemsAdded,
        },
      });
    } catch (error) {
      console.error("Error applying FC defaults:", error);
      res.status(500).json({ message: "Failed to apply FC defaults" });
    }
  });

  // Interior items routes
  app.get('/api/quotations/:id/interior-items', async (req: any, res) => {
    try {
      // Check for render token first (for Puppeteer), then fall back to session auth
      const token = req.query.renderToken as string;
      const isRenderMode = token && verifyRenderToken(token, req.params.id);
      
      if (!isRenderMode && !req.isAuthenticated?.()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      
      if (!isRenderMode && quotation.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const items = await storage.getInteriorItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching interior items:", error);
      res.status(500).json({ message: "Failed to fetch interior items" });
    }
  });

  app.post('/api/quotations/:id/interior-items', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation || quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Normalize pricing data server-side
      const { normalizeInteriorItemData } = await import('./lib/pricing');
      const normalizedData = normalizeInteriorItemData({ ...req.body, quotationId: req.params.id });
      
      const validatedData = validatedInteriorItemSchema.parse(normalizedData);
      const item = await storage.createInteriorItem(validatedData);
      
      // Recalculate quotation totals
      const { recalculateQuotationTotals } = await import('./lib/totals');
      await recalculateQuotationTotals(req.params.id, storage);
      
      // Create version snapshot
      const { createVersionSnapshot } = await import('./lib/version-history');
      await createVersionSnapshot(
        storage, 
        req.params.id, 
        req.user.claims.sub, 
        'update_items', 
        `Added interior item: ${item.description || 'unnamed'}`
      );
      
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating interior item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      res.status(400).json({ message: "Failed to create interior item" });
    }
  });

  app.patch('/api/quotations/:id/interior-items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation || quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get existing item to merge with partial update
      const interiorItems = await storage.getInteriorItems(req.params.id);
      const existingItem = interiorItems.find(item => item.id === req.params.itemId);
      
      if (!existingItem) {
        return res.status(404).json({ message: "Interior item not found" });
      }
      
      // Merge partial update with existing data
      const mergedData = {
        ...existingItem,
        ...req.body,
      };
      
      // Normalize pricing data server-side
      const { normalizeInteriorItemData } = await import('./lib/pricing');
      const normalizedData = normalizeInteriorItemData(mergedData);
      
      const item = await storage.updateInteriorItem(req.params.itemId, normalizedData);
      
      // Recalculate quotation totals
      const { recalculateQuotationTotals } = await import('./lib/totals');
      await recalculateQuotationTotals(req.params.id, storage);
      
      // Create version snapshot
      const { createVersionSnapshot } = await import('./lib/version-history');
      await createVersionSnapshot(
        storage, 
        req.params.id, 
        req.user.claims.sub, 
        'update_items', 
        `Modified interior item: ${item.description || 'unnamed'}`
      );
      
      res.json(item);
    } catch (error) {
      console.error("Error updating interior item:", error);
      res.status(400).json({ message: "Failed to update interior item" });
    }
  });

  app.delete('/api/quotations/:id/interior-items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation || quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get item description before deleting for version history
      const items = await storage.getInteriorItems(req.params.id);
      const deletedItem = items.find(item => item.id === req.params.itemId);
      
      await storage.deleteInteriorItem(req.params.itemId);
      
      // Recalculate quotation totals
      const { recalculateQuotationTotals } = await import('./lib/totals');
      await recalculateQuotationTotals(req.params.id, storage);
      
      // Create version snapshot
      const { createVersionSnapshot } = await import('./lib/version-history');
      await createVersionSnapshot(
        storage, 
        req.params.id, 
        req.user.claims.sub, 
        'update_items', 
        `Deleted interior item: ${deletedItem?.description || 'unnamed'}`
      );
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting interior item:", error);
      res.status(500).json({ message: "Failed to delete interior item" });
    }
  });

  // False ceiling items routes
  app.get('/api/quotations/:id/false-ceiling-items', async (req: any, res) => {
    try {
      // Check for render token first (for Puppeteer), then fall back to session auth
      const token = req.query.renderToken as string;
      const isRenderMode = token && verifyRenderToken(token, req.params.id);
      
      if (!isRenderMode && !req.isAuthenticated?.()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      
      if (!isRenderMode && quotation.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const items = await storage.getFalseCeilingItems(req.params.id);
      
      // Normalize each item to ensure area and totalPrice are calculated from canonical dimensions
      const { normalizeFCItemData } = await import('./lib/totals');
      const normalizedItems = items.map(item => {
        const normalized = normalizeFCItemData(item);
        return {
          ...item,
          area: normalized.area,
          totalPrice: normalized.totalPrice,
        };
      });
      
      res.json(normalizedItems);
    } catch (error) {
      console.error("Error fetching false ceiling items:", error);
      res.status(500).json({ message: "Failed to fetch false ceiling items" });
    }
  });

  app.post('/api/quotations/:id/false-ceiling-items', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation || quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Calculate area and totalPrice server-side, discarding any client-sent values
      const { normalizeFCItemData } = await import('./lib/totals');
      const normalizedData = normalizeFCItemData({ ...req.body, quotationId: req.params.id });
      
      const validatedData = insertFalseCeilingItemSchema.parse(normalizedData);
      const item = await storage.createFalseCeilingItem(validatedData);
      
      // Recalculate quotation totals
      const { recalculateQuotationTotals } = await import('./lib/totals');
      await recalculateQuotationTotals(req.params.id, storage);
      
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating false ceiling item:", error);
      res.status(400).json({ message: "Failed to create false ceiling item" });
    }
  });

  app.patch('/api/quotations/:id/false-ceiling-items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation || quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get existing item to merge with updates
      const existingItems = await storage.getFalseCeilingItems(req.params.id);
      const existingItem = existingItems.find(i => i.id === req.params.itemId);
      
      if (!existingItem) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      // Merge existing data with updates for complete dimension calculation
      const mergedData = { ...existingItem, ...req.body };
      
      // Calculate area and totalPrice server-side, discarding any client-sent values
      const { normalizeFCItemData } = await import('./lib/totals');
      const normalizedData = normalizeFCItemData(mergedData);
      
      const item = await storage.updateFalseCeilingItem(req.params.itemId, normalizedData);
      
      // Recalculate quotation totals
      const { recalculateQuotationTotals } = await import('./lib/totals');
      await recalculateQuotationTotals(req.params.id, storage);
      
      res.json(item);
    } catch (error) {
      console.error("Error updating false ceiling item:", error);
      res.status(400).json({ message: "Failed to update false ceiling item" });
    }
  });

  app.delete('/api/quotations/:id/false-ceiling-items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation || quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteFalseCeilingItem(req.params.itemId);
      
      // Recalculate quotation totals
      const { recalculateQuotationTotals } = await import('./lib/totals');
      await recalculateQuotationTotals(req.params.id, storage);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting false ceiling item:", error);
      res.status(500).json({ message: "Failed to delete false ceiling item" });
    }
  });

  // Other items routes
  app.get('/api/quotations/:id/other-items', async (req: any, res) => {
    try {
      // Check for render token first (for Puppeteer), then fall back to session auth
      const token = req.query.renderToken as string;
      const isRenderMode = token && verifyRenderToken(token, req.params.id);
      
      if (!isRenderMode && !req.isAuthenticated?.()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      
      if (!isRenderMode && quotation.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const items = await storage.getOtherItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching other items:", error);
      res.status(500).json({ message: "Failed to fetch other items" });
    }
  });

  app.post('/api/quotations/:id/other-items', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation || quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const validatedData = insertOtherItemSchema.parse({ ...req.body, quotationId: req.params.id });
      const item = await storage.createOtherItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating other item:", error);
      res.status(400).json({ message: "Failed to create other item" });
    }
  });

  app.patch('/api/quotations/:id/other-items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation || quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const item = await storage.updateOtherItem(req.params.itemId, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating other item:", error);
      res.status(400).json({ message: "Failed to update other item" });
    }
  });

  app.delete('/api/quotations/:id/other-items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation || quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteOtherItem(req.params.itemId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting other item:", error);
      res.status(500).json({ message: "Failed to delete other item" });
    }
  });

  // Backup routes
  app.get('/api/quotations/:id/backup/download', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      if (quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Determine base URL from request
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;
      
      console.log(`[Backup] Creating backup for ${quotation.quoteId} with baseUrl: ${baseUrl}`);
      const zipBuffer = await createQuoteBackupZip(req.params.id, baseUrl);
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="TRECASA_${quotation.quoteId}_backup.zip"`);
      res.send(zipBuffer);
    } catch (error) {
      console.error("Error creating quote backup:", error);
      res.status(500).json({ message: "Failed to create backup" });
    }
  });

  app.get('/api/backup/all-data', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Determine base URL from request
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;
      
      // First, backup current database data to JSON files
      await backupDatabaseToFiles(userId);
      
      // Then create ZIP from those files with PDFs
      console.log(`[Backup] Creating global backup with baseUrl: ${baseUrl}`);
      const zipBuffer = await createAllDataBackupZip(userId, baseUrl);
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="TRECASA_AllData_${Date.now()}.zip"`);
      res.send(zipBuffer);
    } catch (error) {
      console.error("Error creating full backup:", error);
      res.status(500).json({ message: "Failed to create full backup" });
    }
  });

  // PDF download routes (supports both user auth and render token)
  app.get('/api/quotations/:id/pdf/:type', async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      // Check authentication: either render token or user session
      const token = req.query.token as string;
      const quotationId = req.params.id;
      
      if (token) {
        // Verify render token
        const { verifyRenderToken } = await import('./lib/render-token');
        if (!verifyRenderToken(token, quotationId)) {
          return res.status(403).json({ message: "Invalid or expired token" });
        }
      } else if (req.user?.claims?.sub) {
        // Verify user ownership
        if (quotation.userId !== req.user.claims.sub) {
          return res.status(403).json({ message: "Forbidden" });
        }
      } else {
        return res.status(401).json({ message: "Authentication required" });
      }

      const type = req.params.type as 'interiors' | 'false-ceiling' | 'agreement';
      if (!['interiors', 'false-ceiling', 'agreement'].includes(type)) {
        return res.status(400).json({ message: "Invalid PDF type" });
      }

      // Determine base URL from request
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;

      console.log(`[PDF] Generating ${type} PDF for ${quotation.quoteId} with baseUrl: ${baseUrl}`);
      const { generateQuotationPDF } = await import('./lib/pdf-generator');
      const pdfBuffer = await generateQuotationPDF(quotation, type, baseUrl);

      const typeLabel = type === 'interiors' ? 'Interiors' : type === 'false-ceiling' ? 'FalseCeiling' : 'Agreement';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="TRECASA_${quotation.quoteId}_${typeLabel}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Render routes for PDF generation (token-authenticated, used by Puppeteer)
  // These routes return the HTML content without requiring user session authentication
  app.get('/render/quotation/:id/print', async (req: any, res) => {
    try {
      const token = req.query.token as string;
      const quotationId = req.params.id;
      
      if (!token || !verifyRenderToken(token, quotationId)) {
        return res.status(403).json({ message: "Invalid or expired render token" });
      }
      
      const quotation = await storage.getQuotation(quotationId);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      
      // Return minimal HTML that loads the print page content
      // The page will load without requiring user authentication
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Print - ${quotation.quoteId}</title>
            <script>
              window.__RENDER_MODE__ = true;
              window.__RENDER_TOKEN__ = '${token}';
            </script>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/src/index.tsx"></script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error rendering print page:", error);
      res.status(500).json({ message: "Failed to render page" });
    }
  });

  app.get('/render/quotation/:id/agreement', async (req: any, res) => {
    try {
      const token = req.query.token as string;
      const quotationId = req.params.id;
      
      if (!token || !verifyRenderToken(token, quotationId)) {
        return res.status(403).json({ message: "Invalid or expired render token" });
      }
      
      const quotation = await storage.getQuotation(quotationId);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      
      // Return minimal HTML that loads the agreement page content
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Agreement - ${quotation.quoteId}</title>
            <script>
              window.__RENDER_MODE__ = true;
              window.__RENDER_TOKEN__ = '${token}';
            </script>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/src/index.tsx"></script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error rendering agreement page:", error);
      res.status(500).json({ message: "Failed to render page" });
    }
  });

  // API endpoint to get render token (for testing/debugging)
  app.get('/api/quotations/:id/render-token', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      if (quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const token = generateRenderToken(req.params.id);
      res.json({ token });
    } catch (error) {
      console.error("Error generating render token:", error);
      res.status(500).json({ message: "Failed to generate token" });
    }
  });

  // Approval & Agreement routes
  app.post('/api/quotations/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const quotationId = req.params.id;
      const { approvedBy, siteAddress } = req.body;
      
      // Fetch quotation
      const quotation = await storage.getQuotation(quotationId);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      
      // Check ownership
      if (quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Check if already approved
      if (quotation.status === "approved") {
        return res.status(409).json({ message: "Quote already approved" });
      }
      
      // Fetch global rules for GST and payment schedule
      const [globalRulesData] = await db
        .select()
        .from(globalRules)
        .where(eq(globalRules.id, "global"));
      
      // Fetch interior items to get selected brands and rates
      const interiorItemsList = await storage.getInteriorItems(quotationId);
      
      // Build snapshot (rates, brands, global rules used at approval)
      const ratesByItemKey: Record<string, any> = {};
      const brandsSelected = new Set<string>();
      
      for (const item of interiorItemsList) {
        brandsSelected.add(item.material || "Generic Ply");
        brandsSelected.add(item.finish || "Generic Laminate");
        brandsSelected.add(item.hardware || "Nimmi");
      }
      
      const snapshotJson = {
        globalRules: globalRulesData || {},
        brandsSelected: Array.from(brandsSelected),
        ratesByItemKey,
      };
      
      // Calculate totals
      const interiorsSubtotal = interiorItemsList.reduce((sum, item) => {
        const total = parseFloat(item.totalPrice || "0");
        return sum + (isNaN(total) ? 0 : total);
      }, 0);
      
      const fcItems = await storage.getFalseCeilingItems(quotationId);
      const fcSubtotal = fcItems.reduce((sum, item) => {
        const total = parseFloat(item.totalPrice || "0");
        return sum + (isNaN(total) ? 0 : total);
      }, 0);
      
      const grandSubtotal = interiorsSubtotal + fcSubtotal;
      
      // Apply discount
      let discountAmount = 0;
      if (quotation.discountType === "percent") {
        discountAmount = (grandSubtotal * parseFloat(quotation.discountValue || "0")) / 100;
      } else {
        discountAmount = parseFloat(quotation.discountValue || "0");
      }
      
      const amountAfterDiscount = grandSubtotal - discountAmount;
      
      // Calculate GST
      const gstPercent = globalRulesData?.gstPercent || 18;
      const gstAmount = (amountAfterDiscount * gstPercent) / 100;
      const grandTotal = amountAfterDiscount + gstAmount;
      
      // Update quotation status
      const updatedQuotation = await storage.updateQuotation(quotationId, {
        status: "approved" as const,
        approvedAt: Date.now(),
        approvedBy: approvedBy || req.user.claims.email || "Unknown",
        snapshotJson: snapshotJson as any,
      });
      
      // Create payment schedule with amounts
      const paymentScheduleData = globalRulesData?.paymentScheduleJson ? JSON.parse(globalRulesData.paymentScheduleJson) : [];
      const paymentSchedule = paymentScheduleData.map((item: any) => ({
        label: item.label,
        percent: item.percent,
        amount: Math.round((grandTotal * item.percent) / 100),
      }));
      
      // Assemble T&C from dynamic source
      const termsJson = [
        "All measurements are finished-size; deviations will be re-measured on site.",
        "Manufacturing tolerances are ±3mm.",
        "Warranty as per brand manufacturer terms.",
        "Delivery & installation timelines depend on site readiness.",
        "Payments as per agreed schedule; delays may affect timeline.",
      ];
      
      // Create agreement
      const agreement = await storage.createAgreement({
        quotationId,
        clientName: quotation.clientName,
        projectName: quotation.projectName,
        siteAddress: siteAddress || quotation.projectAddress || "",
        amountBeforeGst: Math.round(amountAfterDiscount * 100), // Convert to paise
        gstPercent,
        gstAmount: Math.round(gstAmount * 100),
        grandTotal: Math.round(grandTotal * 100),
        paymentScheduleJson: paymentSchedule,
        termsJson,
        pdfPath: `/storage/agreements/${quotationId}_agreement.pdf`, // Placeholder
        generatedAt: Date.now(),
      });
      
      // Log approval
      await db.insert(auditLog).values({
        userId: req.user.claims.sub,
        userEmail: req.user.claims.email || "",
        section: "Quotes",
        action: "UPDATE",
        targetId: quotationId,
        summary: `Approved quote ${quotation.quoteId}`,
        beforeJson: JSON.stringify({ status: quotation.status }),
        afterJson: JSON.stringify({ status: "approved", approvedBy: approvedBy || req.user.claims.email }),
      });
      
      // Log agreement creation
      await db.insert(auditLog).values({
        userId: req.user.claims.sub,
        userEmail: req.user.claims.email || "",
        section: "Agreement",
        action: "CREATE",
        targetId: agreement.id,
        summary: `Agreement created ${agreement.id}`,
        beforeJson: null,
        afterJson: JSON.stringify({ quotationId, grandTotal }),
      });
      
      // Auto-create project for expense tracking
      const projectId = generateQuoteId().replace('TRE_QT_', 'TRE_PRJ_');
      const [newProject] = await db.insert(projects).values({
        quotationId,
        userId: req.user.claims.sub,
        projectId,
        projectName: quotation.projectName,
        clientName: quotation.clientName,
        projectAddress: quotation.projectAddress || "",
        contractAmount: grandTotal.toFixed(2),
        totalExpenses: "0",
        profitLoss: grandTotal.toFixed(2),
        status: "active",
        startDate: new Date(),
      }).returning();
      
      // Log project creation
      await db.insert(auditLog).values({
        userId: req.user.claims.sub,
        userEmail: req.user.claims.email || "",
        section: "Projects",
        action: "CREATE",
        targetId: newProject.id,
        summary: `Project ${projectId} created from quote ${quotation.quoteId}`,
        beforeJson: null,
        afterJson: JSON.stringify({ quotationId, projectId, contractAmount: grandTotal }),
      });
      
      res.json({
        ok: true,
        quotation: updatedQuotation,
        agreement,
        project: newProject,
      });
    } catch (error) {
      console.error("Error approving quotation:", error);
      res.status(500).json({ message: "Failed to approve quotation" });
    }
  });

  // Get agreement by ID
  app.get('/api/agreements/:id', isAuthenticated, async (req: any, res) => {
    try {
      const agreement = await storage.getAgreement(req.params.id);
      if (!agreement) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      
      // Verify ownership through quotation
      const quotation = await storage.getQuotation(agreement.quotationId);
      if (!quotation || quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(agreement);
    } catch (error) {
      console.error("Error fetching agreement:", error);
      res.status(500).json({ message: "Failed to fetch agreement" });
    }
  });

  // Get agreement by quotation ID
  app.get('/api/quotations/:quotationId/agreement', isAuthenticated, async (req: any, res) => {
    try {
      const quotationId = req.params.quotationId;
      
      // Verify ownership first
      const quotation = await storage.getQuotation(quotationId);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      if (quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const agreement = await storage.getAgreementByQuotationId(quotationId);
      if (!agreement) {
        return res.status(404).json({ message: "Agreement not found for this quotation" });
      }
      
      res.json(agreement);
    } catch (error) {
      console.error("Error fetching agreement by quotation:", error);
      res.status(500).json({ message: "Failed to fetch agreement" });
    }
  });

  // Sign agreement
  app.post('/api/agreements/:id/sign', isAuthenticated, async (req: any, res) => {
    try {
      const { signedByClient } = req.body;
      
      const agreement = await storage.getAgreement(req.params.id);
      if (!agreement) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      
      // Verify ownership through quotation
      const quotation = await storage.getQuotation(agreement.quotationId);
      if (!quotation || quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updated = await storage.updateAgreement(req.params.id, {
        signedByClient,
        signedAt: Date.now(),
      });
      
      // Log signing
      await db.insert(auditLog).values({
        userId: req.user.claims.sub,
        userEmail: req.user.claims.email || "",
        section: "Agreement",
        action: "UPDATE",
        targetId: req.params.id,
        summary: `Agreement signed by ${signedByClient}`,
        beforeJson: JSON.stringify({ signedByClient: agreement.signedByClient }),
        afterJson: JSON.stringify({ signedByClient, signedAt: updated.signedAt }),
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error signing agreement:", error);
      res.status(500).json({ message: "Failed to sign agreement" });
    }
  });

  // Export quotation as ZIP
  app.get("/api/quotations/:id/export-zip", isAuthenticated, async (req, res) => {
    try {
      const quotationId = req.params.id;
      const ensurePdfs = req.query.ensurePdfs !== '0'; // Default true
      
      const quotation = await storage.getQuotation(quotationId);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      
      // Verify ownership
      if (quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const zipBuffer = await buildQuoteZip({
        quoteId: quotationId,
        ensurePdfs,
        baseUrl,
      });
      
      // Generate filename with date
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const filename = `Trecasa_Quote_${quotation.quoteId}_${date}.zip`;
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(zipBuffer);
    } catch (error) {
      console.error("Error exporting quotation ZIP:", error);
      res.status(500).json({ message: "Failed to export quotation" });
    }
  });

  // Save snapshot for draft quotes
  app.post("/api/quotations/:id/snapshot", isAuthenticated, async (req, res) => {
    try {
      const quotationId = req.params.id;
      
      const quotation = await storage.getQuotation(quotationId);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      
      // Verify ownership
      if (quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Build snapshot from current state
      const [allRates, allBrands, globalRulesData] = await Promise.all([
        db.select().from(rates).where(eq(rates.isActive, true)),
        db.select().from(brands).where(eq(brands.isActive, true)),
        db.select().from(globalRules).limit(1),
      ]);
      
      // Build rates-by-itemKey map
      const ratesByItemKey: Record<string, any> = {};
      for (const rate of allRates) {
        ratesByItemKey[rate.itemKey] = rate;
      }
      
      // Get interior items to extract brands used
      const interiorItems = await storage.getInteriorItems(quotationId);
      const brandsUsed = {
        materials: new Set<string>(),
        finishes: new Set<string>(),
        hardware: new Set<string>(),
      };
      
      interiorItems.forEach(item => {
        if (item.material) brandsUsed.materials.add(item.material);
        if (item.finish) brandsUsed.finishes.add(item.finish);
        if (item.hardware) brandsUsed.hardware.add(item.hardware);
      });
      
      const snapshotData = {
        globalRules: globalRulesData[0] || null,
        ratesByItemKey,
        brandsSelected: {
          materials: Array.from(brandsUsed.materials),
          finishes: Array.from(brandsUsed.finishes),
          hardware: Array.from(brandsUsed.hardware),
        },
        brands: allBrands,
        timestamp: Date.now(),
      };
      
      // Save snapshot to quotation
      await storage.updateQuotation(quotationId, {
        snapshotJson: snapshotData,
      });
      
      res.json({ ok: true, snapshotSaved: true });
    } catch (error) {
      console.error("Error saving snapshot:", error);
      res.status(500).json({ message: "Failed to save snapshot" });
    }
  });

  // Change Order routes
  app.get('/api/change-orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const changeOrdersList = await db.query.changeOrders.findMany({
        where: eq(changeOrders.userId, userId),
        with: {
          quotation: true,
          items: true,
        },
        orderBy: (changeOrders, { desc }) => [desc(changeOrders.createdAt)],
      });
      res.json(changeOrdersList);
    } catch (error) {
      console.error("Error fetching change orders:", error);
      res.status(500).json({ message: "Failed to fetch change orders" });
    }
  });

  app.get('/api/quotations/:quotationId/change-orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quotationId = req.params.quotationId;
      
      // Verify quotation belongs to user
      const quotation = await storage.getQuotation(quotationId);
      if (!quotation || quotation.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const changeOrdersList = await db.query.changeOrders.findMany({
        where: eq(changeOrders.quotationId, quotationId),
        with: {
          items: true,
        },
        orderBy: (changeOrders, { desc }) => [desc(changeOrders.createdAt)],
      });
      res.json(changeOrdersList);
    } catch (error) {
      console.error("Error fetching change orders:", error);
      res.status(500).json({ message: "Failed to fetch change orders" });
    }
  });

  app.get('/api/change-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const changeOrder = await db.query.changeOrders.findFirst({
        where: eq(changeOrders.id, req.params.id),
        with: {
          quotation: true,
          items: true,
        },
      });
      
      if (!changeOrder) {
        return res.status(404).json({ message: "Change order not found" });
      }
      
      // Ensure user owns this change order
      if (changeOrder.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(changeOrder);
    } catch (error) {
      console.error("Error fetching change order:", error);
      res.status(500).json({ message: "Failed to fetch change order" });
    }
  });

  app.post('/api/change-orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertChangeOrderSchema.parse(req.body);
      
      // Verify quotation exists and belongs to user
      const quotation = await storage.getQuotation(validated.quotationId);
      if (!quotation || quotation.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Generate Change Order ID (TRE_CO_YYMMDD_XXXX)
      const changeOrderId = generateQuoteId().replace('TRE_QT_', 'TRE_CO_');
      
      const [newChangeOrder] = await db.insert(changeOrders).values({
        ...validated,
        userId,
        changeOrderId,
      }).returning();
      
      res.json(newChangeOrder);
    } catch (error) {
      console.error("Error creating change order:", error);
      res.status(500).json({ message: "Failed to create change order" });
    }
  });

  app.patch('/api/change-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const changeOrder = await db.query.changeOrders.findFirst({
        where: eq(changeOrders.id, req.params.id),
      });
      
      if (!changeOrder) {
        return res.status(404).json({ message: "Change order not found" });
      }
      
      if (changeOrder.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const [updated] = await db.update(changeOrders)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(changeOrders.id, req.params.id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating change order:", error);
      res.status(500).json({ message: "Failed to update change order" });
    }
  });

  app.delete('/api/change-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const changeOrder = await db.query.changeOrders.findFirst({
        where: eq(changeOrders.id, req.params.id),
      });
      
      if (!changeOrder) {
        return res.status(404).json({ message: "Change order not found" });
      }
      
      if (changeOrder.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await db.delete(changeOrders).where(eq(changeOrders.id, req.params.id));
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting change order:", error);
      res.status(500).json({ message: "Failed to delete change order" });
    }
  });

  // Change Order Items routes
  app.post('/api/change-orders/:changeOrderId/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const changeOrderId = req.params.changeOrderId;
      
      // Verify change order exists and belongs to user
      const changeOrder = await db.query.changeOrders.findFirst({
        where: eq(changeOrders.id, changeOrderId),
      });
      
      if (!changeOrder || changeOrder.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validated = insertChangeOrderItemSchema.parse(req.body);
      const [newItem] = await db.insert(changeOrderItems).values({
        ...validated,
        changeOrderId,
      }).returning();
      
      res.json(newItem);
    } catch (error) {
      console.error("Error creating change order item:", error);
      res.status(500).json({ message: "Failed to create change order item" });
    }
  });

  app.patch('/api/change-order-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const item = await db.query.changeOrderItems.findFirst({
        where: eq(changeOrderItems.id, req.params.id),
        with: { changeOrder: true },
      });
      
      if (!item || item.changeOrder.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const [updated] = await db.update(changeOrderItems)
        .set(req.body)
        .where(eq(changeOrderItems.id, req.params.id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating change order item:", error);
      res.status(500).json({ message: "Failed to update change order item" });
    }
  });

  app.delete('/api/change-order-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const item = await db.query.changeOrderItems.findFirst({
        where: eq(changeOrderItems.id, req.params.id),
        with: { changeOrder: true },
      });
      
      if (!item || item.changeOrder.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await db.delete(changeOrderItems).where(eq(changeOrderItems.id, req.params.id));
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting change order item:", error);
      res.status(500).json({ message: "Failed to delete change order item" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectsList = await db.query.projects.findMany({
        where: eq(projects.userId, userId),
        with: {
          quotation: true,
          expenses: true,
        },
        orderBy: (projects, { desc }) => [desc(projects.createdAt)],
      });
      res.json(projectsList);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, req.params.id),
        with: {
          quotation: true,
          expenses: true,
        },
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.get('/api/quotations/:quotationId/project', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quotationId = req.params.quotationId;
      
      const project = await db.query.projects.findFirst({
        where: eq(projects.quotationId, quotationId),
        with: {
          expenses: true,
        },
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.patch('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, req.params.id),
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const [updated] = await db.update(projects)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(projects.id, req.params.id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Project Expenses routes
  app.post('/api/projects/:projectId/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.params.projectId;
      
      // Verify project exists and belongs to user
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
      });
      
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validated = insertProjectExpenseSchema.parse(req.body);
      
      // Convert paymentDate string to Date if provided (and not empty)
      const expenseData: any = {
        ...validated,
        projectId,
      };
      
      // Only set paymentDate if it's a non-empty string
      if (validated.paymentDate && validated.paymentDate.trim() !== '') {
        expenseData.paymentDate = new Date(validated.paymentDate as any);
      } else {
        // Remove paymentDate if it's empty or undefined
        delete expenseData.paymentDate;
      }
      
      const [newExpense] = await db.insert(projectExpenses).values(expenseData).returning();
      
      // Update project totals
      const allExpenses = await db.query.projectExpenses.findMany({
        where: eq(projectExpenses.projectId, projectId),
      });
      
      const totalExpenses = allExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || "0"), 0);
      const contractAmount = parseFloat(project.contractAmount || "0");
      const profitLoss = contractAmount - totalExpenses;
      
      await db.update(projects)
        .set({
          totalExpenses: totalExpenses.toFixed(2),
          profitLoss: profitLoss.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));
      
      res.json(newExpense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.patch('/api/project-expenses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expense = await db.query.projectExpenses.findFirst({
        where: eq(projectExpenses.id, req.params.id),
        with: { project: true },
      });
      
      if (!expense || expense.project.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Handle paymentDate conversion for update
      const updateData: any = { ...req.body, updatedAt: new Date() };
      
      // Handle paymentDate: convert if valid, remove if empty/undefined
      if (updateData.paymentDate !== undefined) {
        if (updateData.paymentDate && updateData.paymentDate.trim() !== '') {
          updateData.paymentDate = new Date(updateData.paymentDate);
        } else {
          // Remove empty or whitespace-only paymentDate
          delete updateData.paymentDate;
        }
      }
      
      const [updated] = await db.update(projectExpenses)
        .set(updateData)
        .where(eq(projectExpenses.id, req.params.id))
        .returning();
      
      // Recalculate project totals
      const allExpenses = await db.query.projectExpenses.findMany({
        where: eq(projectExpenses.projectId, expense.projectId),
      });
      
      const totalExpenses = allExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || "0"), 0);
      const contractAmount = parseFloat(expense.project.contractAmount || "0");
      const profitLoss = contractAmount - totalExpenses;
      
      await db.update(projects)
        .set({
          totalExpenses: totalExpenses.toFixed(2),
          profitLoss: profitLoss.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(projects.id, expense.projectId));
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete('/api/project-expenses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expense = await db.query.projectExpenses.findFirst({
        where: eq(projectExpenses.id, req.params.id),
        with: { project: true },
      });
      
      if (!expense || expense.project.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const projectId = expense.projectId;
      await db.delete(projectExpenses).where(eq(projectExpenses.id, req.params.id));
      
      // Recalculate project totals
      const allExpenses = await db.query.projectExpenses.findMany({
        where: eq(projectExpenses.projectId, projectId),
      });
      
      const totalExpenses = allExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || "0"), 0);
      const contractAmount = parseFloat(expense.project.contractAmount || "0");
      const profitLoss = contractAmount - totalExpenses;
      
      await db.update(projects)
        .set({
          totalExpenses: totalExpenses.toFixed(2),
          profitLoss: profitLoss.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));
      
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Business Expenses routes (overhead/monthly costs)
  app.get('/api/business-expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expenses = await db.query.businessExpenses.findMany({
        where: eq(businessExpenses.userId, userId),
        orderBy: (businessExpenses, { desc }) => [desc(businessExpenses.paymentDate), desc(businessExpenses.createdAt)],
      });
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching business expenses:", error);
      res.status(500).json({ message: "Failed to fetch business expenses" });
    }
  });

  app.post('/api/business-expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertBusinessExpenseSchema.parse(req.body);
      
      // Convert paymentDate string to Date if provided (and not empty)
      const expenseData: any = {
        ...validated,
        userId,
      };
      
      // Only set paymentDate if it's a non-empty string
      if (validated.paymentDate && validated.paymentDate.trim() !== '') {
        expenseData.paymentDate = new Date(validated.paymentDate as any);
      } else {
        delete expenseData.paymentDate;
      }
      
      const [newExpense] = await db.insert(businessExpenses).values(expenseData).returning();
      res.json(newExpense);
    } catch (error) {
      console.error("Error creating business expense:", error);
      res.status(500).json({ message: "Failed to create business expense" });
    }
  });

  app.patch('/api/business-expenses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expense = await db.query.businessExpenses.findFirst({
        where: eq(businessExpenses.id, req.params.id),
      });
      
      if (!expense || expense.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Handle paymentDate conversion for update
      const updateData: any = { ...req.body, updatedAt: new Date() };
      
      // Handle paymentDate: convert if valid, remove if empty/undefined
      if (updateData.paymentDate !== undefined) {
        if (updateData.paymentDate && updateData.paymentDate.trim() !== '') {
          updateData.paymentDate = new Date(updateData.paymentDate);
        } else {
          delete updateData.paymentDate;
        }
      }
      
      const [updated] = await db.update(businessExpenses)
        .set(updateData)
        .where(eq(businessExpenses.id, req.params.id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating business expense:", error);
      res.status(500).json({ message: "Failed to update business expense" });
    }
  });

  app.delete('/api/business-expenses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expense = await db.query.businessExpenses.findFirst({
        where: eq(businessExpenses.id, req.params.id),
      });
      
      if (!expense || expense.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await db.delete(businessExpenses).where(eq(businessExpenses.id, req.params.id));
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting business expense:", error);
      res.status(500).json({ message: "Failed to delete business expense" });
    }
  });

  // Get business expenses stats and summary
  app.get('/api/business-expenses/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allExpenses = await db.query.businessExpenses.findMany({
        where: eq(businessExpenses.userId, userId),
      });
      
      // Calculate total by category
      const byCategory = allExpenses.reduce((acc: any, exp) => {
        const category = exp.category || 'Other';
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += parseFloat(exp.amount || "0");
        return acc;
      }, {});
      
      // Calculate monthly totals (last 6 months)
      const now = new Date();
      const monthlyTotals: { month: string; total: number }[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthTotal = allExpenses.reduce((sum, exp) => {
          if (exp.paymentDate) {
            const expDate = new Date(exp.paymentDate);
            const expMonthKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
            if (expMonthKey === monthKey) {
              return sum + parseFloat(exp.amount || "0");
            }
          }
          return sum;
        }, 0);
        
        monthlyTotals.push({
          month: monthKey,
          total: monthTotal,
        });
      }
      
      const totalExpenses = allExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || "0"), 0);
      
      res.json({
        totalExpenses,
        byCategory,
        monthlyTotals,
        count: allExpenses.length,
      });
    } catch (error) {
      console.error("Error fetching business expenses stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Admin routes
  registerAdminRatesRoutes(app, isAuthenticated);
  registerAdminTemplatesRoutes(app, isAuthenticated);
  registerAdminBrandsRoutes(app, isAuthenticated);
  registerAdminPaintingFcRoutes(app, isAuthenticated);
  registerAdminGlobalRulesRoutes(app, isAuthenticated);
  registerAdminAuditRoutes(app, isAuthenticated);

  // Client portal routes (public + admin)
  registerClientQuoteRoutes(app, isAuthenticated);

  const httpServer = createServer(app);
  return httpServer;
}
