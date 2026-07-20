"""
job.py — The common job schema every provider and scraper must emit.

A single Pydantic model is the contract for the whole service: providers
produce raw dicts, the normalizer maps them into `Job`, and the API returns
`Job` objects. Keeping one schema means dedup, filtering, and the API layer
never care which source a job came from.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class Job(BaseModel):
    # ── Core ────────────────────────────────────────────────────────────
    title: str
    company: str
    location: Optional[str] = None

    # ── Geo ─────────────────────────────────────────────────────────────
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None

    # ── Compensation ────────────────────────────────────────────────────
    salary: Optional[str] = None
    currency: Optional[str] = None

    # ── Role details ────────────────────────────────────────────────────
    experience: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    employment_type: Optional[str] = Field(default=None, alias="employmentType")
    education: Optional[str] = None
    industry: Optional[str] = None
    category: Optional[str] = None

    # ── Work mode (mutually-informative booleans) ───────────────────────
    remote: bool = False
    hybrid: bool = False
    onsite: bool = False

    # ── Company / application ───────────────────────────────────────────
    company_logo: Optional[str] = Field(default=None, alias="companyLogo")
    company_website: Optional[str] = Field(default=None, alias="companyWebsite")
    apply_url: Optional[str] = Field(default=None, alias="applyUrl")

    # ── Provenance ──────────────────────────────────────────────────────
    source: str
    posted_date: Optional[str] = Field(default=None, alias="postedDate")

    # ── Derived identity (filled by the normalizer) ─────────────────────
    fingerprint: Optional[str] = None

    model_config = {
        "populate_by_name": True,
        "extra": "ignore",
    }

    @field_validator("title", "company")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError("must not be blank")
        return str(v).strip()

    def compute_fingerprint(self) -> str:
        """
        Stable identity used for de-duplication and "new vs seen" tracking.
        Based on the strongest signals: apply URL if present, else
        company + title + city.
        """
        basis = (self.apply_url or "").strip().lower()
        if not basis:
            basis = "|".join(
                [
                    (self.company or "").strip().lower(),
                    (self.title or "").strip().lower(),
                    (self.city or self.location or "").strip().lower(),
                ]
            )
        return hashlib.sha1(basis.encode("utf-8")).hexdigest()

    def to_public_dict(self) -> dict:
        """Serialize with the camelCase field names the prompt schema lists."""
        return {
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "salary": self.salary,
            "currency": self.currency,
            "experience": self.experience,
            "skills": self.skills,
            "description": self.description,
            "employmentType": self.employment_type,
            "remote": self.remote,
            "hybrid": self.hybrid,
            "onsite": self.onsite,
            "companyLogo": self.company_logo,
            "companyWebsite": self.company_website,
            "applyUrl": self.apply_url,
            "source": self.source,
            "postedDate": self.posted_date,
            "industry": self.industry,
            "category": self.category,
            "education": self.education,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "pincode": self.pincode,
            "fingerprint": self.fingerprint,
        }


class JobsResponse(BaseModel):
    success: bool = True
    count: int = 0
    source: Optional[str] = None
    cached: bool = False
    generated_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    jobs: List[dict] = Field(default_factory=list)
