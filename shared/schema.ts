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
