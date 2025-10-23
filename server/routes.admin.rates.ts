import type { Express } from "express";
import { db } from "./db";
import { rates, insertRateSchema } from "@shared/schema";
import { eq, sql, and, or, like } from "drizzle-orm";
import { z } from "zod";
import { getAdminUser, logAudit, createRateSummary } from "./lib/audit";

// Unit guardrail validation
function validateUnitForItemKey(itemKey: string, unit: string): { valid: boolean; error?: string } {
  const lsumOnly = ["termite_treatment", "floor_matting", "transportation_handling", "fc_paint"];
  const countOnly = ["fc_lights", "fc_fan_hook", "fc_cove_led"];

  if (lsumOnly.includes(itemKey) && unit !== "LSUM") {
    return { valid: false, error: `Item '${itemKey}' must use LSUM unit` };
  }

  if (countOnly.includes(itemKey) && unit !== "COUNT") {
    return { valid: false, error: `Item '${itemKey}' must use COUNT unit` };
  }

  return { valid: true };
}

export function registerAdminRatesRoutes(app: Express, isAuthenticated: any) {
  // GET /api/admin/rates - List rates with optional filters
  app.get("/api/admin/rates", isAuthenticated, async (req: any, res) => {
    try {
      const { q, unit, category, active } = req.query;

      let conditions = [];

      // Search filter
      if (q) {
        const searchTerm = `%${q}%`;
        conditions.push(or(like(rates.displayName, searchTerm), like(rates.itemKey, searchTerm)));
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
        const isActive = active === "1" || active === "true";
        conditions.push(eq(rates.isActive, isActive));
      }

      const result =
        conditions.length > 0
          ? await db
              .select()
              .from(rates)
              .where(and(...conditions))
              .orderBy(rates.category, rates.displayName)
          : await db.select().from(rates).orderBy(rates.category, rates.displayName);

      res.json(result);
    } catch (error) {
      console.error("Error fetching rates:", error);
      res.status(500).json({ message: "Failed to fetch rates" });
    }
  });

  // POST /api/admin/rates - Create new rate
  app.post("/api/admin/rates", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertRateSchema.parse(req.body);

      // Validate unit guardrails
      const unitValidation = validateUnitForItemKey(validatedData.itemKey, validatedData.unit);
      if (!unitValidation.valid) {
        return res.status(400).json({ message: unitValidation.error });
      }

      const [newRate] = await db
        .insert(rates)
        .values({
          ...validatedData,
          isActive: validatedData.isActive ?? true,
        })
        .returning();

      // Log audit
      const adminUser = getAdminUser(req);
      await logAudit({
        ...adminUser,
        section: "Rates",
        action: "CREATE",
        targetId: newRate.id,
        summary: createRateSummary("CREATE", null, newRate),
        afterJson: newRate,
      });

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
  app.put("/api/admin/rates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = z
        .object({
          displayName: z.string().min(2).max(80).optional(),
          unit: z.enum(["SFT", "COUNT", "LSUM"]).optional(),
          baseRateHandmade: z.number().min(0).optional(),
          baseRateFactory: z.number().min(0).optional(),
          category: z
            .enum([
              "Kitchen",
              "Living",
              "Dining",
              "Master Bedroom",
              "Bedroom 2",
              "Bedroom 3",
              "Others",
              "FC",
            ])
            .optional(),
          isActive: z.boolean().optional(),
          notes: z.string().optional().nullable(),
        })
        .parse(req.body);

      // Fetch existing rate for validation and audit
      const [existingRate] = await db.select().from(rates).where(eq(rates.id, id));
      if (!existingRate) {
        return res.status(404).json({ message: "Rate not found" });
      }

      // If unit is being updated, validate against itemKey
      if (updateData.unit) {
        const unitValidation = validateUnitForItemKey(existingRate.itemKey, updateData.unit);
        if (!unitValidation.valid) {
          return res.status(400).json({ message: unitValidation.error });
        }
      }

      const [updatedRate] = await db
        .update(rates)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(rates.id, id))
        .returning();

      if (!updatedRate) {
        return res.status(404).json({ message: "Rate not found" });
      }

      // Log audit
      const adminUser = getAdminUser(req);
      await logAudit({
        ...adminUser,
        section: "Rates",
        action: "UPDATE",
        targetId: id,
        summary: createRateSummary("UPDATE", existingRate, updatedRate),
        beforeJson: existingRate,
        afterJson: updatedRate,
      });

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
  app.patch("/api/admin/rates/:id/active", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isActive } = z
        .object({
          isActive: z.boolean(),
        })
        .parse(req.body);

      // Fetch existing rate for audit
      const [existingRate] = await db.select().from(rates).where(eq(rates.id, id));
      if (!existingRate) {
        return res.status(404).json({ message: "Rate not found" });
      }

      const [updatedRate] = await db
        .update(rates)
        .set({
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(rates.id, id))
        .returning();

      if (!updatedRate) {
        return res.status(404).json({ message: "Rate not found" });
      }

      // Log audit
      const adminUser = getAdminUser(req);
      const action = isActive ? "UPDATE" : "DELETE";
      await logAudit({
        ...adminUser,
        section: "Rates",
        action,
        targetId: id,
        summary: createRateSummary(action, existingRate, updatedRate),
        beforeJson: existingRate,
        afterJson: updatedRate,
      });

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
  app.delete("/api/admin/rates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Fetch existing rate for audit
      const [existingRate] = await db.select().from(rates).where(eq(rates.id, id));
      if (!existingRate) {
        return res.status(404).json({ message: "Rate not found" });
      }

      const [deletedRate] = await db
        .update(rates)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(rates.id, id))
        .returning();

      if (!deletedRate) {
        return res.status(404).json({ message: "Rate not found" });
      }

      // Log audit
      const adminUser = getAdminUser(req);
      await logAudit({
        ...adminUser,
        section: "Rates",
        action: "DELETE",
        targetId: id,
        summary: createRateSummary("DELETE", existingRate, deletedRate),
        beforeJson: existingRate,
        afterJson: deletedRate,
      });

      res.json(deletedRate);
    } catch (error) {
      console.error("Error deleting rate:", error);
      res.status(500).json({ message: "Failed to delete rate" });
    }
  });
}
