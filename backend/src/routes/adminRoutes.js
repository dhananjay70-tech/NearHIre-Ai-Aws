/**
 * adminRoutes.js — Admin-only job/scraper dashboard routes.
 * Mounted at /api/admin.
 */

import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { verifyAdmin } from "../middleware/roleMiddleware.js";
import {
  getScraperStats,
  triggerScrape,
  createPrivilegedUser,
  getPlatformStats,
  listUsers,
  updateUser,
  listAllJobs,
  deleteJobAsAdmin,
} from "../controllers/adminController.js";

const router = Router();

// All admin routes require an authenticated admin user.
router.use(authenticate, verifyAdmin);

// GET /api/admin/scraper-stats — dashboard metrics (Step 17).
router.get("/scraper-stats", getScraperStats);

// POST /api/admin/scrape — manually trigger a scrape run.
router.post("/scrape", triggerScrape);

// POST /api/admin/users — create an account with any role (incl. admin).
router.post("/users", createPrivilegedUser);

// ── Platform administration ──
// GET    /api/admin/stats          — platform-wide totals
router.get("/stats", getPlatformStats);

// GET    /api/admin/users          — list users
router.get("/users", listUsers);

// PUT    /api/admin/users/:userId  — activate/deactivate or change role
router.put("/users/:userId", updateUser);

// GET    /api/admin/jobs           — list jobs for moderation
router.get("/jobs", listAllJobs);

// DELETE /api/admin/jobs/:jobId    — remove a job
router.delete("/jobs/:jobId", deleteJobAsAdmin);

export default router;
