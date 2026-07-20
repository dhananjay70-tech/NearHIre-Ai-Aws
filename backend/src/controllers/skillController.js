/**
 * skillController.js
 */

import * as skillService from '../services/skillService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listSkills = asyncHandler(async (req, res) => {
  const skills = await skillService.getAllSkills(req.query.search || null);
  sendSuccess(res, { message: 'Skills fetched successfully', data: { skills } });
});
