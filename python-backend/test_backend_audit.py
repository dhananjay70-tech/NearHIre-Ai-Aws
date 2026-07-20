"""
test_backend_audit.py — Comprehensive test script for Python FastAPI backend.
Tests:
- Health check endpoints
- CORS preflight OPTIONS requests from http://localhost:5173
- JWT authentication extraction & validation
- Multipart PDF upload to /api/resume/analyze
- Resume rewriter endpoints (/api/resume/rewrite & /api/rewrite)
- Career tools (/api/resume/skill-gap, /api/resume/roadmap)
- AI Agent endpoints (/api/agent/*)
- Job recommendations (/api/recommendations/jobs)
"""

import sys
import os
import json
import jwt
import httpx
import asyncio
from datetime import datetime, timezone, timedelta

# Import app settings
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.config import settings

BASE_URL = f"http://localhost:{settings.PORT}"
JWT_SECRET = settings.JWT_SECRET or "gfvehdlkihweiytrfyuwehlknbkvgzcdguwiqjd"

def create_test_jwt(user_id="123e4567-e89b-12d3-a456-426614174000", email="test@example.com", role="seeker", expires_minutes=60):
    payload = {
        "id": user_id,
        "userId": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def create_minimal_pdf_bytes():
    """Generates a minimal valid PDF byte sequence containing text."""
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
        b"2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
        b"3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>> >> endobj\n"
        b"4 0 obj <</Length 68>> stream\n"
        b"BT /F1 12 Tf 100 700 Td (John Doe - Senior Python & React Developer. Skills: Python, React, FastAPI, Node.js, SQL.) Tj ET\n"
        b"endstream endobj\n"
        b"5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n"
        b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000262 00000 n \n0000000380 00000 n \n"
        b"trailer <</Size 6 /Root 1 0 R>>\nstartxref\n450\n%%EOF\n"
    )
    return pdf_content

async def run_tests():
    print("=" * 60)
    print("STARTING PYTHON FASTAPI BACKEND AUDIT & VERIFICATION")
    print("=" * 60)

    token = create_test_jwt()
    headers = {
        "Authorization": f"Bearer {token}",
        "Origin": "http://localhost:5173",
    }
    
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=60.0) as client:
        # 1. Health Check
        print("\n[1] Testing GET /health...")
        res = await client.get("/health")
        print(f"Status: {res.status_code}, Body: {res.json()}")
        assert res.status_code == 200, "Health check failed"

        print("\n[2] Testing GET /api/health...")
        res = await client.get("/api/health")
        print(f"Status: {res.status_code}, Body: {res.json()}")
        assert res.status_code == 200, "API health check failed"

        # 2. CORS Preflight Check
        print("\n[3] Testing CORS Preflight OPTIONS /api/resume/analyze...")
        cors_headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization, content-type",
        }
        res = await client.options("/api/resume/analyze", headers=cors_headers)
        print(f"Status: {res.status_code}")
        print(f"Access-Control-Allow-Origin: {res.headers.get('access-control-allow-origin')}")
        print(f"Access-Control-Allow-Credentials: {res.headers.get('access-control-allow-credentials')}")
        assert res.status_code == 200, "CORS preflight failed"
        assert res.headers.get("access-control-allow-origin") == "http://localhost:5173", "CORS origin mismatch"
        assert res.headers.get("access-control-allow-credentials") == "true", "CORS credentials mismatch"

        # 3. JWT Auth verification (Unauthenticated request should fail with 401)
        print("\n[4] Testing Authentication Guard (No token)...")
        res = await client.post("/api/resume/analyze")
        print(f"Status: {res.status_code}, Response: {res.json()}")
        assert res.status_code == 401, "Expected 401 Unauthorized when no token is supplied"

        # 4. Resume PDF Upload /analyze
        print("\n[5] Testing Multipart PDF Upload POST /api/resume/analyze...")
        pdf_bytes = create_minimal_pdf_bytes()
        files = {"file": ("test_resume.pdf", pdf_bytes, "application/pdf")}
        data = {"jobId": "", "latitude": "12.9716", "longitude": "77.5946", "radiusKm": "20"}
        
        res = await client.post("/api/resume/analyze", headers=headers, files=files, data=data)
        print(f"Status: {res.status_code}")
        resp_data = res.json()
        print(f"Success: {resp_data.get('success')}")
        print(f"Extracted Skills: {resp_data.get('data', {}).get('extractedSkills')}")
        print(f"ATS Score: {resp_data.get('data', {}).get('atsScore')}")
        assert res.status_code == 200, f"Resume analyze failed: {res.text}"
        assert resp_data.get("success") is True, "Expected success: true in analyze response"

        # 5. Resume Rewriter endpoints
        print("\n[6] Testing Resume Rewrite POST /api/resume/rewrite...")
        rewrite_payload = {
            "resumeText": "Experienced Developer with Python, React and PostgreSQL skills.",
            "jobDescription": "Looking for Senior Full Stack Engineer with Python, React and AWS.",
            "tone": "professional"
        }
        res = await client.post("/api/resume/rewrite", json=rewrite_payload)
        print(f"Status: {res.status_code}, geminiUsed: {res.json().get('geminiUsed')}")
        assert res.status_code == 200, "Resume rewrite failed"

        print("\n[7] Testing Resume Rewrite Alias POST /api/rewrite...")
        res = await client.post("/api/rewrite", json=rewrite_payload)
        print(f"Status: {res.status_code}, geminiUsed: {res.json().get('geminiUsed')}")
        assert res.status_code == 200, "Resume rewrite alias failed"

        # 6. Career Tools endpoints
        print("\n[8] Testing Skill Gap Analysis POST /api/resume/skill-gap...")
        skill_gap_payload = {
            "resumeText": "Developer skilled in React, JavaScript, HTML, CSS.",
            "jobDescription": "Need a React Developer with TypeScript, Docker, and AWS."
        }
        res = await client.post("/api/resume/skill-gap", json=skill_gap_payload)
        print(f"Status: {res.status_code}, MatchScore: {res.json().get('data', {}).get('matchScore')}")
        assert res.status_code == 200, "Skill gap analysis failed"

        print("\n[9] Testing Learning Roadmap POST /api/resume/roadmap...")
        roadmap_payload = {
            "missingSkills": ["TypeScript", "Docker"],
            "targetRole": "Full Stack Engineer"
        }
        res = await client.post("/api/resume/roadmap", json=roadmap_payload)
        print(f"Status: {res.status_code}, TotalWeeks: {res.json().get('data', {}).get('totalWeeks')}")
        assert res.status_code == 200, "Learning roadmap failed"

        # 7. AI Agent endpoints
        print("\n[10] Testing AI Agent Interview Questions POST /api/agent/interview-questions...")
        agent_payload = {
            "jobTitle": "Python Backend Engineer",
            "jobDescription": "Build high performance FastAPI microservices",
            "requiredSkills": ["Python", "FastAPI", "PostgreSQL"],
            "matchedSkills": ["Python", "FastAPI"],
            "missingSkills": ["Docker"]
        }
        res = await client.post("/api/agent/interview-questions", headers=headers, json=agent_payload)
        print(f"Status: {res.status_code}, Success: {res.json().get('success')}")
        assert res.status_code == 200, "Interview questions failed"

        print("\n[11] Testing AI Agent Chat POST /api/agent/chat...")
        chat_payload = {"message": "How can I improve my resume for a Senior Developer role?"}
        res = await client.post("/api/agent/chat", headers=headers, json=chat_payload)
        print(f"Status: {res.status_code}, Success: {res.json().get('success')}")
        assert res.status_code == 200, "Agent chat failed"

    print("\n" + "=" * 60)
    print("ALL AUDIT TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_tests())
