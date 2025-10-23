// Referenced from javascript_log_in_with_replit and javascript_database blueprints
import {
  users,
  quotations,
  interiorItems,
  falseCeilingItems,
  otherItems,
  agreements,
  quotationVersions,
  paintingPacks,
  type User,
  type UpsertUser,
  type Quotation,
  type InsertQuotation,
  type InteriorItem,
  type InsertInteriorItem,
  type FalseCeilingItem,
  type InsertFalseCeilingItem,
  type OtherItem,
  type InsertOtherItem,
  type Agreement,
  type InsertAgreement,
  type QuotationVersion,
  type NewQuotationVersion,
  type PaintingPackRow,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { generateQuoteId } from "./utils/generateQuoteId";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<User>;

  // Quotation operations
  getQuotations(userId: string): Promise<Quotation[]>;
  getQuotation(id: string): Promise<Quotation | undefined>;
  createQuotation(quotation: InsertQuotation): Promise<Quotation>;
  updateQuotation(id: string, data: Partial<InsertQuotation>): Promise<Quotation>;
  deleteQuotation(id: string): Promise<void>;

  // Interior items operations
  getInteriorItems(quotationId: string): Promise<InteriorItem[]>;
  createInteriorItem(item: InsertInteriorItem): Promise<InteriorItem>;
  updateInteriorItem(id: string, data: Partial<InsertInteriorItem>): Promise<InteriorItem>;
  deleteInteriorItem(id: string): Promise<void>;

  // False ceiling items operations
  getFalseCeilingItems(quotationId: string): Promise<FalseCeilingItem[]>;
  createFalseCeilingItem(item: InsertFalseCeilingItem): Promise<FalseCeilingItem>;
  updateFalseCeilingItem(
    id: string,
    data: Partial<InsertFalseCeilingItem>,
  ): Promise<FalseCeilingItem>;
  deleteFalseCeilingItem(id: string): Promise<void>;

  // Other items operations
  getOtherItems(quotationId: string): Promise<OtherItem[]>;
  createOtherItem(item: InsertOtherItem): Promise<OtherItem>;
  updateOtherItem(id: string, data: Partial<InsertOtherItem>): Promise<OtherItem>;
  deleteOtherItem(id: string): Promise<void>;

  // Agreement operations
  getAgreement(id: string): Promise<Agreement | undefined>;
  getAgreementByQuotationId(quotationId: string): Promise<Agreement | undefined>;
  createAgreement(agreement: InsertAgreement): Promise<Agreement>;
  updateAgreement(id: string, data: Partial<InsertAgreement>): Promise<Agreement>;

  // Version history operations
  getQuotationVersions(quotationId: string): Promise<QuotationVersion[]>;
  createQuotationVersion(version: NewQuotationVersion): Promise<QuotationVersion>;
  getLatestVersionNumber(quotationId: string): Promise<number>;

  // Quotation locking operations
  verifyLockOwnership(
    quotationId: string,
    userId: string,
  ): Promise<{ hasLock: boolean; lockedByName?: string }>;
  acquireLock(
    quotationId: string,
    userId: string,
  ): Promise<{ success: boolean; lockedBy?: string; lockedByName?: string }>;
  releaseLock(quotationId: string, userId: string): Promise<{ success: boolean }>;
  updateLockHeartbeat(quotationId: string, userId: string): Promise<{ success: boolean }>;
  checkLockStatus(
    quotationId: string,
  ): Promise<{ isLocked: boolean; lockedBy?: string; lockedByName?: string; lockedAt?: number }>;

  // Painting pack operations
  getActivePaintingPacks(): Promise<PaintingPackRow[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user with this email already exists
    if (userData.email) {
      const existingByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingByEmail.length > 0) {
        // Update existing user (use the existing user's ID)
        const [user] = await db
          .update(users)
          .set({
            ...userData,
            id: existingByEmail[0].id, // Keep the existing ID
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingByEmail[0].id))
          .returning();
        return user;
      }
    }

    // Insert new user or update if ID conflicts
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  // Quotation operations
  async getQuotations(userId: string): Promise<Quotation[]> {
    return await db
      .select()
      .from(quotations)
      .where(eq(quotations.userId, userId))
      .orderBy(desc(quotations.createdAt));
  }

  async getQuotation(id: string): Promise<Quotation | undefined> {
    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id));
    return quotation;
  }

  async createQuotation(quotation: InsertQuotation): Promise<Quotation> {
    const quoteId = generateQuoteId();
    const [newQuotation] = await db
      .insert(quotations)
      .values({ ...quotation, quoteId } as any)
      .returning();
    return newQuotation;
  }

  async updateQuotation(id: string, data: Partial<InsertQuotation>): Promise<Quotation> {
    const [updated] = await db
      .update(quotations)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(quotations.id, id))
      .returning();
    return updated;
  }

  async deleteQuotation(id: string): Promise<void> {
    await db.delete(quotations).where(eq(quotations.id, id));
  }

  // Interior items operations
  async getInteriorItems(quotationId: string): Promise<InteriorItem[]> {
    return await db
      .select()
      .from(interiorItems)
      .where(eq(interiorItems.quotationId, quotationId))
      .orderBy(interiorItems.createdAt);
  }

  async createInteriorItem(item: InsertInteriorItem): Promise<InteriorItem> {
    const [newItem] = await db.insert(interiorItems).values(item).returning();
    return newItem;
  }

  async updateInteriorItem(id: string, data: Partial<InsertInteriorItem>): Promise<InteriorItem> {
    // Filter out readonly fields that cannot be updated
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...updateData } = data as any;
    
    const [updated] = await db
      .update(interiorItems)
      .set(updateData)
      .where(eq(interiorItems.id, id))
      .returning();
    return updated;
  }

  async deleteInteriorItem(id: string): Promise<void> {
    await db.delete(interiorItems).where(eq(interiorItems.id, id));
  }

  // False ceiling items operations
  async getFalseCeilingItems(quotationId: string): Promise<FalseCeilingItem[]> {
    return await db
      .select()
      .from(falseCeilingItems)
      .where(eq(falseCeilingItems.quotationId, quotationId))
      .orderBy(falseCeilingItems.createdAt);
  }

  async createFalseCeilingItem(item: InsertFalseCeilingItem): Promise<FalseCeilingItem> {
    const [newItem] = await db.insert(falseCeilingItems).values(item).returning();
    return newItem;
  }

  async updateFalseCeilingItem(
    id: string,
    data: Partial<InsertFalseCeilingItem>,
  ): Promise<FalseCeilingItem> {
    // Filter out readonly fields that cannot be updated
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...updateData } = data as any;
    
    const [updated] = await db
      .update(falseCeilingItems)
      .set(updateData)
      .where(eq(falseCeilingItems.id, id))
      .returning();
    return updated;
  }

  async deleteFalseCeilingItem(id: string): Promise<void> {
    await db.delete(falseCeilingItems).where(eq(falseCeilingItems.id, id));
  }

  // Other items operations
  async getOtherItems(quotationId: string): Promise<OtherItem[]> {
    return await db
      .select()
      .from(otherItems)
      .where(eq(otherItems.quotationId, quotationId))
      .orderBy(otherItems.createdAt);
  }

  async createOtherItem(item: InsertOtherItem): Promise<OtherItem> {
    const [newItem] = await db.insert(otherItems).values(item).returning();
    return newItem;
  }

  async updateOtherItem(id: string, data: Partial<InsertOtherItem>): Promise<OtherItem> {
    const [updated] = await db
      .update(otherItems)
      .set(data)
      .where(eq(otherItems.id, id))
      .returning();
    return updated;
  }

  async deleteOtherItem(id: string): Promise<void> {
    await db.delete(otherItems).where(eq(otherItems.id, id));
  }

  // Agreement operations
  async getAgreement(id: string): Promise<Agreement | undefined> {
    const [agreement] = await db.select().from(agreements).where(eq(agreements.id, id));
    return agreement;
  }

  async getAgreementByQuotationId(quotationId: string): Promise<Agreement | undefined> {
    const [agreement] = await db
      .select()
      .from(agreements)
      .where(eq(agreements.quotationId, quotationId));
    return agreement;
  }

  async createAgreement(agreement: InsertAgreement): Promise<Agreement> {
    const [newAgreement] = await db
      .insert(agreements)
      .values(agreement as any)
      .returning();
    return newAgreement;
  }

  async updateAgreement(id: string, data: Partial<InsertAgreement>): Promise<Agreement> {
    const [updated] = await db
      .update(agreements)
      .set(data as any)
      .where(eq(agreements.id, id))
      .returning();
    return updated;
  }

  // Version history operations
  async getQuotationVersions(quotationId: string): Promise<QuotationVersion[]> {
    return await db
      .select()
      .from(quotationVersions)
      .where(eq(quotationVersions.quotationId, quotationId))
      .orderBy(desc(quotationVersions.versionNumber));
  }

  async createQuotationVersion(version: NewQuotationVersion): Promise<QuotationVersion> {
    const [newVersion] = await db
      .insert(quotationVersions)
      .values(version as any)
      .returning();
    return newVersion;
  }

  async getLatestVersionNumber(quotationId: string): Promise<number> {
    const versions = await db
      .select()
      .from(quotationVersions)
      .where(eq(quotationVersions.quotationId, quotationId))
      .orderBy(desc(quotationVersions.versionNumber))
      .limit(1);

    return versions.length > 0 ? versions[0].versionNumber : 0;
  }

  // Quotation locking operations
  private LOCK_TIMEOUT_MS = 30000; // 30 seconds

  async verifyLockOwnership(
    quotationId: string,
    userId: string,
  ): Promise<{ hasLock: boolean; lockedByName?: string }> {
    const now = Date.now();
    const expireThreshold = now - this.LOCK_TIMEOUT_MS;

    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, quotationId));

    // Quotation doesn't exist - deny operation
    if (!quotation) {
      return { hasLock: false, lockedByName: "Quotation not found" };
    }

    // No lock exists - allow operation
    if (!quotation.lockedBy) {
      return { hasLock: true };
    }

    // Check if lock is expired
    if (!quotation.lockHeartbeat || quotation.lockHeartbeat <= expireThreshold) {
      // Clear expired lock from database
      await db
        .update(quotations)
        .set({
          lockedBy: null,
          lockedAt: null,
          lockHeartbeat: null,
        })
        .where(eq(quotations.id, quotationId));

      // Force client to reacquire lock after expiry
      return { hasLock: false, lockedByName: "Lock expired - please refresh the page" };
    }

    // Lock exists and is active
    if (quotation.lockedBy === userId) {
      return { hasLock: true };
    }

    // Locked by someone else
    const [lockHolder] = await db.select().from(users).where(eq(users.id, quotation.lockedBy));

    return {
      hasLock: false,
      lockedByName: lockHolder
        ? `${lockHolder.firstName || ""} ${lockHolder.lastName || ""}`.trim() ||
          lockHolder.email ||
          "Unknown User"
        : "Unknown User",
    };
  }

  async acquireLock(
    quotationId: string,
    userId: string,
  ): Promise<{ success: boolean; lockedBy?: string; lockedByName?: string }> {
    const now = Date.now();
    const expireThreshold = now - this.LOCK_TIMEOUT_MS;

    // Get current lock status
    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, quotationId));

    if (!quotation) {
      return { success: false };
    }

    // Check if already locked by someone else
    if (quotation.lockedBy && quotation.lockedBy !== userId) {
      // Check if lock is still active (heartbeat within timeout)
      if (quotation.lockHeartbeat && quotation.lockHeartbeat > expireThreshold) {
        // Lock is still active, fetch user name
        const [lockHolder] = await db.select().from(users).where(eq(users.id, quotation.lockedBy));

        return {
          success: false,
          lockedBy: quotation.lockedBy,
          lockedByName: lockHolder
            ? `${lockHolder.firstName || ""} ${lockHolder.lastName || ""}`.trim() ||
              lockHolder.email ||
              "Unknown User"
            : "Unknown User",
        };
      }
    }

    // Acquire or refresh lock
    await db
      .update(quotations)
      .set({
        lockedBy: userId,
        lockedAt: now,
        lockHeartbeat: now,
      })
      .where(eq(quotations.id, quotationId));

    return { success: true };
  }

  async releaseLock(quotationId: string, userId: string): Promise<{ success: boolean }> {
    const now = Date.now();
    const expireThreshold = now - this.LOCK_TIMEOUT_MS;

    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, quotationId));

    if (!quotation) {
      return { success: false };
    }

    // No lock exists - nothing to release
    if (!quotation.lockedBy) {
      return { success: true };
    }

    // Check if lock is expired - allow anyone to release expired locks
    if (!quotation.lockHeartbeat || quotation.lockHeartbeat <= expireThreshold) {
      await db
        .update(quotations)
        .set({
          lockedBy: null,
          lockedAt: null,
          lockHeartbeat: null,
        })
        .where(eq(quotations.id, quotationId));
      return { success: true };
    }

    // Only release if locked by this user (and lock is still active)
    if (quotation.lockedBy === userId) {
      await db
        .update(quotations)
        .set({
          lockedBy: null,
          lockedAt: null,
          lockHeartbeat: null,
        })
        .where(eq(quotations.id, quotationId));
      return { success: true };
    }

    return { success: false };
  }

  async updateLockHeartbeat(quotationId: string, userId: string): Promise<{ success: boolean }> {
    const now = Date.now();
    const expireThreshold = now - this.LOCK_TIMEOUT_MS;

    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, quotationId));

    if (!quotation || quotation.lockedBy !== userId) {
      return { success: false };
    }

    // Reject heartbeat if lock has expired - force reacquisition
    if (!quotation.lockHeartbeat || quotation.lockHeartbeat <= expireThreshold) {
      // Clear expired lock
      await db
        .update(quotations)
        .set({
          lockedBy: null,
          lockedAt: null,
          lockHeartbeat: null,
        })
        .where(eq(quotations.id, quotationId));

      return { success: false };
    }

    // Lock is still active, update heartbeat
    await db.update(quotations).set({ lockHeartbeat: now }).where(eq(quotations.id, quotationId));

    return { success: true };
  }

  async checkLockStatus(
    quotationId: string,
  ): Promise<{ isLocked: boolean; lockedBy?: string; lockedByName?: string; lockedAt?: number }> {
    const now = Date.now();
    const expireThreshold = now - this.LOCK_TIMEOUT_MS;

    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, quotationId));

    if (!quotation || !quotation.lockedBy) {
      return { isLocked: false };
    }

    // Check if lock is expired
    if (!quotation.lockHeartbeat || quotation.lockHeartbeat <= expireThreshold) {
      // Auto-release expired lock
      await db
        .update(quotations)
        .set({
          lockedBy: null,
          lockedAt: null,
          lockHeartbeat: null,
        })
        .where(eq(quotations.id, quotationId));
      return { isLocked: false };
    }

    // Lock is active, get user name
    const [lockHolder] = await db.select().from(users).where(eq(users.id, quotation.lockedBy));

    return {
      isLocked: true,
      lockedBy: quotation.lockedBy,
      lockedByName: lockHolder
        ? `${lockHolder.firstName || ""} ${lockHolder.lastName || ""}`.trim() ||
          lockHolder.email ||
          "Unknown User"
        : "Unknown User",
      lockedAt: quotation.lockedAt || undefined,
    };
  }

  // Painting pack operations
  async getActivePaintingPacks(): Promise<PaintingPackRow[]> {
    return await db
      .select()
      .from(paintingPacks)
      .where(eq(paintingPacks.isActive, true))
      .orderBy(paintingPacks.name);
  }
}

export const storage = new DatabaseStorage();
