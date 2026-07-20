# NearHire.AI — Local Demo Guide

## Prerequisites

- Node.js 18+
- Python 3.12+
- PostgreSQL 14+ running locally
- Git

## 1. Clone and Install

```bash
git clone <repo-url>
cd nearhire-ai
npm install               # root workspace
cd node-backend && npm install
cd ../frontend && npm install
```

## 2. PostgreSQL Setup

```sql
-- In psql as postgres:
CREATE DATABASE nearhire_db;
```

## 3. Node Backend Environment

Create `node-backend/.env`:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/nearhire_db
JWT_SECRET=your_very_long_random_secret_here
PORT=5001
CLIENT_URL=http://localhost:5173
```

## 4. Python Backend Environment

Create `python-backend/.env`:
```
JWT_SECRET=your_very_long_random_secret_here   # MUST match Node
NODE_BACKEND_URL=http://localhost:5001/api
CLIENT_URL=http://localhost:5173
PORT=8000
GEMINI_API_KEY=                                 # optional
GEMINI_MODEL=gemini-1.5-flash
```

## 5. Database Initialization

```bash
cd node-backend
npm run db:init    # Creates all tables
```

Jobs are populated with **real** data by the scraper pipeline / Job Scraper
service — there is no demo dataset to seed.

## 6. Python Dependencies

```bash
cd python-backend
pip install -r requirements.txt
```

## 7. Start All Three Services

**Terminal 1 — Node backend:**
```bash
cd node-backend
npm run dev
# → http://localhost:5001
```

**Terminal 2 — Python backend:**
```bash
cd python-backend
uvicorn app.main:app --reload --port 8000
# OR: python -m uvicorn app.main:app --reload --port 8000
# → http://localhost:8000
```

**Terminal 3 — Frontend:**
```bash
cd frontend
npm run dev
# → http://localhost:5173
```

## 8. Complete Demo Flow

1. Open http://localhost:5173
2. Click **Register** → create account
3. **Search Jobs** → browse 35 seeded jobs
4. Toggle **Map view** → see job locations
5. Use **📍 Use My Location** → enable GPS radius search
6. Open any job → **Save Job** / **Apply on Official Website**
7. Go to **Saved Jobs** → verify bookmark
8. Go to **Applications** → change status to INTERVIEW
9. Go to **Dashboard** → see live stats
10. Go to **Resume** → upload a PDF resume
11. Watch skill extraction and match score
12. Click **Analyze & Recommend Jobs** → ranked recommendations
13. Click **🎤 Interview Questions** (requires GEMINI_API_KEY)
14. Click **🗺 Learning Roadmap**

## 9. Verify Health Endpoints

```
GET http://localhost:5001/health
GET http://localhost:5001/api/health
GET http://localhost:8000/health
GET http://localhost:8000/docs        # Python Swagger UI
```
