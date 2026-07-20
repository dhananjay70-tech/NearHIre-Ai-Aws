import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { analyzeResume } from "../services/resumeService";
import { geocodeCity } from "../services/jobService";
import {
  getRecommendations,
  getInterviewQuestions,
  getLearningRoadmap,
  getCoverLetter,
  getResumeFeedback,
  getPreparationChecklist,
} from "../services/recommendationService";

const LOCATION_KEY = "nearhire_candidate_location";
const RADIUS_KEY = "nearhire_candidate_radius";
const ANALYSIS_KEY = "nearhire_resume_analysis";
const RECOMMENDATIONS_KEY = "nearhire_recommendations";

const INITIAL_FILTERS = {
  city: "",
  jobType: "",
  workMode: "",
  maxExperience: "",
};

function readSession(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function ProgressRing({ score = 0, size = 84 }) {
  const value = Math.min(100, Math.max(0, Number(score) || 0));
  const radius = size / 2 - 7;
  const circumference = 2 * Math.PI * radius;
  const dash = (value / 100) * circumference;
  const color = value >= 75 ? "#10b981" : value >= 50 ? "#6366f1" : "#f59e0b";

  return (
    <svg width={size} height={size} className="shrink-0" aria-label={`${value}%`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize="16" fontWeight="800" fill={color}>
        {value}%
      </text>
    </svg>
  );
}

function ScoreBar({ label, score }) {
  if (score === null || score === undefined) return null;
  const value = Math.min(100, Math.max(0, Number(score) || 0));

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-bold text-slate-700">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Pill({ children, tone = "indigo" }) {
  const tones = {
    indigo: "border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
    green: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    red: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    amber: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    blue: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    slate: "border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Card({ title, subtitle, action, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm sm:p-6 card-shadow">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ToolPanel({ title, description, loading, error, data, onGenerate, children }) {
  const [open, setOpen] = useState(false);

  async function handleClick() {
    if (!data && !loading) {
      await onGenerate();
      setOpen(true);
      return;
    }
    setOpen((value) => !value);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex w-full items-center justify-between gap-4 bg-white dark:bg-zinc-950 p-4 text-left hover:bg-slate-50 dark:hover:bg-zinc-900 disabled:opacity-60"
      >
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{title}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{description}</p>
        </div>
        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
          {loading ? "Generating..." : data && open ? "Hide" : data ? "View" : "Generate"}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 p-4">
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : children}
        </div>
      )}
    </div>
  );
}

export default function ResumePage() {
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobId, setJobId] = useState(routerLocation.state?.jobId || "");

  const [location, setLocation] = useState(() => readSession(LOCATION_KEY, null));
  const [radiusKm, setRadiusKm] = useState(() => {
    const saved = Number(sessionStorage.getItem(RADIUS_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : 20;
  });

  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [progress, setProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(() => readSession(ANALYSIS_KEY, null));

  const [recommendations, setRecommendations] = useState(() =>
    readSession(RECOMMENDATIONS_KEY, null)
  );
  const [recommendationSummary, setRecommendationSummary] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState("");

  const [aiData, setAiData] = useState(() => {
    const analysis = readSession(ANALYSIS_KEY, null);
    return analysis?.aiGenerated || {};
  });
  const [aiLoading, setAiLoading] = useState({});
  const [aiErrors, setAiErrors] = useState({});

  useEffect(() => {
    if (location) {
      sessionStorage.setItem(LOCATION_KEY, JSON.stringify(location));
    } else {
      sessionStorage.removeItem(LOCATION_KEY);
    }
    sessionStorage.setItem(RADIUS_KEY, String(radiusKm));
  }, [location, radiusKm]);

  function validateFile(selectedFile) {
    if (!selectedFile) return "Please select a PDF resume.";
    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) return "Only PDF files are accepted.";
    if (selectedFile.size > 5 * 1024 * 1024) return "The selected PDF exceeds the 5 MB limit.";
    return "";
  }

  function selectFile(selectedFile) {
    const message = validateFile(selectedFile);
    if (message) {
      setError(message);
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError("");
    setResult(null);
    setRecommendations(null);
    setRecommendationSummary(null);
    setAiData({});
    sessionStorage.removeItem(ANALYSIS_KEY);
    sessionStorage.removeItem(RECOMMENDATIONS_KEY);
  }

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  }, []);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Your browser does not support location access.");
      return;
    }

    setLocationLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          source: "gps",
        };
        setLocation(coordinates);
        setManualLat(String(coordinates.lat));
        setManualLng(String(coordinates.lng));
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
        setShowManualLocation(true);
        setError("Location permission was denied. Enter coordinates manually or continue without location.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  function applyManualLocation() {
    const lat = Number(manualLat);
    const lng = Number(manualLng);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setError("Latitude must be between -90 and 90.");
      return;
    }

    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError("Longitude must be between -180 and 180.");
      return;
    }

    setLocation({ lat, lng, source: "manual" });
    setError("");
  }

  async function applyCityLocation() {
    const cityQuery = filters.city.trim();
    if (!cityQuery) {
      setError("Type a city first, then locate it.");
      return;
    }

    try {
      setGeocoding(true);
      setError("");
      const geo = await geocodeCity(cityQuery);
      setLocation({ lat: geo.latitude, lng: geo.longitude, source: "city", label: cityQuery });
      setManualLat(String(geo.latitude));
      setManualLng(String(geo.longitude));
    } catch (geoError) {
      setError(
        geoError.response?.data?.message ||
        `Couldn't pin "${cityQuery}" on the map. Try a nearby major city or enter coordinates manually.`
      );
    } finally {
      setGeocoding(false);
    }
  }

  function removeLocation() {
    setLocation(null);
    setManualLat("");
    setManualLng("");
    setError("");
  }

  function updateFilter(name, value) {
    setFilters((previous) => ({ ...previous, [name]: value }));
  }

  async function handleUpload(event) {
    event.preventDefault();
    const message = validateFile(file);
    if (message) {
      setError(message);
      return;
    }

    setLoading(true);
    setProgress(0);
    setAnalysisStep(0); // 0: Uploading
    setError("");
    setResult(null);
    setAiData({});

    // Increment analysis steps periodically to simulate visual progression
    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => {
        if (prev < 4) return prev + 1;
        return prev;
      });
    }, 1500);

    try {
      const response = await analyzeResume(file, {
        jobId: jobId || null,
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
        radiusKm: location ? radiusKm : null,
        onProgress: (p) => {
          setProgress(p);
          if (p >= 100) {
            setAnalysisStep(1); // 1: Extracting text
          }
        },
      });

      // Instantly set to complete
      setAnalysisStep(5); // 5: Complete
      await new Promise(resolve => setTimeout(resolve, 800));

      const analysis = response?.data || null;
      setResult(analysis);

      if (analysis) {
        sessionStorage.setItem(ANALYSIS_KEY, JSON.stringify(analysis));
        if (analysis.aiGenerated) {
          setAiData(analysis.aiGenerated);
        }
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
        requestError.response?.data?.message ||
        requestError.message ||
        "Resume analysis failed."
      );
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
      setProgress(0);
      setAnalysisStep(-1);
    }
  }

  async function handleRecommendations() {
    if (!result?.extractedSkills?.length) return;

    setRecLoading(true);
    setRecError("");

    try {
      const response = await getRecommendations(result.extractedSkills, {
        experienceHints: result.experienceHints || [],
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
        radiusKm,
        limit: 10,
        filters: {
          city: location ? "" : filters.city,
          jobType: filters.jobType,
          workMode: filters.workMode,
          maxExperience: filters.maxExperience ? Number(filters.maxExperience) : null,
        },
      });

      const jobs = response?.data?.recommendations || [];
      setRecommendations(jobs);
      setRecommendationSummary(response?.data?.summary || null);
      sessionStorage.setItem(RECOMMENDATIONS_KEY, JSON.stringify(jobs));
    } catch (requestError) {
      setRecError(
        requestError.response?.data?.detail ||
        requestError.response?.data?.message ||
        "Unable to generate recommendations."
      );
    } finally {
      setRecLoading(false);
    }
  }

  async function runAI(type) {
    if (!result) return;

    const match = result.selectedJobMatch || {};
    const payload = {
      jobTitle: match.jobTitle || "Software Developer",
      companyName: match.companyName || "",
      extractedSkills: result.extractedSkills || [],
      currentSkills: result.extractedSkills || [],
      matchedSkills: match.matchedSkills || [],
      missingSkills: match.missingRequiredSkills || [],
      missingRequiredSkills: match.missingRequiredSkills || [],
      missingPreferredSkills: match.missingPreferredSkills || [],
      projects: result.projects || [],
      education: result.education || [],
      experienceHints: result.experienceHints || [],
      timelineDays: 30,
      matchScore: match.overallScore ?? null,
    };

    setAiLoading((previous) => ({ ...previous, [type]: true }));
    setAiErrors((previous) => ({ ...previous, [type]: "" }));

    try {
      let response;
      if (type === "feedback") response = await getResumeFeedback(payload);
      if (type === "questions") response = await getInterviewQuestions(payload);
      if (type === "roadmap") response = await getLearningRoadmap(payload);
      if (type === "coverLetter") response = await getCoverLetter(payload);
      if (type === "checklist") response = await getPreparationChecklist(payload);

      setAiData((previous) => ({ ...previous, [type]: response?.data || null }));
    } catch (requestError) {
      setAiErrors((previous) => ({
        ...previous,
        [type]:
          requestError.response?.data?.detail ||
          requestError.response?.data?.message ||
          "Generation failed.",
      }));
    } finally {
      setAiLoading((previous) => ({ ...previous, [type]: false }));
    }
  }

  function startNewAnalysis() {
    setFile(null);
    setResult(null);
    setRecommendations(null);
    setRecommendationSummary(null);
    setAiData({});
    setAiErrors({});
    setError("");
    sessionStorage.removeItem(ANALYSIS_KEY);
    sessionStorage.removeItem(RECOMMENDATIONS_KEY);
  }

  const completeness = result?.resumeCompleteness;
  const match = result?.selectedJobMatch;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-20 sm:pt-24 pb-10">
        <header className="mb-8 fade-in-up">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Career DNA</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
            Resume intelligence and location-aware recommendations
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-zinc-400">
            Combine your resume, selected job and commute radius to receive explainable matching,
            nearby opportunities and preparation tools.
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <Card title="Candidate setup" subtitle="PDF only, maximum 5 MB.">
              <form onSubmit={handleUpload} className="space-y-5">
                <div
                  onDrop={handleDrop}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => inputRef.current?.click()}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition ${isDragging
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                      : file
                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
                        : "border-slate-300 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 hover:border-indigo-400 dark:hover:border-indigo-500"
                    }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(event) => selectFile(event.target.files?.[0])}
                  />
                  <p className="text-3xl">{file ? "✓" : "↑"}</p>
                  <p className="mt-3 font-black text-slate-900 dark:text-white">
                    {file ? file.name : "Drop your PDF or browse"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Click to replace`
                      : "PDF only · Maximum 5 MB"}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-zinc-300">
                    Target job UUID <span className="font-normal text-slate-400 dark:text-zinc-500">(optional)</span>
                  </label>
                  <input
                    value={jobId}
                    onChange={(event) => setJobId(event.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full rounded-xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-900 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-500"
                  />
                  {routerLocation.state?.jobTitle && (
                    <p className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      Selected: {routerLocation.state.jobTitle}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-900/30 p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900 dark:text-white">Candidate location</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                        Used for distance score and nearby recommendations.
                      </p>
                    </div>
                    {location && (
                      <button type="button" onClick={removeLocation} className="text-xs font-bold text-red-600 dark:text-red-400">
                        Remove
                      </button>
                    )}
                  </div>

                  {location ? (
                    <div className="mt-4 rounded-xl bg-white dark:bg-zinc-950 p-3">
                      <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                        {location.source === "city" && location.label
                          ? `Location: ${location.label}`
                          : "Location enabled"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                        {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={useCurrentLocation}
                        disabled={locationLoading}
                        className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                      >
                        {locationLoading ? "Getting location..." : "Use My Location"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowManualLocation((value) => !value)}
                        className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-bold text-indigo-700 dark:text-indigo-300"
                      >
                        Manual coordinates
                      </button>
                    </div>
                  )}

                  {showManualLocation && (
                    <div className="mt-4 grid gap-2">
                      <input
                        type="number"
                        step="any"
                        value={manualLat}
                        onChange={(event) => setManualLat(event.target.value)}
                        placeholder="Latitude"
                        className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white px-3 py-2.5 text-sm"
                      />
                      <input
                        type="number"
                        step="any"
                        value={manualLng}
                        onChange={(event) => setManualLng(event.target.value)}
                        placeholder="Longitude"
                        className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white px-3 py-2.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={applyManualLocation}
                        className="rounded-xl bg-slate-900 dark:bg-zinc-700 px-4 py-2.5 text-sm font-bold text-white"
                      >
                        Apply coordinates
                      </button>
                    </div>
                  )}

                  <select
                    value={radiusKm}
                    onChange={(event) => setRadiusKm(Number(event.target.value))}
                    disabled={!location}
                    className="mt-4 w-full rounded-xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-900 dark:text-white px-3 py-2.5 text-sm disabled:bg-slate-100 dark:disabled:bg-zinc-900"
                  >
                    {[5, 10, 20, 50, 100, 200].map((value) => (
                      <option key={value} value={value}>
                        {value} km radius
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex gap-2">
                    <input
                      value={filters.city}
                      disabled={Boolean(location)}
                      onChange={(event) => updateFilter("city", event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          applyCityLocation();
                        }
                      }}
                      placeholder={location ? "Location active" : "Preferred city (e.g. Pune)"}
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-900 dark:text-white px-3 py-2.5 text-sm disabled:bg-slate-100 dark:disabled:bg-zinc-900"
                    />
                    {!location && (
                      <button
                        type="button"
                        onClick={applyCityLocation}
                        disabled={geocoding || !filters.city.trim()}
                        title="Convert this city to a location for distance-based matching"
                        className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {geocoding ? "…" : "📍 Locate"}
                      </button>
                    )}
                  </div>
                  <select
                    value={filters.jobType}
                    onChange={(event) => updateFilter("jobType", event.target.value)}
                    className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm"
                  >
                    <option value="">All job types</option>
                    <option value="INTERNSHIP">Internship</option>
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                  <select
                    value={filters.workMode}
                    onChange={(event) => updateFilter("workMode", event.target.value)}
                    className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm"
                  >
                    <option value="">All work modes</option>
                    <option value="ONSITE">Onsite</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="REMOTE">Remote</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={filters.maxExperience}
                    onChange={(event) => updateFilter("maxExperience", event.target.value)}
                    placeholder="Maximum experience"
                    className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm"
                  />
                </div>

                 {loading && analysisStep >= 0 && (
                  <div className="rounded-2xl border border-indigo-100 dark:border-zinc-800 bg-indigo-50/30 dark:bg-zinc-900/30 p-4 space-y-3.5 fade-in">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-zinc-300">
                      <span>Analyzing Resume DNA</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{progress > 0 ? `${progress}%` : "Processing"}</span>
                    </div>
                    
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                        style={{ width: `${Math.max(progress, (analysisStep + 1) * 20)}%` }}
                      />
                    </div>

                    <div className="space-y-2 pt-1">
                      {[
                        "Uploading Resume...",
                        "Extracting Text...",
                        "Analyzing Skills...",
                        "Calculating ATS Score...",
                        "Generating Suggestions...",
                      ].map((stepText, idx) => {
                        const isDone = analysisStep > idx || analysisStep === 5;
                        const isCurrent = analysisStep === idx;
                        return (
                          <div key={idx} className="flex items-center gap-2.5 text-xs">
                            {isDone ? (
                              <span className="text-emerald-500 font-bold">✓</span>
                            ) : isCurrent ? (
                              <span className="text-indigo-500 animate-pulse">●</span>
                            ) : (
                              <span className="text-slate-300 dark:text-zinc-700">○</span>
                            )}
                            <span className={`${
                              isDone ? "text-slate-500 dark:text-zinc-500 line-through" :
                              isCurrent ? "text-indigo-600 dark:text-indigo-400 font-bold" :
                              "text-slate-400 dark:text-zinc-600"
                            }`}>
                              {stepText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!file || loading}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 font-black text-white disabled:opacity-50"
                >
                  {loading ? "Analyzing resume..." : "Analyze Career DNA"}
                </button>
              </form>
            </Card>

            {result && (
              <button
                type="button"
                onClick={startNewAnalysis}
                className="w-full rounded-xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 text-sm font-bold text-slate-700 dark:text-zinc-300"
              >
                Start New Analysis
              </button>
            )}
          </aside>

          <div className="space-y-6">
            {!result ? (
              <div className="rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-10 text-center">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Your analysis dashboard will appear here</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
                  Add location before analysis to include distance score and nearby jobs.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl bg-slate-950 p-5 text-white md:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
                      Candidate profile
                    </p>
                    <p className="mt-3 text-lg font-bold leading-7">{result.summary}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Pill tone="blue">{result.extractedSkills?.length || 0} skills</Pill>
                      <Pill tone="green">{result.projects?.length || 0} project hints</Pill>
                      <Pill tone="amber">{result.certifications?.length || 0} certifications</Pill>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
                    <ProgressRing score={completeness?.score || 0} />
                    <div>
                      <p className="font-black text-slate-900 dark:text-white">Resume completeness</p>
                      <p className="mt-1 text-xs text-slate-500">Not an ATS guarantee.</p>
                    </div>
                  </div>
                </div>

                {completeness && (
                  <Card title="Resume completeness" subtitle="Detected section coverage.">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {Object.entries(completeness.components || {}).map(([key, value]) => (
                        <ScoreBar key={key} label={key} score={value} />
                      ))}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {(completeness.missingSections || []).map((item) => (
                        <Pill key={item} tone="amber">Missing: {item}</Pill>
                      ))}
                    </div>
                  </Card>
                )}

                <Card title="Detected skills" subtitle={`${result.extractedSkills?.length || 0} recognized skills`}>
                  <div className="flex flex-wrap gap-2">
                    {(result.extractedSkills || []).map((skill) => (
                      <Pill key={skill}>{skill}</Pill>
                    ))}
                  </div>
                </Card>

                {match && (
                  <Card
                    title={`Target-job match: ${match.jobTitle || "Selected job"}`}
                    subtitle={`${match.companyName || ""}${match.displayJobId ? ` · ${match.displayJobId}` : ""}`}
                    action={<ProgressRing score={match.overallScore} size={76} />}
                  >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      <ScoreBar label="Required skills" score={match.requiredSkillScore} />
                      <ScoreBar label="Preferred skills" score={match.preferredSkillScore} />
                      <ScoreBar label="Experience" score={match.experienceScore} />
                      <ScoreBar label="Location" score={match.distanceScore} />
                      <ScoreBar label="Preferences" score={match.preferenceScore} />
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {match.distanceKm !== null && match.distanceKm !== undefined && (
                        <Pill tone="blue">{match.distanceKm} km away</Pill>
                      )}
                      {match.locationUsed && <Pill>Radius: {match.radiusKm} km</Pill>}
                    </div>

                    <div className="mt-6 grid gap-6 lg:grid-cols-2">
                      <div>
                        <p className="font-black text-slate-900">Why recommended</p>
                        <ul className="mt-3 space-y-2 text-sm text-emerald-700">
                          {(match.whyRecommended || []).map((reason, index) => (
                            <li key={index}>✓ {reason}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-black text-slate-900">Gaps and risks</p>
                        <ul className="mt-3 space-y-2 text-sm text-amber-700">
                          {(match.risks || []).length ? (
                            match.risks.map((risk, index) => <li key={index}>• {risk}</li>)
                          ) : (
                            <li>No major risk detected.</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6">
                      <p className="font-black text-slate-900">Matched skills</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(match.matchedSkills || []).map((skill) => (
                          <Pill key={skill} tone="green">{skill}</Pill>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                      <div>
                        <p className="font-black text-slate-900">Missing required</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(match.missingRequiredSkills || []).length ? (
                            match.missingRequiredSkills.map((skill) => (
                              <Pill key={skill} tone="red">{skill}</Pill>
                            ))
                          ) : (
                            <Pill tone="green">No required gap</Pill>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="font-black text-slate-900">Missing preferred</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(match.missingPreferredSkills || []).length ? (
                            match.missingPreferredSkills.map((skill) => (
                              <Pill key={skill} tone="amber">{skill}</Pill>
                            ))
                          ) : (
                            <Pill tone="green">No preferred gap</Pill>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {match && (
                  <Card title="Career preparation tools" subtitle="Works with deterministic fallback when Gemini is unavailable.">
                    <div className="space-y-3">
                      <ToolPanel
                        title="Resume Feedback"
                        description="Strengths and improvements."
                        loading={aiLoading.feedback}
                        error={aiErrors.feedback}
                        data={aiData.feedback}
                        onGenerate={() => runAI("feedback")}
                      >
                        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">
                          {JSON.stringify(aiData.feedback?.data, null, 2)}
                        </pre>
                      </ToolPanel>

                      <ToolPanel
                        title="Interview Questions"
                        description="Technical, project-based, behavioural and HR."
                        loading={aiLoading.questions}
                        error={aiErrors.questions}
                        data={aiData.questions}
                        onGenerate={() => runAI("questions")}
                      >
                        <div className="space-y-4 text-sm text-slate-700">
                          {["technical", "projectBased", "behavioural", "hr"].map((key) =>
                            aiData.questions?.data?.[key]?.length ? (
                              <div key={key}>
                                <p className="font-bold capitalize text-slate-900">{key}</p>
                                <ol className="mt-2 list-decimal space-y-1 pl-5">
                                  {aiData.questions.data[key].map((question, index) => (
                                    <li key={index}>{question}</li>
                                  ))}
                                </ol>
                              </div>
                            ) : null
                          )}
                        </div>
                      </ToolPanel>

                      <ToolPanel
                        title="30-Day Learning Roadmap"
                        description="Prioritized skill-gap plan."
                        loading={aiLoading.roadmap}
                        error={aiErrors.roadmap}
                        data={aiData.roadmap}
                        onGenerate={() => runAI("roadmap")}
                      >
                        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">
                          {JSON.stringify(aiData.roadmap?.data, null, 2)}
                        </pre>
                      </ToolPanel>

                      <ToolPanel
                        title="Cover Letter"
                        description="Job-specific deterministic fallback."
                        loading={aiLoading.coverLetter}
                        error={aiErrors.coverLetter}
                        data={aiData.coverLetter}
                        onGenerate={() => runAI("coverLetter")}
                      >
                        <div>
                          <pre className="whitespace-pre-wrap rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 font-sans text-sm leading-6 text-slate-700 dark:text-zinc-300">
                            {aiData.coverLetter?.data?.coverLetter}
                          </pre>
                          <button
                            type="button"
                            onClick={() =>
                              navigator.clipboard.writeText(aiData.coverLetter?.data?.coverLetter || "")
                            }
                            className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                          >
                            Copy Cover Letter
                          </button>
                        </div>
                      </ToolPanel>

                      <ToolPanel
                        title="Preparation Checklist"
                        description="Actions before applying and interviewing."
                        loading={aiLoading.checklist}
                        error={aiErrors.checklist}
                        data={aiData.checklist}
                        onGenerate={() => runAI("checklist")}
                      >
                        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 rounded-xl">
                          {JSON.stringify(aiData.checklist?.data, null, 2)}
                        </pre>
                      </ToolPanel>
                    </div>
                  </Card>
                )}

                <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-7 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">
                    Nearby opportunities
                  </p>
                  <h2 className="mt-3 text-2xl font-black">
                    Rank jobs using skills{location ? ` and a ${radiusKm} km radius` : ""}.
                  </h2>
                  <p className="mt-3 text-sm text-indigo-100">
                    Missing components are omitted instead of fabricated.
                  </p>
                  <button
                    type="button"
                    onClick={handleRecommendations}
                    disabled={recLoading || !result.extractedSkills?.length}
                    className="mt-6 rounded-xl bg-white px-5 py-3 font-black text-indigo-700 disabled:opacity-60"
                  >
                    {recLoading ? "Ranking opportunities..." : "Generate Recommendations"}
                  </button>
                  {recError && <p className="mt-4 text-sm text-red-100">{recError}</p>}
                </section>

                {recommendations && (
                  <Card
                    title="Top recommendations"
                    subtitle={
                      recommendationSummary
                        ? `${recommendationSummary.recommendationsReturned ?? recommendations.length} returned from ${recommendationSummary.jobsEvaluated ?? "available"} jobs`
                        : `${recommendations.length} ranked jobs`
                    }
                    action={
                      recommendations.length ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate("/recommendations", {
                              state: {
                                recommendations,
                                skills: result.extractedSkills,
                                summary: recommendationSummary,
                                location,
                                radiusKm,
                              },
                            })
                          }
                          className="text-sm font-bold text-indigo-600"
                        >
                          Full page →
                        </button>
                      ) : null
                    }
                  >
                    {recommendations.length ? (
                      <div className="space-y-3">
                        {recommendations.slice(0, 5).map((job, index) => (
                          <article
                            key={job.id}
                            className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <div className="flex flex-wrap gap-2">
                                <Pill tone="slate">#{index + 1}</Pill>
                                {job.displayJobId && <Pill tone="blue">{job.displayJobId}</Pill>}
                              </div>
                              <h3 className="mt-3 font-black text-slate-900">{job.title}</h3>
                              <p className="mt-1 text-sm text-slate-500">
                                {job.company_name || job.company?.name}
                                {job.city ? ` · ${job.city}` : ""}
                                {job.matchScore?.distanceKm !== null &&
                                  job.matchScore?.distanceKm !== undefined
                                  ? ` · ${job.matchScore.distanceKm} km`
                                  : ""}
                              </p>
                              <p className="mt-2 text-xs text-slate-500">
                                {job.matchScore?.whyRecommended?.[0] ||
                                  job.whyRecommended?.[0] ||
                                  job.matchScore?.explanation}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <ProgressRing score={job.matchScore?.overallScore || 0} size={68} />
                              <button
                                type="button"
                                onClick={() => navigate(`/jobs/${job.id}`)}
                                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
                              >
                                View
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                        No jobs match the current radius and filters. Increase the radius or remove filters.
                      </div>
                    )}
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}