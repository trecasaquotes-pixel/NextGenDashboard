import { db } from "../db";
import { templates } from "@shared/schema";
import { seedModern1BHK } from "./templates.modern-1bhk.seed";

export async function seedTemplates() {
  try {
    console.log("Seeding templates...");

    // Seed Modern 1BHK template (will skip if already exists)
    await seedModern1BHK();

    console.log("✅ All templates seeded successfully!");
  } catch (error) {
    console.error("Error seeding templates:", error);
    throw error;
  }
}
