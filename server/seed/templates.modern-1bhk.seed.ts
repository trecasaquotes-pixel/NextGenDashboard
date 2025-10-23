import { db } from "../db";
import { templates, templateRooms, templateItems } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedModern1BHK() {
  try {
    // Check if Modern 1BHK template already exists
    const existingTemplate = await db
      .select()
      .from(templates)
      .where(eq(templates.name, "Modern 1BHK"))
      .limit(1);

    if (existingTemplate.length > 0) {
      console.log("Modern 1BHK template already exists, skipping seed.");
      return;
    }

    console.log("Seeding Modern 1BHK template...");

    // Create template
    const [template] = await db
      .insert(templates)
      .values({
        name: "Modern 1BHK",
        category: "Residential 1BHK",
        isActive: true,
      })
      .returning();

    // Define rooms with items in correct order
    const roomsData = [
      // 1. Kitchen
      {
        name: "Kitchen",
        sortOrder: 1,
        items: [
          { itemKey: "base_unit", displayName: "Base Unit", unit: "SFT", sortOrder: 1 },
          { itemKey: "wall_unit", displayName: "Wall Unit", unit: "SFT", sortOrder: 2 },
          { itemKey: "loft_unit", displayName: "Loft Unit", unit: "SFT", sortOrder: 3 },
          { itemKey: "tall_unit_roller", displayName: "Tall Unit (Roller Shutter)", unit: "SFT", sortOrder: 4 },
          { itemKey: "tall_unit_no_roller", displayName: "Tall Unit (No Roller Shutter)", unit: "SFT", sortOrder: 5 },
          { itemKey: "third_floor_kitchen", displayName: "3rd floor kitchen base and wall unit", unit: "SFT", sortOrder: 6 },
          { itemKey: "appliance_unit", displayName: "Appliance Unit", unit: "SFT", sortOrder: 7 },
          { itemKey: "pantry_unit_shelves", displayName: "Pantry Unit with Shelves", unit: "SFT", sortOrder: 8 },
          { itemKey: "pantry_unit_drawers", displayName: "Pantry Unit with Drawers", unit: "SFT", sortOrder: 9 },
          { itemKey: "refrigerator_box", displayName: "Refrigerator Box", unit: "SFT", sortOrder: 10 },
          { itemKey: "wicker_basket", displayName: "Wicker Basket", unit: "COUNT", sortOrder: 11 },
          { itemKey: "tandem_drawer_set", displayName: "Tandem Drawer Set", unit: "COUNT", sortOrder: 12 },
        ],
      },
      // 2. Living Room
      {
        name: "Living Room",
        sortOrder: 2,
        items: [
          { itemKey: "tv_unit_base", displayName: "TV Unit – Base", unit: "SFT", sortOrder: 1 },
          { itemKey: "tv_unit_tall_open", displayName: "TV Unit – Tall Unit (Open)", unit: "SFT", sortOrder: 2 },
          { itemKey: "tv_unit_tall_closed", displayName: "TV Unit – Tall Unit (Closed)", unit: "SFT", sortOrder: 3 },
          { itemKey: "tv_unit_back_panel", displayName: "TV Unit – Back Panel", unit: "SFT", sortOrder: 4, isWallHighlightOrPanel: true },
          { itemKey: "tv_unit_wall_highlights", displayName: "TV Unit – Wall Highlights", unit: "SFT", sortOrder: 5, isWallHighlightOrPanel: true },
        ],
      },
      // 3. Dining
      {
        name: "Dining",
        sortOrder: 3,
        items: [
          { itemKey: "partition", displayName: "Partition (PVD / Wood & Glass / Full Wooden)", unit: "SFT", sortOrder: 1 },
          { itemKey: "window_seating", displayName: "Window Seating", unit: "SFT", sortOrder: 2 },
          { itemKey: "window_seating_2", displayName: "Window Seating 2", unit: "SFT", sortOrder: 3 },
          { itemKey: "crockery_base_unit", displayName: "Crockery Base Unit", unit: "SFT", sortOrder: 4 },
          { itemKey: "crockery_loft_unit", displayName: "Crockery Loft Unit", unit: "SFT", sortOrder: 5 },
          { itemKey: "crockery_wall_unit", displayName: "Crockery Wall Unit", unit: "SFT", sortOrder: 6 },
        ],
      },
      // 4. Master Bedroom
      {
        name: "Master Bedroom",
        sortOrder: 4,
        items: [
          { itemKey: "wardrobe_swing", displayName: "Wardrobe – Swing Shutters", unit: "SFT", sortOrder: 1 },
          { itemKey: "wardrobe_sliding", displayName: "Wardrobe – Sliding Doors", unit: "SFT", sortOrder: 2 },
          { itemKey: "wardrobe_loft", displayName: "Wardrobe – Loft", unit: "SFT", sortOrder: 3 },
          { itemKey: "dresser_base", displayName: "Dresser Base (No Mirror)", unit: "SFT", sortOrder: 4 },
          { itemKey: "dresser_tall_unit", displayName: "Dresser Tall Unit", unit: "SFT", sortOrder: 5 },
          { itemKey: "bed_headboard", displayName: "Bed Headboard", unit: "SFT", sortOrder: 6 },
          { itemKey: "custom_bed", displayName: "Custom Bed", unit: "SFT", sortOrder: 7 },
          { itemKey: "study_unit", displayName: "Study Unit", unit: "SFT", sortOrder: 8 },
          { itemKey: "study_table", displayName: "Study Table", unit: "SFT", sortOrder: 9 },
          { itemKey: "vanity", displayName: "Vanity", unit: "SFT", sortOrder: 10 },
          { itemKey: "shoe_rack", displayName: "Shoe Rack", unit: "SFT", sortOrder: 11 },
        ],
      },
      // 5. Bathroom
      {
        name: "Bathroom",
        sortOrder: 5,
        items: [
          { itemKey: "vanity_with_mirror", displayName: "Vanity with Mirror", unit: "LSUM", sortOrder: 1 },
        ],
      },
      // 6. Puja Room
      {
        name: "Puja Room",
        sortOrder: 6,
        items: [
          { itemKey: "puja_box", displayName: "Puja Box", unit: "SFT", sortOrder: 1 },
          { itemKey: "puja_base", displayName: "Puja Base", unit: "SFT", sortOrder: 2 },
          { itemKey: "puja_back_panel", displayName: "Puja Back Panel", unit: "SFT", sortOrder: 3 },
          { itemKey: "puja_doors", displayName: "Puja Doors", unit: "SFT", sortOrder: 4 },
        ],
      },
      // 7. Utility / Service Area
      {
        name: "Utility / Service Area",
        sortOrder: 7,
        items: [
          { itemKey: "utility_base_unit", displayName: "Utility Base Unit", unit: "SFT", sortOrder: 1 },
          { itemKey: "utility_tall_unit", displayName: "Utility Tall Unit", unit: "SFT", sortOrder: 2 },
          { itemKey: "laundry_pullout", displayName: "Laundry Pullout", unit: "SFT", sortOrder: 3 },
          { itemKey: "overhead_storage", displayName: "Overhead Storage", unit: "SFT", sortOrder: 4 },
        ],
      },
      // 8. Foyer/Entry
      {
        name: "Foyer/Entry",
        sortOrder: 8,
        items: [
          { itemKey: "foyer_shoe_rack", displayName: "Shoe Rack", unit: "SFT", sortOrder: 1 },
        ],
      },
      // 9. Balcony
      {
        name: "Balcony",
        sortOrder: 9,
        items: [
          { itemKey: "bench_seating", displayName: "Bench/Seating", unit: "SFT", sortOrder: 1 },
        ],
      },
      // 10. Storage / Miscellaneous
      {
        name: "Storage / Miscellaneous",
        sortOrder: 10,
        items: [
          { itemKey: "staircase_storage", displayName: "Staircase Storage", unit: "SFT", sortOrder: 1 },
          { itemKey: "office_storage", displayName: "Office Storage", unit: "SFT", sortOrder: 2 },
          { itemKey: "book_shelf", displayName: "Book Shelf", unit: "SFT", sortOrder: 3 },
          { itemKey: "floor_matting", displayName: "Floor Matting", unit: "LSUM", sortOrder: 4 },
          { itemKey: "transportation", displayName: "Transportation", unit: "LSUM", sortOrder: 5 },
          { itemKey: "termite_treatment", displayName: "Termite Treatment", unit: "LSUM", sortOrder: 6 },
          { itemKey: "main_door_panel", displayName: "Main Door Panel", unit: "SFT", sortOrder: 7 },
        ],
      },
    ];

    // Insert rooms and items
    for (const roomData of roomsData) {
      const [room] = await db
        .insert(templateRooms)
        .values({
          templateId: template.id,
          roomName: roomData.name,
          sortOrder: roomData.sortOrder,
        })
        .returning();

      if (roomData.items.length > 0) {
        await db.insert(templateItems).values(
          roomData.items.map((item) => ({
            templateRoomId: room.id,
            itemKey: item.itemKey,
            displayName: item.displayName,
            unit: item.unit,
            isWallHighlightOrPanel: item.isWallHighlightOrPanel || false,
            sortOrder: item.sortOrder,
          })),
        );
      }
    }

    console.log("✅ Modern 1BHK template seeded successfully!");
  } catch (error) {
    console.error("Error seeding Modern 1BHK template:", error);
    throw error;
  }
}
