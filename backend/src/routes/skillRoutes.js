/**
 * skillRoutes.js
 */

import { Router } from 'express';
import * as skillController from '../controllers/skillController.js';

const router = Router();

// GET /api/skills?search=react
router.get('/', skillController.listSkills);

export default router;
