import type { Express } from "express";
import { db } from "./db";
import { paintingPacks, fcCatalog, insertPaintingPackSchema, insertFCCatalogSchema } from "@shared/schema";
import { eq, sql, and, or, like } from "drizzle-orm";
import { z } from "zod";

export function registerAdminPaintingFcRoutes(app: Express, isAuthenticated: any) {
  
  // ============================================================
  // PAINTING PACKS ROUTES
  // ============================================================
  
  // GET /api/admin/painting-packs - List painting packs with optional filters
  app.get('/api/admin/painting-packs', isAuthenticated, async (req: any, res) => {
    try {
      const { q, active, showInQuote } = req.query;
      
      let conditions = [];
      
      // Search filter
      if (q) {
        const searchTerm = `%${q}%`;
        conditions.push(like(paintingPacks.name, searchTerm));
      }
      
      // Active filter
      if (active !== undefined) {
        const isActive = active === '1' || active === 'true';
        conditions.push(eq(paintingPacks.isActive, isActive));
      }
      
      // Show in quote filter
      if (showInQuote !== undefined) {
        const shouldShow = showInQuote === '1' || showInQuote === 'true';
        conditions.push(eq(paintingPacks.showInQuote, shouldShow));
      }
      
      const result = conditions.length > 0
        ? await db.select().from(paintingPacks).where(and(...conditions)).orderBy(paintingPacks.basePriceLsum)
        : await db.select().from(paintingPacks).orderBy(paintingPacks.basePriceLsum);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching painting packs:", error);
      res.status(500).json({ message: "Failed to fetch painting packs" });
    }
  });

  // POST /api/admin/painting-packs - Create new painting pack
  app.post('/api/admin/painting-packs', isAuthenticated, async (req: any, res) => {
    try {
      // Transform bullets array to JSON string if needed
      const bodyData = { ...req.body };
      if (Array.isArray(bodyData.bulletsJson)) {
        bodyData.bulletsJson = JSON.stringify(bodyData.bulletsJson);
      }
      
      const validatedData = insertPaintingPackSchema.parse(bodyData);
      
      // Check for duplicate name (case-insensitive)
      const [existing] = await db.select().from(paintingPacks).where(
        sql`LOWER(${paintingPacks.name}) = LOWER(${validatedData.name})`
      );
      
      if (existing) {
        return res.status(400).json({ 
          message: `Painting pack '${validatedData.name}' already exists` 
        });
      }
      
      const [newPack] = await db.insert(paintingPacks)
        .values({
          ...validatedData,
          perBedroomDelta: String(validatedData.perBedroomDelta || 0.10),
          isActive: validatedData.isActive ?? true,
          showInQuote: validatedData.showInQuote ?? true,
        })
        .returning();
      
      res.status(201).json(newPack);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating painting pack:", error);
      res.status(500).json({ message: "Failed to create painting pack" });
    }
  });

  // PUT /api/admin/painting-packs/:id - Update painting pack
  app.put('/api/admin/painting-packs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Transform bullets array to JSON string if needed
      const bodyData = { ...req.body };
      if (Array.isArray(bodyData.bulletsJson)) {
        bodyData.bulletsJson = JSON.stringify(bodyData.bulletsJson);
      }
      
      const updateData = z.object({
        name: z.string().min(2).max(100).optional(),
        basePriceLsum: z.number().int().min(0).optional(),
        bulletsJson: z.string().optional(),
        bhkFactorBase: z.number().int().min(1).max(10).optional(),
        perBedroomDelta: z.number().min(0).max(0.25).optional(),
        showInQuote: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }).parse(bodyData);
      
      const [existingPack] = await db.select().from(paintingPacks).where(eq(paintingPacks.id, id));
      if (!existingPack) {
        return res.status(404).json({ message: "Painting pack not found" });
      }
      
      // Check for duplicate name if name is being updated
      if (updateData.name && updateData.name !== existingPack.name) {
        const [duplicate] = await db.select().from(paintingPacks).where(
          and(
            sql`LOWER(${paintingPacks.name}) = LOWER(${updateData.name})`,
            sql`${paintingPacks.id} != ${id}`
          )
        );
        
        if (duplicate) {
          return res.status(400).json({ 
            message: `Painting pack '${updateData.name}' already exists` 
          });
        }
      }
      
      // Prepare update object, converting perBedroomDelta to string if present
      const { perBedroomDelta, ...restUpdateData } = updateData;
      const updatePayload: any = {
        ...restUpdateData,
        updatedAt: new Date(),
      };
      
      if (perBedroomDelta !== undefined) {
        updatePayload.perBedroomDelta = String(perBedroomDelta);
      }
      
      const [updatedPack] = await db.update(paintingPacks)
        .set(updatePayload)
        .where(eq(paintingPacks.id, id))
        .returning();
      
      res.json(updatedPack);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating painting pack:", error);
      res.status(500).json({ message: "Failed to update painting pack" });
    }
  });

  // PATCH /api/admin/painting-packs/:id/active - Toggle active status
  app.patch('/api/admin/painting-packs/:id/active', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
      
      const [existingPack] = await db.select().from(paintingPacks).where(eq(paintingPacks.id, id));
      if (!existingPack) {
        return res.status(404).json({ message: "Painting pack not found" });
      }
      
      const [updatedPack] = await db.update(paintingPacks)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(paintingPacks.id, id))
        .returning();
      
      res.json(updatedPack);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error toggling painting pack active status:", error);
      res.status(500).json({ message: "Failed to update painting pack" });
    }
  });

  // DELETE /api/admin/painting-packs/:id - Soft delete painting pack
  app.delete('/api/admin/painting-packs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const [existingPack] = await db.select().from(paintingPacks).where(eq(paintingPacks.id, id));
      if (!existingPack) {
        return res.status(404).json({ message: "Painting pack not found" });
      }
      
      await db.update(paintingPacks)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(paintingPacks.id, id));
      
      res.json({ message: "Painting pack deleted successfully" });
    } catch (error) {
      console.error("Error deleting painting pack:", error);
      res.status(500).json({ message: "Failed to delete painting pack" });
    }
  });

  // ============================================================
  // FC CATALOG ROUTES
  // ============================================================
  
  // GET /api/admin/fc-catalog - List FC catalog items
  app.get('/api/admin/fc-catalog', isAuthenticated, async (req: any, res) => {
    try {
      const { q, active } = req.query;
      
      let conditions = [];
      
      // Search filter
      if (q) {
        const searchTerm = `%${q}%`;
        conditions.push(
          or(
            like(fcCatalog.key, searchTerm),
            like(fcCatalog.displayName, searchTerm)
          )
        );
      }
      
      // Active filter
      if (active !== undefined) {
        const isActive = active === '1' || active === 'true';
        conditions.push(eq(fcCatalog.isActive, isActive));
      }
      
      const result = conditions.length > 0
        ? await db.select().from(fcCatalog).where(and(...conditions)).orderBy(fcCatalog.key)
        : await db.select().from(fcCatalog).orderBy(fcCatalog.key);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching FC catalog:", error);
      res.status(500).json({ message: "Failed to fetch FC catalog" });
    }
  });

  // POST /api/admin/fc-catalog - Create new FC catalog item
  app.post('/api/admin/fc-catalog', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertFCCatalogSchema.parse(req.body);
      
      // Check for duplicate key
      const [existing] = await db.select().from(fcCatalog).where(
        eq(fcCatalog.key, validatedData.key)
      );
      
      if (existing) {
        return res.status(400).json({ 
          message: `FC catalog item with key '${validatedData.key}' already exists` 
        });
      }
      
      // Enforce unit guardrails
      if (validatedData.key === 'fc_paint' && validatedData.unit !== 'LSUM') {
        return res.status(400).json({ 
          message: "FC Paint must use LSUM unit" 
        });
      }
      
      if (['fc_lights', 'fc_fan_hook', 'fc_cove_led'].includes(validatedData.key) && validatedData.unit !== 'COUNT') {
        return res.status(400).json({ 
          message: "FC Lights, Fan Hook, and Cove LED must use COUNT unit" 
        });
      }
      
      // For COUNT units, require ratePerUnit >= 0
      if (validatedData.unit === 'COUNT' && (!validatedData.ratePerUnit || validatedData.ratePerUnit < 0)) {
        return res.status(400).json({ 
          message: "COUNT unit requires ratePerUnit >= 0" 
        });
      }
      
      const [newItem] = await db.insert(fcCatalog)
        .values({
          ...validatedData,
          isActive: validatedData.isActive ?? true,
        })
        .returning();
      
      res.status(201).json(newItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating FC catalog item:", error);
      res.status(500).json({ message: "Failed to create FC catalog item" });
    }
  });

  // PUT /api/admin/fc-catalog/:id - Update FC catalog item
  app.put('/api/admin/fc-catalog/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = z.object({
        displayName: z.string().min(2).max(100).optional(),
        unit: z.enum(["LSUM", "COUNT"]).optional(),
        defaultValue: z.number().int().min(0).optional(),
        ratePerUnit: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
      }).parse(req.body);
      
      const [existingItem] = await db.select().from(fcCatalog).where(eq(fcCatalog.id, id));
      if (!existingItem) {
        return res.status(404).json({ message: "FC catalog item not found" });
      }
      
      // Enforce unit guardrails if unit is being changed
      const finalUnit = updateData.unit || existingItem.unit;
      if (existingItem.key === 'fc_paint' && finalUnit !== 'LSUM') {
        return res.status(400).json({ 
          message: "FC Paint must use LSUM unit" 
        });
      }
      
      if (['fc_lights', 'fc_fan_hook', 'fc_cove_led'].includes(existingItem.key) && finalUnit !== 'COUNT') {
        return res.status(400).json({ 
          message: "FC Lights, Fan Hook, and Cove LED must use COUNT unit" 
        });
      }
      
      const [updatedItem] = await db.update(fcCatalog)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(fcCatalog.id, id))
        .returning();
      
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating FC catalog item:", error);
      res.status(500).json({ message: "Failed to update FC catalog item" });
    }
  });

  // PATCH /api/admin/fc-catalog/:id/active - Toggle active status
  app.patch('/api/admin/fc-catalog/:id/active', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
      
      const [existingItem] = await db.select().from(fcCatalog).where(eq(fcCatalog.id, id));
      if (!existingItem) {
        return res.status(404).json({ message: "FC catalog item not found" });
      }
      
      const [updatedItem] = await db.update(fcCatalog)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(fcCatalog.id, id))
        .returning();
      
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error toggling FC catalog active status:", error);
      res.status(500).json({ message: "Failed to update FC catalog item" });
    }
  });

  // DELETE /api/admin/fc-catalog/:id - Soft delete FC catalog item
  app.delete('/api/admin/fc-catalog/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const [existingItem] = await db.select().from(fcCatalog).where(eq(fcCatalog.id, id));
      if (!existingItem) {
        return res.status(404).json({ message: "FC catalog item not found" });
      }
      
      await db.update(fcCatalog)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(fcCatalog.id, id));
      
      res.json({ message: "FC catalog item deleted successfully" });
    } catch (error) {
      console.error("Error deleting FC catalog item:", error);
      res.status(500).json({ message: "Failed to delete FC catalog item" });
    }
  });
}
