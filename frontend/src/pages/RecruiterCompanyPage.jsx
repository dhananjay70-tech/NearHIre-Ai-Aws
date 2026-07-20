import { useEffect, useState } from "react";
import { getCompany, updateCompany } from "../services/recruiterService";

const EMPTY = {
  name: "", description: "", websiteUrl: "", logoUrl: "",
  address: "", city: "", state: "", postalCode: "",
};

export default function RecruiterCompanyPage() {
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getCompany();
        if (cancelled) return;

        setCompany(data);
        if (data) {
          setForm({
            name: data.name || "",
            description: data.description || "",
            websiteUrl: data.websiteUrl || "",
            logoUrl: data.logoUrl || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            postalCode: data.postalCode || "",
          });
        } else {
          // No company yet — open the form so the page is never blank.
          setEditing(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
            "Could not load your company profile. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Company name is required.");
      return;
    }
    if (form.websiteUrl && !/^https?:\/\//i.test(form.websiteUrl)) {
      setError("Website must start with http:// or https://");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const saved = await updateCompany(form);
      setCompany(saved);
      setEditing(false);
      setSuccess("Company profile saved.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save your company profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-20 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="h-8 w-48 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse mb-6" />
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-slate-100 dark:bg-zinc-800 rounded animate-pulse" style={{ width: `${80 - i * 12}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Company Profile</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
              This information appears on every job you post.
            </p>
          </div>
          {company && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
            >
              Edit Profile
            </button>
          )}
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="mb-5 p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs">
            ✓ {success}
          </div>
        )}

        {!editing && company ? (
          <>
            {/* Summary card */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 mb-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl font-black text-white shrink-0 overflow-hidden">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    (company.name || "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white truncate">{company.name}</h2>
                    {company.isVerified && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                    {[company.city, company.state].filter(Boolean).join(", ") || "Location not set"}
                  </p>
                  {company.websiteUrl && (
                    <a
                      href={company.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mt-1 inline-block"
                    >
                      {company.websiteUrl}
                    </a>
                  )}
                </div>
              </div>

              {company.description ? (
                <p className="text-sm text-slate-600 dark:text-zinc-300 mt-5 leading-relaxed whitespace-pre-line">
                  {company.description}
                </p>
              ) : (
                <p className="text-sm text-slate-400 dark:text-zinc-500 mt-5 italic">
                  No company description yet — add one so candidates know who you are.
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Jobs Posted", value: company.totalJobs, icon: "📋" },
                { label: "Active Jobs", value: company.activeJobs, icon: "✅" },
              ].map((s) => (
                <div key={s.label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5">
                  <div className="text-xl mb-1">{s.icon}</div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value ?? 0}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">{s.label}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Edit / create form */
          <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 space-y-4">
            {!company && (
              <p className="text-sm text-slate-500 dark:text-zinc-400 -mt-1 mb-2">
                You don&apos;t have a company profile yet. Create one below.
              </p>
            )}

            <Field label="Company Name *" name="name" value={form.name} onChange={handleChange} placeholder="Acme Corp" required />

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1.5">About the Company</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="What your company does, culture, mission…"
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-slate-700 dark:text-zinc-200 outline-none focus:border-indigo-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Website" name="websiteUrl" value={form.websiteUrl} onChange={handleChange} placeholder="https://example.com" />
              <Field label="Logo URL" name="logoUrl" value={form.logoUrl} onChange={handleChange} placeholder="https://…/logo.png" />
              <Field label="City" name="city" value={form.city} onChange={handleChange} placeholder="Bengaluru" />
              <Field label="State" name="state" value={form.state} onChange={handleChange} placeholder="Karnataka" />
              <Field label="Address" name="address" value={form.address} onChange={handleChange} placeholder="Street address" />
              <Field label="Postal Code" name="postalCode" value={form.postalCode} onChange={handleChange} placeholder="560001" />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Profile"}
              </button>
              {company && (
                <button
                  type="button"
                  onClick={() => { setEditing(false); setError(""); }}
                  className="rounded-xl border border-slate-200 dark:border-zinc-700 px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1.5">{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-slate-700 dark:text-zinc-200 outline-none focus:border-indigo-400"
      />
    </div>
  );
}
