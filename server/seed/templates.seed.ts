import { db } from "../db";
import { templates } from "@shared/schema";
import { seedModern1BHK } from "./templates.modern-1bhk.seed";
import { seedModern2BHK } from "./templates.modern-2bhk.seed";
import { seedModern3BHK } from "./templates.modern-3bhk.seed";
import { seedCommercial } from "./templates.commercial.seed";

export async function seedTemplates() {
  // Template seeding disabled - users will create templates manually via admin panel
  console.log("Template seeding skipped (create templates manually via admin panel)");
  return;
}
