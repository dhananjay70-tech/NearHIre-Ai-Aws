/**
 * companyRepository.js — Raw SQL queries for companies.
 */

import pool from "../config/db.js";

export async function findCompanies() {
  const sql = `
    SELECT
      c.id,
      c.name,
      c.description,
      c.website_url,
      c.logo_url,
      c.address,
      c.city,
      c.state,
      c.postal_code,
      c.latitude,
      c.longitude,
      c.is_verified,
      c.created_at,
      COUNT(j.id)::INTEGER AS active_jobs_count
    FROM companies c
    LEFT JOIN jobs j
      ON j.company_id = c.id
      AND j.is_active = TRUE
    GROUP BY c.id
    ORDER BY c.name ASC
  `;

  const result = await pool.query(sql);
  return result.rows;
}

export async function findCompanyById(id) {
  const companySql = `
    SELECT
      id,
      name,
      description,
      website_url,
      logo_url,
      address,
      city,
      state,
      postal_code,
      latitude,
      longitude,
      is_verified,
      created_at,
      updated_at
    FROM companies
    WHERE id = $1
  `;

  const companyResult = await pool.query(companySql, [id]);

  if (!companyResult.rows.length) {
    return null;
  }

  const jobsSql = `
    SELECT
      id,
      title,
      job_type,
      work_mode,
      city,
      salary_min,
      salary_max,
      salary_period,
      posted_at
    FROM jobs
    WHERE company_id = $1
      AND is_active = TRUE
    ORDER BY posted_at DESC NULLS LAST
  `;

  const jobsResult = await pool.query(jobsSql, [id]);

  return {
    ...companyResult.rows[0],
    jobs: jobsResult.rows,
  };
}

export async function findCompanyByName(name) {
  const sql = `
    SELECT id, name, logo_url, website_url, city, state, latitude, longitude
    FROM companies
    WHERE name ILIKE $1
  `;
  const result = await pool.query(sql, [name]);
  return result.rows[0] || null;
}

export async function createCompany(data) {
  const {
    name,
    description = null,
    websiteUrl = null,
    logoUrl = null,
    address = null,
    city = null,
    state = null,
    postalCode = null,
    latitude = null,
    longitude = null,
    isVerified = false,
  } = data;

  const sql = `
    INSERT INTO companies (
      name,
      description,
      website_url,
      logo_url,
      address,
      city,
      state,
      postal_code,
      latitude,
      longitude,
      is_verified
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11
    )
    RETURNING *
  `;

  const values = [
    name,
    description,
    websiteUrl,
    logoUrl,
    address,
    city,
    state,
    postalCode,
    latitude,
    longitude,
    isVerified,
  ];

  const result = await pool.query(sql, values);
  return result.rows[0];
}