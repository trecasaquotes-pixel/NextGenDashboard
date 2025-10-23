import { db } from "../db";
import { paintingPacks, fcCatalog } from "@shared/schema";
import { count } from "drizzle-orm";

export async function seedPaintingFc() {
  // Check and seed painting packs
  const [packResult] = await db.select({ count: count() }).from(paintingPacks);
  const packCount = packResult?.count ?? 0;

  if (packCount === 0) {
    console.log("Seeding painting packs table...");

    const defaultPacks = [
      {
        name: "Tractor Emulsion",
        basePriceLsum: 35000,
        bulletsJson: JSON.stringify([
          "Touchup with Putti for walls.",
          "Two coats painting for complete walls.",
          "Door paintings are not included.",
        ]),
        bhkFactorBase: 3,
        perBedroomDelta: "0.10",
        showInQuote: true,
        isActive: true,
      },
      {
        name: "Premium",
        basePriceLsum: 50000,
        bulletsJson: JSON.stringify([
          "One coat Acrylic putty for all walls.",
          "Two coats painting for complete walls.",
          "Washroom doors and main door painting is included.",
        ]),
        bhkFactorBase: 3,
        perBedroomDelta: "0.10",
        showInQuote: true,
        isActive: true,
      },
      {
        name: "Royal Luxury Emulsion",
        basePriceLsum: 80000,
        bulletsJson: JSON.stringify([
          "2 coats Acrylic putty for complete walls.",
          "1 base coat for all walls.",
          "3 coats paint for all walls.",
          "Included for washroom walls, balcony and polish for main door.",
        ]),
        bhkFactorBase: 3,
        perBedroomDelta: "0.10",
        showInQuote: true,
        isActive: true,
      },
      {
        name: "Royal Shine",
        basePriceLsum: 90000,
        bulletsJson: JSON.stringify([
          "2 coats Acrylic putty for complete walls.",
          "1 base coat for all walls.",
          "3 coats paint for all walls.",
          "Included for washroom walls, balcony and polish for main door.",
        ]),
        bhkFactorBase: 3,
        perBedroomDelta: "0.10",
        showInQuote: true,
        isActive: true,
      },
      {
        name: "Royal Aspira",
        basePriceLsum: 100000,
        bulletsJson: JSON.stringify([
          "2 coats Acrylic putty for complete walls.",
          "1 base coat for all walls.",
          "3 coats paint for all walls.",
          "Included for washroom walls, balcony and PU polish for main door.",
        ]),
        bhkFactorBase: 3,
        perBedroomDelta: "0.10",
        showInQuote: true,
        isActive: true,
      },
    ];

    await db.insert(paintingPacks).values(defaultPacks);
    console.log(`Seeded ${defaultPacks.length} default painting packs.`);
  } else {
    console.log(`Painting packs table already has ${packCount} entries, skipping seed.`);
  }

  // Check and seed FC catalog
  const [fcResult] = await db.select({ count: count() }).from(fcCatalog);
  const fcCount = fcResult?.count ?? 0;

  if (fcCount === 0) {
    console.log("Seeding FC catalog table...");

    const defaultFcItems = [
      {
        key: "fc_paint",
        displayName: "False Ceiling Painting",
        unit: "LSUM",
        defaultValue: 0,
        ratePerUnit: 0,
        isActive: true,
      },
      {
        key: "fc_lights",
        displayName: "FC Lights (Downlights/Spots)",
        unit: "COUNT",
        defaultValue: 0,
        ratePerUnit: 0,
        isActive: true,
      },
      {
        key: "fc_fan_hook",
        displayName: "Fan Hook Rods",
        unit: "COUNT",
        defaultValue: 0,
        ratePerUnit: 0,
        isActive: true,
      },
      {
        key: "fc_cove_led",
        displayName: "Cove LED Strip",
        unit: "COUNT",
        defaultValue: 0,
        ratePerUnit: 0,
        isActive: true,
      },
    ];

    await db.insert(fcCatalog).values(defaultFcItems);
    console.log(`Seeded ${defaultFcItems.length} default FC catalog items.`);
  } else {
    console.log(`FC catalog table already has ${fcCount} entries, skipping seed.`);
  }
}
