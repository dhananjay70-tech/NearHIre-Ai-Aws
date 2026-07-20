"""
Unit tests for the pure pipeline logic: normalization, validation, and
de-duplication. These run without network access.

Run:  pytest -q
"""

import asyncio

from app.models.job import Job
from app.services.deduplicator import deduplicate
from app.services.normalizer import normalize_one, normalize_many


def _run(coro):
    return asyncio.run(coro)


def test_normalize_valid_job():
    raw = {
        "title": "Senior Python Developer",
        "company": "Acme",
        "location": "Remote",
        "remote": True,
        "description": "Work with FastAPI, PostgreSQL and Docker.",
        "applyUrl": "https://acme.com/jobs/1",
        "source": "test",
    }
    job = _run(normalize_one(raw, do_geocode=False))
    assert job is not None
    assert job.title == "Senior Python Developer"
    assert job.remote is True
    assert "FastAPI" in job.skills
    assert job.employment_type == "FULL_TIME"
    assert job.fingerprint  # computed


def test_normalize_drops_invalid():
    # Missing company -> dropped, never fabricated.
    assert _run(normalize_one({"title": "X", "source": "t"}, do_geocode=False)) is None
    # Missing title -> dropped.
    assert _run(normalize_one({"company": "Y", "source": "t"}, do_geocode=False)) is None


def test_dedupe_by_apply_url():
    raws = [
        {"title": "Dev", "company": "Acme", "applyUrl": "https://a.com/1", "source": "s1"},
        {"title": "Dev", "company": "Acme", "applyUrl": "https://a.com/1?utm=x", "source": "s2"},
    ]
    jobs = _run(normalize_many(raws, do_geocode=False))
    unique = deduplicate(jobs)
    assert len(unique) == 1


def test_dedupe_by_company_title_city():
    raws = [
        {"title": "Data Engineer", "company": "Globex", "city": "Pune", "source": "s1"},
        {"title": "data engineer", "company": "globex", "city": "pune", "source": "s2"},
        {"title": "Data Engineer", "company": "Globex", "city": "Mumbai", "source": "s3"},
    ]
    jobs = _run(normalize_many(raws, do_geocode=False))
    unique = deduplicate(jobs)
    # First two collapse; Mumbai is a distinct location.
    assert len(unique) == 2


def test_india_filter_keeps_india_and_drops_others():
    from app.models.job import Job
    from app.services.location_filter import is_india_job, filter_india

    india_jobs = [
        Job(title="A", company="C", country="India", source="s"),
        Job(title="B", company="C", country="IN", source="s"),
        Job(title="D", company="C", city="Bangalore", source="s"),
        Job(title="E", company="C", location="Gurugram, Haryana", source="s"),
        Job(title="F", company="C", state="Maharashtra", source="s"),
    ]
    foreign_jobs = [
        Job(title="G", company="C", country="United States", city="San Francisco", source="s"),
        Job(title="H", company="C", location="Berlin, Germany", source="s"),
        Job(title="I", company="C", city="Indiana", source="s"),   # must NOT match "India"
        Job(title="J", company="C", location="Worldwide", remote=True, source="s"),
    ]
    for j in india_jobs:
        assert is_india_job(j) is True, j.title
    for j in foreign_jobs:
        assert is_india_job(j) is False, j.title

    kept = filter_india(india_jobs + foreign_jobs)
    assert len(kept) == len(india_jobs)
    assert all(j.country for j in kept)  # country backfilled to India


def test_location_filter_mumbai_excludes_other_cities():
    from app.models.job import Job
    from app.services.location_filter import filter_by_location, matches_location

    jobs = [
        Job(title="Java Dev", company="A", city="Mumbai", source="s"),
        Job(title="Java Dev", company="B", city="Navi Mumbai", source="s"),
        Job(title="Java Dev", company="C", city="Thane", source="s"),
        Job(title="Java Dev", company="D", location="Powai, Mumbai", source="s"),
        Job(title="Java Dev", company="E", city="Andheri", source="s"),
        Job(title="Java Dev", company="F", city="Bandra", source="s"),
        Job(title="Java Dev", company="G", city="Borivali", source="s"),
        # these MUST be removed
        Job(title="Java Dev", company="H", city="Bangalore", source="s"),
        Job(title="Java Dev", company="I", city="Delhi", source="s"),
        Job(title="Java Dev", company="J", city="Noida", source="s"),
        Job(title="Java Dev", company="K", city="Pune", source="s"),
        Job(title="Java Dev", company="L", city="Chennai", source="s"),
    ]
    kept = filter_by_location(jobs, "Mumbai")
    kept_cities = {(j.city or j.location) for j in kept}
    assert kept_cities == {
        "Mumbai", "Navi Mumbai", "Thane", "Powai, Mumbai", "Andheri", "Bandra", "Borivali",
    }
    # explicit negatives
    for city in ["Bangalore", "Delhi", "Noida", "Pune", "Chennai"]:
        assert not matches_location(Job(title="x", company="y", city=city, source="s"), "Mumbai")


def test_location_filter_is_case_insensitive():
    from app.models.job import Job
    from app.services.location_filter import matches_location

    assert matches_location(Job(title="x", company="y", city="MUMBAI", source="s"), "mumbai")
    assert matches_location(Job(title="x", company="y", city="mumbai", source="s"), "MUMBAI")
    assert matches_location(Job(title="x", company="y", location="Bengaluru, KA", source="s"), "bangalore")


def test_location_country_request_passes_through():
    from app.models.job import Job
    from app.services.location_filter import filter_by_location

    jobs = [
        Job(title="x", company="y", city="Mumbai", source="s"),
        Job(title="x", company="y", city="Delhi", source="s"),
    ]
    # location=India (country) must not city-filter
    assert len(filter_by_location(jobs, "India")) == 2
    assert len(filter_by_location(jobs, "")) == 2


def test_public_schema_has_all_fields():
    job = Job(title="T", company="C", source="s")
    d = job.to_public_dict()
    for field in [
        "title", "company", "location", "latitude", "longitude", "salary",
        "currency", "experience", "skills", "description", "employmentType",
        "remote", "hybrid", "onsite", "companyLogo", "companyWebsite",
        "applyUrl", "source", "postedDate", "industry", "category",
        "education", "city", "state", "country", "pincode",
    ]:
        assert field in d
