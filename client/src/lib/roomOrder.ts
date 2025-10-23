// Natural room order for consistent sorting throughout the app
const ROOM_ORDER_MAP: Record<string, number> = {
  // Living spaces
  Kitchen: 1,
  Living: 2,
  "Living/Dining": 3,
  Dining: 4,
  Foyer: 5,
  Passage: 6,

  // Bedrooms
  "Master Bedroom": 10,
  "Bedroom 1": 11,
  "Bedroom 2": 12,
  "Bedroom 3": 13,
  "Bedroom 4": 14,
  "Kids Room": 15,
  "Guest Room": 16,

  // Bathrooms
  "Bathroom 1": 20,
  "Bathroom 2": 21,
  "Bathroom 3": 22,
  "Bathroom 4": 23,
  "Master Bath": 24,
  "Common Bath": 25,
  "Powder Room": 26,

  // Other spaces
  Balcony: 30,
  Terrace: 31,
  Study: 32,
  "Home Office": 33,
  "Prayer Room": 34,
  "Store Room": 35,
  Utility: 36,
  Laundry: 37,
  "Additional Works": 38,
  Puja: 39,

  // Fallback
  Other: 999,
};

/**
 * Get the sort order for a room name
 * Returns a high number (1000+) for unknown rooms to push them to the end
 */
function getRoomOrder(roomName: string): number {
  const normalized = roomName.trim();

  // Exact match
  if (ROOM_ORDER_MAP[normalized] !== undefined) {
    return ROOM_ORDER_MAP[normalized];
  }

  // Partial match for variations (e.g., "Bedroom 1", "Bedroom-1", "Bedroom1")
  for (const [key, value] of Object.entries(ROOM_ORDER_MAP)) {
    if (normalized.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Unknown room - push to end, sort alphabetically among unknowns
  return 1000;
}

/**
 * Sort room names in a logical, natural order
 */
export function sortRoomNames(rooms: string[]): string[] {
  return [...rooms].sort((a, b) => {
    const orderA = getRoomOrder(a);
    const orderB = getRoomOrder(b);

    // If same order, sort alphabetically
    if (orderA === orderB) {
      return a.localeCompare(b);
    }

    return orderA - orderB;
  });
}

/**
 * Sort an array of objects by their room property
 */
export function sortByRoom<T extends { room: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const orderA = getRoomOrder(a.room);
    const orderB = getRoomOrder(b.room);

    if (orderA === orderB) {
      return a.room.localeCompare(b.room);
    }

    return orderA - orderB;
  });
}

/**
 * Sort room entries (from Object.entries)
 */
export function sortRoomEntries<T>(entries: [string, T][]): [string, T][] {
  return [...entries].sort(([roomA], [roomB]) => {
    const orderA = getRoomOrder(roomA);
    const orderB = getRoomOrder(roomB);

    if (orderA === orderB) {
      return roomA.localeCompare(roomB);
    }

    return orderA - orderB;
  });
}
