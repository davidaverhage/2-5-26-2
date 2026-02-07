import { Router } from "express";
import type { UserService } from "../services/user_service.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import type { CreateUserInput, UpdateUserInput } from "../types/index.js";

/**
 * Create user management routes.
 * All routes require authentication, most require admin role.
 */
export function createUserRoutes(userService: UserService): Router {
  const router = Router();

  /** GET /api/users - List all users (admin only) */
  router.get("/", requireAuth, requireAdmin, (_req, res) => {
    const users = userService.listUsers();
    res.json(users);
  });

  /** GET /api/users/:userId - Get a specific user (admin or self) */
  router.get("/:userId", requireAuth, (req, res) => {
    const sessionUser = req.session.user!;
    const userId = req.params.userId as string;

    // Non-admins can only view their own profile
    if (sessionUser.role !== "admin" && sessionUser.userId !== userId) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    const user = userService.getSafeUserById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  });

  /** POST /api/users - Create a new user (admin only) */
  router.post("/", requireAuth, requireAdmin, (req, res) => {
    const input = req.body as CreateUserInput;

    try {
      const user = userService.createUser(input);
      res.status(201).json(user);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create user";
      res.status(400).json({ error: message });
    }
  });

  /** PATCH /api/users/:userId - Update a user (admin or self for limited fields) */
  router.patch("/:userId", requireAuth, (req, res) => {
    const sessionUser = req.session.user!;
    const userId = req.params.userId as string;
    const input = req.body as UpdateUserInput;

    // Non-admins can only update their own password and email
    if (sessionUser.role !== "admin" && sessionUser.userId !== userId) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    // Non-admins cannot change roles or active status
    if (sessionUser.role !== "admin") {
      delete input.role;
      delete input.isActive;
      delete input.username;
    }

    try {
      const user = userService.updateUser(userId, input);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(user);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update user";
      res.status(400).json({ error: message });
    }
  });

  /** DELETE /api/users/:userId - Delete a user (admin only) */
  router.delete("/:userId", requireAuth, requireAdmin, (req, res) => {
    const sessionUser = req.session.user!;
    const userId = req.params.userId as string;

    // Prevent self-deletion
    if (sessionUser.userId === userId) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }

    const deleted = userService.deleteUser(userId);
    if (!deleted) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ success: true });
  });

  return router;
}
