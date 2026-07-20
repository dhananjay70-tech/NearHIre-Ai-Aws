/**
 * jobRoutes.js — Routes for /api/jobs and /api/jobs/nearby
 */

import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createJobSchema } from '../validators/jobValidators.js';
import * as jobController from '../controllers/jobController.js';
import * as liveJobController from '../controllers/liveJobController.js';

const router = Router();

// ── Live jobs proxied from the Job Scraper microservice (MS3) ──
// Declared BEFORE '/:id' so these fixed paths are not captured by the id param.
router.get('/live',            liveJobController.listLiveJobs);
router.get('/search',          liveJobController.searchLiveJobs);
router.get('/latest',          liveJobController.latestLiveJobs);
router.get('/scraper/health',  liveJobController.scraperHealth);

// Public (DB-backed — unchanged)
// '/geocode' is declared before '/:id' so it is not captured by the id param.
router.get('/geocode', jobController.geocode);
router.get('/',        jobController.listJobs);
router.get('/nearby',  jobController.listNearbyJobs);
router.get('/:id',     jobController.getJob);

// Record a view when a job details page is opened. Public — anonymous
// visitors are counted by hashed IP; signed-in users by id.
router.post('/:id/view', optionalAuthenticate, jobController.trackJobView);

// Protected — ADMIN or RECRUITER only
router.post('/', authenticate, requireRole('ADMIN', 'RECRUITER'), validateRequest(createJobSchema), jobController.createJob);

export default router;
