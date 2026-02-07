import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { initializeSchema } from "../src/db/schema.js";
import { UserService } from "../src/services/user_service.js";
import { GroupService } from "../src/services/group_service.js";

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  initializeSchema(db);
  return db;
}

describe("GroupService", () => {
  let db: Database.Database;
  let groupService: GroupService;
  let userService: UserService;

  beforeEach(() => {
    db = createTestDb();
    groupService = new GroupService(db);
    userService = new UserService(db);
  });

  describe("createGroup", () => {
    it("should create a group", () => {
      const group = groupService.createGroup({ name: "Team A", description: "First team" });
      expect(group.name).toBe("Team A");
      expect(group.description).toBe("First team");
      expect(group.groupId).toBeDefined();
    });

    it("should reject duplicate group names", () => {
      groupService.createGroup({ name: "Team A" });
      expect(() => groupService.createGroup({ name: "Team A" })).toThrow("already exists");
    });

    it("should reject empty name", () => {
      expect(() => groupService.createGroup({ name: "" })).toThrow("Group name is required");
    });
  });

  describe("getGroupById", () => {
    it("should find group by ID", () => {
      const created = groupService.createGroup({ name: "Team A" });
      const found = groupService.getGroupById(created.groupId);
      expect(found).not.toBeNull();
      expect(found!.name).toBe("Team A");
    });

    it("should return null for non-existent group", () => {
      expect(groupService.getGroupById("nonexistent")).toBeNull();
    });
  });

  describe("listGroups", () => {
    it("should list all groups sorted by name", () => {
      groupService.createGroup({ name: "Zulu" });
      groupService.createGroup({ name: "Alpha" });
      const groups = groupService.listGroups();
      expect(groups).toHaveLength(2);
      expect(groups[0].name).toBe("Alpha");
      expect(groups[1].name).toBe("Zulu");
    });
  });

  describe("updateGroup", () => {
    it("should update group name", () => {
      const created = groupService.createGroup({ name: "Old Name" });
      const updated = groupService.updateGroup(created.groupId, { name: "New Name" });
      expect(updated!.name).toBe("New Name");
    });

    it("should update group description", () => {
      const created = groupService.createGroup({ name: "Team A" });
      const updated = groupService.updateGroup(created.groupId, { description: "Updated desc" });
      expect(updated!.description).toBe("Updated desc");
    });

    it("should return null for non-existent group", () => {
      expect(groupService.updateGroup("nonexistent", { name: "test" })).toBeNull();
    });
  });

  describe("deleteGroup", () => {
    it("should delete group", () => {
      const created = groupService.createGroup({ name: "Team A" });
      expect(groupService.deleteGroup(created.groupId)).toBe(true);
      expect(groupService.getGroupById(created.groupId)).toBeNull();
    });

    it("should return false for non-existent group", () => {
      expect(groupService.deleteGroup("nonexistent")).toBe(false);
    });
  });

  describe("members", () => {
    it("should add and retrieve members", () => {
      const group = groupService.createGroup({ name: "Team A" });
      const user = userService.createUser({ username: "alice", password: "password123" });
      const member = groupService.addMember(group.groupId, user.userId);
      expect(member.groupId).toBe(group.groupId);
      expect(member.userId).toBe(user.userId);

      const members = groupService.getMembers(group.groupId);
      expect(members).toHaveLength(1);
      expect(members[0].username).toBe("alice");
    });

    it("should reject adding non-existent user", () => {
      const group = groupService.createGroup({ name: "Team A" });
      expect(() => groupService.addMember(group.groupId, "nonexistent")).toThrow("User not found");
    });

    it("should reject adding to non-existent group", () => {
      const user = userService.createUser({ username: "alice", password: "password123" });
      expect(() => groupService.addMember("nonexistent", user.userId)).toThrow("Group not found");
    });

    it("should reject duplicate membership", () => {
      const group = groupService.createGroup({ name: "Team A" });
      const user = userService.createUser({ username: "alice", password: "password123" });
      groupService.addMember(group.groupId, user.userId);
      expect(() => groupService.addMember(group.groupId, user.userId)).toThrow("already a member");
    });

    it("should remove member", () => {
      const group = groupService.createGroup({ name: "Team A" });
      const user = userService.createUser({ username: "alice", password: "password123" });
      groupService.addMember(group.groupId, user.userId);
      expect(groupService.removeMember(group.groupId, user.userId)).toBe(true);
      expect(groupService.getMembers(group.groupId)).toHaveLength(0);
    });

    it("should get user groups", () => {
      const group1 = groupService.createGroup({ name: "Team A" });
      const group2 = groupService.createGroup({ name: "Team B" });
      const user = userService.createUser({ username: "alice", password: "password123" });
      groupService.addMember(group1.groupId, user.userId);
      groupService.addMember(group2.groupId, user.userId);
      const groups = groupService.getUserGroups(user.userId);
      expect(groups).toHaveLength(2);
    });
  });
});
