import type { Express } from "express";
import { db } from "./db";
import { rates, insertRateSchema } from "@shared/schema";
import { eq, sql, and, or, like } from "drizzle-orm";
import { z } from "zod";

export function registerAdminRatesRoutes(app: Express, isAuthenticated: any) {
  
  // GET /api/admin/rates - List rates with optional filters
  app.get('/api/admin/rates', isAuthenticated, async (req: any, res) => {
    try {
      const { q, unit, category, active } = req.query;
      
      let conditions = [];
      
      // Search filter
      if (q) {
        const searchTerm = `%${q}%`;
        conditions.push(
          or(
            like(rates.displayName, searchTerm),
            like(rates.itemKey, searchTerm)
          )
        );
      }
      
      // Unit filter
      if (unit) {
        conditions.push(eq(rates.unit, unit as string));
      }
      
      // Category filter
      if (category) {
        conditions.push(eq(rates.category, category as string));
      }
      
      // Active filter
      if (active !== undefined) {
        const isActive = active === '1' || active === 'true';
        conditions.push(eq(rates.isActive, isActive));
      }
      
      const result = conditions.length > 0
        ? await db.select().from(rates).where(and(...conditions)).orderBy(rates.category, rates.displayName)
        : await db.select().from(rates).orderBy(rates.category, rates.displayName);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching rates:", error);
      res.status(500).json({ message: "Failed to fetch rates" });
    }
  });

  // POST /api/admin/rates - Create new rate
  app.post('/api/admin/rates', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertRateSchema.parse(req.body);
      
      const [newRate] = await db.insert(rates)
        .values({
          ...validatedData,
          isActive: validatedData.isActive ?? true,
        })
        .returning();
      
      res.status(201).json(newRate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating rate:", error);
      res.status(500).json({ message: "Failed to create rate" });
    }
  });

  // PUT /api/admin/rates/:id - Update rate
  app.put('/api/admin/rates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = z.object({
        displayName: z.string().min(2).max(80).optional(),
        unit: z.enum(["SFT", "COUNT", "LSUM"]).optional(),
        baseRateHandmade: z.number().min(0).optional(),
        baseRateFactory: z.number().min(0).optional(),
        category: z.enum([
          "Kitchen",
          "Living", 
          "Dining",
          "Master Bedroom",
          "Bedroom 2",
          "Bedroom 3",
          "Others",
          "FC"
        ]).optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional().nullable(),
      }).parse(req.body);
      
      const [updatedRate] = await db.update(rates)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(rates.id, id))
        .returning();
      
      if (!updatedRate) {
        return res.status(404).json({ message: "Rate not found" });
      }
      
      res.json(updatedRate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating rate:", error);
      res.status(500).json({ message: "Failed to update rate" });
    }
  });

  // PATCH /api/admin/rates/:id/active - Toggle active status
  app.patch('/api/admin/rates/:id/active', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isActive } = z.object({
        isActive: z.boolean()
      }).parse(req.body);
      
      const [updatedRate] = await db.update(rates)
        .set({ 
          isActive,
          updatedAt: new Date()
        })
        .where(eq(rates.id, id))
        .returning();
      
      if (!updatedRate) {
        return res.status(404).json({ message: "Rate not found" });
      }
      
      res.json(updatedRate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error toggling rate active status:", error);
      res.status(500).json({ message: "Failed to toggle active status" });
    }
  });

  // DELETE /api/admin/rates/:id - Soft delete (set isActive = false)
  app.delete('/api/admin/rates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const [deletedRate] = await db.update(rates)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(rates.id, id))
        .returning();
      
      if (!deletedRate) {
        return res.status(404).json({ message: "Rate not found" });
      }
      
      res.json(deletedRate);
    } catch (error) {
      console.error("Error deleting rate:", error);
      res.status(500).json({ message: "Failed to delete rate" });
    }
  });
}
