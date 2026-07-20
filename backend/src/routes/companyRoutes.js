/**
 * companyRoutes.js
 */

import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createCompanySchema } from '../validators/jobValidators.js';
import * as companyController from '../controllers/companyController.js';

const router = Router();

router.get('/',    companyController.listCompanies);
router.get('/:id', companyController.getCompany);

router.post('/', authenticate, requireRole('ADMIN', 'RECRUITER'), validateRequest(createCompanySchema), companyController.createCompany);

export default router;
