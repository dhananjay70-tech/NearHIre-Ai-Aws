import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  getJobs,
  getNearbyJobs,
  geocodeCity,
} from "../services/jobService";

import JobMap from "../components/map/JobMap";

/** Human-friendly "posted 3 days ago" from an ISO timestamp. */
function formatPostedAt(value) {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;

  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";

  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [label, secs] of units) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

const initialFilters = {
  search: "",
  city: "",
  jobType: "",
  workMode: "",
  minSalary: "",
  maxExperience: "",
  skill: "",
  sortBy: "newest",
};

const initialPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

function InputField({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function SearchJobsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [location, setLocation] = useState(null);
  // City-name search resolves to coordinates that drive the same radius search
  // as GPS/manual location. { lat, lng, label } or null.
  const [cityGeo, setCityGeo] = useState(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [showLatLng, setShowLatLng] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const resultsRef = useRef(null);
  const hasLoadedInitially = useRef(false);

  async function loadJobs({
    selectedFilters = filters,
    selectedLocation = location,
    selectedRadius = radiusKm,
    page = 1,
    scrollToResults = false,
  } = {}) {
    try {
      setLoading(true);
      setError("");

      const params = {
        ...selectedFilters,
        page,
        limit: 10,
      };

      let result;

      if (selectedLocation) {
        const nearbyFilters = {
          ...params,
          city: "",
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          radiusKm: selectedRadius,
        };
        result = await getNearbyJobs(nearbyFilters);
      } else {
        result = await getJobs(params);
      }

      setJobs(result?.jobs || []);
      setPagination(result?.pagination || initialPagination);

      if (scrollToResults) {
        window.setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    } catch (requestError) {
      console.error("Failed to fetch jobs:", requestError);
      setJobs([]);
      setPagination(initialPagination);
      setError(
        requestError.response?.data?.message ||
        "Unable to fetch jobs. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hasLoadedInitially.current) return;
    hasLoadedInitially.current = true;
    loadJobs({ selectedFilters: initialFilters, selectedLocation: null, selectedRadius: 10, page: 1 });
  }, []);

  useEffect(() => {
    const active = location || cityGeo;
    if (!active) return;
    loadJobs({ selectedFilters: filters, selectedLocation: active, selectedRadius: radiusKm, page: 1 });
  }, [radiusKm]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSearch(event) {
    event.preventDefault();

    // GPS / manual coordinates always win when active.
    if (location) {
      loadJobs({ selectedFilters: filters, selectedLocation: location, selectedRadius: radiusKm, page: 1, scrollToResults: true });
      return;
    }

    // A typed city is geocoded (Nominatim) and drives the radius search.
    const cityQuery = filters.city.trim();
    if (cityQuery) {
      try {
        setGeocoding(true);
        setError("");
        const geo = await geocodeCity(cityQuery);
        const resolved = { lat: geo.latitude, lng: geo.longitude, label: cityQuery };
        setCityGeo(resolved);
        loadJobs({ selectedFilters: filters, selectedLocation: resolved, selectedRadius: radiusKm, page: 1, scrollToResults: true });
      } catch (geoError) {
        // Could not resolve the city — fall back to a plain text-based search.
        setCityGeo(null);
        setError(
          geoError.response?.data?.message ||
          `Couldn't pin "${cityQuery}" on the map. Showing text matches instead.`
        );
        loadJobs({ selectedFilters: filters, selectedLocation: null, selectedRadius: radiusKm, page: 1, scrollToResults: true });
      } finally {
        setGeocoding(false);
      }
      return;
    }

    // No location and no city — plain list.
    setCityGeo(null);
    loadJobs({ selectedFilters: filters, selectedLocation: null, selectedRadius: radiusKm, page: 1, scrollToResults: true });
  }

  function handleClearFilters() {
    setFilters(initialFilters);
    setLocation(null);
    setCityGeo(null);
    setRadiusKm(10);
    setManualLat("");
    setManualLng("");
    setShowLatLng(false);
    setError("");
    setViewMode("list");
    loadJobs({ selectedFilters: initialFilters, selectedLocation: null, selectedRadius: 10, page: 1, scrollToResults: true });
  }

  function handleRemoveLocation() {
    setLocation(null);
    setCityGeo(null);
    setManualLat("");
    setManualLng("");
    setError("");
    loadJobs({ selectedFilters: filters, selectedLocation: null, selectedRadius: radiusKm, page: 1, scrollToResults: true });
  }

  function handleRemoveFilter(filterName) {
    const updatedFilters = {
      ...filters,
      [filterName]: filterName === "sortBy" ? "newest" : "",
    };
    setFilters(updatedFilters);
    // Removing the city chip also drops its geocoded radius search.
    const nextCityGeo = filterName === "city" ? null : cityGeo;
    if (filterName === "city") setCityGeo(null);
    loadJobs({ selectedFilters: updatedFilters, selectedLocation: location || nextCityGeo, selectedRadius: radiusKm, page: 1 });
  }

  function handleApplyManualLatLng() {
    const latitude = Number(manualLat);
    const longitude = Number(manualLng);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setError("Latitude must be a valid number between -90 and 90.");
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError("Longitude must be a valid number between -180 and 180.");
      return;
    }

    const coordinates = { lat: latitude, lng: longitude };
    const updatedFilters = { ...filters, city: "" };
    setFilters(updatedFilters);
    setCityGeo(null);
    setLocation(coordinates);
    setError("");
    loadJobs({ selectedFilters: updatedFilters, selectedLocation: coordinates, selectedRadius: radiusKm, page: 1, scrollToResults: true });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Use city search or enter coordinates manually.");
      return;
    }
    setLocationLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        const updatedFilters = { ...filters, city: "" };
        setFilters(updatedFilters);
        setCityGeo(null);
        setLocation(currentLocation);
        setLocationLoading(false);
        loadJobs({ selectedFilters: updatedFilters, selectedLocation: currentLocation, selectedRadius: radiusKm, page: 1, scrollToResults: true });
      },
      (locationError) => {
        console.error("Geolocation error:", locationError);
        setLocationLoading(false);
        setError("Location permission was denied. You can still search using a city or enter coordinates manually.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.page) return;
    loadJobs({ selectedFilters: filters, selectedLocation: location || cityGeo, selectedRadius: radiusKm, page: newPage, scrollToResults: true });
  }

  function formatLabel(value) {
    if (!value) return "";
    return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // GPS/manual coordinates OR a geocoded city — both drive the radius search.
  const activeLocation = location || cityGeo;

  const activeFilters = [
    filters.search && { key: "search", label: `Search: ${filters.search}` },
    !location && filters.city && { key: "city", label: `City: ${filters.city}` },
    filters.skill && { key: "skill", label: `Skill: ${filters.skill}` },
    filters.jobType && { key: "jobType", label: formatLabel(filters.jobType) },
    filters.workMode && { key: "workMode", label: formatLabel(filters.workMode) },
    filters.minSalary && { key: "minSalary", label: `Min salary: ₹${Number(filters.minSalary).toLocaleString("en-IN")}` },
    filters.maxExperience && { key: "maxExperience", label: `Max exp: ${filters.maxExperience} yrs` },
  ].filter(Boolean);

  const selectClass = "w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-500/20 transition-all duration-200";
  const inputClass = "w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-500/20 transition-all duration-200";

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-10">

        {/* ── Header ──────────────────────────────────────── */}
        <header className="mb-8 fade-in-up">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Search Jobs in Any City</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400 text-sm">
            Type any city in India — Mumbai, Delhi, Bangalore, Pune — pick a radius, and see the
            nearest jobs first. Or use your current location.
          </p>
        </header>

        {/* ── Filter Form ─────────────────────────────────── */}
        <form
          onSubmit={handleSearch}
          className="mb-8 bg-white dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800 card-shadow p-6 sm:p-8 fade-in-up"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <InputField label="Job title or keyword" htmlFor="job-search">
                <div className="relative">
                  <input
                    id="job-search"
                    name="search"
                    value={filters.search}
                    onChange={handleChange}
                    placeholder="React, backend, internship…"
                    className={`${inputClass} pl-10`}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                </div>
              </InputField>
            </div>

            <InputField label="City" htmlFor="city">
              <input
                id="city"
                name="city"
                value={filters.city}
                onChange={handleChange}
                disabled={Boolean(location)}
                placeholder={location ? "Using GPS location" : "Mumbai, Delhi, Bangalore…"}
                className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-zinc-700 disabled:text-slate-400 dark:disabled:text-slate-500`}
              />
            </InputField>

            <InputField label="Skill" htmlFor="skill">
              <input
                id="skill"
                name="skill"
                value={filters.skill}
                onChange={handleChange}
                placeholder="Node.js"
                className={inputClass}
              />
            </InputField>

            <InputField label="Job type" htmlFor="job-type">
              <select id="job-type" name="jobType" value={filters.jobType} onChange={handleChange} className={selectClass}>
                <option value="">All job types</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </InputField>

            <InputField label="Work mode" htmlFor="work-mode">
              <select id="work-mode" name="workMode" value={filters.workMode} onChange={handleChange} className={selectClass}>
                <option value="">All work modes</option>
                <option value="ONSITE">Onsite</option>
                <option value="HYBRID">Hybrid</option>
                <option value="REMOTE">Remote</option>
              </select>
            </InputField>

            <InputField label="Minimum salary" htmlFor="minimum-salary">
              <input
                id="minimum-salary"
                type="number"
                name="minSalary"
                value={filters.minSalary}
                onChange={handleChange}
                placeholder="500000"
                min="0"
                className={inputClass}
              />
            </InputField>

            <InputField label="Maximum experience" htmlFor="maximum-experience">
              <input
                id="maximum-experience"
                type="number"
                name="maxExperience"
                value={filters.maxExperience}
                onChange={handleChange}
                placeholder="2"
                min="0"
                className={inputClass}
              />
            </InputField>

            <InputField label="Sort by" htmlFor="sort-by">
              <select id="sort-by" name="sortBy" value={filters.sortBy} onChange={handleChange} className={selectClass}>
                <option value="newest">Newest</option>
                <option value="salary_high">Salary: High to Low</option>
                <option value="salary_low">Salary: Low to High</option>
                <option value="title">Job title</option>
                {activeLocation && <option value="distance">Nearest first</option>}
              </select>
            </InputField>

            <InputField label="Search radius" htmlFor="radius">
              <select
                id="radius"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                disabled={!activeLocation}
                className={`${selectClass} disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-zinc-700 disabled:text-slate-400 dark:disabled:text-slate-500`}
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
                <option value={200}>200 km</option>
              </select>
            </InputField>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading || geocoding}
              className="btn-primary flex items-center gap-2 disabled:opacity-60"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {geocoding ? "Locating city…" : loading ? "Searching…" : "Search Jobs"}
            </button>

            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locationLoading || loading}
              className="btn-secondary flex items-center gap-2 disabled:opacity-60"
            >
              📍 {locationLoading ? "Getting Location…" : location ? "Update My Location" : "Use My Location"}
            </button>

            {activeLocation && (
              <button
                type="button"
                onClick={handleRemoveLocation}
                disabled={loading}
                className="font-medium px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 text-sm disabled:opacity-60"
              >
                {cityGeo ? "Clear City Search" : "Remove Location"}
              </button>
            )}

            <button
              type="button"
              onClick={handleClearFilters}
              disabled={loading}
              className="btn-ghost border border-slate-200 disabled:opacity-60 text-sm"
            >
              Clear Filters
            </button>

            <button
              type="button"
              onClick={() => setShowLatLng((p) => !p)}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-indigo-200 dark:hover:border-indigo-500 transition-all duration-200"
            >
              {showLatLng ? "Hide" : "Enter"} Coordinates
            </button>
          </div>

          {/* Manual Lat/Lng */}
          {showLatLng && (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 p-5">
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                Use manual coordinates when GPS is unavailable or permission is denied.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="manual-latitude" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Latitude</label>
                  <input
                    id="manual-latitude"
                    type="number"
                    step="any"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="28.6139"
                    className="w-40 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="manual-longitude" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Longitude</label>
                  <input
                    id="manual-longitude"
                    type="number"
                    step="any"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    placeholder="77.2090"
                    className="w-40 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyManualLatLng}
                  disabled={loading}
                  className="btn-primary text-sm py-2 px-4 disabled:opacity-60"
                >
                  Apply Location
                </button>
              </div>
            </div>
          )}

          {/* Location active banner */}
          {activeLocation && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                <span>📍</span>
                {cityGeo
                  ? `Showing jobs within ${radiusKm} km of ${cityGeo.label}`
                  : "Nearby search is enabled"}
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Latitude: {activeLocation.lat.toFixed(5)} · Longitude: {activeLocation.lng.toFixed(5)} · Radius: {radiusKm} km · Sorted by nearest first
              </p>
            </div>
          )}

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Active Filters</p>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((filter) => (
                  <button
                    type="button"
                    key={filter.key}
                    onClick={() => handleRemoveFilter(filter.key)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                    title="Remove filter"
                  >
                    {filter.label}
                    <span className="w-3.5 h-3.5 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-600 font-bold">×</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* ── Results ─────────────────────────────────────── */}
        <section ref={resultsRef}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Available Jobs</h2>
              {!loading && (
                <p className="mt-0.5 text-sm text-slate-500">
                  <span className="font-semibold text-slate-700">{pagination.total}</span> {pagination.total === 1 ? "job" : "jobs"} found
                  <span className="ml-2 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">📦 Demo Dataset</span>
                </p>
              )}
            </div>

            {/* View mode toggle */}
            <div className="flex overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  viewMode === "list"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  viewMode === "map"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                🗺️ Map
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 flex items-start gap-3">
              <span>⚠️</span>
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 card-shadow">
                  <div className="shimmer h-6 w-2/3 rounded-xl mb-3" />
                  <div className="shimmer h-4 w-1/3 rounded mb-4" />
                  <div className="flex gap-2 mb-4">
                    {[1,2,3,4].map(j => <div key={j} className="shimmer h-6 w-20 rounded-full" />)}
                  </div>
                  <div className="shimmer h-4 w-full rounded mb-2" />
                  <div className="shimmer h-4 w-3/4 rounded" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800 card-shadow p-16 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No matching jobs found</h3>
              <p className="mx-auto max-w-xl text-slate-500 text-sm mb-6">
                Your active filters may be too specific. Try removing a skill, changing the city,
                increasing the radius or clearing all filters.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {activeLocation && radiusKm < 200 && (
                  <button
                    type="button"
                    onClick={() => setRadiusKm((p) => Math.min(p * 2, 200))}
                    className="btn-secondary"
                  >
                    Increase Radius
                  </button>
                )}
                <button type="button" onClick={handleClearFilters} className="btn-primary">
                  Show All Jobs
                </button>
              </div>
            </div>
          ) : viewMode === "map" ? (
            <div className="rounded-3xl overflow-hidden border border-slate-100 dark:border-zinc-800 card-shadow">
              <JobMap jobs={jobs} userLocation={activeLocation} radiusKm={radiusKm} />
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job, idx) => (
                <article
                  key={job.id}
                  className="group bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-0.5 overflow-hidden fade-in-up"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-start justify-between gap-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{job.title}</h3>
                        {job.company?.verified && (
                          <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-100">✓ Verified</span>
                        )}
                      </div>

                      <p className="font-semibold text-indigo-600 text-sm mb-1.5">{job.company?.name}</p>

                      <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-3">
                        <svg className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {job.city || "Location unavailable"}
                        {job.state ? `, ${job.state}` : ""}
                        {job.distanceKm !== undefined && job.distanceKm !== null && (
                          <span className="text-emerald-600 font-semibold">· {job.distanceKm} km away</span>
                        )}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-100">{formatLabel(job.jobType)}</span>
                        <span className="badge bg-blue-50 text-blue-700 border border-blue-100">{formatLabel(job.workMode)}</span>
                        <span className="badge bg-slate-100 text-slate-600 border border-slate-200">{job.salary || "Salary not disclosed"}</span>
                        <span className="badge bg-amber-50 text-amber-700 border border-amber-100">
                          {job.experience?.min ?? 0}–{job.experience?.max ?? "Any"} yrs
                        </span>
                        {formatPostedAt(job.postedAt) && (
                          <span className="badge bg-slate-50 text-slate-500 border border-slate-200">
                            🕒 Posted {formatPostedAt(job.postedAt)}
                          </span>
                        )}
                      </div>

                      {job.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {job.skills.slice(0, 6).map((skill) => (
                            <span
                              key={skill.id || skill.name}
                              className="text-xs border border-slate-200 text-slate-500 rounded-lg px-2 py-0.5"
                            >
                              {skill.name}
                            </span>
                          ))}
                          {job.skills.length > 6 && (
                            <span className="text-xs text-slate-400 px-1 py-0.5">+{job.skills.length - 6} more</span>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>Source: {job.sourceLabel || job.source?.label || "Unknown"}</span>
                        {job.displayJobId && (
                          <span className="font-mono text-indigo-400">{job.displayJobId}</span>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {(job.totalViews ?? 0).toLocaleString("en-IN")} {(job.totalViews ?? 0) === 1 ? "view" : "views"}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-row md:flex-col gap-2 shrink-0 self-start">
                      {job.applicationUrl && (
                        <a
                          href={job.applicationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary flex items-center justify-center gap-2 text-sm"
                        >
                          Apply
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </a>
                      )}
                      <Link
                        to={`/jobs/${job.id}`}
                        className={`${job.applicationUrl ? "btn-secondary" : "btn-primary"} flex items-center justify-center gap-2 text-sm`}
                      >
                        View Details
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="btn-secondary text-sm py-2 px-5 disabled:opacity-40"
              >
                ← Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = pagination.page <= 3 ? i + 1
                    : pagination.page >= pagination.totalPages - 2 ? pagination.totalPages - 4 + i
                    : pagination.page - 2 + i;
                  if (page < 1 || page > pagination.totalPages) return null;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        page === pagination.page
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="btn-secondary text-sm py-2 px-5 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}