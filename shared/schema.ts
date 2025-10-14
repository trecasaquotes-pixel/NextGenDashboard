import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Quotations table
export const quotations = pgTable("quotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Quote ID (e.g., TRE_QT_250113_A1B2)
  quoteId: varchar("quote_id").notNull().unique(),
  
  // Project Info
  projectName: varchar("project_name").notNull(),
  projectType: varchar("project_type"), // 1 BHK, 2 BHK, 3 BHK, 4 BHK, Duplex, Triplex, Villa, Commercial, Other
  clientName: varchar("client_name").notNull(),
  clientEmail: varchar("client_email"),
  clientPhone: varchar("client_phone"),
  projectAddress: text("project_address"),
  
  // Status
  status: varchar("status").notNull().default("draft"), // draft, sent, accepted, rejected
  
  // Totals (calculated subtotals)
  totals: jsonb("totals").$type<{
    interiorsSubtotal: number;
    fcSubtotal: number;
    grandSubtotal: number;
    updatedAt: number;
  }>(),
  
  // Discount
  discountType: varchar("discount_type").default("percent"), // percent or amount
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).default("0"),
  
  // Terms & Conditions
  terms: jsonb("terms").$type<{
    interiors: {
      useDefault: boolean;
      templateId: string;
      customText?: string;
      vars: {
        validDays?: number;
        warrantyMonths?: number;
        paymentSchedule?: string;
      };
    };
    falseCeiling: {
      useDefault: boolean;
      templateId: string;
      customText?: string;
      vars: {
        validDays?: number;
        warrantyMonths?: number;
        paymentSchedule?: string;
      };
    };
  }>(),
  
  // Signature & Acceptance
  signoff: jsonb("signoff").$type<{
    client: {
      name?: string;
      signature?: string;
      signedAt?: number;
    };
    trecasa: {
      name?: string;
      title?: string;
      signature?: string;
      signedAt?: number;
    };
    accepted: boolean;
    acceptedAt?: number;
  }>(),
  
  // Agreement Pack Settings
  includeAnnexureInteriors: boolean("include_annexure_interiors").default(true),
  includeAnnexureFC: boolean("include_annexure_fc").default(true),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  user: one(users, {
    fields: [quotations.userId],
    references: [users.id],
  }),
  interiorItems: many(interiorItems),
  falseCeilingItems: many(falseCeilingItems),
  otherItems: many(otherItems),
}));

// Interior line items (Kitchen, Living, Bedrooms, etc.)
export const interiorItems = pgTable("interior_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: varchar("quotation_id").notNull().references(() => quotations.id, { onDelete: 'cascade' }),
  
  roomType: varchar("room_type").notNull(), // Kitchen, Living, Bedrooms, Bathrooms, Utility, Puja
  description: text("description"),
  
  // Calculation type (determines how SQFT/area is calculated)
  calc: varchar("calc").notNull().default("SQFT"), // SQFT, COUNT, LSUM
  
  // Dimensions
  length: decimal("length", { precision: 10, scale: 2 }),
  height: decimal("height", { precision: 10, scale: 2 }),
  width: decimal("width", { precision: 10, scale: 2 }),
  sqft: decimal("sqft", { precision: 10, scale: 2 }), // Calculated: L×H or L×W
  
  // Build Type (Work-on-Site = handmade, Factory Finish = factory)
  buildType: varchar("build_type").notNull().default("handmade"), // handmade, factory
  
  // Materials/Finishes/Hardware (with defaults)
  material: varchar("material").notNull().default("Generic Ply"),
  finish: varchar("finish").notNull().default("Generic Laminate"),
  hardware: varchar("hardware").notNull().default("Nimmi"),
  
  // Pricing (brand-based calculation)
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }), // Rate per sqft
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }), // Amount = Rate × Area
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const interiorItemsRelations = relations(interiorItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [interiorItems.quotationId],
    references: [quotations.id],
  }),
}));

// False ceiling items (per room, AREA calculation L×W)
export const falseCeilingItems = pgTable("false_ceiling_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: varchar("quotation_id").notNull().references(() => quotations.id, { onDelete: 'cascade' }),
  
  roomType: varchar("room_type").notNull(), // Kitchen, Living, Bedrooms, Bathrooms, Utility, Puja
  description: text("description"),
  
  // Dimensions for AREA (L×W)
  length: decimal("length", { precision: 10, scale: 2 }),
  width: decimal("width", { precision: 10, scale: 2 }),
  area: decimal("area", { precision: 10, scale: 2 }), // Calculated: L×W
  
  // Pricing (optional for future)
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const falseCeilingItemsRelations = relations(falseCeilingItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [falseCeilingItems.quotationId],
    references: [quotations.id],
  }),
}));

// Other items (Paint, Lights, Fan Hook Rods)
export const otherItems = pgTable("other_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: varchar("quotation_id").notNull().references(() => quotations.id, { onDelete: 'cascade' }),
  
  itemType: varchar("item_type").notNull(), // Paint, Lights, Fan Hook Rods
  description: text("description"),
  
  // Value type (lumpsum or count)
  valueType: varchar("value_type").notNull(), // lumpsum, count
  value: varchar("value"), // Store as string for flexibility (can be number or lumpsum amount)
  
  // Pricing (optional for future)
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const otherItemsRelations = relations(otherItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [otherItems.quotationId],
    references: [quotations.id],
  }),
}));

// Zod schemas for validation
export const insertQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInteriorItemSchema = createInsertSchema(interiorItems).omit({
  id: true,
  createdAt: true,
});

export const insertFalseCeilingItemSchema = createInsertSchema(falseCeilingItems).omit({
  id: true,
  createdAt: true,
});

export const insertOtherItemSchema = createInsertSchema(otherItems).omit({
  id: true,
  createdAt: true,
});

// TypeScript types
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotations.$inferSelect;

export type InsertInteriorItem = z.infer<typeof insertInteriorItemSchema>;
export type InteriorItem = typeof interiorItems.$inferSelect;

export type InsertFalseCeilingItem = z.infer<typeof insertFalseCeilingItemSchema>;
export type FalseCeilingItem = typeof falseCeilingItems.$inferSelect;

export type InsertOtherItem = z.infer<typeof insertOtherItemSchema>;
export type OtherItem = typeof otherItems.$inferSelect;

// Room types constant
export const ROOM_TYPES = ["Kitchen", "Living", "Bedrooms", "Bathrooms", "Utility", "Puja"] as const;
export const OTHER_ITEM_TYPES = ["Paint", "Lights", "Fan Hook Rods"] as const;

// Rates table for admin-managed pricing
export const rates = pgTable("rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemKey: varchar("item_key").notNull().unique(), // lowercase snake_case
  displayName: varchar("display_name", { length: 80 }).notNull(),
  unit: varchar("unit").notNull(), // SFT, COUNT, LSUM
  baseRateHandmade: integer("base_rate_handmade").notNull().default(0),
  baseRateFactory: integer("base_rate_factory").notNull().default(0),
  category: varchar("category").notNull(), // Kitchen, Living, etc.
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rate validation schemas
export const unitEnum = z.enum(["SFT", "COUNT", "LSUM"]);
export const categoryEnum = z.enum([
  "Kitchen",
  "Living", 
  "Dining",
  "Master Bedroom",
  "Bedroom 2",
  "Bedroom 3",
  "Others",
  "FC"
]);

export const insertRateSchema = createInsertSchema(rates, {
  itemKey: z.string().regex(/^[a-z0-9_]+$/, "Must be lowercase letters, numbers, and underscores only"),
  displayName: z.string().min(2).max(80),
  unit: unitEnum,
  category: categoryEnum,
  baseRateHandmade: z.number().min(0),
  baseRateFactory: z.number().min(0),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RateRow = typeof rates.$inferSelect;
export type NewRateRow = z.infer<typeof insertRateSchema>;
export type Unit = z.infer<typeof unitEnum>;
export type Category = z.infer<typeof categoryEnum>;

// Templates tables for auto-creating room structures
export const templateCategoryEnum = z.enum([
  "Residential 1BHK",
  "Residential 2BHK",
  "Residential 3BHK",
  "Villa",
  "Commercial"
]);

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const templateRooms = pgTable("template_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => templates.id, { onDelete: 'cascade' }),
  roomName: varchar("room_name", { length: 60 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const templateItems = pgTable("template_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateRoomId: varchar("template_room_id").notNull().references(() => templateRooms.id, { onDelete: 'cascade' }),
  itemKey: varchar("item_key").notNull(),
  displayName: varchar("display_name", { length: 80 }).notNull(),
  unit: varchar("unit").notNull().default("SFT"),
  isWallHighlightOrPanel: boolean("is_wall_highlight_or_panel").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Template relations
export const templatesRelations = relations(templates, ({ many }) => ({
  rooms: many(templateRooms),
}));

export const templateRoomsRelations = relations(templateRooms, ({ one, many }) => ({
  template: one(templates, {
    fields: [templateRooms.templateId],
    references: [templates.id],
  }),
  items: many(templateItems),
}));

export const templateItemsRelations = relations(templateItems, ({ one }) => ({
  room: one(templateRooms, {
    fields: [templateItems.templateRoomId],
    references: [templateRooms.id],
  }),
}));

// Template validation schemas
export const insertTemplateSchema = createInsertSchema(templates, {
  name: z.string().min(2).max(100),
  category: templateCategoryEnum,
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateRoomSchema = createInsertSchema(templateRooms, {
  roomName: z.string().min(2).max(60),
  sortOrder: z.number().min(0).default(0),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateItemSchema = createInsertSchema(templateItems, {
  itemKey: z.string().min(2),
  displayName: z.string().min(2).max(80),
  unit: unitEnum,
  isWallHighlightOrPanel: z.boolean().default(false),
  sortOrder: z.number().min(0).default(0),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TemplateRow = typeof templates.$inferSelect;
export type NewTemplateRow = z.infer<typeof insertTemplateSchema>;
export type TemplateRoomRow = typeof templateRooms.$inferSelect;
export type NewTemplateRoomRow = z.infer<typeof insertTemplateRoomSchema>;
export type TemplateItemRow = typeof templateItems.$inferSelect;
export type NewTemplateItemRow = z.infer<typeof insertTemplateItemSchema>;
export type TemplateCategory = z.infer<typeof templateCategoryEnum>;
