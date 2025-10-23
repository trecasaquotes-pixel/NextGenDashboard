import { db } from "../db";
import { templates, templateRooms, templateItems } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedCommercial() {
  try {
    // Check if Commercial template already exists
    const existingTemplate = await db
      .select()
      .from(templates)
      .where(eq(templates.name, "Commercial"))
      .limit(1);

    if (existingTemplate.length > 0) {
      console.log("Commercial template already exists, skipping seed.");
      return;
    }

    console.log("Seeding Commercial template...");

    // Create template
    const [template] = await db
      .insert(templates)
      .values({
        name: "Commercial",
        category: "Commercial",
        isActive: true,
      })
      .returning();

    // Define rooms with items in correct order
    const roomsData = [
      // 1. Reception / Lobby
      {
        name: "Reception / Lobby",
        sortOrder: 1,
        items: [
          { itemKey: "reception_desk", displayName: "Reception Desk", unit: "SFT", sortOrder: 1 },
          { itemKey: "reception_back_panel", displayName: "Reception Back Panel", unit: "SFT", sortOrder: 2, isWallHighlightOrPanel: true },
          { itemKey: "display_unit", displayName: "Display Unit", unit: "SFT", sortOrder: 3 },
          { itemKey: "waiting_seating", displayName: "Waiting Area Seating", unit: "SFT", sortOrder: 4 },
          { itemKey: "shoe_rack_commercial", displayName: "Shoe Rack", unit: "SFT", sortOrder: 5 },
        ],
      },
      // 2. Conference Room / Meeting Room
      {
        name: "Conference Room / Meeting Room",
        sortOrder: 2,
        items: [
          { itemKey: "conference_table", displayName: "Conference Table", unit: "SFT", sortOrder: 1 },
          { itemKey: "conference_storage", displayName: "Storage Unit", unit: "SFT", sortOrder: 2 },
          { itemKey: "av_cabinet", displayName: "AV Cabinet", unit: "SFT", sortOrder: 3 },
          { itemKey: "whiteboard_panel", displayName: "Whiteboard Panel", unit: "SFT", sortOrder: 4 },
          { itemKey: "conference_back_panel", displayName: "Back Panel / Accent Wall", unit: "SFT", sortOrder: 5, isWallHighlightOrPanel: true },
        ],
      },
      // 3. Manager's Cabin
      {
        name: "Manager's Cabin",
        sortOrder: 3,
        items: [
          { itemKey: "manager_desk", displayName: "Manager Desk", unit: "SFT", sortOrder: 1 },
          { itemKey: "manager_storage", displayName: "Storage Unit / Credenza", unit: "SFT", sortOrder: 2 },
          { itemKey: "manager_bookshelf", displayName: "Bookshelf", unit: "SFT", sortOrder: 3 },
          { itemKey: "manager_back_panel", displayName: "Back Panel", unit: "SFT", sortOrder: 4, isWallHighlightOrPanel: true },
          { itemKey: "meeting_table_small", displayName: "Small Meeting Table", unit: "SFT", sortOrder: 5 },
        ],
      },
      // 4. Office Cabins / Workstations
      {
        name: "Office Cabins / Workstations",
        sortOrder: 4,
        items: [
          { itemKey: "workstation_desk", displayName: "Workstation Desk", unit: "SFT", sortOrder: 1 },
          { itemKey: "workstation_storage", displayName: "Personal Storage Unit", unit: "SFT", sortOrder: 2 },
          { itemKey: "overhead_storage_office", displayName: "Overhead Storage", unit: "SFT", sortOrder: 3 },
          { itemKey: "partition_office", displayName: "Partition", unit: "SFT", sortOrder: 4 },
        ],
      },
      // 5. Pantry / Cafeteria
      {
        name: "Pantry / Cafeteria",
        sortOrder: 5,
        items: [
          { itemKey: "pantry_base_unit", displayName: "Base Unit", unit: "SFT", sortOrder: 1 },
          { itemKey: "pantry_wall_unit", displayName: "Wall Unit", unit: "SFT", sortOrder: 2 },
          { itemKey: "pantry_tall_unit", displayName: "Tall Unit", unit: "SFT", sortOrder: 3 },
          { itemKey: "refrigerator_box_commercial", displayName: "Refrigerator Box", unit: "SFT", sortOrder: 4 },
          { itemKey: "coffee_station", displayName: "Coffee Station", unit: "SFT", sortOrder: 5 },
          { itemKey: "dining_table_pantry", displayName: "Dining Table", unit: "SFT", sortOrder: 6 },
        ],
      },
      // 6. Storage / Server Room
      {
        name: "Storage / Server Room",
        sortOrder: 6,
        items: [
          { itemKey: "storage_racks", displayName: "Storage Racks", unit: "SFT", sortOrder: 1 },
          { itemKey: "filing_cabinets", displayName: "Filing Cabinets", unit: "SFT", sortOrder: 2 },
          { itemKey: "server_cabinet", displayName: "Server Cabinet", unit: "SFT", sortOrder: 3 },
          { itemKey: "overhead_storage_server", displayName: "Overhead Storage", unit: "SFT", sortOrder: 4 },
        ],
      },
      // 7. Restroom
      {
        name: "Restroom",
        sortOrder: 7,
        items: [
          { itemKey: "vanity_commercial", displayName: "Vanity with Mirror", unit: "LSUM", sortOrder: 1 },
        ],
      },
    ];

    // Insert rooms and items
    for (const roomData of roomsData) {
      // Create room
      const [room] = await db
        .insert(templateRooms)
        .values({
          templateId: template.id,
          roomName: roomData.name,
          sortOrder: roomData.sortOrder,
          isFcRoom: false,
        })
        .returning();

      // Create items for this room
      for (const item of roomData.items) {
        await db.insert(templateItems).values({
          templateRoomId: room.id,
          itemKey: item.itemKey,
          displayName: item.displayName,
          unit: item.unit,
          isWallHighlightOrPanel: item.isWallHighlightOrPanel || false,
          sortOrder: item.sortOrder,
        });
      }
    }

    // Define FC rooms
    const fcRoomsData = [
      { name: "Reception / Lobby", sortOrder: 1 },
      { name: "Conference Room / Meeting Room", sortOrder: 2 },
      { name: "Manager's Cabin", sortOrder: 3 },
      { name: "Office Cabins / Workstations", sortOrder: 4 },
      { name: "Pantry / Cafeteria", sortOrder: 5 },
    ];

    // Insert FC rooms
    for (const fcRoom of fcRoomsData) {
      await db.insert(templateRooms).values({
        templateId: template.id,
        roomName: fcRoom.name,
        sortOrder: fcRoom.sortOrder,
        isFcRoom: true,
      });
    }

    console.log("✅ Commercial template seeded successfully!");
  } catch (error) {
    console.error("Error seeding Commercial template:", error);
    throw error;
  }
}
