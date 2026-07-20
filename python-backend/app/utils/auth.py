"""
JWT authentication for Python backend.
Reads and validates the same JWT used by the Node backend.
Token is read from:
  1. Authorization: Bearer <token> header
  2. nearhire_token cookie
"""

import jwt
from fastapi import Request, HTTPException
from app.config import settings


def extract_token(request: Request) -> str | None:
    """Extract JWT from Authorization header or cookie."""
    # 1. Authorization header
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization") or ""
    if auth_header.strip():
        parts = auth_header.strip().split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]
        elif len(parts) == 1 and not auth_header.lower().startswith("bearer"):
            return parts[0]

    # 2. Cookie fallbacks
    return (
        request.cookies.get("nearhire_token")
        or request.cookies.get("accessToken")
        or request.cookies.get("token")
    )


def verify_token(token: str) -> dict:
    """Verify JWT using the shared secret. Returns decoded payload."""
    if not settings.JWT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Server misconfiguration: JWT_SECRET not set."
        )
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
        )
        if payload.get("type") == "refresh":
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token. Refresh token cannot be used for authentication."
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Your session has expired. Please log in again."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token. Please log in again."
        )


def require_auth(request: Request) -> dict:
    """
    FastAPI dependency — extracts and validates JWT.
    Returns { userId, id, role }.
    """
    token = extract_token(request)
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in."
        )
    payload = verify_token(token)
    user_id = payload.get("userId") or payload.get("id") or payload.get("sub")
    role = payload.get("role", "USER")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload.")
    return {"userId": user_id, "id": user_id, "role": role}

