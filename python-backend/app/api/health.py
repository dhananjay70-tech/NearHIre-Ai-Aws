from fastapi import APIRouter
from app.models.health import HealthResponse
from datetime import datetime, timezone

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="API Health Check",
    tags=["Health"],
)
async def api_health():
    """Returns the health status of the AI backend API."""
    return HealthResponse(
        status="ok",
        service="nearhire-python-backend",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
