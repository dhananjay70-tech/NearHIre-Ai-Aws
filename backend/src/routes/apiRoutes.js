import { Router } from 'express';
import { healthCheck } from '../controllers/healthController.js';
import authRoutes      from './authRoutes.js';
import recruiterRoutes from './recruiterRoutes.js';
import jobRoutes       from './jobRoutes.js';
import companyRoutes   from './companyRoutes.js';
import skillRoutes     from './skillRoutes.js';
import savedJobRoutes  from './savedJobRoutes.js';
import applicationRoutes from './applicationRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import adminRoutes     from './adminRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = Router();

// GET /api/health
router.get('/health', healthCheck);

// /api/auth/*
router.use('/auth', authRoutes);

// /api/recruiter/* — Recruiter Portal
router.use('/recruiter', recruiterRoutes);

// /api/jobs/* | /api/companies/* | /api/skills/*
router.use('/jobs',      jobRoutes);
router.use('/companies', companyRoutes);
router.use('/skills',    skillRoutes);

// /api/saved-jobs/* | /api/applications/* | /api/dashboard
router.use('/saved-jobs',    savedJobRoutes);
router.use('/applications',  applicationRoutes);
router.use('/dashboard',     dashboardRoutes);

// /api/notifications/* — in-app notifications (any signed-in role)
router.use('/notifications', notificationRoutes);

// /api/admin/* — admin job/scraper dashboard (ADMIN only)
router.use('/admin',         adminRoutes);

export default router;
