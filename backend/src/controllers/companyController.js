/**
 * companyController.js
 */

import * as companyService from '../services/companyService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listCompanies = asyncHandler(async (req, res) => {
  const companies = await companyService.getAllCompanies();
  sendSuccess(res, { message: 'Companies fetched successfully', data: { companies } });
});

export const getCompany = asyncHandler(async (req, res) => {
  const company = await companyService.getCompanyById(req.params.id);
  sendSuccess(res, { message: 'Company fetched successfully', data: { company } });
});

export const createCompany = asyncHandler(async (req, res) => {
  const id = await companyService.createCompanyRecord(req.body);
  sendSuccess(res, { statusCode: 201, message: 'Company created successfully', data: { id } });
});
