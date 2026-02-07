# Trilium Multi-User Support Module

A standalone multi-user support module for [TriliumNext/Trilium](https://github.com/TriliumNext/Trilium), addressing [issue #4956](https://github.com/TriliumNext/Trilium/issues/4956).

## Features

- **User Management**: Full CRUD operations for user accounts with bcrypt password hashing
- **Role-Based Access Control**: Three roles — Admin, Editor, Reader — with hierarchical permissions
- **Group Management**: Create groups and manage memberships for team-based permission assignments
- **Note-Level Permissions**: Granular per-note access control with inheritance to child notes
- **Permission Inheritance**: Inheritable permissions flow from parent notes to child notes
- **RESTful API**: Complete REST API for all user, group, and permission operations
- **Session-Based Authentication**: Secure session management with Express
- **Backward Compatibility**: Single-user mode maintained when only one user exists

## Architecture

### Why a Separate Module?

As discussed in the [original PR #7441 review](https://github.com/TriliumNext/Trilium/pull/7441), user authentication data should **not** be synced across instances. This module keeps user management isolated per instance, while Trilium's content sync remains unaffected.

### Database Schema

```
users          — User accounts with hashed passwords and roles
groups         — Named groups for organizing users
group_members  — Many-to-many relationship between users and groups
permissions    — Per-note permissions for users and groups with inheritance
```

### Role Hierarchy

| Role   | Read | Write | Delete | Manage |
|--------|------|-------|--------|--------|
| Admin  | ✅   | ✅    | ✅     | ✅     |
| Editor | ✅   | ✅    | ❌*    | ❌     |
| Reader | ❌*  | ❌*   | ❌*    | ❌     |

\* Readers need explicit per-note permissions. Editors can read/write all notes by default.

### Permission Inheritance

Permissions set on a parent note with `isInheritable: true` automatically apply to all child notes. This eliminates the need to set permissions on every sub-node individually.

## Quick Start

### Installation

```bash
npm install
npm run build
```

### Running Standalone

```bash
# Environment variables (optional)
export PORT=3000
export DB_PATH=./multi_user.db
export SESSION_SECRET=your-secret-here
export DEFAULT_ADMIN_PASSWORD=admin123!

npm start
```

### Integration with Existing Express App

```typescript
import { createMultiUserRouter } from "trilium-multi-user";

const { router, userService, groupService, permissionService } =
  createMultiUserRouter({
    dbPath: "./multi_user.db",
    sessionSecret: "your-secret",
  });

// Mount under /api
app.use("/api", router);

// Use services directly for permission checks
if (permissionService.checkPermission(userId, noteId, "read", parentNoteIds)) {
  // Allow access
}
```

## API Reference

### Authentication

| Method | Endpoint         | Description              | Auth Required |
|--------|-----------------|--------------------------|---------------|
| POST   | /api/auth/login  | Login with credentials   | No            |
| POST   | /api/auth/logout | End session              | No            |
| GET    | /api/auth/me     | Get current user info    | Yes           |
| GET    | /api/auth/status | Check multi-user status  | No            |

### Users (Admin only, except self-profile)

| Method | Endpoint            | Description        |
|--------|--------------------|--------------------|
| GET    | /api/users          | List all users     |
| GET    | /api/users/:id      | Get user (self/admin) |
| POST   | /api/users          | Create user        |
| PATCH  | /api/users/:id      | Update user        |
| DELETE | /api/users/:id      | Delete user        |

### Groups

| Method | Endpoint                         | Description           |
|--------|----------------------------------|-----------------------|
| GET    | /api/groups                      | List all groups       |
| GET    | /api/groups/:id                  | Get group             |
| POST   | /api/groups                      | Create group (admin)  |
| PATCH  | /api/groups/:id                  | Update group (admin)  |
| DELETE | /api/groups/:id                  | Delete group (admin)  |
| GET    | /api/groups/:id/members          | Get group members     |
| POST   | /api/groups/:id/members          | Add member (admin)    |
| DELETE | /api/groups/:id/members/:userId  | Remove member (admin) |

### Permissions

| Method | Endpoint                        | Description                    |
|--------|---------------------------------|--------------------------------|
| GET    | /api/permissions/note/:noteId   | Get note permissions           |
| GET    | /api/permissions/user/:userId   | Get user permissions           |
| GET    | /api/permissions/effective/:uid  | Get effective permissions      |
| POST   | /api/permissions/check           | Check permission               |
| POST   | /api/permissions                 | Create permission (admin)      |
| DELETE | /api/permissions/:id             | Delete permission (admin)      |

### Example: Create User

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123!"}'

# Use the session cookie from login
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"username": "alice", "password": "securepass123", "role": "editor"}'
```

### Example: Set Note Permissions

```bash
# Grant read access to a specific user on a note tree
curl -X POST http://localhost:3000/api/permissions \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "noteId": "root-note-id",
    "targetType": "user",
    "targetId": "user-uuid",
    "action": "read",
    "isInheritable": true
  }'
```

## Testing

```bash
npm test           # Run all tests once
npm run test:watch # Run tests in watch mode
```

## Project Structure

```
src/
├── index.ts                  # Main entry point, app factory
├── db/
│   └── schema.ts             # Database schema and initialization
├── middleware/
│   └── auth.ts               # Authentication middleware
├── routes/
│   ├── auth.ts               # Login/logout routes
│   ├── users.ts              # User CRUD routes
│   ├── groups.ts             # Group management routes
│   └── permissions.ts        # Permission management routes
├── services/
│   ├── user_service.ts       # User management logic
│   ├── group_service.ts      # Group management logic
│   └── permission_service.ts # Permission checking logic
└── types/
    └── index.ts              # TypeScript type definitions

tests/
├── schema.test.ts            # Database schema tests
├── user_service.test.ts      # User service tests
├── group_service.test.ts     # Group service tests
└── permission_service.test.ts # Permission service tests
```

## Design Decisions

Based on the [PR #7441 review feedback](https://github.com/TriliumNext/Trilium/pull/7441):

1. **Users are NOT Becca entities** — User auth data stays local per instance for security
2. **No unused tables** — Only creates tables that are actively used
3. **Extends existing patterns** — Uses SQLite, follows Trilium's coding conventions
4. **Backward compatible** — Single-user mode works unchanged
5. **Permission inheritance** — Addresses the key requirement from issue discussions about sub-node permissions
6. **Group-based permissions** — Supports the user/group model requested in issue comments

## License

AGPL-3.0 (same as TriliumNext/Trilium)