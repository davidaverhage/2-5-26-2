/**
 * Type definitions for the Trilium multi-user support module.
 */

/** User roles */
export type UserRole = "admin" | "editor" | "reader";

/** User record in the database */
export interface User {
  userId: string;
  username: string;
  email: string | null;
  passwordHash: string;
  passwordSalt: string;
  role: UserRole;
  isActive: boolean;
  utcDateCreated: string;
  utcDateModified: string;
}

/** Safe user data (no sensitive fields) returned from API */
export interface SafeUser {
  userId: string;
  username: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  utcDateCreated: string;
  utcDateModified: string;
}

/** Input for creating a new user */
export interface CreateUserInput {
  username: string;
  password: string;
  email?: string;
  role?: UserRole;
}

/** Input for updating an existing user */
export interface UpdateUserInput {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

/** Group record in the database */
export interface Group {
  groupId: string;
  name: string;
  description: string | null;
  utcDateCreated: string;
  utcDateModified: string;
}

/** Input for creating a group */
export interface CreateGroupInput {
  name: string;
  description?: string;
}

/** Input for updating a group */
export interface UpdateGroupInput {
  name?: string;
  description?: string;
}

/** Permission actions on notes */
export type PermissionAction = "read" | "write" | "delete" | "manage";

/** Permission target type */
export type PermissionTargetType = "user" | "group";

/** Permission record in the database */
export interface Permission {
  permissionId: string;
  noteId: string;
  targetType: PermissionTargetType;
  targetId: string;
  action: PermissionAction;
  isInheritable: boolean;
  utcDateCreated: string;
}

/** Input for creating a permission */
export interface CreatePermissionInput {
  noteId: string;
  targetType: PermissionTargetType;
  targetId: string;
  action: PermissionAction;
  isInheritable?: boolean;
}

/** Group membership record */
export interface GroupMember {
  groupId: string;
  userId: string;
  utcDateAdded: string;
}

/** Session user data stored in request */
export interface SessionUser {
  userId: string;
  username: string;
  role: UserRole;
}

/** Configuration options for the module */
export interface MultiUserConfig {
  /** Path to the SQLite database file */
  dbPath: string;
  /** Session secret for signing cookies */
  sessionSecret: string;
  /** Session max age in milliseconds (default: 24 hours) */
  sessionMaxAge?: number;
  /** Whether to enable multi-user mode (default: true) */
  enabled?: boolean;
}

/** Database row types (raw from SQLite) */
export interface UserRow {
  userId: string;
  username: string;
  email: string | null;
  passwordHash: string;
  passwordSalt: string;
  role: string;
  isActive: number;
  utcDateCreated: string;
  utcDateModified: string;
}

export interface GroupRow {
  groupId: string;
  name: string;
  description: string | null;
  utcDateCreated: string;
  utcDateModified: string;
}

export interface PermissionRow {
  permissionId: string;
  noteId: string;
  targetType: string;
  targetId: string;
  action: string;
  isInheritable: number;
  utcDateCreated: string;
}

export interface GroupMemberRow {
  groupId: string;
  userId: string;
  utcDateAdded: string;
}
