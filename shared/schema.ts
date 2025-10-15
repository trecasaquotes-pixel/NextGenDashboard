import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  bigint,
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
  
  // Build Type (Project-level: determines base pricing for all interior items)
  buildType: varchar("build_type").notNull().default("handmade"), // handmade, factory
  
  // Status
  status: varchar("status").notNull().default("draft"), // draft, sent, accepted, rejected, approved, cancelled
  
  // Approval tracking
  approvedAt: bigint("approved_at", { mode: "number" }), // Unix timestamp of approval
  approvedBy: varchar("approved_by"), // User who approved
  snapshotJson: jsonb("snapshot_json").$type<{
    globalRules: any;
    brandsSelected: any;
    ratesByItemKey: Record<string, any>;
  }>(), // Snapshot of rates/brands/rules at approval time
  
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
  
  // Client Portal (share link)
  clientToken: text("client_token"), // Random token for share URL
  clientTokenExpiresAt: bigint("client_token_expires_at", { mode: "number" }), // Unix timestamp in ms
  
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
  changeOrders: many(changeOrders),
}));

// Agreements table (generated when quote is approved)
export const agreements = pgTable("agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: varchar("quotation_id").notNull().references(() => quotations.id, { onDelete: 'cascade' }),
  
  // Project details (snapshot at approval time)
  clientName: varchar("client_name").notNull(),
  projectName: varchar("project_name").notNull(),
  siteAddress: text("site_address").notNull(),
  
  // Financial details
  amountBeforeGst: integer("amount_before_gst").notNull(), // Subtotal in paise
  gstPercent: integer("gst_percent").notNull(), // GST percentage (18 = 18%)
  gstAmount: integer("gst_amount").notNull(), // GST amount in paise
  grandTotal: integer("grand_total").notNull(), // Total amount in paise
  
  // Payment schedule (with computed amounts)
  paymentScheduleJson: jsonb("payment_schedule_json").$type<Array<{
    label: string;
    percent: number;
    amount: number; // In paise
  }>>().notNull(),
  
  // Terms & Conditions
  termsJson: jsonb("terms_json").$type<string[]>().notNull(),
  
  // PDF storage
  pdfPath: text("pdf_path").notNull(), // File path on disk
  
  // Signature tracking
  signedByClient: varchar("signed_by_client"), // Client name if signed
  signedAt: bigint("signed_at", { mode: "number" }), // Unix timestamp
  
  // Timestamps
  generatedAt: bigint("generated_at", { mode: "number" }).notNull(), // Unix timestamp
  createdAt: timestamp("created_at").defaultNow(),
});

export const agreementsRelations = relations(agreements, ({ one }) => ({
  quotation: one(quotations, {
    fields: [agreements.quotationId],
    references: [quotations.id],
  }),
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
  
  // Rate override functionality
  rateAuto: decimal("rate_auto", { precision: 10, scale: 2 }), // Auto-computed rate from buildType + brands
  rateOverride: decimal("rate_override", { precision: 10, scale: 2 }), // User-entered manual rate (nullable)
  isRateOverridden: boolean("is_rate_overridden").default(false), // true when override is active
  
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
  
  // Rate override functionality
  rateAuto: decimal("rate_auto", { precision: 10, scale: 2 }), // Auto-computed rate from buildType + brands
  rateOverride: decimal("rate_override", { precision: 10, scale: 2 }), // User-entered manual rate (nullable)
  isRateOverridden: boolean("is_rate_overridden").default(false), // true when override is active
  
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

export const insertAgreementSchema = createInsertSchema(agreements).omit({
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

export type InsertAgreement = z.infer<typeof insertAgreementSchema>;
export type Agreement = typeof agreements.$inferSelect;

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

// Template summary and detail types for client use
export interface TemplateSummary {
  id: string;
  name: string;
  category: string;
}

export interface TemplateDetail {
  id: string;
  name: string;
  category: string;
  rooms: {
    id: string;
    roomName: string;
    sortOrder: number;
    items: {
      id: string;
      itemKey: string;
      displayName: string;
      unit: string;
      isWallHighlightOrPanel: boolean;
      sortOrder: number;
    }[];
  }[];
}

// Apply template request/response schemas
export const applyTemplateSchema = z.object({
  templateId: z.string(),
  mode: z.enum(["merge", "reset"]).default("merge"),
});

export type ApplyTemplateRequest = z.infer<typeof applyTemplateSchema>;

export interface ApplyTemplateResponse {
  ok: boolean;
  applied: {
    roomsAdded: number;
    itemsAdded: number;
  };
  skipped?: string[];
}

// Brands table for brand-based pricing adders
export const brandTypes = ["core", "finish", "hardware"] as const;
export const brandTypeEnum = z.enum(brandTypes);

export const brands = pgTable("brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(),
  name: varchar("name", { length: 60 }).notNull(),
  adderPerSft: integer("adder_per_sft").notNull().default(0),
  warrantyMonths: integer("warranty_months").default(12), // Default 1 year warranty
  warrantySummary: text("warranty_summary"), // Optional warranty description
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Brand validation schemas
export const insertBrandSchema = createInsertSchema(brands, {
  type: brandTypeEnum,
  name: z.string().min(2).max(60),
  adderPerSft: z.number().int().min(0).default(0),
  warrantyMonths: z.number().int().min(0).max(120).default(12).optional(),
  warrantySummary: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type BrandRow = typeof brands.$inferSelect;
export type NewBrandRow = z.infer<typeof insertBrandSchema>;
export type BrandType = z.infer<typeof brandTypeEnum>;

// Painting Packs table for BHK-scaled LSUM painting packages
export const paintingPacks = pgTable("painting_packs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  basePriceLsum: integer("base_price_lsum").notNull().default(0),
  bulletsJson: text("bullets_json").notNull().default("[]"),
  bhkFactorBase: integer("bhk_factor_base").notNull().default(3),
  perBedroomDelta: decimal("per_bedroom_delta", { precision: 5, scale: 3 }).notNull().default("0.10"),
  showInQuote: boolean("show_in_quote").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaintingPackSchema = createInsertSchema(paintingPacks, {
  name: z.string().min(2).max(100),
  basePriceLsum: z.number().int().min(0),
  bulletsJson: z.string().transform((val) => {
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) throw new Error("Must be array");
      return val;
    } catch {
      throw new Error("bulletsJson must be valid JSON array");
    }
  }),
  bhkFactorBase: z.number().int().min(1).max(10).default(3),
  perBedroomDelta: z.number().min(0).max(0.25).default(0.10),
  showInQuote: z.boolean().default(true),
  isActive: z.boolean().default(true),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PaintingPackRow = typeof paintingPacks.$inferSelect;
export type NewPaintingPackRow = z.infer<typeof insertPaintingPackSchema>;

// FC Catalog table for admin-configurable FC "Others" items
export const fcCatalog = pgTable("fc_catalog", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 60 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  unit: varchar("unit", { length: 10 }).notNull(),
  defaultValue: integer("default_value").notNull().default(0),
  ratePerUnit: integer("rate_per_unit").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const fcUnitEnum = z.enum(["LSUM", "COUNT"]);

export const insertFCCatalogSchema = createInsertSchema(fcCatalog, {
  key: z.string().min(2).max(60),
  displayName: z.string().min(2).max(100),
  unit: fcUnitEnum,
  defaultValue: z.number().int().min(0).default(0),
  ratePerUnit: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FCCatalogRow = typeof fcCatalog.$inferSelect;
export type NewFCCatalogRow = z.infer<typeof insertFCCatalogSchema>;

// Global Rules table - single-row configuration for application-wide settings
export const globalRules = pgTable("global_rules", {
  id: varchar("id").primaryKey().default("global"),
  buildTypeDefault: varchar("build_type_default", { length: 20 }).notNull().default("handmade"),
  gstPercent: integer("gst_percent").notNull().default(18),
  validityDays: integer("validity_days").notNull().default(15),
  bedroomFactorBase: integer("bedroom_factor_base").notNull().default(3),
  perBedroomDelta: decimal("per_bedroom_delta", { precision: 5, scale: 3 }).notNull().default("0.10"),
  paymentScheduleJson: text("payment_schedule_json").notNull().default("[]"),
  cityFactorsJson: text("city_factors_json").notNull().default("[]"),
  footerLine1: text("footer_line_1").notNull().default("TRECASA Design Studio | Luxury Interiors | Architecture | Build"),
  footerLine2: text("footer_line_2").notNull().default("www.trecasadesignstudio.com | +91-XXXXXXXXXX"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const buildTypeEnum = z.enum(["handmade", "factory"]);

export const insertGlobalRulesSchema = createInsertSchema(globalRules, {
  buildTypeDefault: buildTypeEnum,
  gstPercent: z.number().int().min(0).max(28).default(18),
  validityDays: z.number().int().min(1).max(90).default(15),
  bedroomFactorBase: z.number().int().min(1).max(5).default(3),
  perBedroomDelta: z.number().min(0).max(0.25).default(0.10),
  paymentScheduleJson: z.string().transform((val) => {
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) throw new Error("Must be array");
      return val;
    } catch {
      throw new Error("paymentScheduleJson must be valid JSON array");
    }
  }),
  cityFactorsJson: z.string().transform((val) => {
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) throw new Error("Must be array");
      return val;
    } catch {
      throw new Error("cityFactorsJson must be valid JSON array");
    }
  }),
  footerLine1: z.string().min(1).max(200),
  footerLine2: z.string().min(1).max(200),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GlobalRulesRow = typeof globalRules.$inferSelect;
export type NewGlobalRulesRow = z.infer<typeof insertGlobalRulesSchema>;

// Change Orders table
export const changeOrders = pgTable("change_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: varchar("quotation_id").notNull().references(() => quotations.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Change Order ID (e.g., TRE_CO_250115_X1Y2)
  changeOrderId: varchar("change_order_id").notNull().unique(),
  
  // Change Order Info
  title: varchar("title").notNull(), // e.g., "Additional Kitchen Cabinets"
  description: text("description"), // Detailed explanation of changes
  
  // Status workflow
  status: varchar("status").notNull().default("draft"), // draft, sent, approved, rejected
  
  // Approval tracking
  approvedAt: bigint("approved_at", { mode: "number" }), // Unix timestamp
  approvedBy: varchar("approved_by"), // User who approved
  
  // Totals (calculated)
  totals: jsonb("totals").$type<{
    interiorsSubtotal: number; // Total for interior items
    fcSubtotal: number; // Total for FC items
    grandSubtotal: number; // Combined subtotal
    updatedAt: number;
  }>(),
  
  // Discount (optional for change orders)
  discountType: varchar("discount_type").default("percent"), // percent or amount
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).default("0"),
  
  // Revised total (original quote + all approved change orders)
  revisedTotal: decimal("revised_total", { precision: 10, scale: 2 }),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const changeOrdersRelations = relations(changeOrders, ({ one, many }) => ({
  quotation: one(quotations, {
    fields: [changeOrders.quotationId],
    references: [quotations.id],
  }),
  user: one(users, {
    fields: [changeOrders.userId],
    references: [users.id],
  }),
  items: many(changeOrderItems),
}));

// Change Order Items (similar to interior items but tracks additions/deletions)
export const changeOrderItems = pgTable("change_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  changeOrderId: varchar("change_order_id").notNull().references(() => changeOrders.id, { onDelete: 'cascade' }),
  
  // Item type (interior or false ceiling)
  itemType: varchar("item_type").notNull().default("interior"), // interior, falseCeiling, other
  
  // Change type (addition or credit/deletion)
  changeType: varchar("change_type").notNull().default("addition"), // addition, credit
  
  // Room and description
  roomType: varchar("room_type").notNull(), // Kitchen, Living, etc.
  description: text("description"),
  
  // Calculation type
  calc: varchar("calc").notNull().default("SQFT"), // SQFT, COUNT, LSUM
  
  // Dimensions
  length: decimal("length", { precision: 10, scale: 2 }),
  height: decimal("height", { precision: 10, scale: 2 }),
  width: decimal("width", { precision: 10, scale: 2 }),
  sqft: decimal("sqft", { precision: 10, scale: 2 }),
  
  // Build Type
  buildType: varchar("build_type").notNull().default("handmade"),
  
  // Materials/Finishes/Hardware
  material: varchar("material").notNull().default("Generic Ply"),
  finish: varchar("finish").notNull().default("Generic Laminate"),
  hardware: varchar("hardware").notNull().default("Nimmi"),
  
  // Pricing
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  
  // Rate override
  rateAuto: decimal("rate_auto", { precision: 10, scale: 2 }),
  rateOverride: decimal("rate_override", { precision: 10, scale: 2 }),
  isRateOverridden: boolean("is_rate_overridden").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const changeOrderItemsRelations = relations(changeOrderItems, ({ one }) => ({
  changeOrder: one(changeOrders, {
    fields: [changeOrderItems.changeOrderId],
    references: [changeOrders.id],
  }),
}));

export const insertChangeOrderSchema = createInsertSchema(changeOrders, {
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  status: z.enum(["draft", "sent", "approved", "rejected"]),
  discountType: z.enum(["percent", "amount"]),
  discountValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
}).omit({
  id: true,
  changeOrderId: true,
  createdAt: true,
  updatedAt: true,
});

export type ChangeOrder = typeof changeOrders.$inferSelect;
export type NewChangeOrder = z.infer<typeof insertChangeOrderSchema>;

export const insertChangeOrderItemSchema = createInsertSchema(changeOrderItems, {
  itemType: z.enum(["interior", "falseCeiling", "other"]),
  changeType: z.enum(["addition", "credit"]),
  roomType: z.string().min(1),
  description: z.string().optional(),
  calc: z.enum(["SQFT", "COUNT", "LSUM"]),
  buildType: z.enum(["handmade", "factory"]),
}).omit({
  id: true,
  createdAt: true,
});

export type ChangeOrderItem = typeof changeOrderItems.$inferSelect;
export type NewChangeOrderItem = z.infer<typeof insertChangeOrderItemSchema>;

// Audit Log table
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // For now store user ID; later hook real auth
  userEmail: varchar("user_email"), // Store email for display
  section: varchar("section").notNull(), // "Rates" | "Templates" | "Brands" | "Painting&FC" | "GlobalRules"
  action: varchar("action").notNull(), // "CREATE" | "UPDATE" | "DELETE"
  targetId: varchar("target_id").notNull(), // ID of the row affected
  summary: text("summary").notNull(), // Human-readable summary
  beforeJson: text("before_json"), // JSON string (nullable)
  afterJson: text("after_json"), // JSON string (nullable)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLog, {
  section: z.enum(["Rates", "Templates", "Brands", "Painting&FC", "GlobalRules", "Quotes", "Agreement"]),
  action: z.enum(["CREATE", "UPDATE", "DELETE"]),
  summary: z.string().min(1).max(500),
}).omit({
  id: true,
  createdAt: true,
});

export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = z.infer<typeof insertAuditLogSchema>;
