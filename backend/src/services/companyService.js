/**
 * companyService.js — Business logic for companies.
 */

import * as companyRepo from "../repositories/companyRepository.js";
import { AppError } from "../utils/AppError.js";

function formatCompany(company) {
  if (!company) {
    return null;
  }

  return {
    id: company.id,
    name: company.name,
    description: company.description,
    websiteUrl: company.website_url,
    logoUrl: company.logo_url,

    location: {
      address: company.address,
      city: company.city,
      state: company.state,
      postalCode: company.postal_code,
      latitude:
        company.latitude !== null
          ? Number(company.latitude)
          : null,
      longitude:
        company.longitude !== null
          ? Number(company.longitude)
          : null,
    },

    verified: company.is_verified,
    activeJobsCount:
      company.active_jobs_count !== undefined
        ? Number(company.active_jobs_count)
        : undefined,

    jobs: company.jobs || [],
    createdAt: company.created_at,
    updatedAt: company.updated_at,
  };
}

export async function getAllCompanies() {
  const companies = await companyRepo.findCompanies();

  return companies.map(formatCompany);
}

export async function getCompanyById(id) {
  const company = await companyRepo.findCompanyById(id);

  if (!company) {
    throw new AppError("Company not found", 404);
  }

  return formatCompany(company);
}

export async function createCompanyRecord(data) {
  const company = await companyRepo.createCompany(data);

  return formatCompany(company);
}