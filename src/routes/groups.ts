import { Router } from "express";
import type { GroupService } from "../services/group_service.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import type { CreateGroupInput, UpdateGroupInput } from "../types/index.js";

/**
 * Create group management routes.
 * All routes require authentication, most require admin role.
 */
export function createGroupRoutes(groupService: GroupService): Router {
  const router = Router();

  /** GET /api/groups - List all groups */
  router.get("/", requireAuth, (_req, res) => {
    const groups = groupService.listGroups();
    res.json(groups);
  });

  /** GET /api/groups/:groupId - Get a specific group */
  router.get("/:groupId", requireAuth, (req, res) => {
    const groupId = req.params.groupId as string;
    const group = groupService.getGroupById(groupId);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }
    res.json(group);
  });

  /** POST /api/groups - Create a new group (admin only) */
  router.post("/", requireAuth, requireAdmin, (req, res) => {
    const input = req.body as CreateGroupInput;
    try {
      const group = groupService.createGroup(input);
      res.status(201).json(group);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create group";
      res.status(400).json({ error: message });
    }
  });

  /** PATCH /api/groups/:groupId - Update a group (admin only) */
  router.patch("/:groupId", requireAuth, requireAdmin, (req, res) => {
    const groupId = req.params.groupId as string;
    const input = req.body as UpdateGroupInput;
    try {
      const group = groupService.updateGroup(groupId, input);
      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }
      res.json(group);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update group";
      res.status(400).json({ error: message });
    }
  });

  /** DELETE /api/groups/:groupId - Delete a group (admin only) */
  router.delete("/:groupId", requireAuth, requireAdmin, (req, res) => {
    const groupId = req.params.groupId as string;
    const deleted = groupService.deleteGroup(groupId);
    if (!deleted) {
      res.status(404).json({ error: "Group not found" });
      return;
    }
    res.json({ success: true });
  });

  /** GET /api/groups/:groupId/members - Get group members */
  router.get("/:groupId/members", requireAuth, (req, res) => {
    const groupId = req.params.groupId as string;
    const group = groupService.getGroupById(groupId);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }
    const members = groupService.getMembers(groupId);
    res.json(members);
  });

  /** POST /api/groups/:groupId/members - Add a member to group (admin only) */
  router.post("/:groupId/members", requireAuth, requireAdmin, (req, res) => {
    const groupId = req.params.groupId as string;
    const { userId } = req.body as { userId?: string };
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }
    try {
      const member = groupService.addMember(groupId, userId);
      res.status(201).json(member);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add member";
      res.status(400).json({ error: message });
    }
  });

  /** DELETE /api/groups/:groupId/members/:userId - Remove a member from group (admin only) */
  router.delete("/:groupId/members/:userId", requireAuth, requireAdmin, (req, res) => {
    const groupId = req.params.groupId as string;
    const userId = req.params.userId as string;
    const removed = groupService.removeMember(groupId, userId);
    if (!removed) {
      res.status(404).json({ error: "Membership not found" });
      return;
    }
    res.json({ success: true });
  });

  return router;
}
