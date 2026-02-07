import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { initializeSchema } from "../src/db/schema.js";
import { UserService } from "../src/services/user_service.js";
import { GroupService } from "../src/services/group_service.js";
import { PermissionService } from "../src/services/permission_service.js";

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  initializeSchema(db);
  return db;
}

describe("PermissionService", () => {
  let db: Database.Database;
  let permissionService: PermissionService;
  let userService: UserService;
  let groupService: GroupService;

  beforeEach(() => {
    db = createTestDb();
    permissionService = new PermissionService(db);
    userService = new UserService(db);
    groupService = new GroupService(db);
  });

  describe("createPermission", () => {
    it("should create a user permission", () => {
      const user = userService.createUser({ username: "alice", password: "password123" });
      const perm = permissionService.createPermission({
        noteId: "note1",
        targetType: "user",
        targetId: user.userId,
        action: "read",
      });
      expect(perm.noteId).toBe("note1");
      expect(perm.targetType).toBe("user");
      expect(perm.action).toBe("read");
      expect(perm.isInheritable).toBe(true);
    });

    it("should create a group permission", () => {
      const group = groupService.createGroup({ name: "Team A" });
      const perm = permissionService.createPermission({
        noteId: "note1",
        targetType: "group",
        targetId: group.groupId,
        action: "write",
        isInheritable: false,
      });
      expect(perm.targetType).toBe("group");
      expect(perm.isInheritable).toBe(false);
    });

    it("should reject permission for non-existent user", () => {
      expect(() =>
        permissionService.createPermission({
          noteId: "note1",
          targetType: "user",
          targetId: "nonexistent",
          action: "read",
        })
      ).toThrow("Target user not found");
    });

    it("should reject permission for non-existent group", () => {
      expect(() =>
        permissionService.createPermission({
          noteId: "note1",
          targetType: "group",
          targetId: "nonexistent",
          action: "read",
        })
      ).toThrow("Target group not found");
    });

    it("should reject duplicate permission", () => {
      const user = userService.createUser({ username: "alice", password: "password123" });
      permissionService.createPermission({
        noteId: "note1",
        targetType: "user",
        targetId: user.userId,
        action: "read",
      });
      expect(() =>
        permissionService.createPermission({
          noteId: "note1",
          targetType: "user",
          targetId: user.userId,
          action: "read",
        })
      ).toThrow();
    });
  });

  describe("getNotePermissions", () => {
    it("should return permissions for a note", () => {
      const user = userService.createUser({ username: "alice", password: "password123" });
      permissionService.createPermission({
        noteId: "note1",
        targetType: "user",
        targetId: user.userId,
        action: "read",
      });
      permissionService.createPermission({
        noteId: "note1",
        targetType: "user",
        targetId: user.userId,
        action: "write",
      });
      const perms = permissionService.getNotePermissions("note1");
      expect(perms).toHaveLength(2);
    });
  });

  describe("checkPermission", () => {
    it("should grant admin full access", () => {
      const admin = userService.createUser({ username: "admin", password: "password123", role: "admin" });
      expect(permissionService.checkPermission(admin.userId, "any-note", "read")).toBe(true);
      expect(permissionService.checkPermission(admin.userId, "any-note", "write")).toBe(true);
      expect(permissionService.checkPermission(admin.userId, "any-note", "delete")).toBe(true);
      expect(permissionService.checkPermission(admin.userId, "any-note", "manage")).toBe(true);
    });

    it("should grant editor read/write access", () => {
      const editor = userService.createUser({ username: "editor", password: "password123", role: "editor" });
      expect(permissionService.checkPermission(editor.userId, "any-note", "read")).toBe(true);
      expect(permissionService.checkPermission(editor.userId, "any-note", "write")).toBe(true);
    });

    it("should deny manage for non-admin", () => {
      const editor = userService.createUser({ username: "editor", password: "password123", role: "editor" });
      expect(permissionService.checkPermission(editor.userId, "any-note", "manage")).toBe(false);
    });

    it("should check direct user permission for reader", () => {
      const reader = userService.createUser({ username: "reader", password: "password123", role: "reader" });
      permissionService.createPermission({
        noteId: "note1",
        targetType: "user",
        targetId: reader.userId,
        action: "read",
      });
      expect(permissionService.checkPermission(reader.userId, "note1", "read")).toBe(true);
      expect(permissionService.checkPermission(reader.userId, "note2", "read")).toBe(false);
    });

    it("should check group permission for reader", () => {
      const reader = userService.createUser({ username: "reader", password: "password123", role: "reader" });
      const group = groupService.createGroup({ name: "Team A" });
      groupService.addMember(group.groupId, reader.userId);
      permissionService.createPermission({
        noteId: "note1",
        targetType: "group",
        targetId: group.groupId,
        action: "read",
      });
      expect(permissionService.checkPermission(reader.userId, "note1", "read")).toBe(true);
    });

    it("should support permission inheritance from parent notes", () => {
      const reader = userService.createUser({ username: "reader", password: "password123", role: "reader" });
      permissionService.createPermission({
        noteId: "parent-note",
        targetType: "user",
        targetId: reader.userId,
        action: "read",
        isInheritable: true,
      });
      // Check child note with parent in ancestry
      expect(
        permissionService.checkPermission(reader.userId, "child-note", "read", ["parent-note"])
      ).toBe(true);
    });

    it("should not inherit non-inheritable permissions", () => {
      const reader = userService.createUser({ username: "reader", password: "password123", role: "reader" });
      permissionService.createPermission({
        noteId: "parent-note",
        targetType: "user",
        targetId: reader.userId,
        action: "read",
        isInheritable: false,
      });
      // Child should not inherit
      expect(
        permissionService.checkPermission(reader.userId, "child-note", "read", ["parent-note"])
      ).toBe(false);
      // Direct access to parent should still work
      expect(permissionService.checkPermission(reader.userId, "parent-note", "read")).toBe(true);
    });

    it("should grant higher permissions (write implies read)", () => {
      const reader = userService.createUser({ username: "reader", password: "password123", role: "reader" });
      permissionService.createPermission({
        noteId: "note1",
        targetType: "user",
        targetId: reader.userId,
        action: "write",
      });
      // Write permission should also grant read
      expect(permissionService.checkPermission(reader.userId, "note1", "read")).toBe(true);
      expect(permissionService.checkPermission(reader.userId, "note1", "write")).toBe(true);
    });

    it("should deny inactive users", () => {
      const user = userService.createUser({ username: "alice", password: "password123", role: "admin" });
      userService.updateUser(user.userId, { isActive: false });
      expect(permissionService.checkPermission(user.userId, "note1", "read")).toBe(false);
    });

    it("should deny non-existent users", () => {
      expect(permissionService.checkPermission("nonexistent", "note1", "read")).toBe(false);
    });
  });

  describe("deletePermission", () => {
    it("should delete a permission", () => {
      const user = userService.createUser({ username: "alice", password: "password123" });
      const perm = permissionService.createPermission({
        noteId: "note1",
        targetType: "user",
        targetId: user.userId,
        action: "read",
      });
      expect(permissionService.deletePermission(perm.permissionId)).toBe(true);
      expect(permissionService.getNotePermissions("note1")).toHaveLength(0);
    });

    it("should return false for non-existent permission", () => {
      expect(permissionService.deletePermission("nonexistent")).toBe(false);
    });
  });

  describe("deleteNotePermissions", () => {
    it("should delete all permissions for a note", () => {
      const user = userService.createUser({ username: "alice", password: "password123" });
      permissionService.createPermission({
        noteId: "note1",
        targetType: "user",
        targetId: user.userId,
        action: "read",
      });
      permissionService.createPermission({
        noteId: "note1",
        targetType: "user",
        targetId: user.userId,
        action: "write",
      });
      const deleted = permissionService.deleteNotePermissions("note1");
      expect(deleted).toBe(2);
      expect(permissionService.getNotePermissions("note1")).toHaveLength(0);
    });
  });

  describe("getEffectivePermissions", () => {
    it("should include direct and group permissions", () => {
      const user = userService.createUser({ username: "alice", password: "password123" });
      const group = groupService.createGroup({ name: "Team A" });
      groupService.addMember(group.groupId, user.userId);

      permissionService.createPermission({
        noteId: "note1",
        targetType: "user",
        targetId: user.userId,
        action: "read",
      });
      permissionService.createPermission({
        noteId: "note2",
        targetType: "group",
        targetId: group.groupId,
        action: "write",
      });

      const effective = permissionService.getEffectivePermissions(user.userId);
      expect(effective).toHaveLength(2);
    });
  });
});
