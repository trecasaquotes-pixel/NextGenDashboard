import type { Express, Request, Response } from "express";
import { isAuthenticated } from "./replitAuth";
import type { IStorage } from "./storage";
import { userRoleEnum } from "@shared/schema";
import { z } from "zod";
import { logAudit, getAdminUser } from "./lib/audit";

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
          return res.status(403).json({ message: "Admin access required" });
        }

        const users = await storage.getAllUsers();
        res.json(users);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Failed to fetch users" });
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
          return res.status(403).json({ message: "Admin access required" });
        }

        const validation = updateRoleSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({ 
            message: "Invalid role",
            errors: validation.error.errors 
          });
        }

        const { role } = validation.data;
        const userId = req.params.userId;

        if (userId === req.user.claims.sub) {
          return res.status(400).json({ 
            message: "Cannot change your own role" 
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
        console.error("Error updating user role:", error);
        res.status(500).json({ message: "Failed to update user role" });
      }
    },
  );
}
