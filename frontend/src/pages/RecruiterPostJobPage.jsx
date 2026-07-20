import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { postJob, updateJob, getRecruiterMeta } from "../services/recruiterService";
import { geocodeCity } from "../services/jobService";

/**
 * Dropdown values are loaded from the backend (GET /api/recruiter/meta) so they
 * always match the PostgreSQL enums exactly. These constants are only a
 * fallback for the brief moment before that request resolves — they use the
 * enum VALUES, never display labels, which is what previously caused
 * `invalid input value for enum job_type: "PART TIME"`.
 */
const FALLBACK_JOB_TYPES = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "CONTRACT", label: "Contract" },
];
const FALLBACK_WORK_MODES = [
  { value: "ONSITE", label: "Onsite" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "REMOTE", label: "Remote" },
];
const EXPERIENCE_LEVELS = [
  { value: "0", label: "Fresher" },
  { value: "1", label: "1+ years" },
  { value: "3", label: "3+ years" },
  { value: "5", label: "5+ years" },
  { value: "10", label: "10+ years" },
];

const EMPTY_FORM = {
  title: "", company: "", description: "", requiredSkills: "", experienceMin: "0",
  salaryMin: "", salaryMax: "", salaryPeriod: "YEAR", jobType: "FULL_TIME",
  workMode: "ONSITE", city: "", state: "", country: "India",
  latitude: "", longitude: "", radius: 10, deadline: "", benefits: "",
};

export default function RecruiterPostJobPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const editJob = state?.editJob || null;

  const [form, setForm] = useState(editJob ? { ...EMPTY_FORM, ...editJob } : EMPTY_FORM);
  const [geocoding, setGeocoding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Enum options come from the backend so they can never drift from the DB.
  const [jobTypes, setJobTypes] = useState(FALLBACK_JOB_TYPES);
  const [workModes, setWorkModes] = useState(FALLBACK_WORK_MODES);

  useEffect(() => {
    let cancelled = false;
    getRecruiterMeta()
      .then((meta) => {
        if (cancelled || !meta) return;
        if (meta.jobTypes?.length) setJobTypes(meta.jobTypes);
        if (meta.workModes?.length) setWorkModes(meta.workModes);
      })
      .catch(() => {
        /* keep the enum-valued fallbacks */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleGeocode() {
    if (!form.city) return;
    try {
      setGeocoding(true);
      // The geocode API returns { latitude, longitude } — not { lat, lon }.
      const geo = await geocodeCity(form.city, form.state, form.country);
      if (geo?.latitude != null && geo?.longitude != null) {
        setForm((f) => ({ ...f, latitude: geo.latitude, longitude: geo.longitude }));
        setError("");
      } else {
        setError(`Could not locate "${form.city}". You can enter coordinates manually.`);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        `Could not locate "${form.city}". You can enter coordinates manually.`
      );
    } finally { setGeocoding(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Client-side validation so the user gets an instant, friendly message.
    if (!form.title.trim()) return setError("Job title is required.");
    if (!form.company.trim()) return setError("Company name is required.");
    if (!form.description.trim()) return setError("Job description is required.");
    if (form.salaryMin && form.salaryMax && Number(form.salaryMin) > Number(form.salaryMax)) {
      return setError("Minimum salary cannot be greater than maximum salary.");
    }

    try {
      setLoading(true);
      setError("");
      const payload = {
        ...form,
        companyName: form.company,
        requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        benefits: form.benefits.split(",").map((s) => s.trim()).filter(Boolean),
        experienceMin: Number(form.experienceMin) || 0,
        salaryMin: form.salaryMin === "" ? null : Number(form.salaryMin),
        salaryMax: form.salaryMax === "" ? null : Number(form.salaryMax),
        latitude: parseFloat(form.latitude) || null,
        longitude: parseFloat(form.longitude) || null,
        radius: parseFloat(form.radius) || 10,
        deadline: form.deadline || null,
      };
      if (editJob) {
        await updateJob(editJob.id, payload);
      } else {
        await postJob(payload);
      }
      setSuccess(true);
      setTimeout(() => navigate("/recruiter/dashboard"), 1800);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save job. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-zinc-950 dark:to-indigo-950">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            {editJob ? "Job Updated!" : "Job Posted!"}
          </h2>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {editJob ? "✏️ Edit Job" : "📝 Post a New Job"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Fill in the details to {editJob ? "update" : "publish"} your job listing on NearHire.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Section title="Basic Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Job Title *" name="title" value={form.title} onChange={handleChange} placeholder="Senior React Developer" required />
              <Field label="Company *" name="company" value={form.company} onChange={handleChange} placeholder="Your Company Name" required />
              <Field label="Job Type *" name="jobType" value={form.jobType} onChange={handleChange} type="select" options={jobTypes} required />
              <Field label="Work Mode *" name="workMode" value={form.workMode} onChange={handleChange} type="select" options={workModes} required />
              <Field label="Experience Level" name="experienceMin" value={form.experienceMin} onChange={handleChange} type="select" options={EXPERIENCE_LEVELS} />
              <Field label="Application Deadline" name="deadline" value={form.deadline} onChange={handleChange} type="date" />
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Job Description *</label>
              <textarea
                name="description" value={form.description} onChange={handleChange}
                rows={5} required
                placeholder="Describe the role, responsibilities, and what you're looking for…"
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 outline-none focus:border-indigo-400 resize-none transition"
              />
            </div>
          </Section>

          {/* Skills & Salary */}
          <Section title="Skills & Compensation">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Required Skills (comma-separated)" name="requiredSkills" value={form.requiredSkills} onChange={handleChange} placeholder="React, Node.js, PostgreSQL, AWS" />
              </div>
              <Field label="Min Salary (₹/yr)" name="salaryMin" value={form.salaryMin} onChange={handleChange} type="number" placeholder="600000" />
              <Field label="Max Salary (₹/yr)" name="salaryMax" value={form.salaryMax} onChange={handleChange} type="number" placeholder="1200000" />
              <div className="sm:col-span-2">
                <Field label="Benefits (comma-separated)" name="benefits" value={form.benefits} onChange={handleChange} placeholder="Health insurance, Remote work, Stock options" />
              </div>
            </div>
          </Section>

          {/* Location */}
          <Section title="Location & Radius">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="City *" name="city" value={form.city} onChange={handleChange} placeholder="Bangalore" required />
              <Field label="State" name="state" value={form.state} onChange={handleChange} placeholder="Karnataka" />
              <Field label="Country" name="country" value={form.country} onChange={handleChange} placeholder="India" />
            </div>
            <div className="mt-3 flex flex-wrap gap-3 items-center">
              <button type="button" onClick={handleGeocode} disabled={!form.city || geocoding}
                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl hover:bg-indigo-100 disabled:opacity-50 transition">
                {geocoding ? "Geocoding…" : "📍 Auto-fill Coordinates"}
              </button>
              {form.latitude && form.longitude && (
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <Field label="Latitude" name="latitude" value={form.latitude} onChange={handleChange} type="number" placeholder="12.9716" />
              <Field label="Longitude" name="longitude" value={form.longitude} onChange={handleChange} type="number" placeholder="77.5946" />
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Radius (km)</label>
                <select name="radius" value={form.radius} onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-zinc-200 outline-none focus:border-indigo-400 transition">
                  {[5, 10, 20, 50, 100, 200].map((r) => <option key={r} value={r}>{r} km</option>)}
                </select>
              </div>
            </div>
          </Section>

          {/* Submit */}
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate("/recruiter/dashboard")}
              className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white font-black text-sm shadow-lg transition">
              {loading ? "Saving…" : editJob ? "💾 Update Job" : "🚀 Publish Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm">
      <h3 className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-5">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder, options, required }) {
  const base = "w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 outline-none focus:border-indigo-400 transition";
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
      {type === "select" ? (
        <select name={name} value={value} onChange={onChange} required={required} className={base}>
          {options.map((o) => {
            const val = typeof o === "string" ? o : o.value;
            const lbl = typeof o === "string" ? o : o.label;
            return <option key={val} value={val}>{lbl}</option>;
          })}
        </select>
      ) : (
        <input name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} className={base} />
      )}
    </div>
  );
}
