import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import type Database from "better-sqlite3";
import type {
  User,
  SafeUser,
  CreateUserInput,
  UpdateUserInput,
  UserRow,
  UserRole,
} from "../types/index.js";

const SALT_ROUNDS = 12;

function rowToUser(row: UserRow): User {
  return {
    userId: row.userId,
    username: row.username,
    email: row.email,
    passwordHash: row.passwordHash,
    passwordSalt: row.passwordSalt,
    role: row.role as UserRole,
    isActive: Boolean(row.isActive),
    utcDateCreated: row.utcDateCreated,
    utcDateModified: row.utcDateModified,
  };
}

function toSafeUser(user: User): SafeUser {
  return {
    userId: user.userId,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    utcDateCreated: user.utcDateCreated,
    utcDateModified: user.utcDateModified,
  };
}

export class UserService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /** Create a new user. Returns the safe (no password) user object. */
  createUser(input: CreateUserInput): SafeUser {
    const { username, password, email, role } = input;

    if (!username || username.trim().length === 0) {
      throw new Error("Username is required");
    }
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const existing = this.db
      .prepare("SELECT userId FROM users WHERE username = ? COLLATE NOCASE")
      .get(username);
    if (existing) {
      throw new Error(`User '${username}' already exists`);
    }

    const salt = bcryptjs.genSaltSync(SALT_ROUNDS);
    const hash = bcryptjs.hashSync(password, salt);
    const now = new Date().toISOString();
    const userId = uuidv4();

    this.db
      .prepare(
        `INSERT INTO users (userId, username, email, passwordHash, passwordSalt, role, isActive, utcDateCreated, utcDateModified)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(userId, username.trim(), email ?? null, hash, salt, role ?? "reader", now, now);

    return {
      userId,
      username: username.trim(),
      email: email ?? null,
      role: role ?? "reader",
      isActive: true,
      utcDateCreated: now,
      utcDateModified: now,
    };
  }

  /** Get user by ID. Returns null if not found. */
  getUserById(userId: string): User | null {
    const row = this.db
      .prepare("SELECT * FROM users WHERE userId = ?")
      .get(userId) as UserRow | undefined;
    return row ? rowToUser(row) : null;
  }

  /** Get safe user by ID (no sensitive fields). */
  getSafeUserById(userId: string): SafeUser | null {
    const user = this.getUserById(userId);
    return user ? toSafeUser(user) : null;
  }

  /** Get user by username (case-insensitive). */
  getUserByUsername(username: string): User | null {
    const row = this.db
      .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE")
      .get(username) as UserRow | undefined;
    return row ? rowToUser(row) : null;
  }

  /** List all users (safe view). */
  listUsers(): SafeUser[] {
    const rows = this.db
      .prepare("SELECT * FROM users ORDER BY username")
      .all() as UserRow[];
    return rows.map((r) => toSafeUser(rowToUser(r)));
  }

  /** Update user by ID. Returns updated safe user or null if not found. */
  updateUser(userId: string, input: UpdateUserInput): SafeUser | null {
    const user = this.getUserById(userId);
    if (!user) return null;

    const now = new Date().toISOString();
    const sets: string[] = [];
    const params: unknown[] = [];

    if (input.username !== undefined) {
      if (input.username.trim().length === 0) {
        throw new Error("Username cannot be empty");
      }
      const existing = this.db
        .prepare("SELECT userId FROM users WHERE username = ? COLLATE NOCASE AND userId != ?")
        .get(input.username, userId);
      if (existing) {
        throw new Error(`Username '${input.username}' is already taken`);
      }
      sets.push("username = ?");
      params.push(input.username.trim());
    }

    if (input.email !== undefined) {
      sets.push("email = ?");
      params.push(input.email);
    }

    if (input.password !== undefined) {
      if (input.password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      const salt = bcryptjs.genSaltSync(SALT_ROUNDS);
      const hash = bcryptjs.hashSync(input.password, salt);
      sets.push("passwordHash = ?, passwordSalt = ?");
      params.push(hash, salt);
    }

    if (input.role !== undefined) {
      sets.push("role = ?");
      params.push(input.role);
    }

    if (input.isActive !== undefined) {
      sets.push("isActive = ?");
      params.push(input.isActive ? 1 : 0);
    }

    if (sets.length === 0) {
      return toSafeUser(user);
    }

    sets.push("utcDateModified = ?");
    params.push(now);
    params.push(userId);

    this.db
      .prepare(`UPDATE users SET ${sets.join(", ")} WHERE userId = ?`)
      .run(...params);

    return this.getSafeUserById(userId);
  }

  /** Delete user by ID. Returns true if deleted, false if not found. */
  deleteUser(userId: string): boolean {
    const result = this.db
      .prepare("DELETE FROM users WHERE userId = ?")
      .run(userId);
    return result.changes > 0;
  }

  /**
   * Authenticate a user by username and password.
   * Returns the safe user if credentials are valid, null otherwise.
   */
  authenticate(username: string, password: string): SafeUser | null {
    const user = this.getUserByUsername(username);
    if (!user || !user.isActive) return null;

    const valid = bcryptjs.compareSync(password, user.passwordHash);
    return valid ? toSafeUser(user) : null;
  }

  /** Count total users in the database. */
  getUserCount(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM users")
      .get() as { count: number };
    return row.count;
  }

  /** Check if multi-user mode is active (more than one user exists). */
  isMultiUserMode(): boolean {
    return this.getUserCount() > 1;
  }

  /**
   * Create a default admin user if no users exist.
   * Used for backward compatibility with single-user mode.
   */
  ensureDefaultAdmin(password: string): SafeUser {
    const count = this.getUserCount();
    if (count > 0) {
      const admins = this.db
        .prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1")
        .get() as UserRow | undefined;
      if (admins) {
        return toSafeUser(rowToUser(admins));
      }
    }
    return this.createUser({
      username: "admin",
      password,
      role: "admin",
    });
  }
}
