import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { initializeSchema } from "../src/db/schema.js";
import { UserService } from "../src/services/user_service.js";

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  initializeSchema(db);
  return db;
}

describe("UserService", () => {
  let db: Database.Database;
  let service: UserService;

  beforeEach(() => {
    db = createTestDb();
    service = new UserService(db);
  });

  describe("createUser", () => {
    it("should create a user with default role", () => {
      const user = service.createUser({ username: "alice", password: "password123" });
      expect(user.username).toBe("alice");
      expect(user.role).toBe("reader");
      expect(user.isActive).toBe(true);
      expect(user.userId).toBeDefined();
    });

    it("should create a user with specified role", () => {
      const user = service.createUser({ username: "bob", password: "password123", role: "editor" });
      expect(user.role).toBe("editor");
    });

    it("should create an admin user", () => {
      const user = service.createUser({ username: "admin", password: "password123", role: "admin" });
      expect(user.role).toBe("admin");
    });

    it("should reject duplicate usernames (case-insensitive)", () => {
      service.createUser({ username: "alice", password: "password123" });
      expect(() => service.createUser({ username: "Alice", password: "password456" })).toThrow(
        "already exists"
      );
    });

    it("should reject empty username", () => {
      expect(() => service.createUser({ username: "", password: "password123" })).toThrow(
        "Username is required"
      );
    });

    it("should reject short password", () => {
      expect(() => service.createUser({ username: "alice", password: "short" })).toThrow(
        "at least 8 characters"
      );
    });

    it("should trim username whitespace", () => {
      const user = service.createUser({ username: "  alice  ", password: "password123" });
      expect(user.username).toBe("alice");
    });

    it("should store email if provided", () => {
      const user = service.createUser({
        username: "alice",
        password: "password123",
        email: "alice@example.com",
      });
      expect(user.email).toBe("alice@example.com");
    });
  });

  describe("getUserById / getUserByUsername", () => {
    it("should find user by ID", () => {
      const created = service.createUser({ username: "alice", password: "password123" });
      const found = service.getUserById(created.userId);
      expect(found).not.toBeNull();
      expect(found!.username).toBe("alice");
    });

    it("should find user by username (case-insensitive)", () => {
      service.createUser({ username: "alice", password: "password123" });
      const found = service.getUserByUsername("ALICE");
      expect(found).not.toBeNull();
      expect(found!.username).toBe("alice");
    });

    it("should return null for non-existent user", () => {
      expect(service.getUserById("nonexistent")).toBeNull();
      expect(service.getUserByUsername("nonexistent")).toBeNull();
    });
  });

  describe("getSafeUserById", () => {
    it("should not include password fields", () => {
      const created = service.createUser({ username: "alice", password: "password123" });
      const safe = service.getSafeUserById(created.userId);
      expect(safe).not.toBeNull();
      expect(safe).not.toHaveProperty("passwordHash");
      expect(safe).not.toHaveProperty("passwordSalt");
    });
  });

  describe("listUsers", () => {
    it("should list all users sorted by username", () => {
      service.createUser({ username: "charlie", password: "password123" });
      service.createUser({ username: "alice", password: "password123" });
      service.createUser({ username: "bob", password: "password123" });
      const users = service.listUsers();
      expect(users).toHaveLength(3);
      expect(users[0].username).toBe("alice");
      expect(users[1].username).toBe("bob");
      expect(users[2].username).toBe("charlie");
    });
  });

  describe("updateUser", () => {
    it("should update username", () => {
      const created = service.createUser({ username: "alice", password: "password123" });
      const updated = service.updateUser(created.userId, { username: "alice2" });
      expect(updated!.username).toBe("alice2");
    });

    it("should update password", () => {
      const created = service.createUser({ username: "alice", password: "password123" });
      service.updateUser(created.userId, { password: "newpassword123" });
      const auth = service.authenticate("alice", "newpassword123");
      expect(auth).not.toBeNull();
    });

    it("should update role", () => {
      const created = service.createUser({ username: "alice", password: "password123" });
      const updated = service.updateUser(created.userId, { role: "admin" });
      expect(updated!.role).toBe("admin");
    });

    it("should deactivate user", () => {
      const created = service.createUser({ username: "alice", password: "password123" });
      const updated = service.updateUser(created.userId, { isActive: false });
      expect(updated!.isActive).toBe(false);
    });

    it("should reject duplicate username on update", () => {
      service.createUser({ username: "alice", password: "password123" });
      const bob = service.createUser({ username: "bob", password: "password123" });
      expect(() => service.updateUser(bob.userId, { username: "alice" })).toThrow("already taken");
    });

    it("should return null for non-existent user", () => {
      const result = service.updateUser("nonexistent", { username: "test" });
      expect(result).toBeNull();
    });

    it("should return unchanged user when no fields provided", () => {
      const created = service.createUser({ username: "alice", password: "password123" });
      const result = service.updateUser(created.userId, {});
      expect(result!.username).toBe("alice");
    });
  });

  describe("deleteUser", () => {
    it("should delete existing user", () => {
      const created = service.createUser({ username: "alice", password: "password123" });
      expect(service.deleteUser(created.userId)).toBe(true);
      expect(service.getUserById(created.userId)).toBeNull();
    });

    it("should return false for non-existent user", () => {
      expect(service.deleteUser("nonexistent")).toBe(false);
    });
  });

  describe("authenticate", () => {
    it("should authenticate with correct credentials", () => {
      service.createUser({ username: "alice", password: "password123" });
      const result = service.authenticate("alice", "password123");
      expect(result).not.toBeNull();
      expect(result!.username).toBe("alice");
    });

    it("should reject wrong password", () => {
      service.createUser({ username: "alice", password: "password123" });
      const result = service.authenticate("alice", "wrongpassword");
      expect(result).toBeNull();
    });

    it("should reject non-existent user", () => {
      const result = service.authenticate("nonexistent", "password123");
      expect(result).toBeNull();
    });

    it("should reject inactive user", () => {
      const created = service.createUser({ username: "alice", password: "password123" });
      service.updateUser(created.userId, { isActive: false });
      const result = service.authenticate("alice", "password123");
      expect(result).toBeNull();
    });
  });

  describe("getUserCount / isMultiUserMode", () => {
    it("should return 0 for empty database", () => {
      expect(service.getUserCount()).toBe(0);
      expect(service.isMultiUserMode()).toBe(false);
    });

    it("should return correct count", () => {
      service.createUser({ username: "alice", password: "password123" });
      expect(service.getUserCount()).toBe(1);
      expect(service.isMultiUserMode()).toBe(false);

      service.createUser({ username: "bob", password: "password123" });
      expect(service.getUserCount()).toBe(2);
      expect(service.isMultiUserMode()).toBe(true);
    });
  });

  describe("ensureDefaultAdmin", () => {
    it("should create admin if no users exist", () => {
      const admin = service.ensureDefaultAdmin("admin123!");
      expect(admin.username).toBe("admin");
      expect(admin.role).toBe("admin");
    });

    it("should return existing admin if one exists", () => {
      const first = service.createUser({ username: "superadmin", password: "password123", role: "admin" });
      const result = service.ensureDefaultAdmin("newpassword123");
      expect(result.userId).toBe(first.userId);
    });
  });
});
