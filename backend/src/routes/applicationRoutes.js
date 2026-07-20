/**
 * applicationRoutes.js — Routes for application tracking.
 * All routes are protected.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { verifySeeker } from '../middleware/roleMiddleware.js';
import {
  createApplicationHandler,
  listApplications,
  updateApplicationHandler,
  deleteApplicationHandler,
} from '../controllers/applicationController.js';

const router = Router();

// Application tracking belongs to job seekers.
router.use(authenticate, verifySeeker);

// POST   /api/applications        — record an application
router.post('/', createApplicationHandler);

// GET    /api/applications        — list all applications
router.get('/', listApplications);

// PATCH  /api/applications/:id   — update status / notes
router.patch('/:id', updateApplicationHandler);

// DELETE /api/applications/:id   — remove tracker record
router.delete('/:id', deleteApplicationHandler);

export default router;
