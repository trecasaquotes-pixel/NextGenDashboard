import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { quotations, agreements, auditLog, rates, brands, globalRules } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createClientToken, verifyClientToken } from "../lib/client-token";
import { generateAllQuotationPDFs } from "../lib/pdf-generator";
import { generateRenderToken } from "../lib/render-token";
import path from "path";
import fs from "fs/promises";

export function registerClientQuoteRoutes(app: Express, isAuthenticated: any) {
  
  // GET /api/client-quote/:quoteId/info?token=...
  // Returns public info for the portal
  app.get("/api/client-quote/:quoteId/info", async (req, res) => {
    try {
      const { quoteId } = req.params;
      const token = req.query.token as string;

      if (!token || !(await verifyClientToken(quoteId, token))) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }

      const quotation = await storage.getQuotation(quoteId);
      if (!quotation) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Get interior and FC items to check if FC exists
      const interiorItems = await storage.getInteriorItems(quoteId);
      const fcItems = await storage.getFalseCeilingItems(quoteId);
      
      // Calculate totals with discount and GST
      const interiorsSubtotal = quotation.totals?.interiorsSubtotal || 0;
      const fcSubtotal = quotation.totals?.fcSubtotal || 0;
      const grandSubtotal = quotation.totals?.grandSubtotal || 0;

      const discountType = quotation.discountType || "percent";
      const discountValue = parseFloat(quotation.discountValue?.toString() || "0");
      
      const discountAmount = discountType === "percent" 
        ? (grandSubtotal * discountValue) / 100 
        : discountValue;

      const afterDiscount = Math.max(0, grandSubtotal - discountAmount);
      const gstPercent = 18; // Fixed 18% GST
      const gstAmount = afterDiscount * (gstPercent / 100);
      const grandTotal = afterDiscount + gstAmount;

      // Generate render tokens for PDF access
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const interiorsRenderToken = generateRenderToken(quoteId);
      const fcRenderToken = fcItems.length > 0 ? generateRenderToken(quoteId) : null;

      // Get terms from quotation
      const termsArray: string[] = [];
      if (quotation.terms?.interiors?.customText) {
        termsArray.push(...quotation.terms.interiors.customText.split('\n').filter(Boolean));
      }

      const response = {
        project: {
          name: quotation.projectName,
          clientName: quotation.clientName,
          siteAddress: quotation.projectAddress,
        },
        totals: {
          interiors: {
            subtotal: interiorsSubtotal,
            gstPercent,
            gstAmount: (interiorsSubtotal * gstPercent) / 100,
            grandTotal: interiorsSubtotal + (interiorsSubtotal * gstPercent) / 100,
          },
          fc: fcItems.length > 0 ? {
            subtotal: fcSubtotal,
            gstPercent,
            gstAmount: (fcSubtotal * gstPercent) / 100,
            grandTotal: fcSubtotal + (fcSubtotal * gstPercent) / 100,
          } : null,
          discount: {
            type: discountType,
            value: discountValue,
            amount: discountAmount,
          },
          afterDiscount,
          gstAmount,
          grandTotal,
        },
        pdfs: {
          interiorsUrl: `${baseUrl}/api/quotations/${quoteId}/pdf/interiors?token=${interiorsRenderToken}`,
          fcUrl: fcRenderToken ? `${baseUrl}/api/quotations/${quoteId}/pdf/fc?token=${fcRenderToken}` : null,
        },
        terms: termsArray,
        status: quotation.status,
        approvedAt: quotation.approvedAt,
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching client quote info:", error);
      res.status(500).json({ message: "Failed to fetch quote info" });
    }
  });

  // POST /api/client-quote/:quoteId/accept?token=...
  // Client accepts T&C and e-signs
  app.post("/api/client-quote/:quoteId/accept", async (req, res) => {
    try {
      const { quoteId } = req.params;
      const token = req.query.token as string;
      const { clientName, signatureDataUrl } = req.body;

      if (!token || !(await verifyClientToken(quoteId, token))) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }

      if (!clientName || !signatureDataUrl) {
        return res.status(400).json({ message: "Client name and signature required" });
      }

      const quotation = await storage.getQuotation(quoteId);
      if (!quotation) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // If quote is not approved, approve it first
      if (quotation.status !== "approved") {
        // Approve logic (similar to admin approve)
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        // Build snapshot
        const [ratesData, brandsData, globalRulesData] = await Promise.all([
          db.select().from(rates).where(eq(rates.isActive, true)),
          db.select().from(brands).where(eq(brands.isActive, true)),
          db.select().from(globalRules).limit(1),
        ]);

        const interiorItems = await storage.getInteriorItems(quoteId);
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

        const ratesByItemKey: Record<string, any> = {};
        for (const rate of ratesData) {
          ratesByItemKey[rate.itemKey] = rate;
        }

        const snapshotJson = {
          globalRules: globalRulesData[0] || null,
          ratesByItemKey,
          brandsSelected: {
            materials: Array.from(brandsUsed.materials),
            finishes: Array.from(brandsUsed.finishes),
            hardware: Array.from(brandsUsed.hardware),
          },
          brands: brandsData,
          timestamp: Date.now(),
        };

        // Update quote to approved
        await storage.updateQuotation(quoteId, {
          status: "approved",
          approvedAt: Date.now(),
          approvedBy: "Client Portal",
          snapshotJson: snapshotJson as any,
        });

        // Generate agreement PDF
        try {
          const pdfs = await generateAllQuotationPDFs(quotation, baseUrl);
          if (pdfs.agreement) {
            const storagePath = path.resolve('storage', 'pdf', 'quotes', quoteId);
            await fs.mkdir(storagePath, { recursive: true });
            const agreementPath = path.join(storagePath, 'agreement.pdf');
            await fs.writeFile(agreementPath, pdfs.agreement);
          }
        } catch (pdfError) {
          console.error("PDF generation failed (non-fatal):", pdfError);
        }
      }

      // Save signature image
      const signatureDir = path.resolve('storage', 'signatures');
      await fs.mkdir(signatureDir, { recursive: true });
      
      // Convert data URL to buffer and save
      const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const signaturePath = path.join(signatureDir, `${quoteId}.png`);
      await fs.writeFile(signaturePath, buffer);

      // Update agreement with signature
      const agreementResult = await db
        .select()
        .from(agreements)
        .where(eq(agreements.quotationId, quoteId))
        .limit(1);

      if (agreementResult.length > 0) {
        const agreement = agreementResult[0];
        await db
          .update(agreements)
          .set({
            signedByClient: clientName,
            signedAt: Date.now(),
          })
          .where(eq(agreements.id, agreement.id));

        // Audit log
        await db.insert(auditLog).values({
          userId: quotation.userId,
          userEmail: "client-portal",
          section: "Agreement",
          action: "UPDATE",
          targetId: quoteId,
          summary: `Client ${clientName} accepted and signed via portal`,
          beforeJson: JSON.stringify({ signedByClient: agreement.signedByClient }),
          afterJson: JSON.stringify({ signedByClient: clientName, signedAt: Date.now() }),
        });
      }

      // Generate render token for agreement PDF
      const agreementRenderToken = generateRenderToken(quoteId);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      res.json({ 
        ok: true, 
        agreementUrl: `${baseUrl}/api/quotations/${quoteId}/pdf/agreement?token=${agreementRenderToken}` 
      });
    } catch (error) {
      console.error("Error accepting quote:", error);
      res.status(500).json({ message: "Failed to accept quote" });
    }
  });

  // POST /api/client-quote/:quoteId/request-link (Admin only)
  // Generate or regenerate client share link
  app.post("/api/client-quote/:quoteId/request-link", isAuthenticated, async (req, res) => {
    try {
      const { quoteId } = req.params;
      const { setExpiry } = req.body; // boolean - whether to set 14-day expiry

      const quotation = await storage.getQuotation(quoteId);
      if (!quotation) {
        return res.status(404).json({ message: "Quote not found" });
      }

      const user = req.user as any;
      
      // Verify ownership
      if (quotation.userId !== user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Generate new token
      const clientToken = createClientToken();
      const clientTokenExpiresAt = setExpiry ? Date.now() + (14 * 24 * 60 * 60 * 1000) : null; // 14 days

      // Update quote
      await storage.updateQuotation(quoteId, {
        clientToken,
        clientTokenExpiresAt,
      });

      // Audit log
      await db.insert(auditLog).values({
        userId: user.claims.sub,
        userEmail: user.claims.email || "",
        section: "Quotes",
        action: "UPDATE",
        targetId: quoteId,
        summary: `Client share link ${quotation.clientToken ? 'regenerated' : 'generated'} for ${quotation.quoteId}`,
        beforeJson: JSON.stringify({ clientToken: quotation.clientToken }),
        afterJson: JSON.stringify({ clientToken, clientTokenExpiresAt }),
      });

      const baseUrl = process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : `${req.protocol}://${req.get('host')}`;
      
      const shareUrl = `${baseUrl}/quote/${quoteId}?t=${clientToken}`;

      res.json({ shareUrl, expiresAt: clientTokenExpiresAt });
    } catch (error) {
      console.error("Error generating client link:", error);
      res.status(500).json({ message: "Failed to generate link" });
    }
  });
}
