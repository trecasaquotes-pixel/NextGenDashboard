import type { Express } from "express";
import { db } from "./db";
import { globalRules, insertGlobalRulesSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export function registerAdminGlobalRulesRoutes(app: Express, isAuthenticated: any) {
  
  // GET /api/admin/global-rules - Get global rules configuration
  app.get('/api/admin/global-rules', isAuthenticated, async (req: any, res) => {
    try {
      const [rules] = await db.select().from(globalRules).where(eq(globalRules.id, "global"));
      
      if (!rules) {
        // Return default values if not seeded yet
        return res.json({
          id: "global",
          buildTypeDefault: "handmade",
          gstPercent: 18,
          validityDays: 15,
          bedroomFactorBase: 3,
          perBedroomDelta: "0.10",
          paymentScheduleJson: JSON.stringify([
            { label: "Booking", percent: 10 },
            { label: "Site Measurement", percent: 50 },
            { label: "On Delivery", percent: 35 },
            { label: "After Installation", percent: 5 }
          ]),
          cityFactorsJson: JSON.stringify([
            { city: "Hyderabad", factor: 1.00 }
          ]),
          footerLine1: "TRECASA Design Studio | Luxury Interiors | Architecture | Build",
          footerLine2: "www.trecasadesignstudio.com | +91-XXXXXXXXXX",
        });
      }
      
      res.json(rules);
    } catch (error) {
      console.error("Error fetching global rules:", error);
      res.status(500).json({ message: "Failed to fetch global rules" });
    }
  });

  // PUT /api/admin/global-rules - Update global rules (upsert)
  app.put('/api/admin/global-rules', isAuthenticated, async (req: any, res) => {
    try {
      const bodyData = { ...req.body };
      
      // Transform arrays to JSON strings if needed
      if (Array.isArray(bodyData.paymentScheduleJson)) {
        bodyData.paymentScheduleJson = JSON.stringify(bodyData.paymentScheduleJson);
      }
      if (Array.isArray(bodyData.cityFactorsJson)) {
        bodyData.cityFactorsJson = JSON.stringify(bodyData.cityFactorsJson);
      }
      
      // Additional validation for payment schedule
      if (bodyData.paymentScheduleJson) {
        try {
          const schedule = JSON.parse(bodyData.paymentScheduleJson);
          const total = schedule.reduce((sum: number, item: any) => sum + (item.percent || 0), 0);
          
          if (Math.abs(total - 100) > 0.01) { // Allow small floating point errors
            return res.status(400).json({ 
              message: `Payment schedule must sum to 100% (currently ${total}%)` 
            });
          }
        } catch (e) {
          return res.status(400).json({ 
            message: "Invalid payment schedule JSON format" 
          });
        }
      }
      
      // Additional validation for city factors
      if (bodyData.cityFactorsJson) {
        try {
          const factors = JSON.parse(bodyData.cityFactorsJson);
          for (const item of factors) {
            if (!item.city || typeof item.city !== 'string') {
              return res.status(400).json({ message: "Each city factor must have a city name" });
            }
            if (typeof item.factor !== 'number' || item.factor < 0.8 || item.factor > 1.3) {
              return res.status(400).json({ 
                message: `City factor must be between 0.8 and 1.3 (got ${item.factor} for ${item.city})` 
              });
            }
          }
        } catch (e) {
          return res.status(400).json({ 
            message: "Invalid city factors JSON format" 
          });
        }
      }
      
      const validatedData = insertGlobalRulesSchema.parse(bodyData);
      
      // Upsert: try to update first, if no rows affected, insert
      const [existing] = await db.select().from(globalRules).where(eq(globalRules.id, "global"));
      
      let result;
      if (existing) {
        [result] = await db.update(globalRules)
          .set({
            ...validatedData,
            perBedroomDelta: String(validatedData.perBedroomDelta),
            updatedAt: new Date(),
          })
          .where(eq(globalRules.id, "global"))
          .returning();
      } else {
        [result] = await db.insert(globalRules)
          .values({
            id: "global",
            ...validatedData,
            perBedroomDelta: String(validatedData.perBedroomDelta),
          })
          .returning();
      }
      
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating global rules:", error);
      res.status(500).json({ message: "Failed to update global rules" });
    }
  });
}
