/**
 * dashboardController.js — GET /api/dashboard aggregated stats.
 */

import { sendSuccess } from '../utils/apiResponse.js';
import pool from '../config/db.js';

export async function getDashboard(req, res, next) {
  try {
    const { userId } = req.user;

    // Run all queries in parallel
    const [
      savedCountResult,
      appCountResult,
      interviewCountResult,
      offerCountResult,
      recentAppsResult,
      recentSavedResult,
      latestResumeResult,
      aiChatsCountResult,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS cnt FROM saved_jobs WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*) AS cnt FROM applications WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*) AS cnt FROM applications WHERE user_id = $1 AND status = 'INTERVIEW'`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*) AS cnt FROM applications WHERE user_id = $1 AND status = 'OFFER'`,
        [userId]
      ),
      pool.query(
        `SELECT
           a.id, a.status, a.applied_at,
           j.title AS job_title, j.city AS job_city,
           c.name AS company_name
         FROM applications a
         JOIN jobs j      ON j.id = a.job_id
         JOIN companies c ON c.id = j.company_id
         WHERE a.user_id = $1
         ORDER BY a.applied_at DESC
         LIMIT 5`,
        [userId]
      ),
      pool.query(
        `SELECT
           sj.id AS saved_id, sj.created_at AS saved_at,
           j.id AS job_id, j.title AS job_title, j.city AS job_city,
           c.name AS company_name
         FROM saved_jobs sj
         JOIN jobs j      ON j.id = sj.job_id
         JOIN companies c ON c.id = j.company_id
         WHERE sj.user_id = $1
         ORDER BY sj.created_at DESC
         LIMIT 5`,
        [userId]
      ),
      pool.query(
        `SELECT ats_score FROM resumes WHERE user_id = $1 ORDER BY analyzed_at DESC LIMIT 1`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*) AS cnt FROM ai_chats WHERE user_id = $1`,
        [userId]
      ),
    ]);

    const savedJobsCount    = parseInt(savedCountResult.rows[0].cnt, 10);
    const applicationsCount = parseInt(appCountResult.rows[0].cnt, 10);
    const interviewsCount   = parseInt(interviewCountResult.rows[0].cnt, 10);
    const offersCount       = parseInt(offerCountResult.rows[0].cnt, 10);

    const recentApplications = recentAppsResult.rows.map((r) => ({
      id: r.id,
      status: r.status,
      appliedAt: r.applied_at,
      jobTitle: r.job_title,
      jobCity: r.job_city,
      companyName: r.company_name,
    }));

    const recentSavedJobs = recentSavedResult.rows.map((r) => ({
      savedId: r.saved_id,
      savedAt: r.saved_at,
      jobId: r.job_id,
      jobTitle: r.job_title,
      jobCity: r.job_city,
      companyName: r.company_name,
    }));

    const resumeScore = latestResumeResult.rows[0]?.ats_score ?? null;
    const aiChatsCount = parseInt(aiChatsCountResult.rows[0]?.cnt || 0, 10);

    return sendSuccess(res, {
      message: 'Dashboard data retrieved.',
      data: {
        savedJobsCount,
        applicationsCount,
        interviewsCount,
        offersCount,
        recentApplications,
        recentSavedJobs,
        resumeScore,
        aiChatsCount,
      },
    });
  } catch (err) {
    next(err);
  }
}
