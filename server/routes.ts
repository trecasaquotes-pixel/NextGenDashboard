// Referenced from javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertQuotationSchema, insertInteriorItemSchema, insertFalseCeilingItemSchema, insertOtherItemSchema } from "@shared/schema";
import { generateQuoteId } from "./utils/generateQuoteId";
import { createQuoteBackupZip, createAllDataBackupZip, backupDatabaseToFiles } from "./lib/backup";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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

  app.get('/api/quotations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      // Ensure user owns this quotation
      if (quotation.userId !== req.user.claims.sub) {
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
      
      const validatedData = insertQuotationSchema.parse({ 
        ...req.body, 
        userId, 
        quoteId,
        terms: defaultTerms,
        signoff: defaultSignoff
      });
      const quotation = await storage.createQuotation(validatedData);
      res.status(201).json(quotation);
    } catch (error) {
      console.error("Error creating quotation:", error);
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
      const updated = await storage.updateQuotation(req.params.id, req.body);
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

  // Interior items routes
  app.get('/api/quotations/:id/interior-items', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation || quotation.userId !== req.user.claims.sub) {
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
      const validatedData = insertInteriorItemSchema.parse({ ...req.body, quotationId: req.params.id });
      const item = await storage.createInteriorItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating interior item:", error);
      res.status(400).json({ message: "Failed to create interior item" });
    }
  });

  app.patch('/api/quotations/:id/interior-items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation || quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const item = await storage.updateInteriorItem(req.params.itemId, req.body);
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
      await storage.deleteInteriorItem(req.params.itemId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting interior item:", error);
      res.status(500).json({ message: "Failed to delete interior item" });
    }
  });

  // False ceiling items routes
  app.get('/api/quotations/:id/false-ceiling-items', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation || quotation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const items = await storage.getFalseCeilingItems(req.params.id);
      res.json(items);
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
      const validatedData = insertFalseCeilingItemSchema.parse({ ...req.body, quotationId: req.params.id });
      const item = await storage.createFalseCeilingItem(validatedData);
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
      const item = await storage.updateFalseCeilingItem(req.params.itemId, req.body);
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
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting false ceiling item:", error);
      res.status(500).json({ message: "Failed to delete false ceiling item" });
    }
  });

  // Other items routes
  app.get('/api/quotations/:id/other-items', isAuthenticated, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation || quotation.userId !== req.user.claims.sub) {
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

  const httpServer = createServer(app);
  return httpServer;
}
