import { db } from "../db";
import { globalRules } from "@shared/schema";
import { count } from "drizzle-orm";

export async function seedGlobalRules() {
  const [result] = await db.select({ count: count() }).from(globalRules);
  const rulesCount = result?.count ?? 0;

  if (rulesCount === 0) {
    console.log("Seeding global rules table...");

    const defaultRules = {
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
    };

    await db.insert(globalRules).values(defaultRules);
    console.log("Seeded global rules with default configuration.");
  } else {
    console.log(`Global rules table already has ${rulesCount} entries, skipping seed.`);
  }
}
