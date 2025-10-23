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
    {
      type: "core",
      name: "Generic Ply",
      adderPerSft: 0,
      warrantyMonths: 12,
      warrantySummary:
        "12 months warranty against manufacturing defects, delamination, and borer attack under normal usage",
      isDefault: true,
      isActive: true,
    },
    {
      type: "core",
      name: "Century Ply",
      adderPerSft: 100,
      warrantyMonths: 24,
      warrantySummary:
        "24 months warranty against borer and termite attack, delamination, and manufacturing defects",
      isDefault: false,
      isActive: true,
    },
    {
      type: "core",
      name: "Greenply",
      adderPerSft: 100,
      warrantyMonths: 24,
      warrantySummary:
        "24 months warranty against borer attack, delamination, and manufacturing defects",
      isDefault: false,
      isActive: true,
    },

    // Finish brands
    {
      type: "finish",
      name: "Generic Laminate (Nimmi)",
      adderPerSft: 0,
      warrantyMonths: 6,
      warrantySummary:
        "6 months warranty against peeling, fading, and surface defects under normal usage",
      isDefault: true,
      isActive: true,
    },
    {
      type: "finish",
      name: "Merino",
      adderPerSft: 100,
      warrantyMonths: 12,
      warrantySummary:
        "12 months warranty against peeling, color fading, and manufacturing defects",
      isDefault: false,
      isActive: true,
    },
    {
      type: "finish",
      name: "Greenlam",
      adderPerSft: 100,
      warrantyMonths: 12,
      warrantySummary: "12 months warranty against surface defects, peeling, and color fading",
      isDefault: false,
      isActive: true,
    },
    {
      type: "finish",
      name: "Acrylic",
      adderPerSft: 200,
      warrantyMonths: 18,
      warrantySummary:
        "18 months warranty against yellowing, surface cracks, and manufacturing defects",
      isDefault: false,
      isActive: true,
    },

    // Hardware brands
    {
      type: "hardware",
      name: "Generic",
      adderPerSft: 0,
      warrantyMonths: 12,
      warrantySummary: "12 months warranty against mechanical failure and manufacturing defects",
      isDefault: true,
      isActive: true,
    },
    {
      type: "hardware",
      name: "Hettich",
      adderPerSft: 100,
      warrantyMonths: 24,
      warrantySummary:
        "24 months warranty against mechanical failure, rust, and manufacturing defects",
      isDefault: false,
      isActive: true,
    },
    {
      type: "hardware",
      name: "Häfele",
      adderPerSft: 100,
      warrantyMonths: 24,
      warrantySummary:
        "24 months warranty against mechanical failure, corrosion, and manufacturing defects",
      isDefault: false,
      isActive: true,
    },
    {
      type: "hardware",
      name: "Ebco",
      adderPerSft: 100,
      warrantyMonths: 18,
      warrantySummary: "18 months warranty against mechanical failure and manufacturing defects",
      isDefault: false,
      isActive: true,
    },
    {
      type: "hardware",
      name: "Sleek",
      adderPerSft: 100,
      warrantyMonths: 18,
      warrantySummary:
        "18 months warranty against mechanical failure, rust, and manufacturing defects",
      isDefault: false,
      isActive: true,
    },
  ];

  await db.insert(brands).values(defaultBrands);
  console.log(`Seeded ${defaultBrands.length} default brands.`);
}
