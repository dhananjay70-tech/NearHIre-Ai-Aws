# NearHire.AI — Known Limitations

## Data

- **Jobs are real.** They are collected by the scraper pipeline / Job Scraper
  service from live job boards and APIs. The demo dataset has been removed.
- **Skills** are resolved dynamically as jobs are ingested.

## Resume Analysis

- **PDF only.** DOC/DOCX files are not supported in this version.
- **Text-based PDFs only.** Scanned image PDFs cannot be parsed by PyMuPDF without OCR, which is not included.
- **Skill extraction is deterministic, not semantic.** Skills must match known aliases in the dictionary. "Machine Learning Engineer" will not automatically imply "Python" without explicit mention.
- **Education/experience extraction is heuristic,** not structured parsing. These are helpful hints, not authoritative data.

## AI Features

- **Gemini is optional.** Interview questions, learning roadmap, cover letter, and resume feedback require a valid `GEMINI_API_KEY`. Without it, these features return a clear message explaining the limitation — all other features continue to work normally.
- **AI outputs are not guaranteed to be accurate.** Cover letters and roadmaps are AI-generated and should be reviewed before use.
- **No ATS score guarantee** is made or implied by any feature.

## Authentication

- **Shared JWT secret.** The Node and Python backends must use the same `JWT_SECRET`. If they differ, Python endpoints will reject authenticated requests.
- **Cookie-based auth.** The `nearhire_token` httpOnly cookie is set by Node. Ensure `withCredentials: true` is set in all API calls to Python.

## Infrastructure

- **No Redis/caching.** All data is fetched fresh from PostgreSQL and the Node API on each request.
- **No file storage.** Uploaded PDFs are processed in-memory and not stored permanently.
- **No email/notifications.** Application status changes do not trigger emails.
- **No recruiter/admin UI.** The RECRUITER and ADMIN roles exist in the schema but no separate interface is implemented.
- **Single-machine deployment.** This version is designed for local development. Production deployment requires environment-specific CORS, secure cookies (HTTPS), and reverse proxy configuration.

## Performance

- **Rate limiting** is set at 200 requests per 15 minutes globally on the Node backend. Adjust in `app.js` for production.
- **Python AI calls** can take 5–15 seconds when Gemini is used. The frontend shows loading states but does not implement streaming responses.
