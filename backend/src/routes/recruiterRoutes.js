/**
 * recruiterRoutes.js — Routes for /api/recruiter/*
 */

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { verifyRecruiter } from '../middleware/roleMiddleware.js';
import * as recruiterController from '../controllers/recruiterController.js';

const router = Router();

// Public auth endpoints for recruiters
router.post('/register', asyncHandler(recruiterController.register));
router.post('/login',    asyncHandler(recruiterController.login));

// Protected endpoints — Recruiter role only
router.use(authenticate, verifyRecruiter);

router.get('/dashboard',                  asyncHandler(recruiterController.getDashboard));
router.get('/analytics',                  asyncHandler(recruiterController.getAnalytics));

// Enum values the recruiter forms must use (never hardcode in the frontend).
router.get('/meta',                       asyncHandler(recruiterController.getMeta));

// Company profile
router.get('/company',                    asyncHandler(recruiterController.getCompany));
router.put('/company',                    asyncHandler(recruiterController.updateCompany));

// Applicants — declared before '/jobs/:id' so they are not shadowed.
router.get('/applicants',                 asyncHandler(recruiterController.getApplicants));
router.put('/applicants/:applicationId',  asyncHandler(recruiterController.updateApplicantStatus));
router.get('/jobs/:jobId/applicants',     asyncHandler(recruiterController.getApplicants));

// Jobs
router.get('/jobs',                       asyncHandler(recruiterController.getJobs));
router.post('/jobs',                      asyncHandler(recruiterController.postJob));
router.get('/jobs/:id',                   asyncHandler(recruiterController.getJobById));
router.put('/jobs/:id',                   asyncHandler(recruiterController.updateJob));
router.delete('/jobs/:id',                asyncHandler(recruiterController.deleteJob));

export default router;
