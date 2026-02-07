import { v4 as uuidv4 } from "uuid";
import type Database from "better-sqlite3";
import type {
  Permission,
  PermissionRow,
  CreatePermissionInput,
  PermissionAction,
  PermissionTargetType,
} from "../types/index.js";

function rowToPermission(row: PermissionRow): Permission {
  return {
    permissionId: row.permissionId,
    noteId: row.noteId,
    targetType: row.targetType as PermissionTargetType,
    targetId: row.targetId,
    action: row.action as PermissionAction,
    isInheritable: Boolean(row.isInheritable),
    utcDateCreated: row.utcDateCreated,
  };
}

export class PermissionService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /** Create a new permission. */
  createPermission(input: CreatePermissionInput): Permission {
    const { noteId, targetType, targetId, action, isInheritable } = input;

    if (!noteId) throw new Error("noteId is required");
    if (!targetId) throw new Error("targetId is required");

    // Validate target exists
    if (targetType === "user") {
      const user = this.db
        .prepare("SELECT userId FROM users WHERE userId = ?")
        .get(targetId);
      if (!user) throw new Error("Target user not found");
    } else if (targetType === "group") {
      const group = this.db
        .prepare("SELECT groupId FROM groups WHERE groupId = ?")
        .get(targetId);
      if (!group) throw new Error("Target group not found");
    }

    const now = new Date().toISOString();
    const permissionId = uuidv4();

    this.db
      .prepare(
        `INSERT INTO permissions (permissionId, noteId, targetType, targetId, action, isInheritable, utcDateCreated)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        permissionId,
        noteId,
        targetType,
        targetId,
        action,
        isInheritable !== false ? 1 : 0,
        now
      );

    return {
      permissionId,
      noteId,
      targetType,
      targetId,
      action,
      isInheritable: isInheritable !== false,
      utcDateCreated: now,
    };
  }

  /** Get permissions for a specific note. */
  getNotePermissions(noteId: string): Permission[] {
    const rows = this.db
      .prepare("SELECT * FROM permissions WHERE noteId = ?")
      .all(noteId) as PermissionRow[];
    return rows.map(rowToPermission);
  }

  /** Get permissions for a user (direct user permissions). */
  getUserPermissions(userId: string): Permission[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM permissions WHERE targetType = 'user' AND targetId = ?"
      )
      .all(userId) as PermissionRow[];
    return rows.map(rowToPermission);
  }

  /**
   * Get all effective permissions for a user, including those from group memberships.
   */
  getEffectivePermissions(userId: string): Permission[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT p.* FROM permissions p
         WHERE (p.targetType = 'user' AND p.targetId = ?)
            OR (p.targetType = 'group' AND p.targetId IN (
              SELECT gm.groupId FROM group_members gm WHERE gm.userId = ?
            ))`
      )
      .all(userId, userId) as PermissionRow[];
    return rows.map(rowToPermission);
  }

  /**
   * Check if a user has a specific action on a note, considering:
   * - Direct user permissions on the note
   * - Group permissions on the note
   * - Inheritable permissions from ancestor notes (requires parentNoteIds)
   * - Admin users always have full access
   */
  checkPermission(
    userId: string,
    noteId: string,
    action: PermissionAction,
    parentNoteIds?: string[]
  ): boolean {
    // Check if user is admin (admins always have access)
    const user = this.db
      .prepare("SELECT role FROM users WHERE userId = ? AND isActive = 1")
      .get(userId) as { role: string } | undefined;
    if (!user) return false;
    if (user.role === "admin") return true;

    // Manage action requires admin role
    if (action === "manage") return false;

    // Editor role always has read and write
    if (user.role === "editor" && (action === "read" || action === "write")) {
      // Still check if there's an explicit deny, but for now editors can read/write all
      return true;
    }

    // Check direct permission on this note
    const noteIds = [noteId, ...(parentNoteIds ?? [])];
    const placeholders = noteIds.map(() => "?").join(",");

    // Build action hierarchy: manage > delete > write > read
    const actionHierarchy: PermissionAction[] = [];
    switch (action) {
      case "read":
        actionHierarchy.push("read", "write", "delete", "manage");
        break;
      case "write":
        actionHierarchy.push("write", "delete", "manage");
        break;
      case "delete":
        actionHierarchy.push("delete", "manage");
        break;
    }
    const actionPlaceholders = actionHierarchy.map(() => "?").join(",");

    // Check direct user permissions on note and inheritable parent permissions
    const directPerm = this.db
      .prepare(
        `SELECT permissionId FROM permissions
         WHERE targetType = 'user' AND targetId = ?
           AND action IN (${actionPlaceholders})
           AND (noteId = ? OR (noteId IN (${placeholders}) AND isInheritable = 1))
         LIMIT 1`
      )
      .get(userId, ...actionHierarchy, noteId, ...noteIds);
    if (directPerm) return true;

    // Check group permissions
    const groupPerm = this.db
      .prepare(
        `SELECT p.permissionId FROM permissions p
         JOIN group_members gm ON p.targetType = 'group' AND p.targetId = gm.groupId
         WHERE gm.userId = ?
           AND p.action IN (${actionPlaceholders})
           AND (p.noteId = ? OR (p.noteId IN (${placeholders}) AND p.isInheritable = 1))
         LIMIT 1`
      )
      .get(userId, ...actionHierarchy, noteId, ...noteIds);
    if (groupPerm) return true;

    return false;
  }

  /** Delete a permission by ID. Returns true if deleted. */
  deletePermission(permissionId: string): boolean {
    const result = this.db
      .prepare("DELETE FROM permissions WHERE permissionId = ?")
      .run(permissionId);
    return result.changes > 0;
  }

  /** Delete all permissions for a specific note. */
  deleteNotePermissions(noteId: string): number {
    const result = this.db
      .prepare("DELETE FROM permissions WHERE noteId = ?")
      .run(noteId);
    return result.changes;
  }
}
