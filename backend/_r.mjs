/**
 * Final verification: reads for all roles + a SELF-CLEANING recruiter write
 * cycle (create -> list -> update -> delete). Real user data is never mutated.
 */
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import pg from 'pg';

import apiRoutes from './src/routes/apiRoutes.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { signToken } from './src/utils/jwt.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', apiRoutes);
app.use(errorHandler);
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}`;

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const recruiter = (await client.query(`SELECT id,email FROM users WHERE role='RECRUITER' LIMIT 1`)).rows[0];
const seeker = (await client.query(`SELECT id,email FROM users WHERE role='USER' LIMIT 1`)).rows[0];

const rTok = signToken({ userId: recruiter.id, email: recruiter.email, role: 'RECRUITER' });
const H = { Authorization: `Bearer ${rTok}`, 'Content-Type': 'application/json' };

const log = (ok, msg, extra = '') =>
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}${extra ? '  ' + extra : ''}`);

let createdId = null;
try {
  // 1. Baseline job count for this recruiter
  const before = await (await fetch(`${base}/api/recruiter/jobs`, { headers: H })).json();
  const beforeCount = (before.data?.jobs || before.data || []).length;
  log(true, `baseline recruiter jobs`, `count=${beforeCount}`);

  // 2. CREATE
  const createRes = await fetch(`${base}/api/recruiter/jobs`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      title: '__SMOKETEST__ Backend Engineer',
      description: 'Temporary job created by an automated verification run.',
      companyName: '__SMOKETEST__ Co',
      city: 'Pune',
      state: 'Maharashtra',
      jobType: 'FULL_TIME',
      workMode: 'REMOTE',
    }),
  });
  const created = await createRes.json();
  createdId =
    created.data?.job?.id || created.data?.id || created.data?.job?.job?.id || null;
  log(createRes.status === 201 && !!createdId, `POST /recruiter/jobs`, `status=${createRes.status} id=${createdId}`);

  // 3. LIST includes it
  const after = await (await fetch(`${base}/api/recruiter/jobs`, { headers: H })).json();
  const list = after.data?.jobs || after.data || [];
  const found = list.find((j) => j.id === createdId);
  log(!!found, `GET /recruiter/jobs contains new job`, found ? `location="${found.location}" status=${found.status} applications=${found.applications}` : '');

  // 4. Ownership scoping: recruiter must NOT see the 2287 scraped jobs
  log(list.length === beforeCount + 1, `job list scoped to owner only`, `count=${list.length} (not 2287+)`);

  // 5. UPDATE
  const updRes = await fetch(`${base}/api/recruiter/jobs/${createdId}`, {
    method: 'PUT',
    headers: H,
    body: JSON.stringify({ title: '__SMOKETEST__ Updated Title', city: 'Mumbai' }),
  });
  log(updRes.status === 200, `PUT /recruiter/jobs/:id`, `status=${updRes.status}`);

  // 6. Cross-recruiter isolation: a DIFFERENT recruiter id must not update it
  const otherTok = signToken({ userId: seeker.id, email: 'other@t', role: 'RECRUITER' });
  const stealRes = await fetch(`${base}/api/recruiter/jobs/${createdId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${otherTok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'HIJACKED' }),
  });
  log(stealRes.status === 404, `other recruiter CANNOT edit this job`, `status=${stealRes.status}`);

  // 7. Applicant status mapping accepts the UI vocabulary
  const badRes = await fetch(`${base}/api/recruiter/applicants/00000000-0000-0000-0000-000000000000`, {
    method: 'PUT',
    headers: H,
    body: JSON.stringify({ status: 'SHORTLISTED' }),
  });
  // 404 (not found) proves it passed validation; 400 would mean status rejected.
  log(badRes.status === 404, `status 'SHORTLISTED' accepted by validation`, `status=${badRes.status} (404=valid status, row absent)`);

  const bogusRes = await fetch(`${base}/api/recruiter/applicants/00000000-0000-0000-0000-000000000000`, {
    method: 'PUT',
    headers: H,
    body: JSON.stringify({ status: 'NONSENSE' }),
  });
  log(bogusRes.status === 400, `invalid status rejected`, `status=${bogusRes.status}`);
} finally {
  // 8. CLEANUP — always remove the test job + company
  if (createdId) {
    const del = await fetch(`${base}/api/recruiter/jobs/${createdId}`, { method: 'DELETE', headers: H });
    log(del.status === 200, `DELETE /recruiter/jobs/:id (cleanup)`, `status=${del.status}`);
  }
  const gone = await client.query(`SELECT COUNT(*)::int c FROM jobs WHERE title LIKE '__SMOKETEST__%'`);
  await client.query(`DELETE FROM companies WHERE name = '__SMOKETEST__ Co'`);
  log(gone.rows[0].c === 0, `no test rows left behind`, `remaining=${gone.rows[0].c}`);
  await client.end();
  server.close();
}
process.exit(0);
