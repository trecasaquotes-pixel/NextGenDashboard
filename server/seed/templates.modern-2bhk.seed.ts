import { db } from "../db";
import { templates, templateRooms, templateItems } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedModern2BHK() {
  try {
    // Check if Modern 2BHK template already exists
    const existingTemplate = await db
      .select()
      .from(templates)
      .where(eq(templates.name, "Modern 2BHK"))
      .limit(1);

    if (existingTemplate.length > 0) {
      console.log("Modern 2BHK template already exists, skipping seed.");
      return;
    }

    console.log("Seeding Modern 2BHK template...");

    // Create template
    const [template] = await db
      .insert(templates)
      .values({
        name: "Modern 2BHK",
        category: "Residential 2BHK",
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
          { itemKey: "tv_unit_base", displayName: "TV Unit Base", unit: "SFT", sortOrder: 1 },
          { itemKey: "tv_unit_tall", displayName: "TV Unit Tall", unit: "SFT", sortOrder: 2 },
          { itemKey: "tv_unit_open", displayName: "TV Unit Open Display", unit: "SFT", sortOrder: 3 },
          { itemKey: "crockery_bar_unit", displayName: "Crockery / Bar Unit", unit: "SFT", sortOrder: 4 },
          { itemKey: "wall_paneling", displayName: "Wall Paneling", unit: "SFT", sortOrder: 5, isWallHighlightOrPanel: true },
        ],
      },
      // 3. Dining
      {
        name: "Dining",
        sortOrder: 3,
        items: [
          { itemKey: "crockery_base", displayName: "Crockery Base", unit: "SFT", sortOrder: 1 },
          { itemKey: "crockery_loft", displayName: "Crockery Loft", unit: "SFT", sortOrder: 2 },
          { itemKey: "crockery_wall_unit", displayName: "Crockery Wall Unit", unit: "SFT", sortOrder: 3 },
          { itemKey: "crockery_tall", displayName: "Crockery Tall Unit", unit: "SFT", sortOrder: 4 },
          { itemKey: "display_open_unit", displayName: "Display Open Unit", unit: "SFT", sortOrder: 5 },
          { itemKey: "bar_unit", displayName: "Bar Unit", unit: "SFT", sortOrder: 6 },
        ],
      },
      // 4. Master Bedroom
      {
        name: "Master Bedroom",
        sortOrder: 4,
        items: [
          { itemKey: "wardrobe_swing", displayName: "Wardrobe (Swing)", unit: "SFT", sortOrder: 1 },
          { itemKey: "wardrobe_sliding", displayName: "Wardrobe (Sliding)", unit: "SFT", sortOrder: 2 },
          { itemKey: "wardrobe_loft", displayName: "Wardrobe Loft", unit: "SFT", sortOrder: 3 },
          { itemKey: "dresser_unit", displayName: "Dresser Unit", unit: "SFT", sortOrder: 4 },
          { itemKey: "study_table", displayName: "Study Table", unit: "SFT", sortOrder: 5 },
          { itemKey: "tv_unit_bedroom", displayName: "TV Unit (Bedroom)", unit: "SFT", sortOrder: 6 },
          { itemKey: "side_table", displayName: "Side Table", unit: "SFT", sortOrder: 7 },
          { itemKey: "headboard", displayName: "Headboard", unit: "SFT", sortOrder: 8 },
          { itemKey: "bed_storage", displayName: "Bed Storage", unit: "SFT", sortOrder: 9 },
          { itemKey: "mirror_frame", displayName: "Mirror Frame", unit: "SFT", sortOrder: 10 },
          { itemKey: "wall_panel_bedroom", displayName: "Wall Panel (Bedroom)", unit: "SFT", sortOrder: 11, isWallHighlightOrPanel: true },
        ],
      },
      // 5. Bedroom 2
      {
        name: "Bedroom 2",
        sortOrder: 5,
        items: [
          { itemKey: "wardrobe_swing", displayName: "Wardrobe (Swing)", unit: "SFT", sortOrder: 1 },
          { itemKey: "wardrobe_sliding", displayName: "Wardrobe (Sliding)", unit: "SFT", sortOrder: 2 },
          { itemKey: "wardrobe_loft", displayName: "Wardrobe Loft", unit: "SFT", sortOrder: 3 },
          { itemKey: "study_table", displayName: "Study Table", unit: "SFT", sortOrder: 4 },
          { itemKey: "side_table", displayName: "Side Table", unit: "SFT", sortOrder: 5 },
          { itemKey: "headboard", displayName: "Headboard", unit: "SFT", sortOrder: 6 },
          { itemKey: "bed_storage", displayName: "Bed Storage", unit: "SFT", sortOrder: 7 },
          { itemKey: "wall_panel_bedroom", displayName: "Wall Panel (Bedroom)", unit: "SFT", sortOrder: 8, isWallHighlightOrPanel: true },
        ],
      },
      // 6. Bathroom 1
      {
        name: "Bathroom 1",
        sortOrder: 6,
        items: [
          { itemKey: "vanity_unit", displayName: "Vanity Unit", unit: "SFT", sortOrder: 1 },
        ],
      },
      // 7. Bathroom 2
      {
        name: "Bathroom 2",
        sortOrder: 7,
        items: [
          { itemKey: "vanity_unit", displayName: "Vanity Unit", unit: "SFT", sortOrder: 1 },
        ],
      },
      // 8. Puja Room
      {
        name: "Puja Room",
        sortOrder: 8,
        items: [
          { itemKey: "puja_base_unit", displayName: "Puja Base Unit", unit: "SFT", sortOrder: 1 },
          { itemKey: "puja_wall_unit", displayName: "Puja Wall Unit", unit: "SFT", sortOrder: 2 },
          { itemKey: "puja_jhula", displayName: "Puja Jhula", unit: "SFT", sortOrder: 3 },
          { itemKey: "puja_drawer_unit", displayName: "Puja Drawer Unit", unit: "SFT", sortOrder: 4 },
        ],
      },
      // 9. Utility / Service Area
      {
        name: "Utility / Service Area",
        sortOrder: 9,
        items: [
          { itemKey: "utility_storage", displayName: "Utility Storage", unit: "SFT", sortOrder: 1 },
          { itemKey: "utility_wall_storage", displayName: "Utility Wall Storage", unit: "SFT", sortOrder: 2 },
          { itemKey: "utility_tall_unit", displayName: "Utility Tall Unit", unit: "SFT", sortOrder: 3 },
          { itemKey: "washing_machine_box", displayName: "Washing Machine Box", unit: "SFT", sortOrder: 4 },
        ],
      },
      // 10. Foyer/Entry
      {
        name: "Foyer/Entry",
        sortOrder: 10,
        items: [
          { itemKey: "foyer_shoe_rack", displayName: "Shoe Rack", unit: "SFT", sortOrder: 1 },
        ],
      },
      // 11. Balcony
      {
        name: "Balcony",
        sortOrder: 11,
        items: [
          { itemKey: "bench_seating", displayName: "Bench/Seating", unit: "SFT", sortOrder: 1 },
        ],
      },
      // 12. Storage / Miscellaneous
      {
        name: "Storage / Miscellaneous",
        sortOrder: 12,
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
      // FALSE CEILING ROOMS (isFcRoom: true)
      // 13. Kitchen (FC)
      {
        name: "Kitchen",
        sortOrder: 13,
        isFcRoom: true,
        items: [], // FC rooms don't have items - they have area-based calculations
      },
      // 14. Living Room (FC)
      {
        name: "Living Room",
        sortOrder: 14,
        isFcRoom: true,
        items: [],
      },
      // 15. Master Bedroom (FC)
      {
        name: "Master Bedroom",
        sortOrder: 15,
        isFcRoom: true,
        items: [],
      },
      // 16. Bedroom 2 (FC)
      {
        name: "Bedroom 2",
        sortOrder: 16,
        isFcRoom: true,
        items: [],
      },
      // 17. Bathroom 1 (FC)
      {
        name: "Bathroom 1",
        sortOrder: 17,
        isFcRoom: true,
        items: [],
      },
      // 18. Bathroom 2 (FC)
      {
        name: "Bathroom 2",
        sortOrder: 18,
        isFcRoom: true,
        items: [],
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
          isFcRoom: roomData.isFcRoom || false,
        })
        .returning();

      if (roomData.items && roomData.items.length > 0) {
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

    console.log("✅ Modern 2BHK template seeded successfully!");
  } catch (error) {
    console.error("Error seeding Modern 2BHK template:", error);
    throw error;
  }
}
