import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLES } from "../utils/roles.js";

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "E-commerce",
  "Manufacturing", "Consulting", "Media", "Logistics", "Real Estate", "Other",
];

export default function RecruiterRegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    companyName: "", email: "", password: "", confirmPassword: "",
    phone: "", website: "", description: "", industry: "", location: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      setLoading(true);
      setError("");

      // Recruiters are created through the shared auth endpoint with an
      // explicit role, so they get the same validation, hashing and session.
      await register({
        name: form.companyName.trim(),
        email: form.email,
        password: form.password,
        role: ROLES.RECRUITER,
      });

      setSuccess(true);
      setTimeout(() => navigate("/recruiter/dashboard"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-zinc-950 dark:to-indigo-950 px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">🎉</div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Welcome aboard!</h2>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950 py-16 px-4" style={{ paddingTop: "80px" }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">🏢</div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Post Jobs on NearHire</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm">
            Create your recruiter account and start hiring talent across India.
          </p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
            Already have an account?{" "}
            <Link to="/recruiter/dashboard" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-8 shadow-xl">
          {error && (
            <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Company Info */}
            <div>
              <h3 className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-3">Company Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Company Name *" name="companyName" value={form.companyName} onChange={handleChange} placeholder="Acme Technologies" required />
                <Field label="Industry *" name="industry" value={form.industry} onChange={handleChange} type="select" options={INDUSTRIES} required />
                <Field label="Company Email *" name="email" value={form.email} onChange={handleChange} type="email" placeholder="hr@company.com" required />
                <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} type="tel" placeholder="+91 98765 43210" />
                <Field label="Website" name="website" value={form.website} onChange={handleChange} type="url" placeholder="https://company.com" />
                <Field label="Location" name="location" value={form.location} onChange={handleChange} placeholder="Bangalore, Karnataka" />
              </div>
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Company Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Tell candidates about your company, culture, and mission…"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 resize-none transition"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800 pt-5">
              <h3 className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-3">Account Security</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Password *" name="password" value={form.password} onChange={handleChange} type="password" placeholder="Min. 8 characters" required />
                <Field label="Confirm Password *" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} type="password" placeholder="Repeat password" required />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700
                         disabled:opacity-50 text-white rounded-xl py-3.5 font-black text-sm
                         transition duration-150 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
            >
              {loading ? "Creating account…" : "🚀 Create Recruiter Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-zinc-600 mt-6">
          <Link to="/" className="hover:text-indigo-500 transition">← Back to NearHire</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder, options, required }) {
  const base = "w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition";
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
      {type === "select" ? (
        <select name={name} value={value} onChange={onChange} required={required} className={base}>
          <option value="">Select industry…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} className={base} />
      )}
    </div>
  );
}
