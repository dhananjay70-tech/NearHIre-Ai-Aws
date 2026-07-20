/**
 * dashboardRoutes.js — GET /api/dashboard.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { verifySeeker } from '../middleware/roleMiddleware.js';
import { getDashboard } from '../controllers/dashboardController.js';

const router = Router();

// The candidate dashboard is seeker-only; recruiters/admins have their own.
router.use(authenticate, verifySeeker);

// GET /api/dashboard
router.get('/', getDashboard);

export default router;
