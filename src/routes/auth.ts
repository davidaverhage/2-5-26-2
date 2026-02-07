import { Router } from "express";
import type { UserService } from "../services/user_service.js";

/**
 * Create authentication routes (login/logout).
 * These routes do NOT require prior authentication.
 */
export function createAuthRoutes(userService: UserService): Router {
  const router = Router();

  /** POST /api/auth/login - Authenticate user */
  router.post("/login", (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const user = userService.authenticate(username, password);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Set session
    req.session.user = {
      userId: user.userId,
      username: user.username,
      role: user.role,
    };

    res.json({ success: true, user });
  });

  /** POST /api/auth/logout - End session */
  router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: "Failed to logout" });
        return;
      }
      res.json({ success: true });
    });
  });

  /** GET /api/auth/me - Get current user info */
  router.get("/me", (req, res) => {
    if (!req.session?.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const user = userService.getSafeUserById(req.session.user.userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json(user);
  });

  /** GET /api/auth/status - Check if multi-user mode is active */
  router.get("/status", (_req, res) => {
    res.json({
      multiUser: userService.isMultiUserMode(),
      userCount: userService.getUserCount(),
    });
  });

  return router;
}
