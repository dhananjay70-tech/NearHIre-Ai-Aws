"""
main.py — FastAPI application entry point for the job-scraper microservice.

Independent service (default port 8100). On startup it optionally starts the
30-minute refresh scheduler and warms the job store. It does NOT integrate with
the NearHire backend — that comes later.

Run:  uvicorn app.main:app --host 0.0.0.0 --port 8100 --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import settings
from app.scheduler.cron import start_scheduler, shutdown_scheduler
from app.services.cache import cache
from app.utils.logger import get_logger

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s (env=%s)…", settings.SERVICE_NAME, settings.ENV)
    if settings.ENABLE_SCHEDULER:
        backend = start_scheduler()
        logger.info("Scheduler backend: %s", backend)
    else:
        logger.info("Scheduler disabled (ENABLE_SCHEDULER=false).")
    yield
    logger.info("Shutting down…")
    shutdown_scheduler()
    await cache.close()


app = FastAPI(
    title="NearHire Job Scraper",
    description="Independent microservice that aggregates REAL jobs from free/freemium APIs and public sources.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root() -> dict:
    return {
        "service": settings.SERVICE_NAME,
        "docs": "/docs",
        "endpoints": [
            "/health",
            "/jobs",
            "/jobs/search?q=",
            "/jobs/latest",
            "/jobs/source/{provider}",
            "/jobs/company/{company}",
            "/jobs/location/{city}",
            "/jobs/skills/{skill}",
            "/sources",
        ],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENV == "development",
    )
