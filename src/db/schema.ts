import Database from "better-sqlite3";

/**
 * Initialize the multi-user database schema.
 * Creates tables for users, groups, group_members, and permissions if they don't exist.
 * Designed to be safe to run on an existing database (uses IF NOT EXISTS).
 */
export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      userId TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      email TEXT COLLATE NOCASE,
      passwordHash TEXT NOT NULL,
      passwordSalt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'reader' CHECK(role IN ('admin', 'editor', 'reader')),
      isActive INTEGER NOT NULL DEFAULT 1,
      utcDateCreated TEXT NOT NULL,
      utcDateModified TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      groupId TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      utcDateCreated TEXT NOT NULL,
      utcDateModified TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_members (
      groupId TEXT NOT NULL,
      userId TEXT NOT NULL,
      utcDateAdded TEXT NOT NULL,
      PRIMARY KEY (groupId, userId),
      FOREIGN KEY (groupId) REFERENCES groups(groupId) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS permissions (
      permissionId TEXT PRIMARY KEY NOT NULL,
      noteId TEXT NOT NULL,
      targetType TEXT NOT NULL CHECK(targetType IN ('user', 'group')),
      targetId TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('read', 'write', 'delete', 'manage')),
      isInheritable INTEGER NOT NULL DEFAULT 1,
      utcDateCreated TEXT NOT NULL,
      UNIQUE(noteId, targetType, targetId, action)
    );

    CREATE INDEX IF NOT EXISTS idx_permissions_noteId ON permissions(noteId);
    CREATE INDEX IF NOT EXISTS idx_permissions_targetId ON permissions(targetType, targetId);
    CREATE INDEX IF NOT EXISTS idx_group_members_userId ON group_members(userId);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);
}

/**
 * Open (or create) a SQLite database and initialize the schema.
 */
export function openDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initializeSchema(db);
  return db;
}
