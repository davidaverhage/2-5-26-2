import { v4 as uuidv4 } from "uuid";
import type Database from "better-sqlite3";
import type {
  Group,
  GroupRow,
  GroupMember,
  GroupMemberRow,
  CreateGroupInput,
  UpdateGroupInput,
  SafeUser,
  UserRow,
  UserRole,
} from "../types/index.js";

function rowToGroup(row: GroupRow): Group {
  return {
    groupId: row.groupId,
    name: row.name,
    description: row.description,
    utcDateCreated: row.utcDateCreated,
    utcDateModified: row.utcDateModified,
  };
}

export class GroupService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /** Create a new group. */
  createGroup(input: CreateGroupInput): Group {
    const { name, description } = input;

    if (!name || name.trim().length === 0) {
      throw new Error("Group name is required");
    }

    const existing = this.db
      .prepare("SELECT groupId FROM groups WHERE name = ?")
      .get(name);
    if (existing) {
      throw new Error(`Group '${name}' already exists`);
    }

    const now = new Date().toISOString();
    const groupId = uuidv4();

    this.db
      .prepare(
        `INSERT INTO groups (groupId, name, description, utcDateCreated, utcDateModified)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(groupId, name.trim(), description ?? null, now, now);

    return {
      groupId,
      name: name.trim(),
      description: description ?? null,
      utcDateCreated: now,
      utcDateModified: now,
    };
  }

  /** Get a group by ID. */
  getGroupById(groupId: string): Group | null {
    const row = this.db
      .prepare("SELECT * FROM groups WHERE groupId = ?")
      .get(groupId) as GroupRow | undefined;
    return row ? rowToGroup(row) : null;
  }

  /** List all groups. */
  listGroups(): Group[] {
    const rows = this.db
      .prepare("SELECT * FROM groups ORDER BY name")
      .all() as GroupRow[];
    return rows.map(rowToGroup);
  }

  /** Update a group by ID. */
  updateGroup(groupId: string, input: UpdateGroupInput): Group | null {
    const group = this.getGroupById(groupId);
    if (!group) return null;

    const now = new Date().toISOString();
    const sets: string[] = [];
    const params: unknown[] = [];

    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        throw new Error("Group name cannot be empty");
      }
      const existing = this.db
        .prepare("SELECT groupId FROM groups WHERE name = ? AND groupId != ?")
        .get(input.name, groupId);
      if (existing) {
        throw new Error(`Group name '${input.name}' is already taken`);
      }
      sets.push("name = ?");
      params.push(input.name.trim());
    }

    if (input.description !== undefined) {
      sets.push("description = ?");
      params.push(input.description);
    }

    if (sets.length === 0) {
      return group;
    }

    sets.push("utcDateModified = ?");
    params.push(now);
    params.push(groupId);

    this.db
      .prepare(`UPDATE groups SET ${sets.join(", ")} WHERE groupId = ?`)
      .run(...params);

    return this.getGroupById(groupId);
  }

  /** Delete a group by ID. Returns true if deleted. */
  deleteGroup(groupId: string): boolean {
    const result = this.db
      .prepare("DELETE FROM groups WHERE groupId = ?")
      .run(groupId);
    return result.changes > 0;
  }

  /** Add a user to a group. */
  addMember(groupId: string, userId: string): GroupMember {
    const group = this.getGroupById(groupId);
    if (!group) throw new Error("Group not found");

    const userExists = this.db
      .prepare("SELECT userId FROM users WHERE userId = ?")
      .get(userId);
    if (!userExists) throw new Error("User not found");

    const existing = this.db
      .prepare("SELECT groupId FROM group_members WHERE groupId = ? AND userId = ?")
      .get(groupId, userId);
    if (existing) {
      throw new Error("User is already a member of this group");
    }

    const now = new Date().toISOString();
    this.db
      .prepare("INSERT INTO group_members (groupId, userId, utcDateAdded) VALUES (?, ?, ?)")
      .run(groupId, userId, now);

    return { groupId, userId, utcDateAdded: now };
  }

  /** Remove a user from a group. Returns true if removed. */
  removeMember(groupId: string, userId: string): boolean {
    const result = this.db
      .prepare("DELETE FROM group_members WHERE groupId = ? AND userId = ?")
      .run(groupId, userId);
    return result.changes > 0;
  }

  /** Get all members of a group (safe user data). */
  getMembers(groupId: string): SafeUser[] {
    const rows = this.db
      .prepare(
        `SELECT u.* FROM users u
         JOIN group_members gm ON u.userId = gm.userId
         WHERE gm.groupId = ?
         ORDER BY u.username`
      )
      .all(groupId) as UserRow[];
    return rows.map((r) => ({
      userId: r.userId,
      username: r.username,
      email: r.email,
      role: r.role as UserRole,
      isActive: Boolean(r.isActive),
      utcDateCreated: r.utcDateCreated,
      utcDateModified: r.utcDateModified,
    }));
  }

  /** Get all groups a user belongs to. */
  getUserGroups(userId: string): Group[] {
    const rows = this.db
      .prepare(
        `SELECT g.* FROM groups g
         JOIN group_members gm ON g.groupId = gm.groupId
         WHERE gm.userId = ?
         ORDER BY g.name`
      )
      .all(userId) as GroupRow[];
    return rows.map(rowToGroup);
  }
}
