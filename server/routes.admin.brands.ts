import type { Express } from "express";
import { db } from "./db";
import { brands, insertBrandSchema } from "@shared/schema";
import { eq, sql, and, or, like } from "drizzle-orm";
import { z } from "zod";
import { getAdminUser, logAudit, createBrandSummary } from "./lib/audit";

export function registerAdminBrandsRoutes(app: Express, isAuthenticated: any) {
  
  // GET /api/admin/brands - List brands with optional filters
  app.get('/api/admin/brands', isAuthenticated, async (req: any, res) => {
    try {
      const { q, type, active } = req.query;
      
      let conditions = [];
      
      // Search filter
      if (q) {
        const searchTerm = `%${q}%`;
        conditions.push(like(brands.name, searchTerm));
      }
      
      // Type filter
      if (type) {
        conditions.push(eq(brands.type, type as string));
      }
      
      // Active filter
      if (active !== undefined) {
        const isActive = active === '1' || active === 'true';
        conditions.push(eq(brands.isActive, isActive));
      }
      
      const result = conditions.length > 0
        ? await db.select().from(brands).where(and(...conditions)).orderBy(brands.type, brands.name)
        : await db.select().from(brands).orderBy(brands.type, brands.name);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching brands:", error);
      res.status(500).json({ message: "Failed to fetch brands" });
    }
  });

  // POST /api/admin/brands - Create new brand
  app.post('/api/admin/brands', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertBrandSchema.parse(req.body);
      
      // Check for duplicate name within same type (case-insensitive)
      const [existing] = await db.select().from(brands).where(
        and(
          eq(brands.type, validatedData.type),
          sql`LOWER(${brands.name}) = LOWER(${validatedData.name})`
        )
      );
      
      if (existing) {
        return res.status(400).json({ 
          message: `Brand '${validatedData.name}' already exists for type '${validatedData.type}'` 
        });
      }
      
      // If this brand is set as default, unset all other defaults of the same type
      if (validatedData.isDefault) {
        await db.update(brands)
          .set({ isDefault: false })
          .where(eq(brands.type, validatedData.type));
      }
      
      const [newBrand] = await db.insert(brands)
        .values({
          ...validatedData,
          isActive: validatedData.isActive ?? true,
        })
        .returning();
      
      // Log audit
      const adminUser = getAdminUser(req);
      await logAudit({
        ...adminUser,
        section: "Brands",
        action: "CREATE",
        targetId: newBrand.id,
        summary: createBrandSummary("CREATE", null, newBrand),
        afterJson: newBrand,
      });
      
      res.status(201).json(newBrand);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating brand:", error);
      res.status(500).json({ message: "Failed to create brand" });
    }
  });

  // PUT /api/admin/brands/:id - Update brand
  app.put('/api/admin/brands/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = z.object({
        name: z.string().min(2).max(60).optional(),
        adderPerSft: z.number().int().min(0).optional(),
        warrantyMonths: z.number().int().min(0).max(120).optional(),
        warrantySummary: z.string().max(200).optional().nullable(),
        isActive: z.boolean().optional(),
      }).parse(req.body);
      
      const [existingBrand] = await db.select().from(brands).where(eq(brands.id, id));
      if (!existingBrand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      // Check for duplicate name within same type if name is being updated
      if (updateData.name && updateData.name !== existingBrand.name) {
        const [duplicate] = await db.select().from(brands).where(
          and(
            eq(brands.type, existingBrand.type),
            sql`LOWER(${brands.name}) = LOWER(${updateData.name})`,
            sql`${brands.id} != ${id}`
          )
        );
        
        if (duplicate) {
          return res.status(400).json({ 
            message: `Brand '${updateData.name}' already exists for type '${existingBrand.type}'` 
          });
        }
      }
      
      const [updatedBrand] = await db.update(brands)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(brands.id, id))
        .returning();
      
      // Log audit
      const adminUser = getAdminUser(req);
      await logAudit({
        ...adminUser,
        section: "Brands",
        action: "UPDATE",
        targetId: id,
        summary: createBrandSummary("UPDATE", existingBrand, updatedBrand),
        beforeJson: existingBrand,
        afterJson: updatedBrand,
      });
      
      res.json(updatedBrand);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating brand:", error);
      res.status(500).json({ message: "Failed to update brand" });
    }
  });

  // PATCH /api/admin/brands/:id/default - Set brand as default for its type
  app.patch('/api/admin/brands/:id/default', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const [existingBrand] = await db.select().from(brands).where(eq(brands.id, id));
      if (!existingBrand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      // Unset all other defaults of the same type
      await db.update(brands)
        .set({ isDefault: false })
        .where(eq(brands.type, existingBrand.type));
      
      // Set this brand as default
      const [updatedBrand] = await db.update(brands)
        .set({ 
          isDefault: true,
          updatedAt: new Date(),
        })
        .where(eq(brands.id, id))
        .returning();
      
      res.json(updatedBrand);
    } catch (error) {
      console.error("Error setting default brand:", error);
      res.status(500).json({ message: "Failed to set default brand" });
    }
  });

  // PATCH /api/admin/brands/:id/active - Toggle active status
  app.patch('/api/admin/brands/:id/active', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
      
      const [existingBrand] = await db.select().from(brands).where(eq(brands.id, id));
      if (!existingBrand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      // Prevent deactivating the default brand
      if (existingBrand.isDefault && !isActive) {
        return res.status(400).json({ 
          message: "Cannot deactivate the default brand. Please set another brand as default first." 
        });
      }
      
      const [updatedBrand] = await db.update(brands)
        .set({ 
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(brands.id, id))
        .returning();
      
      res.json(updatedBrand);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error toggling brand active status:", error);
      res.status(500).json({ message: "Failed to toggle brand active status" });
    }
  });

  // DELETE /api/admin/brands/:id - Soft delete brand
  app.delete('/api/admin/brands/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const [existingBrand] = await db.select().from(brands).where(eq(brands.id, id));
      if (!existingBrand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      // Prevent deleting the default brand
      if (existingBrand.isDefault) {
        return res.status(400).json({ 
          message: "Cannot delete the default brand. Please set another brand as default first." 
        });
      }
      
      // Soft delete by setting isActive to false
      const [deletedBrand] = await db.update(brands)
        .set({ 
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(brands.id, id))
        .returning();
      
      // Log audit
      const adminUser = getAdminUser(req);
      await logAudit({
        ...adminUser,
        section: "Brands",
        action: "DELETE",
        targetId: id,
        summary: createBrandSummary("DELETE", existingBrand, deletedBrand),
        beforeJson: existingBrand,
        afterJson: deletedBrand,
      });
      
      res.json({ message: "Brand deleted successfully" });
    } catch (error) {
      console.error("Error deleting brand:", error);
      res.status(500).json({ message: "Failed to delete brand" });
    }
  });
}
