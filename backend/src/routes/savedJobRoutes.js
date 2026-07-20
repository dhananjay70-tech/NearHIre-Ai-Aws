/**
 * savedJobRoutes.js — Routes for saved jobs.
 * All routes are protected.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { verifySeeker } from '../middleware/roleMiddleware.js';
import { savejob, listSavedJobs, unsaveJob } from '../controllers/savedJobController.js';

const router = Router();

// Saving jobs is a job-seeker capability.
router.use(authenticate, verifySeeker);

// POST   /api/saved-jobs/:jobId  — save a job
router.post('/:jobId', savejob);

// GET    /api/saved-jobs          — list saved jobs
router.get('/', listSavedJobs);

// DELETE /api/saved-jobs/:jobId  — unsave a job
router.delete('/:jobId', unsaveJob);

export default router;
