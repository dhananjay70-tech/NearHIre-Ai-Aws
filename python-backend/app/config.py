from dotenv import load_dotenv
import os

# Load .env file
load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    ENV: str = os.getenv("ENV", "development")
    CORS_ORIGIN: str = os.getenv("CLIENT_URL", os.getenv("CORS_ORIGIN", "http://localhost:5173"))
    CORE_API_URL: str = os.getenv("CORE_API_URL", os.getenv("NODE_BACKEND_URL", "http://localhost:5001/api"))
    # Job Scraper microservice (MS3) — never hardcode; read from env.
    JOB_SCRAPER_URL: str = os.getenv("JOB_SCRAPER_URL", "http://localhost:8100")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


settings = Settings()
