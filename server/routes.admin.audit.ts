import type { Express } from "express";
import { db } from "./db";
import { auditLog } from "@shared/schema";
import { eq, and, or, like, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";

export function registerAdminAuditRoutes(app: Express, isAuthenticated: any) {
  // GET /api/admin/audit - List audit logs with filters and pagination
  app.get("/api/admin/audit", isAuthenticated, async (req: any, res) => {
    try {
      const querySchema = z.object({
        q: z.string().optional(), // Search in summary, user email
        section: z.enum(["Rates", "Templates", "Brands", "Painting&FC", "GlobalRules"]).optional(),
        action: z.enum(["CREATE", "UPDATE", "DELETE"]).optional(),
        since: z.string().optional(), // Unix timestamp (ms)
        until: z.string().optional(), // Unix timestamp (ms)
        page: z.string().optional().default("1"),
        pageSize: z.string().optional().default("50"),
      });

      const filters = querySchema.parse(req.query);
      const page = parseInt(filters.page);
      const pageSize = Math.min(parseInt(filters.pageSize), 200); // Max 200
      const offset = (page - 1) * pageSize;

      let conditions = [];

      // Search filter (summary or user email)
      if (filters.q) {
        const searchTerm = `%${filters.q}%`;
        conditions.push(
          or(like(auditLog.summary, searchTerm), like(auditLog.userEmail, searchTerm)),
        );
      }

      // Section filter
      if (filters.section) {
        conditions.push(eq(auditLog.section, filters.section));
      }

      // Action filter
      if (filters.action) {
        conditions.push(eq(auditLog.action, filters.action));
      }

      // Date range filters
      if (filters.since) {
        const sinceDate = new Date(parseInt(filters.since));
        conditions.push(gte(auditLog.createdAt, sinceDate));
      }

      if (filters.until) {
        const untilDate = new Date(parseInt(filters.until));
        conditions.push(lte(auditLog.createdAt, untilDate));
      }

      // Build query with conditions
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = whereClause
        ? await db.select().from(auditLog).where(whereClause)
        : await db.select().from(auditLog);
      const total = countResult.length;

      // Get paginated results (without beforeJson/afterJson for list view)
      const results = await db
        .select({
          id: auditLog.id,
          userId: auditLog.userId,
          userEmail: auditLog.userEmail,
          section: auditLog.section,
          action: auditLog.action,
          targetId: auditLog.targetId,
          summary: auditLog.summary,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .where(whereClause)
        .orderBy(desc(auditLog.createdAt))
        .limit(pageSize)
        .offset(offset);

      res.json({
        rows: results,
        total,
        page,
        pageSize,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
      }
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // GET /api/admin/audit/:id - Get single audit entry with full JSON
  app.get("/api/admin/audit/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      const [entry] = await db.select().from(auditLog).where(eq(auditLog.id, id));

      if (!entry) {
        return res.status(404).json({ message: "Audit entry not found" });
      }

      res.json(entry);
    } catch (error) {
      console.error("Error fetching audit entry:", error);
      res.status(500).json({ message: "Failed to fetch audit entry" });
    }
  });
}
