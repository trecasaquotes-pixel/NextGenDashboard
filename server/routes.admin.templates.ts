import type { Express } from "express";
import { db } from "./db";
import {
  templates,
  templateRooms,
  templateItems,
  insertTemplateSchema,
  insertTemplateRoomSchema,
  insertTemplateItemSchema,
} from "@shared/schema";
import { eq, sql, and, or, like } from "drizzle-orm";
import { z } from "zod";
import { getAdminUser, logAudit, createTemplateSummary } from "./lib/audit";
import { sendErrorResponse } from "./utils/apiError";

export function registerAdminTemplatesRoutes(app: Express, isAuthenticated: any) {
  // GET /api/admin/templates - List all templates with filters
  app.get("/api/admin/templates", isAuthenticated, async (req: any, res) => {
    try {
      const { q, category, active } = req.query;

      let conditions = [];

      // Search filter
      if (q) {
        const searchTerm = `%${q}%`;
        conditions.push(like(templates.name, searchTerm));
      }

      // Category filter
      if (category && category !== "all") {
        conditions.push(eq(templates.category, category as string));
      }

      // Active filter
      if (active && active !== "all" && active !== "") {
        const isActive = active === "1" || active === "true";
        conditions.push(eq(templates.isActive, isActive));
      }

      const result =
        conditions.length > 0
          ? await db
              .select()
              .from(templates)
              .where(and(...conditions))
              .orderBy(templates.name)
          : await db.select().from(templates).orderBy(templates.name);

      res.json(result);
    } catch (error) {
    sendErrorResponse(res, { status: 500, message: "Failed to fetch templates", error });
  }
  });

  // GET /api/admin/templates/:id - Get template with rooms and items
  app.get("/api/admin/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      const [template] = await db.select().from(templates).where(eq(templates.id, id));
      if (!template) {
        return sendErrorResponse(res, { status: 404, message: "Template not found" });
      }

      const rooms = await db
        .select()
        .from(templateRooms)
        .where(eq(templateRooms.templateId, id))
        .orderBy(templateRooms.sortOrder);

      const roomsWithItems = await Promise.all(
        rooms.map(async (room) => {
          const items = await db
            .select()
            .from(templateItems)
            .where(eq(templateItems.templateRoomId, room.id))
            .orderBy(templateItems.sortOrder);

          return { ...room, items };
        }),
      );

      res.json({ ...template, rooms: roomsWithItems });
    } catch (error) {
    sendErrorResponse(res, { status: 500, message: "Failed to fetch template", error });
  }
  });

  // POST /api/admin/templates - Create new template
  app.post("/api/admin/templates", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertTemplateSchema.parse(req.body);

      const [newTemplate] = await db
        .insert(templates)
        .values({
          ...validatedData,
          isActive: validatedData.isActive ?? true,
        })
        .returning();

      // Log audit
      const adminUser = getAdminUser(req);
      await logAudit({
        ...adminUser,
        section: "Templates",
        action: "CREATE",
        targetId: newTemplate.id,
        summary: createTemplateSummary("CREATE", null, newTemplate),
        afterJson: newTemplate,
      });

      res.status(201).json(newTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendErrorResponse(res, {
          status: 400,
          message: "Validation error",
          details: error.errors,
          error,
        });
      }
      sendErrorResponse(res, { status: 500, message: "Failed to create template", error });
    }
  });

  // PUT /api/admin/templates/:id - Update template
  app.put("/api/admin/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = z
        .object({
          name: z.string().min(2).max(100).optional(),
          category: z.string().optional(),
          isActive: z.boolean().optional(),
        })
        .parse(req.body);

      // Fetch existing template for audit
      const [existingTemplate] = await db.select().from(templates).where(eq(templates.id, id));
      if (!existingTemplate) {
        return sendErrorResponse(res, { status: 404, message: "Template not found" });
      }

      const [updatedTemplate] = await db
        .update(templates)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(templates.id, id))
        .returning();

      if (!updatedTemplate) {
        return sendErrorResponse(res, { status: 404, message: "Template not found" });
      }

      // Log audit
      const adminUser = getAdminUser(req);
      await logAudit({
        ...adminUser,
        section: "Templates",
        action: "UPDATE",
        targetId: id,
        summary: createTemplateSummary("UPDATE", existingTemplate, updatedTemplate),
        beforeJson: existingTemplate,
        afterJson: updatedTemplate,
      });

      res.json(updatedTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendErrorResponse(res, {
          status: 400,
          message: "Validation error",
          details: error.errors,
          error,
        });
      }
      sendErrorResponse(res, { status: 500, message: "Failed to update template", error });
    }
  });

  // DELETE /api/admin/templates/:id - Soft delete template
  app.delete("/api/admin/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Fetch existing template for audit
      const [existingTemplate] = await db.select().from(templates).where(eq(templates.id, id));
      if (!existingTemplate) {
        return sendErrorResponse(res, { status: 404, message: "Template not found" });
      }

      const [deletedTemplate] = await db
        .update(templates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(templates.id, id))
        .returning();

      if (!deletedTemplate) {
        return sendErrorResponse(res, { status: 404, message: "Template not found" });
      }

      // Log audit
      const adminUser = getAdminUser(req);
      await logAudit({
        ...adminUser,
        section: "Templates",
        action: "DELETE",
        targetId: id,
        summary: createTemplateSummary("DELETE", existingTemplate, deletedTemplate),
        beforeJson: existingTemplate,
        afterJson: deletedTemplate,
      });

      res.json(deletedTemplate);
    } catch (error) {
    sendErrorResponse(res, { status: 500, message: "Failed to delete template", error });
  }
  });

  // POST /api/admin/templates/:id/rooms - Add room to template
  app.post("/api/admin/templates/:id/rooms", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const roomData = insertTemplateRoomSchema.parse({ ...req.body, templateId: id });

      const [newRoom] = await db.insert(templateRooms).values(roomData).returning();

      res.status(201).json(newRoom);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendErrorResponse(res, {
          status: 400,
          message: "Validation error",
          details: error.errors,
          error,
        });
      }
      sendErrorResponse(res, { status: 500, message: "Failed to add room", error });
    }
  });

  // PUT /api/admin/templates/:id/rooms/:roomId - Update room
  app.put("/api/admin/templates/:id/rooms/:roomId", isAuthenticated, async (req: any, res) => {
    try {
      const { roomId } = req.params;
      const updateData = z
        .object({
          roomName: z.string().min(2).max(60).optional(),
          sortOrder: z.number().min(0).optional(),
        })
        .parse(req.body);

      const [updatedRoom] = await db
        .update(templateRooms)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(templateRooms.id, roomId))
        .returning();

      if (!updatedRoom) {
        return sendErrorResponse(res, { status: 404, message: "Room not found" });
      }

      res.json(updatedRoom);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendErrorResponse(res, {
          status: 400,
          message: "Validation error",
          details: error.errors,
          error,
        });
      }
      sendErrorResponse(res, { status: 500, message: "Failed to update room", error });
    }
  });

  // DELETE /api/admin/templates/:id/rooms/:roomId - Delete room
  app.delete("/api/admin/templates/:id/rooms/:roomId", isAuthenticated, async (req: any, res) => {
    try {
      const { roomId } = req.params;

      await db.delete(templateRooms).where(eq(templateRooms.id, roomId));

      res.json({ success: true });
    } catch (error) {
      sendErrorResponse(res, { status: 500, message: "Failed to delete room", error });
    }
  });

  // POST /api/admin/templates/:id/rooms/:roomId/items - Add item to room
  app.post(
    "/api/admin/templates/:id/rooms/:roomId/items",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { roomId } = req.params;
        const itemData = insertTemplateItemSchema.parse({ ...req.body, templateRoomId: roomId });

        const [newItem] = await db.insert(templateItems).values(itemData).returning();

        res.status(201).json(newItem);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return sendErrorResponse(res, {
            status: 400,
            message: "Validation error",
            details: error.errors,
            error,
          });
        }
        sendErrorResponse(res, { status: 500, message: "Failed to add item", error });
      }
    },
  );

  // PUT /api/admin/templates/:id/rooms/:roomId/items/:itemId - Update item
  app.put(
    "/api/admin/templates/:id/rooms/:roomId/items/:itemId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { itemId } = req.params;
        const updateData = z
          .object({
            itemKey: z.string().min(2).optional(),
            displayName: z.string().min(2).max(80).optional(),
            unit: z.enum(["SFT", "COUNT", "LSUM"]).optional(),
            isWallHighlightOrPanel: z.boolean().optional(),
            sortOrder: z.number().min(0).optional(),
          })
          .parse(req.body);

        const [updatedItem] = await db
          .update(templateItems)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(templateItems.id, itemId))
          .returning();

        if (!updatedItem) {
          return sendErrorResponse(res, { status: 404, message: "Item not found" });
        }

        res.json(updatedItem);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return sendErrorResponse(res, {
            status: 400,
            message: "Validation error",
            details: error.errors,
            error,
          });
        }
        sendErrorResponse(res, { status: 500, message: "Failed to update item", error });
      }
    },
  );

  // DELETE /api/admin/templates/:id/rooms/:roomId/items/:itemId - Delete item
  app.delete(
    "/api/admin/templates/:id/rooms/:roomId/items/:itemId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { itemId } = req.params;

        await db.delete(templateItems).where(eq(templateItems.id, itemId));

        res.json({ success: true });
      } catch (error) {
    sendErrorResponse(res, { status: 500, message: "Failed to delete item", error });
  }
    },
  );

  // POST /api/admin/templates/import - Import template from JSON
  app.post("/api/admin/templates/import", isAuthenticated, async (req: any, res) => {
    try {
      const { json: templateData } = req.body;

      if (!templateData || !templateData.template) {
        return sendErrorResponse(res, { status: 400, message: "Invalid import data" });
      }

      // Create template
      const [newTemplate] = await db
        .insert(templates)
        .values({
          name: templateData.template.name,
          category: templateData.template.category,
          isActive: templateData.template.isActive ?? true,
        })
        .returning();

      // Create rooms and items
      if (templateData.rooms && templateData.rooms.length > 0) {
        for (const roomData of templateData.rooms) {
          const [newRoom] = await db
            .insert(templateRooms)
            .values({
              templateId: newTemplate.id,
              roomName: roomData.roomName,
              sortOrder: roomData.sortOrder || 0,
            })
            .returning();

          if (roomData.items && roomData.items.length > 0) {
            await db.insert(templateItems).values(
              roomData.items.map((item: any) => ({
                templateRoomId: newRoom.id,
                itemKey: item.itemKey,
                displayName: item.displayName,
                unit: item.unit || "SFT",
                isWallHighlightOrPanel: item.isWallHighlightOrPanel || false,
                sortOrder: item.sortOrder || 0,
              })),
            );
          }
        }
      }

      res.status(201).json(newTemplate);
    } catch (error) {
    sendErrorResponse(res, { status: 500, message: "Failed to import template", error });
  }
  });

  // GET /api/admin/templates/:id/export - Export template as JSON
  app.get("/api/admin/templates/:id/export", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      const [template] = await db.select().from(templates).where(eq(templates.id, id));
      if (!template) {
        return sendErrorResponse(res, { status: 404, message: "Template not found" });
      }

      const rooms = await db
        .select()
        .from(templateRooms)
        .where(eq(templateRooms.templateId, id))
        .orderBy(templateRooms.sortOrder);

      const roomsWithItems = await Promise.all(
        rooms.map(async (room) => {
          const items = await db
            .select()
            .from(templateItems)
            .where(eq(templateItems.templateRoomId, room.id))
            .orderBy(templateItems.sortOrder);

          return {
            roomName: room.roomName,
            sortOrder: room.sortOrder,
            items: items.map((item) => ({
              itemKey: item.itemKey,
              displayName: item.displayName,
              unit: item.unit,
              isWallHighlightOrPanel: item.isWallHighlightOrPanel,
              sortOrder: item.sortOrder,
            })),
          };
        }),
      );

      const exportData = {
        template: {
          name: template.name,
          category: template.category,
          isActive: template.isActive,
        },
        rooms: roomsWithItems,
        exportedAt: new Date().toISOString(),
      };

      res.json(exportData);
    } catch (error) {
    sendErrorResponse(res, { status: 500, message: "Failed to export template", error });
  }
  });

  // POST /api/admin/templates/:id/duplicate - Duplicate a template
  app.post("/api/admin/templates/:id/duplicate", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      const [originalTemplate] = await db.select().from(templates).where(eq(templates.id, id));
      if (!originalTemplate) {
        return sendErrorResponse(res, { status: 404, message: "Template not found" });
      }

      // Create new template with "(copy)" appended
      const [newTemplate] = await db
        .insert(templates)
        .values({
          name: `${originalTemplate.name} (copy)`,
          category: originalTemplate.category,
          isActive: originalTemplate.isActive,
        })
        .returning();

      // Copy rooms
      const rooms = await db
        .select()
        .from(templateRooms)
        .where(eq(templateRooms.templateId, id))
        .orderBy(templateRooms.sortOrder);

      for (const room of rooms) {
        const [newRoom] = await db
          .insert(templateRooms)
          .values({
            templateId: newTemplate.id,
            roomName: room.roomName,
            sortOrder: room.sortOrder,
          })
          .returning();

        // Copy items
        const items = await db
          .select()
          .from(templateItems)
          .where(eq(templateItems.templateRoomId, room.id));

        if (items.length > 0) {
          await db.insert(templateItems).values(
            items.map((item) => ({
              templateRoomId: newRoom.id,
              itemKey: item.itemKey,
              displayName: item.displayName,
              unit: item.unit,
              isWallHighlightOrPanel: item.isWallHighlightOrPanel,
              sortOrder: item.sortOrder,
            })),
          );
        }
      }

      res.status(201).json(newTemplate);
    } catch (error) {
    sendErrorResponse(res, { status: 500, message: "Failed to duplicate template", error });
  }
  });
}
