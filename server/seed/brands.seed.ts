import { db } from "../db";
import { brands } from "@shared/schema";
import { count } from "drizzle-orm";

export async function seedBrands() {
  const [result] = await db.select({ count: count() }).from(brands);
  const brandCount = result?.count ?? 0;

  if (brandCount > 0) {
    console.log(`Brands table already has ${brandCount} entries, skipping seed.`);
    return;
  }

  console.log("Seeding brands table...");

  const defaultBrands = [
    // Core brands
    { type: "core", name: "Generic Ply", adderPerSft: 0, isDefault: true, isActive: true },
    { type: "core", name: "Century Ply", adderPerSft: 100, isDefault: false, isActive: true },
    { type: "core", name: "Greenply", adderPerSft: 100, isDefault: false, isActive: true },
    
    // Finish brands
    { type: "finish", name: "Generic Laminate (Nimmi)", adderPerSft: 0, isDefault: true, isActive: true },
    { type: "finish", name: "Merino", adderPerSft: 100, isDefault: false, isActive: true },
    { type: "finish", name: "Greenlam", adderPerSft: 100, isDefault: false, isActive: true },
    { type: "finish", name: "Acrylic", adderPerSft: 200, isDefault: false, isActive: true },
    
    // Hardware brands
    { type: "hardware", name: "Generic", adderPerSft: 0, isDefault: true, isActive: true },
    { type: "hardware", name: "Hettich", adderPerSft: 100, isDefault: false, isActive: true },
    { type: "hardware", name: "Häfele", adderPerSft: 100, isDefault: false, isActive: true },
    { type: "hardware", name: "Ebco", adderPerSft: 100, isDefault: false, isActive: true },
    { type: "hardware", name: "Sleek", adderPerSft: 100, isDefault: false, isActive: true },
  ];

  await db.insert(brands).values(defaultBrands);
  console.log(`Seeded ${defaultBrands.length} default brands.`);
}
