import type { Express, Request, Response } from "express";
import { isAuthenticated } from "./replitAuth";
import type { IStorage } from "./storage";
import { userRoleEnum } from "@shared/schema";
import { z } from "zod";
import { logAudit, getAdminUser } from "./lib/audit";
import { sendErrorResponse } from "./utils/apiError";

const updateRoleSchema = z.object({
  role: z.enum(userRoleEnum),
});

export function registerUserManagementRoutes(app: Express, storage: IStorage) {
  app.get(
    "/api/admin/users",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const currentUser = await storage.getUser(req.user.claims.sub);
        
        if (!currentUser || currentUser.role !== "admin") {
          return sendErrorResponse(res, { status: 403, message: "Admin access required" });
        }

        const users = await storage.getAllUsers();
        res.json(users);
      } catch (error) {
    sendErrorResponse(res, { status: 500, message: "Failed to fetch users", error });
  }
    },
  );

  app.patch(
    "/api/admin/users/:userId/role",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const currentUser = await storage.getUser(req.user.claims.sub);
        
        if (!currentUser || currentUser.role !== "admin") {
          return sendErrorResponse(res, { status: 403, message: "Admin access required" });
        }

        const validation = updateRoleSchema.safeParse(req.body);
        if (!validation.success) {
          return sendErrorResponse(res, {
            status: 400,
            message: "Invalid role",
            details: validation.error.errors,
          });
        }

        const { role } = validation.data;
        const userId = req.params.userId;

        const requester = req.user as any;
        if (userId === requester?.claims?.sub) {
          return sendErrorResponse(res, {
            status: 400,
            message: "Cannot change your own role",
          });
        }

        const updated = await storage.updateUserRole(userId, role);
        
        const adminUser = getAdminUser(req);
        await logAudit({
          ...adminUser,
          section: "Users",
          action: "UPDATE",
          targetId: userId,
          summary: `Updated user role to ${role}`,
          afterJson: updated,
        });

        res.json(updated);
      } catch (error) {
    sendErrorResponse(res, { status: 500, message: "Failed to update user role", error });
  }
    },
  );
}
