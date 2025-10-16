export type RoomKey =
  | "Living"
  | "Dining"
  | "Kitchen"
  | "Bedroom1"
  | "Bedroom2"
  | "Bedroom3"
  | "Bedroom4"
  | "Bathroom1"
  | "Bathroom2"
  | "Bathroom3"
  | "Utility"
  | "Puja"
  | "Foyer"
  | "Study"
  | "Balcony"
  | "Other";

export type TemplateId =
  | "1BHK"
  | "2BHK"
  | "3BHK"
  | "4BHK"
  | "Duplex"
  | "Triplex"
  | "Villa"
  | "Commercial";

export type DefaultItem = {
  description: string;
  calc: "SQFT" | "COUNT" | "LSUM";
  // interior defaults (rate computed by existing smart rules)
  buildType?: "handmade" | "factory";
  core?: string;     // e.g., "Generic Ply"
  finish?: string;   // e.g., "Generic Laminate"
  hardware?: string; // e.g., "Nimmi"
};

export type TemplateDef = {
  id: TemplateId;
  name: string;
  rooms: Array<{
    key: RoomKey;
    label: string;
    tab: "Interiors" | "FC";
    defaultItems?: DefaultItem[];
    fcLine?: boolean;
  }>;
  fcOthers: {
    includeWallPainting: boolean;
    includeFCPainting: boolean;
    includeLights: boolean;
    includeFanHooks: boolean;
  };
};

// helper to make standard interiors defaults
const I = (description: string, buildType: "handmade"|"factory" = "handmade"): DefaultItem => ({
  description,
  calc: "SQFT",
  buildType,
  core: "Generic Ply",
  finish: "Generic Laminate",
  hardware: "Nimmi",
});

// Standard templates
export const templates: Record<TemplateId, TemplateDef> = {
  "1BHK": {
    id: "1BHK",
    name: "1 BHK",
    rooms: [
      { key: "Kitchen", label: "Kitchen", tab: "Interiors", defaultItems: [ I("Kitchen – Base", "factory"), I("Kitchen – Wall", "factory"), I("Kitchen – Loft", "factory") ] },
      { key: "Living", label: "Living", tab: "Interiors", defaultItems: [ I("TV Unit – Base"), I("TV Back Panel") ] },
      { key: "Bedroom1", label: "Bedroom 1", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bathroom1", label: "Bathroom 1", tab: "Interiors", defaultItems: [ { description: "Vanity", calc: "SQFT" } ] },
      { key: "Other", label: "Misc", tab: "Interiors", defaultItems: [] },

      // FC rows (room-wise)
      { key: "Kitchen", label: "Kitchen", tab: "FC", fcLine: true },
      { key: "Living", label: "Living", tab: "FC", fcLine: true },
      { key: "Bedroom1", label: "Bedroom 1", tab: "FC", fcLine: true },
      { key: "Bathroom1", label: "Bathroom 1", tab: "FC", fcLine: true },
      { key: "Other", label: "Misc", tab: "FC", fcLine: true },
    ],
    fcOthers: { includeWallPainting: true, includeFCPainting: true, includeLights: true, includeFanHooks: true }
  },

  "2BHK": {
    id: "2BHK", name: "2 BHK",
    rooms: [
      { key: "Kitchen", label: "Kitchen", tab: "Interiors", defaultItems: [ I("Kitchen – Base", "factory"), I("Kitchen – Wall", "factory"), I("Kitchen – Loft", "factory") ] },
      { key: "Living", label: "Living", tab: "Interiors", defaultItems: [ I("TV Unit – Base"), I("Crockery Base") ] },
      { key: "Bedroom1", label: "Master Bedroom", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bedroom2", label: "Bedroom 2", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bathroom1", label: "Bathroom 1", tab: "Interiors", defaultItems: [ { description: "Vanity", calc: "SQFT" } ] },
      { key: "Bathroom2", label: "Bathroom 2", tab: "Interiors", defaultItems: [ { description: "Vanity", calc: "SQFT" } ] },
      { key: "Other", label: "Misc", tab: "Interiors", defaultItems: [] },

      { key: "Kitchen", label: "Kitchen", tab: "FC", fcLine: true },
      { key: "Living", label: "Living", tab: "FC", fcLine: true },
      { key: "Bedroom1", label: "Master Bedroom", tab: "FC", fcLine: true },
      { key: "Bedroom2", label: "Bedroom 2", tab: "FC", fcLine: true },
      { key: "Bathroom1", label: "Bathroom 1", tab: "FC", fcLine: true },
      { key: "Bathroom2", label: "Bathroom 2", tab: "FC", fcLine: true },
      { key: "Other", label: "Misc", tab: "FC", fcLine: true },
    ],
    fcOthers: { includeWallPainting: true, includeFCPainting: true, includeLights: true, includeFanHooks: true }
  },

  "3BHK": {
    id: "3BHK", name: "3 BHK",
    rooms: [
      { key: "Kitchen", label: "Kitchen", tab: "Interiors", defaultItems: [ I("Kitchen – Base", "factory"), I("Kitchen – Wall", "factory"), I("Kitchen – Loft", "factory") ] },
      { key: "Living", label: "Living/Dining", tab: "Interiors", defaultItems: [ I("TV Unit – Base"), I("Crockery Base") ] },
      { key: "Bedroom1", label: "Master Bedroom", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft"), I("Dresser Base") ] },
      { key: "Bedroom2", label: "Bedroom 2", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bedroom3", label: "Bedroom 3", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bathroom1", label: "Bathroom 1", tab: "Interiors", defaultItems: [ { description: "Vanity", calc: "SQFT" } ] },
      { key: "Bathroom2", label: "Bathroom 2", tab: "Interiors", defaultItems: [ { description: "Vanity", calc: "SQFT" } ] },
      { key: "Other", label: "Misc", tab: "Interiors", defaultItems: [] },

      { key: "Kitchen", label: "Kitchen", tab: "FC", fcLine: true },
      { key: "Living", label: "Living/Dining", tab: "FC", fcLine: true },
      { key: "Bedroom1", label: "Master Bedroom", tab: "FC", fcLine: true },
      { key: "Bedroom2", label: "Bedroom 2", tab: "FC", fcLine: true },
      { key: "Bedroom3", label: "Bedroom 3", tab: "FC", fcLine: true },
      { key: "Bathroom1", label: "Bathroom 1", tab: "FC", fcLine: true },
      { key: "Bathroom2", label: "Bathroom 2", tab: "FC", fcLine: true },
      { key: "Other", label: "Misc", tab: "FC", fcLine: true },
    ],
    fcOthers: { includeWallPainting: true, includeFCPainting: true, includeLights: true, includeFanHooks: true }
  },

  "4BHK": {
    id: "4BHK", name: "4 BHK",
    rooms: [
      { key: "Kitchen", label: "Kitchen", tab: "Interiors", defaultItems: [ I("Kitchen – Base", "factory"), I("Kitchen – Wall", "factory"), I("Kitchen – Loft", "factory") ] },
      { key: "Living", label: "Living/Dining", tab: "Interiors", defaultItems: [ I("TV Unit – Base"), I("Crockery Base") ] },
      { key: "Bedroom1", label: "Master Bedroom", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft"), I("Dresser Base") ] },
      { key: "Bedroom2", label: "Bedroom 2", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bedroom3", label: "Bedroom 3", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bedroom4", label: "Bedroom 4", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bathroom1", label: "Bathroom 1", tab: "Interiors", defaultItems: [ { description: "Vanity", calc: "SQFT" } ] },
      { key: "Bathroom2", label: "Bathroom 2", tab: "Interiors", defaultItems: [ { description: "Vanity", calc: "SQFT" } ] },
      { key: "Bathroom3", label: "Bathroom 3", tab: "Interiors", defaultItems: [ { description: "Vanity", calc: "SQFT" } ] },
      { key: "Other", label: "Misc", tab: "Interiors", defaultItems: [] },

      { key: "Kitchen", label: "Kitchen", tab: "FC", fcLine: true },
      { key: "Living", label: "Living/Dining", tab: "FC", fcLine: true },
      { key: "Bedroom1", label: "Master Bedroom", tab: "FC", fcLine: true },
      { key: "Bedroom2", label: "Bedroom 2", tab: "FC", fcLine: true },
      { key: "Bedroom3", label: "Bedroom 3", tab: "FC", fcLine: true },
      { key: "Bedroom4", label: "Bedroom 4", tab: "FC", fcLine: true },
      { key: "Bathroom1", label: "Bathroom 1", tab: "FC", fcLine: true },
      { key: "Bathroom2", label: "Bathroom 2", tab: "FC", fcLine: true },
      { key: "Bathroom3", label: "Bathroom 3", tab: "FC", fcLine: true },
      { key: "Other", label: "Misc", tab: "FC", fcLine: true },
    ],
    fcOthers: { includeWallPainting: true, includeFCPainting: true, includeLights: true, includeFanHooks: true }
  },

  "Duplex": {
    id: "Duplex", name: "Duplex",
    rooms: [
      { key: "Kitchen", label: "Kitchen", tab: "Interiors", defaultItems: [ I("Kitchen – Base", "factory"), I("Kitchen – Wall", "factory") ] },
      { key: "Living", label: "Living/Dining", tab: "Interiors", defaultItems: [ I("TV Unit – Base"), I("Crockery Base") ] },
      { key: "Bedroom1", label: "Master Bedroom", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bedroom2", label: "Bedroom 2", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bedroom3", label: "Bedroom 3", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Other", label: "Misc", tab: "Interiors", defaultItems: [] },

      { key: "Kitchen", label: "Kitchen", tab: "FC", fcLine: true },
      { key: "Living", label: "Living/Dining", tab: "FC", fcLine: true },
      { key: "Bedroom1", label: "Master Bedroom", tab: "FC", fcLine: true },
      { key: "Bedroom2", label: "Bedroom 2", tab: "FC", fcLine: true },
      { key: "Bedroom3", label: "Bedroom 3", tab: "FC", fcLine: true },
      { key: "Other", label: "Misc", tab: "FC", fcLine: true },
    ],
    fcOthers: { includeWallPainting: true, includeFCPainting: true, includeLights: true, includeFanHooks: true }
  },

  "Triplex": {
    id: "Triplex", name: "Triplex",
    rooms: [
      { key: "Kitchen", label: "Kitchen", tab: "Interiors", defaultItems: [ I("Kitchen – Base", "factory"), I("Kitchen – Wall", "factory") ] },
      { key: "Living", label: "Living/Dining", tab: "Interiors", defaultItems: [ I("TV Unit – Base"), I("Crockery Base") ] },
      { key: "Bedroom1", label: "Master Bedroom", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bedroom2", label: "Bedroom 2", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bedroom3", label: "Bedroom 3", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bedroom4", label: "Bedroom 4", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Other", label: "Misc", tab: "Interiors", defaultItems: [] },

      { key: "Kitchen", label: "Kitchen", tab: "FC", fcLine: true },
      { key: "Living", label: "Living/Dining", tab: "FC", fcLine: true },
      { key: "Bedroom1", label: "Master Bedroom", tab: "FC", fcLine: true },
      { key: "Bedroom2", label: "Bedroom 2", tab: "FC", fcLine: true },
      { key: "Bedroom3", label: "Bedroom 3", tab: "FC", fcLine: true },
      { key: "Bedroom4", label: "Bedroom 4", tab: "FC", fcLine: true },
      { key: "Other", label: "Misc", tab: "FC", fcLine: true },
    ],
    fcOthers: { includeWallPainting: true, includeFCPainting: true, includeLights: true, includeFanHooks: true }
  },

  "Villa": {
    id: "Villa", name: "Villa",
    rooms: [
      { key: "Kitchen", label: "Kitchen", tab: "Interiors", defaultItems: [ I("Kitchen – Base", "factory"), I("Kitchen – Wall", "factory") ] },
      { key: "Living", label: "Living/Dining", tab: "Interiors", defaultItems: [ I("TV Unit – Base"), I("Crockery Base") ] },
      { key: "Bedroom1", label: "Master Bedroom", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bedroom2", label: "Bedroom 2", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bedroom3", label: "Bedroom 3", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Bedroom4", label: "Bedroom 4", tab: "Interiors", defaultItems: [ I("Wardrobe (Swing)"), I("Loft") ] },
      { key: "Other", label: "Misc", tab: "Interiors", defaultItems: [] },

      { key: "Kitchen", label: "Kitchen", tab: "FC", fcLine: true },
      { key: "Living", label: "Living/Dining", tab: "FC", fcLine: true },
      { key: "Bedroom1", label: "Master Bedroom", tab: "FC", fcLine: true },
      { key: "Bedroom2", label: "Bedroom 2", tab: "FC", fcLine: true },
      { key: "Bedroom3", label: "Bedroom 3", tab: "FC", fcLine: true },
      { key: "Bedroom4", label: "Bedroom 4", tab: "FC", fcLine: true },
      { key: "Other", label: "Misc", tab: "FC", fcLine: true },
    ],
    fcOthers: { includeWallPainting: true, includeFCPainting: true, includeLights: true, includeFanHooks: true }
  },

  "Commercial": {
    id: "Commercial", name: "Commercial",
    rooms: [
      { key: "Living", label: "Reception", tab: "Interiors", defaultItems: [ I("Front Desk"), I("Storage Cabinets") ] },
      { key: "Other", label: "Work Area", tab: "Interiors", defaultItems: [ I("Work Tables"), I("Storage") ] },
      { key: "Other", label: "Conference", tab: "Interiors", defaultItems: [ I("Credenza"), I("Wall Storage") ] },
      { key: "Other", label: "Misc", tab: "Interiors", defaultItems: [] },

      { key: "Living", label: "Reception", tab: "FC", fcLine: true },
      { key: "Other", label: "Work Area", tab: "FC", fcLine: true },
      { key: "Other", label: "Conference", tab: "FC", fcLine: true },
      { key: "Other", label: "Misc", tab: "FC", fcLine: true },
    ],
    fcOthers: { includeWallPainting: true, includeFCPainting: true, includeLights: true, includeFanHooks: true }
  },
};

export function getTemplateForCategory(category: TemplateId): TemplateDef {
  return templates[category] || templates["3BHK"];
}
