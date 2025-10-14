import { db } from "../db";
import { templates, templateRooms, templateItems } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedTemplates() {
  try {
    // Check if templates already exist
    const existingTemplates = await db.select().from(templates);
    if (existingTemplates.length > 0) {
      console.log(`Templates table already has ${existingTemplates.length} entries, skipping seed.`);
      return;
    }

    console.log("Seeding default template: Residential 3BHK – Standard");

    // Create template
    const [template] = await db.insert(templates).values({
      name: "Residential 3BHK – Standard",
      category: "Residential 3BHK",
      isActive: true,
    }).returning();

    // Define rooms with items
    const roomsData = [
      {
        name: "Kitchen",
        sortOrder: 1,
        items: [
          { itemKey: "base_unit", displayName: "Base Unit", unit: "SFT", sortOrder: 1 },
          { itemKey: "wall_unit", displayName: "Wall Unit", unit: "SFT", sortOrder: 2 },
          { itemKey: "loft_unit", displayName: "Loft Unit", unit: "SFT", sortOrder: 3 },
          { itemKey: "tall_unit", displayName: "Tall Unit", unit: "SFT", sortOrder: 4 },
          { itemKey: "appliance_unit", displayName: "Appliance Unit", unit: "SFT", sortOrder: 5 },
          { itemKey: "pantry_unit", displayName: "Pantry Unit", unit: "SFT", sortOrder: 6 },
          { itemKey: "utility_wall_storage", displayName: "Utility Wall Storage", unit: "SFT", sortOrder: 7 },
          { itemKey: "utility_tall_unit", displayName: "Utility Tall Unit", unit: "SFT", sortOrder: 8 },
          { itemKey: "tandem_drawer_set", displayName: "Tandem Drawer Set", unit: "COUNT", sortOrder: 9 },
          { itemKey: "wicker_basket", displayName: "Wicker Basket", unit: "COUNT", sortOrder: 10 },
        ],
      },
      {
        name: "Living",
        sortOrder: 2,
        items: [
          { itemKey: "tv_base_unit", displayName: "TV Base Unit", unit: "SFT", sortOrder: 1 },
          { itemKey: "tv_tall_unit_closed", displayName: "TV Tall Unit Closed", unit: "SFT", sortOrder: 2 },
          { itemKey: "tv_open_display", displayName: "TV Open Display", unit: "SFT", sortOrder: 3 },
          { itemKey: "crockery_bar_unit", displayName: "Crockery / Bar Unit", unit: "SFT", sortOrder: 4 },
          { itemKey: "wall_panel_highlight", displayName: "Wall Panel / Highlight", unit: "SFT", isWallHighlightOrPanel: true, sortOrder: 5 },
          { itemKey: "decor_partition", displayName: "Decor Partition", unit: "SFT", sortOrder: 6 },
        ],
      },
      {
        name: "Dining",
        sortOrder: 3,
        items: [
          { itemKey: "crockery_base", displayName: "Crockery Base", unit: "SFT", sortOrder: 1 },
          { itemKey: "crockery_loft", displayName: "Crockery Loft", unit: "SFT", sortOrder: 2 },
          { itemKey: "crockery_wall_unit", displayName: "Crockery Wall Unit", unit: "SFT", sortOrder: 3 },
          { itemKey: "puja_base_unit", displayName: "Puja Base Unit", unit: "SFT", sortOrder: 4 },
          { itemKey: "puja_loft_unit", displayName: "Puja Loft Unit", unit: "SFT", sortOrder: 5 },
          { itemKey: "puja_doors", displayName: "Puja Doors", unit: "SFT", sortOrder: 6 },
          { itemKey: "puja_back_glass", displayName: "Puja Back Glass", unit: "SFT", sortOrder: 7 },
          { itemKey: "dining_wall_highlight", displayName: "Dining Wall Highlight", unit: "SFT", isWallHighlightOrPanel: true, sortOrder: 8 },
        ],
      },
      {
        name: "Master Bedroom",
        sortOrder: 4,
        items: [
          { itemKey: "wardrobe_swing", displayName: "Wardrobe Swing", unit: "SFT", sortOrder: 1 },
          { itemKey: "wardrobe_slide", displayName: "Wardrobe Slide", unit: "SFT", sortOrder: 2 },
          { itemKey: "wardrobe_loft", displayName: "Wardrobe Loft", unit: "SFT", sortOrder: 3 },
          { itemKey: "tv_base_unit_mb", displayName: "TV Base Unit (MB)", unit: "SFT", sortOrder: 4 },
          { itemKey: "tv_wall_panel_mb", displayName: "TV Wall Panel (MB)", unit: "SFT", isWallHighlightOrPanel: true, sortOrder: 5 },
          { itemKey: "dresser_unit", displayName: "Dresser Unit", unit: "SFT", sortOrder: 6 },
          { itemKey: "mb_wall_highlight", displayName: "MB Wall Highlight", unit: "SFT", isWallHighlightOrPanel: true, sortOrder: 7 },
          { itemKey: "side_tables", displayName: "Side Tables", unit: "COUNT", sortOrder: 8 },
        ],
      },
      {
        name: "Bedroom 2",
        sortOrder: 5,
        items: [
          { itemKey: "b2_wardrobe_swing", displayName: "B2 Wardrobe Swing", unit: "SFT", sortOrder: 1 },
          { itemKey: "b2_wardrobe_loft", displayName: "B2 Wardrobe Loft", unit: "SFT", sortOrder: 2 },
          { itemKey: "study_table", displayName: "Study Table", unit: "SFT", sortOrder: 3 },
          { itemKey: "overhead_storage", displayName: "Overhead Storage", unit: "SFT", sortOrder: 4 },
          { itemKey: "bookshelf_display", displayName: "Bookshelf / Display", unit: "SFT", sortOrder: 5 },
          { itemKey: "b2_wall_highlight", displayName: "B2 Wall Highlight", unit: "SFT", isWallHighlightOrPanel: true, sortOrder: 6 },
        ],
      },
      {
        name: "Bedroom 3",
        sortOrder: 6,
        items: [
          { itemKey: "b3_wardrobe_swing", displayName: "B3 Wardrobe Swing", unit: "SFT", sortOrder: 1 },
          { itemKey: "b3_wardrobe_loft", displayName: "B3 Wardrobe Loft", unit: "SFT", sortOrder: 2 },
          { itemKey: "b3_tv_base_unit", displayName: "B3 TV Base Unit", unit: "SFT", sortOrder: 3 },
          { itemKey: "work_table_compact", displayName: "Work Table Compact", unit: "SFT", sortOrder: 4 },
          { itemKey: "b3_wall_highlight", displayName: "B3 Wall Highlight", unit: "SFT", isWallHighlightOrPanel: true, sortOrder: 5 },
        ],
      },
      {
        name: "Others",
        sortOrder: 7,
        items: [
          { itemKey: "vanity_unit", displayName: "Vanity Unit", unit: "SFT", sortOrder: 1 },
          { itemKey: "vanity_mirror", displayName: "Vanity Mirror", unit: "SFT", sortOrder: 2 },
          { itemKey: "shoe_rack", displayName: "Shoe Rack", unit: "SFT", sortOrder: 3 },
          { itemKey: "main_door_paneling", displayName: "Main Door Paneling", unit: "SFT", isWallHighlightOrPanel: true, sortOrder: 4 },
          { itemKey: "puja_door_frame_architrave", displayName: "Puja Door Frame Architrave", unit: "SFT", sortOrder: 5 },
          { itemKey: "foyer_console", displayName: "Foyer Console", unit: "SFT", sortOrder: 6 },
          { itemKey: "foyer_corridor_panel", displayName: "Foyer / Corridor Panel", unit: "SFT", isWallHighlightOrPanel: true, sortOrder: 7 },
          { itemKey: "mirror_wall_panel", displayName: "Mirror / Wall Panel", unit: "SFT", isWallHighlightOrPanel: true, sortOrder: 8 },
          { itemKey: "termite_treatment", displayName: "Termite Treatment", unit: "LSUM", sortOrder: 9 },
          { itemKey: "floor_matting", displayName: "Floor Matting", unit: "LSUM", sortOrder: 10 },
          { itemKey: "transportation_handling", displayName: "Transportation & Handling", unit: "LSUM", sortOrder: 11 },
        ],
      },
    ];

    // Insert rooms and items
    for (const roomData of roomsData) {
      const [room] = await db.insert(templateRooms).values({
        templateId: template.id,
        roomName: roomData.name,
        sortOrder: roomData.sortOrder,
      }).returning();

      if (roomData.items.length > 0) {
        await db.insert(templateItems).values(
          roomData.items.map(item => ({
            templateRoomId: room.id,
            itemKey: item.itemKey,
            displayName: item.displayName,
            unit: item.unit,
            isWallHighlightOrPanel: item.isWallHighlightOrPanel || false,
            sortOrder: item.sortOrder,
          }))
        );
      }
    }

    console.log("✅ Template seeded successfully!");
  } catch (error) {
    console.error("Error seeding templates:", error);
    throw error;
  }
}
