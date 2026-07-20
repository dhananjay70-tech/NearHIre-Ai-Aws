<<<<<<< HEAD
# NearHire.AI

An AI-powered hyperlocal job discovery platform — connecting job seekers with opportunities near them.

---

## Project Structure

```
nearhire-ai/
├── frontend/          # React + Vite (port 5173)
├── node-backend/      # Node.js + Express (port 5001)
├── python-backend/    # FastAPI (port 8000)
├── database/          # SQL migration scripts
├── docs/              # Project documentation
├── package.json       # Root monorepo orchestrator
├── .gitignore
└── README.md
```

---

## Prerequisites

Make sure the following are installed on your machine:

- **Node.js** v18+ — https://nodejs.org
- **npm** v9+
- **Python** 3.10+ — https://python.org
- **pip** (comes with Python)
- **PostgreSQL** 14+ — https://postgresql.org

---

## Local Setup

### 1. Clone and enter the project

```bash
git clone <your-repo-url>
cd nearhire-ai
```

### 2. Install root dependencies

```bash
npm install
```

### 3. Set up the Frontend

```bash
cd frontend
npm install
cp .env.example .env
cd ..
```

### 4. Set up the Node backend

```bash
cd node-backend
npm install
cp .env.example .env
```

Open `node-backend/.env` and fill in your real values:

```env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/nearhire_db
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

> **Generate a secure JWT_SECRET:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

```bash
cd ..
```

### 5. Set up the Python backend

```bash
cd python-backend
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
cd ..
```

---

## PostgreSQL Database Setup

### Step 1: Create the database

Connect to PostgreSQL and create the database:

```bash
# Using psql (replace 'postgres' with your username if different)
psql -U postgres -c "CREATE DATABASE nearhire_db;"
```

Or in the `psql` shell:

```sql
CREATE DATABASE nearhire_db;
```

### Step 2: Update DATABASE_URL

Edit `node-backend/.env`:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/nearhire_db
```

### Step 3: Initialize the schema

```bash
cd node-backend
npm run db:init
```

Expected output:

```
🚀  NearHire.AI — Database Initialization
─────────────────────────────────────────
📦  Database: localhost:5432/nearhire_db
📄  Schema file loaded: schema.sql
✅  Schema executed successfully.
✅  Tables created: users, user_preferences
✅  Indexes created.
✅  Triggers configured.

🎉  Database initialization complete!
    You can now start the server: npm run dev
```

---

## Running the Project

### Run all services together (from root)

```bash
npm run dev
```

### Or run individually

```bash
npm run dev:frontend    # React app on http://localhost:5173
npm run dev:node        # Node API on http://localhost:5001
npm run dev:python      # Python API on http://localhost:8000
```

---

## Expected URLs

| Service          | URL                              |
|------------------|----------------------------------|
| Frontend (React) | http://localhost:5173            |
| Node Backend     | http://localhost:5001            |
| Node Health      | http://localhost:5001/health     |
| Node API Health  | http://localhost:5001/api/health |
| Python Backend   | http://localhost:8000            |
| Python Health    | http://localhost:8000/health     |
| Python API Docs  | http://localhost:8000/docs       |

---

## Job Data & Sources

All jobs are **real**, aggregated automatically by MS1 — there are no dummy jobs.
Sources (official APIs preferred over scraping): Greenhouse, Lever, Arbeitnow,
Remotive, WeWorkRemotely, **RemoteOK, Adzuna, JSearch (RapidAPI), Jooble**. The
scheduler refreshes jobs on boot and **every 30 minutes**; MS2 (Python AI) and
the frontend read these same jobs through MS1's `/api/jobs*` endpoints.

- Full details: [`docs/JOB_AGGREGATION.md`](docs/JOB_AGGREGATION.md)
- Optional source API keys live in `backend/.env.example` (missing keys are
  skipped — RemoteOK and the existing sources need none).
- Manual scrape: `cd backend && npm run scrape`
- Admin dashboard: `GET /api/admin/scraper-stats` and `POST /api/admin/scrape`
  (ADMIN role) — totals, per-source breakdown, recent runs, scheduler status.

---

## Authentication Endpoints

All auth endpoints are under `/api/auth`.

| Method | Endpoint                 | Auth Required | Description              |
|--------|--------------------------|---------------|--------------------------|
| POST   | `/api/auth/register`     | No            | Create a new account     |
| POST   | `/api/auth/login`        | No            | Log in                   |
| GET    | `/api/auth/me`           | Yes           | Get current user         |
| POST   | `/api/auth/logout`       | No            | Log out (clears cookie)  |
| PATCH  | `/api/auth/profile`      | Yes           | Update profile fields    |
| GET    | `/api/auth/preferences`  | Yes           | Get job preferences      |
| PATCH  | `/api/auth/preferences`  | Yes           | Update job preferences   |

### Sample Register Request

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Neha Kumari","email":"neha@example.com","password":"Password@123"}' \
  -c cookies.txt
```

Response (`201 Created`):

```json
{
  "success": true,
  "message": "Account created successfully. Welcome to NearHire.AI!",
  "data": {
    "user": {
      "id": "uuid-here",
      "name": "Neha Kumari",
      "email": "neha@example.com",
      "role": "USER",
      ...
    }
  }
}
```

### Sample Login Request

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"neha@example.com","password":"Password@123"}' \
  -c cookies.txt
```

Response (`200 OK`):

```json
{
  "success": true,
  "message": "Logged in successfully.",
  "data": {
    "user": { ... }
  }
}
```

---

## Cookie Behaviour

- **Cookie name:** `nearhire_token`
- **Type:** httpOnly (not readable by JavaScript)
- **SameSite:** lax
- **Secure:** true in production, false in development
- **Max age:** 7 days
- **Set on:** login and register
- **Cleared on:** logout

Because the cookie is httpOnly, it is sent automatically by the browser on every request to the backend. The frontend does not need to manage tokens manually.

---

## Common Errors

### `database does not exist`
```
error: database "nearhire_db" does not exist
```
**Fix:** Create the database first:
```bash
psql -U postgres -c "CREATE DATABASE nearhire_db;"
```

### Wrong PostgreSQL password
```
error: password authentication failed for user "postgres"
```
**Fix:** Check that the password in `DATABASE_URL` in `node-backend/.env` matches your PostgreSQL setup.

### Missing JWT_SECRET
```
❌  Missing or insecure JWT_SECRET environment variable.
```
**Fix:** Set a real secret in `node-backend/.env`:
```env
JWT_SECRET=<at-least-32-random-characters>
```

### CORS error in browser
```
Access to XMLHttpRequest at 'http://localhost:5001' from origin 'http://localhost:5173' has been blocked by CORS policy
```
**Fix:** Make sure `CLIENT_URL=http://localhost:5173` is set in `node-backend/.env`. Restart the server after changing `.env`.

### Port already in use
```
Error: listen EADDRINUSE: address already in use :::5001
```
**Fix:** Kill the process using that port:
```powershell
# Windows PowerShell
netstat -ano | findstr :5001
taskkill /PID <PID> /F
```

---

## Tech Stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Frontend       | React, Vite, Tailwind CSS, React Router, Axios |
| Node Backend   | Node.js, Express, pg, bcrypt, jsonwebtoken, zod |
| Python Backend | FastAPI, Uvicorn, Pydantic              |
| Database       | PostgreSQL                              |

---

## Manual Steps Required

1. **PostgreSQL**: Create the database and update `DATABASE_URL` in `node-backend/.env`.
2. **JWT_SECRET**: Generate a secure random string and set it in `node-backend/.env`.
3. **DB Init**: Run `cd node-backend && npm run db:init` before starting the server for the first time.
4. **Python venv**: The virtual environment must be activated manually before running `npm run dev:python` from the root.
5. **Environment files**: All `.env.example` files must be copied to `.env` and filled in before starting any service.
=======
# NearHire-AI
NearHire AI is an AI-powered hyperlocal job platform that helps users discover nearby job opportunities based on their location, skills, and preferences. It delivers personalized job recommendations with smart matching to make job searching faster and more efficient.
>>>>>>> a1f68ab0acec90dcb60c0860658084d41d843945
