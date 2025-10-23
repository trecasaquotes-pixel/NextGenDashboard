import { db } from "../db";
import { templates } from "@shared/schema";
import { seedModern1BHK } from "./templates.modern-1bhk.seed";
import { seedModern2BHK } from "./templates.modern-2bhk.seed";
import { seedModern3BHK } from "./templates.modern-3bhk.seed";

export async function seedTemplates() {
  try {
    console.log("Seeding templates...");

    // Seed Modern 1BHK template (will skip if already exists)
    await seedModern1BHK();

    // Seed Modern 2BHK template (will skip if already exists)
    await seedModern2BHK();

    // Seed Modern 3BHK template (will skip if already exists)
    await seedModern3BHK();

    console.log("✅ All templates seeded successfully!");
  } catch (error) {
    console.error("Error seeding templates:", error);
    throw error;
  }
}
