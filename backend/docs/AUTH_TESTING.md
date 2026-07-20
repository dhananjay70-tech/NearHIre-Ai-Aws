# NearHire.AI — Authentication Testing Guide

This document explains how to test all authentication endpoints using three methods: the browser frontend, Postman, and curl/PowerShell.

---

## Prerequisites

- Node backend running: `cd node-backend && npm run dev`
- Database initialized: `npm run db:init`
- (Optional) Frontend running: `cd frontend && npm run dev`

---

## Endpoints Reference

| Method | Endpoint                 | Auth Required |
|--------|--------------------------|---------------|
| POST   | `/api/auth/register`     | No            |
| POST   | `/api/auth/login`        | No            |
| GET    | `/api/auth/me`           | Yes (cookie)  |
| POST   | `/api/auth/logout`       | No            |
| PATCH  | `/api/auth/profile`      | Yes (cookie)  |
| GET    | `/api/auth/preferences`  | Yes (cookie)  |
| PATCH  | `/api/auth/preferences`  | Yes (cookie)  |

---

## 1. Browser Frontend

### Register
1. Open `http://localhost:5173/register`
2. Fill in Full Name, Email, Password, Confirm Password
3. Click **Create Account**
4. You should be redirected to `/search`

### Login
1. Open `http://localhost:5173/login`
2. Enter your email and password
3. Click **Login**
4. You should be redirected to `/search`

### Verify cookie
1. Open browser DevTools → Application → Cookies → `http://localhost:5173`
2. You should see a `nearhire_token` cookie (value is not readable — it is httpOnly)

### Logout
1. Click **Logout** in the navbar
2. You should be redirected to `/`
3. Protected routes (e.g. `/search`) should now redirect to `/login`

### Session persistence
1. Log in and navigate to `/search`
2. Hard refresh the page (Ctrl+Shift+R)
3. You should remain on `/search` (session restored from cookie)

---

## 2. Postman

### Setup
- Import as a new collection
- Set base URL: `http://localhost:5001/api`
- In **Settings**, enable: **Automatically follow redirects** and **Send Cookies**

### Register

```
POST http://localhost:5001/api/auth/register
Content-Type: application/json

{
  "name": "Neha Kumari",
  "email": "neha@example.com",
  "password": "Password@123"
}
```

Expected: `201 Created` with user object. Cookie `nearhire_token` is set automatically.

### Login

```
POST http://localhost:5001/api/auth/login
Content-Type: application/json

{
  "email": "neha@example.com",
  "password": "Password@123"
}
```

Expected: `200 OK` with user object. Cookie refreshed.

### Get current user (protected)

```
GET http://localhost:5001/api/auth/me
```

The cookie is sent automatically by Postman. Expected: `200 OK` with user + preferences.

### Update profile

```
PATCH http://localhost:5001/api/auth/profile
Content-Type: application/json

{
  "phone": "+91-9876543210",
  "city": "Bengaluru",
  "state": "Karnataka"
}
```

### Update preferences

```
PATCH http://localhost:5001/api/auth/preferences
Content-Type: application/json

{
  "preferred_role": "Software Engineer",
  "minimum_salary": 600000,
  "maximum_distance_km": 15,
  "preferred_job_types": ["full-time", "contract"],
  "preferred_work_modes": ["remote", "hybrid"]
}
```

### Logout

```
POST http://localhost:5001/api/auth/logout
```

Expected: `200 OK`, cookie cleared.

### Using Authorization header (fallback)

If you need to test without cookies, copy the JWT from a login response (if you log it in dev mode) and pass it as:

```
Authorization: Bearer <token>
```

---

## 3. curl / PowerShell

### Register

**curl:**
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Neha Kumari","email":"neha@example.com","password":"Password@123"}' \
  -c cookies.txt \
  -s | python -m json.tool
```

**PowerShell:**
```powershell
$body = @{
  name     = "Neha Kumari"
  email    = "neha@example.com"
  password = "Password@123"
} | ConvertTo-Json

Invoke-WebRequest -Method POST `
  -Uri "http://localhost:5001/api/auth/register" `
  -ContentType "application/json" `
  -Body $body `
  -SessionVariable session | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

### Login

**curl:**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"neha@example.com","password":"Password@123"}' \
  -c cookies.txt -b cookies.txt \
  -s | python -m json.tool
```

### Get current user

**curl:**
```bash
curl -X GET http://localhost:5001/api/auth/me \
  -b cookies.txt \
  -s | python -m json.tool
```

### Logout

**curl:**
```bash
curl -X POST http://localhost:5001/api/auth/logout \
  -b cookies.txt -c cookies.txt \
  -s | python -m json.tool
```

---

## Validation Errors (Expected Failures)

### Short password
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"abc"}' \
  -s | python -m json.tool
```

Expected: `400` with validation errors listing password rules.

### Duplicate email
Register the same email twice — expected: `409 Conflict`.

### Wrong password
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"neha@example.com","password":"WrongPass!1"}' \
  -s | python -m json.tool
```

Expected: `401` with `"Invalid email or password."`.

### Accessing protected route without cookie
```bash
curl -X GET http://localhost:5001/api/auth/me -s | python -m json.tool
```

Expected: `401` with `"Authentication required. Please log in."`.
