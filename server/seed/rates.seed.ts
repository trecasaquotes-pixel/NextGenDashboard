import { db } from "../db";
import { rates } from "@shared/schema";
import { sql } from "drizzle-orm";

interface DefaultRate {
  itemKey: string;
  displayName: string;
  unit: "SFT" | "COUNT" | "LSUM";
  baseRateHandmade: number;
  baseRateFactory: number;
  category: string;
}

const defaultRates: DefaultRate[] = [
  // Kitchen
  {
    itemKey: "base_unit",
    displayName: "Base Unit",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Kitchen",
  },
  {
    itemKey: "wall_unit",
    displayName: "Wall Unit",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Kitchen",
  },
  {
    itemKey: "loft_unit",
    displayName: "Loft Unit",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Kitchen",
  },
  {
    itemKey: "tall_unit",
    displayName: "Tall Unit",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Kitchen",
  },
  {
    itemKey: "appliance_unit",
    displayName: "Appliance Unit",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Kitchen",
  },
  {
    itemKey: "pantry_unit",
    displayName: "Pantry Unit",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Kitchen",
  },
  {
    itemKey: "utility_wall_storage",
    displayName: "Utility Wall Storage",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Kitchen",
  },
  {
    itemKey: "utility_tall_unit",
    displayName: "Utility Tall Unit",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Kitchen",
  },
  {
    itemKey: "tandem_drawer_set",
    displayName: "Tandem Drawer Set",
    unit: "COUNT",
    baseRateHandmade: 0,
    baseRateFactory: 0,
    category: "Kitchen",
  },
  {
    itemKey: "wicker_basket",
    displayName: "Wicker Basket",
    unit: "COUNT",
    baseRateHandmade: 0,
    baseRateFactory: 0,
    category: "Kitchen",
  },

  // Living Room
  {
    itemKey: "tv_base_unit",
    displayName: "TV Base Unit",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Living Room",
  },
  {
    itemKey: "tv_tall_unit_closed",
    displayName: "TV Tall Unit Closed",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Living Room",
  },
  {
    itemKey: "tv_open_display",
    displayName: "TV Open Display",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Living Room",
  },
  {
    itemKey: "crockery_bar_unit",
    displayName: "Crockery Bar Unit",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Living Room",
  },
  {
    itemKey: "decor_partition",
    displayName: "Decor Partition",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Living Room",
  },
  {
    itemKey: "wall_panel_highlight",
    displayName: "Wall Panel Highlight",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Living Room",
  },

  // Dining
  {
    itemKey: "crockery_base",
    displayName: "Crockery Base",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Dining",
  },
  {
    itemKey: "crockery_loft",
    displayName: "Crockery Loft",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Dining",
  },
  {
    itemKey: "crockery_wall_unit",
    displayName: "Crockery Wall Unit",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Dining",
  },
  {
    itemKey: "puja_base_unit",
    displayName: "Puja Base Unit",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Dining",
  },
  {
    itemKey: "puja_loft_unit",
    displayName: "Puja Loft Unit",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Dining",
  },
  {
    itemKey: "puja_doors",
    displayName: "Puja Doors",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Dining",
  },
  {
    itemKey: "puja_back_glass",
    displayName: "Puja Back Glass",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Dining",
  },
  {
    itemKey: "dining_wall_highlight",
    displayName: "Dining Wall Highlight",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Dining",
  },

  // Master Bedroom
  {
    itemKey: "wardrobe_swing",
    displayName: "Wardrobe Swing",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Master Bedroom",
  },
  {
    itemKey: "wardrobe_slide",
    displayName: "Wardrobe Slide",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Master Bedroom",
  },
  {
    itemKey: "wardrobe_loft",
    displayName: "Wardrobe Loft",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Master Bedroom",
  },
  {
    itemKey: "tv_base_unit_mb",
    displayName: "TV Base Unit MB",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Master Bedroom",
  },
  {
    itemKey: "tv_wall_panel_mb",
    displayName: "TV Wall Panel MB",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Master Bedroom",
  },
  {
    itemKey: "dresser_unit",
    displayName: "Dresser Unit",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Master Bedroom",
  },
  {
    itemKey: "mb_wall_highlight",
    displayName: "MB Wall Highlight",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Master Bedroom",
  },
  {
    itemKey: "side_tables",
    displayName: "Side Tables",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Master Bedroom",
  },

  // Bedroom 2
  {
    itemKey: "b2_wardrobe_swing",
    displayName: "B2 Wardrobe Swing",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Bedroom 2",
  },
  {
    itemKey: "b2_wardrobe_loft",
    displayName: "B2 Wardrobe Loft",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Bedroom 2",
  },
  {
    itemKey: "study_table",
    displayName: "Study Table",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Bedroom 2",
  },
  {
    itemKey: "overhead_storage",
    displayName: "Overhead Storage",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Bedroom 2",
  },
  {
    itemKey: "bookshelf_display",
    displayName: "Bookshelf Display",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Bedroom 2",
  },
  {
    itemKey: "b2_wall_highlight",
    displayName: "B2 Wall Highlight",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Bedroom 2",
  },

  // Bedroom 3
  {
    itemKey: "b3_wardrobe_swing",
    displayName: "B3 Wardrobe Swing",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Bedroom 3",
  },
  {
    itemKey: "b3_wardrobe_loft",
    displayName: "B3 Wardrobe Loft",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Bedroom 3",
  },
  {
    itemKey: "b3_tv_base_unit",
    displayName: "B3 TV Base Unit",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Bedroom 3",
  },
  {
    itemKey: "work_table_compact",
    displayName: "Work Table Compact",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Bedroom 3",
  },
  {
    itemKey: "b3_wall_highlight",
    displayName: "B3 Wall Highlight",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Bedroom 3",
  },

  // Others
  {
    itemKey: "vanity_unit",
    displayName: "Vanity Unit",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Others",
  },
  {
    itemKey: "vanity_mirror",
    displayName: "Vanity Mirror",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Others",
  },
  {
    itemKey: "shoe_rack",
    displayName: "Shoe Rack",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Others",
  },
  {
    itemKey: "main_door_paneling",
    displayName: "Main Door Paneling",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Others",
  },
  {
    itemKey: "puja_door_frame_architrave",
    displayName: "Puja Door Frame Architrave",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Others",
  },
  {
    itemKey: "foyer_console",
    displayName: "Foyer Console",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Others",
  },
  {
    itemKey: "foyer_corridor_panel",
    displayName: "Foyer Corridor Panel",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Others",
  },
  {
    itemKey: "mirror_wall_panel",
    displayName: "Mirror Wall Panel",
    unit: "SFT",
    baseRateHandmade: 1300,
    baseRateFactory: 1500,
    category: "Others",
  },
  {
    itemKey: "termite_treatment",
    displayName: "Termite Treatment",
    unit: "LSUM",
    baseRateHandmade: 0,
    baseRateFactory: 0,
    category: "Others",
  },
  {
    itemKey: "floor_matting",
    displayName: "Floor Matting",
    unit: "LSUM",
    baseRateHandmade: 0,
    baseRateFactory: 0,
    category: "Others",
  },
  {
    itemKey: "transportation_handling",
    displayName: "Transportation Handling",
    unit: "LSUM",
    baseRateHandmade: 0,
    baseRateFactory: 0,
    category: "Others",
  },

  // False Ceiling
  {
    itemKey: "fc_room",
    displayName: "FC Room",
    unit: "SFT",
    baseRateHandmade: 0,
    baseRateFactory: 0,
    category: "FC",
  },
  {
    itemKey: "fc_paint",
    displayName: "FC Paint",
    unit: "LSUM",
    baseRateHandmade: 0,
    baseRateFactory: 0,
    category: "FC",
  },
  {
    itemKey: "fc_lights",
    displayName: "FC Lights",
    unit: "COUNT",
    baseRateHandmade: 0,
    baseRateFactory: 0,
    category: "FC",
  },
  {
    itemKey: "fc_fan_hook",
    displayName: "FC Fan Hook",
    unit: "COUNT",
    baseRateHandmade: 0,
    baseRateFactory: 0,
    category: "FC",
  },
  {
    itemKey: "fc_cove_led",
    displayName: "FC Cove LED",
    unit: "COUNT",
    baseRateHandmade: 0,
    baseRateFactory: 0,
    category: "FC",
  },
];

export async function seedRates() {
  try {
    // Check if rates table has data
    const count = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count FROM rates`,
    );
    const rowCount = count.rows[0]?.count || 0;

    if (rowCount === 0) {
      console.log("Seeding default rates...");

      // Insert all default rates
      for (const rate of defaultRates) {
        await db.insert(rates).values({
          itemKey: rate.itemKey,
          displayName: rate.displayName,
          unit: rate.unit,
          baseRateHandmade: rate.baseRateHandmade,
          baseRateFactory: rate.baseRateFactory,
          category: rate.category,
          isActive: true,
        });
      }

      console.log(`✓ Seeded ${defaultRates.length} default rates`);
    } else {
      console.log(`Rates table already has ${rowCount} entries, skipping seed.`);
    }
  } catch (error) {
    console.error("Error seeding rates:", error);
    throw error;
  }
}
