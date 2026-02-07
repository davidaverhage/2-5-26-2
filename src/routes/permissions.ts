import { Router } from "express";
import type { PermissionService } from "../services/permission_service.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import type { CreatePermissionInput } from "../types/index.js";

/**
 * Create permission management routes.
 * All routes require authentication.
 */
export function createPermissionRoutes(permissionService: PermissionService): Router {
  const router = Router();

  /** GET /api/permissions/note/:noteId - Get permissions for a note */
  router.get("/note/:noteId", requireAuth, (req, res) => {
    const noteId = req.params.noteId as string;
    const permissions = permissionService.getNotePermissions(noteId);
    res.json(permissions);
  });

  /** GET /api/permissions/user/:userId - Get direct permissions for a user */
  router.get("/user/:userId", requireAuth, (req, res) => {
    const sessionUser = req.session.user!;
    const userId = req.params.userId as string;

    // Non-admins can only view their own permissions
    if (sessionUser.role !== "admin" && sessionUser.userId !== userId) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    const permissions = permissionService.getUserPermissions(userId);
    res.json(permissions);
  });

  /** GET /api/permissions/effective/:userId - Get effective permissions for a user (including group) */
  router.get("/effective/:userId", requireAuth, (req, res) => {
    const sessionUser = req.session.user!;
    const userId = req.params.userId as string;

    if (sessionUser.role !== "admin" && sessionUser.userId !== userId) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    const permissions = permissionService.getEffectivePermissions(userId);
    res.json(permissions);
  });

  /** POST /api/permissions/check - Check if user has permission on a note */
  router.post("/check", requireAuth, (req, res) => {
    const { userId, noteId, action, parentNoteIds } = req.body as {
      userId?: string;
      noteId?: string;
      action?: string;
      parentNoteIds?: string[];
    };

    if (!userId || !noteId || !action) {
      res.status(400).json({ error: "userId, noteId, and action are required" });
      return;
    }

    const hasPermission = permissionService.checkPermission(
      userId,
      noteId,
      action as "read" | "write" | "delete" | "manage",
      parentNoteIds
    );

    res.json({ hasPermission });
  });

  /** POST /api/permissions - Create a new permission (admin only) */
  router.post("/", requireAuth, requireAdmin, (req, res) => {
    const input = req.body as CreatePermissionInput;
    try {
      const permission = permissionService.createPermission(input);
      res.status(201).json(permission);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create permission";
      res.status(400).json({ error: message });
    }
  });

  /** DELETE /api/permissions/:permissionId - Delete a permission (admin only) */
  router.delete("/:permissionId", requireAuth, requireAdmin, (req, res) => {
    const permissionId = req.params.permissionId as string;
    const deleted = permissionService.deletePermission(permissionId);
    if (!deleted) {
      res.status(404).json({ error: "Permission not found" });
      return;
    }
    res.json({ success: true });
  });

  return router;
}
