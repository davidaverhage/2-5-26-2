import express from "express";
import session from "express-session";
import { openDatabase } from "./db/index.js";
import { UserService, GroupService, PermissionService } from "./services/index.js";
import {
  createAuthRoutes,
  createUserRoutes,
  createGroupRoutes,
  createPermissionRoutes,
} from "./routes/index.js";
import type { MultiUserConfig } from "./types/index.js";

export { UserService } from "./services/user_service.js";
export { GroupService } from "./services/group_service.js";
export { PermissionService } from "./services/permission_service.js";
export { openDatabase, initializeSchema } from "./db/index.js";
export { requireAuth, requireRole, requireAdmin } from "./middleware/index.js";
export type {
  User,
  SafeUser,
  CreateUserInput,
  UpdateUserInput,
  Group,
  CreateGroupInput,
  UpdateGroupInput,
  Permission,
  CreatePermissionInput,
  PermissionAction,
  PermissionTargetType,
  UserRole,
  SessionUser,
  MultiUserConfig,
  GroupMember,
} from "./types/index.js";

/**
 * Create an Express application with all multi-user routes mounted.
 * Can be used standalone or mounted as middleware in an existing Express app.
 */
export function createMultiUserApp(config: MultiUserConfig): express.Express {
  const db = openDatabase(config.dbPath);
  const userService = new UserService(db);
  const groupService = new GroupService(db);
  const permissionService = new PermissionService(db);

  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: config.sessionMaxAge ?? 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
      },
    })
  );

  // Mount routes
  app.use("/api/auth", createAuthRoutes(userService));
  app.use("/api/users", createUserRoutes(userService));
  app.use("/api/groups", createGroupRoutes(groupService));
  app.use("/api/permissions", createPermissionRoutes(permissionService));

  return app;
}

/**
 * Create an Express Router with all multi-user routes (for mounting in existing apps).
 */
export function createMultiUserRouter(config: MultiUserConfig): {
  router: express.Router;
  userService: UserService;
  groupService: GroupService;
  permissionService: PermissionService;
} {
  const db = openDatabase(config.dbPath);
  const userService = new UserService(db);
  const groupService = new GroupService(db);
  const permissionService = new PermissionService(db);

  const router = express.Router();

  router.use("/auth", createAuthRoutes(userService));
  router.use("/users", createUserRoutes(userService));
  router.use("/groups", createGroupRoutes(groupService));
  router.use("/permissions", createPermissionRoutes(permissionService));

  return { router, userService, groupService, permissionService };
}

// Standalone server support
if (process.argv[1]?.endsWith("index.js")) {
  const port = parseInt(process.env["PORT"] ?? "3000", 10);
  const dbPath = process.env["DB_PATH"] ?? "./multi_user.db";
  const sessionSecret = process.env["SESSION_SECRET"] ?? "change-me-in-production";

  const app = createMultiUserApp({ dbPath, sessionSecret });

  // Create default admin if no users exist
  const db = openDatabase(dbPath);
  const userService = new UserService(db);
  const defaultPassword = process.env["DEFAULT_ADMIN_PASSWORD"] ?? "admin123!";
  if (userService.getUserCount() === 0) {
    const admin = userService.ensureDefaultAdmin(defaultPassword);
    console.log(`Default admin user created: ${admin.username} (${admin.userId})`);
  }

  app.listen(port, () => {
    console.log(`Multi-user server running on port ${port}`);
    console.log(`Database: ${dbPath}`);
  });
}
