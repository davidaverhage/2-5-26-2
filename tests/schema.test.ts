import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { initializeSchema } from "../src/db/schema.js";

describe("Database Schema", () => {
  it("should create all required tables", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    initializeSchema(db);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("users");
    expect(tableNames).toContain("groups");
    expect(tableNames).toContain("group_members");
    expect(tableNames).toContain("permissions");
  });

  it("should be safe to run twice (idempotent)", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    initializeSchema(db);
    initializeSchema(db); // Should not throw
  });

  it("should enforce foreign key constraints", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    initializeSchema(db);

    // Try to add a group member with non-existent group
    expect(() => {
      db.prepare(
        "INSERT INTO group_members (groupId, userId, utcDateAdded) VALUES (?, ?, ?)"
      ).run("nonexistent-group", "nonexistent-user", new Date().toISOString());
    }).toThrow();
  });

  it("should enforce unique constraints on users.username", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    initializeSchema(db);

    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO users (userId, username, passwordHash, passwordSalt, role, isActive, utcDateCreated, utcDateModified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run("id1", "alice", "hash", "salt", "reader", 1, now, now);

    expect(() => {
      db.prepare(
        "INSERT INTO users (userId, username, passwordHash, passwordSalt, role, isActive, utcDateCreated, utcDateModified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run("id2", "alice", "hash", "salt", "reader", 1, now, now);
    }).toThrow();
  });

  it("should enforce role check constraint", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    initializeSchema(db);

    const now = new Date().toISOString();
    expect(() => {
      db.prepare(
        "INSERT INTO users (userId, username, passwordHash, passwordSalt, role, isActive, utcDateCreated, utcDateModified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run("id1", "alice", "hash", "salt", "invalid_role", 1, now, now);
    }).toThrow();
  });
});
