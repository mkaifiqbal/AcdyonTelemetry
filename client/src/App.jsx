import { useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise,
  ArrowSquareOut,
  Briefcase,
  Broadcast,
  Check,
  CheckCircle,
  Clock,
  Code,
  Globe,
  Lightning,
  MagnifyingGlass,
  MapPin,
  Play,
  Pulse,
  ShieldCheck,
  ShieldWarning,
  Sparkle,
  TerminalWindow,
  Warning,
  X,
} from "@phosphor-icons/react";
import { api } from "./api.js";
import {
  BrowserRouter,
  useLocation,
  useNavigate,
} from "react-router-dom";

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(value))
    : "In progress";

const relativeTime = (value) => {
  if (!value) return "Never";
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value)) / 1000),
  );
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const durationMs = (start, finish) =>
  finish ? Math.max(0, new Date(finish) - new Date(start)) : null;

const sourceName = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "Unknown";

function StatusBadge({ status }) {
  const styles = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    degraded: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    failed: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    running: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 animate-pulse",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
        styles[status] || "bg-slate-500/10 text-slate-400 border-slate-500/30"
      }`}
    >
      {status === "success" && <Check size={12} weight="bold" />}
      {status === "degraded" && <Warning size={12} weight="bold" />}
      {status === "failed" && <X size={12} weight="bold" />}
      {status === "running" && <Pulse size={12} />}
      {status}
    </span>
  );
}

function AttemptTimeline({ run }) {
  if (!run?.attempts?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-3">
        <div className="w-12 h-12 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center">
          <Pulse size={24} />
        </div>
        <div className="font-semibold text-slate-200">No Pipeline Attempts</div>
        <div className="text-xs text-slate-400">Diagnostic logs and retry steps will appear once ingestion starts.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-4">
        <Pulse size={16} className="text-emerald-400" />
        <span>Execution Pipeline Graph</span>
      </div>

      <div className="flex items-center overflow-x-auto py-4 px-2 mb-6">
        {run.attempts.map((a, i) => (
          <div className="flex items-center relative shrink-0" key={`${a.attemptNumber}-${i}`}>
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white z-10 relative transition-transform hover:scale-110 shadow-lg ${
                a.outcome === "success"
                  ? "bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-emerald-300 shadow-emerald-500/30"
                  : "bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-300 shadow-amber-500/30"
              }`}
              title={`Attempt ${a.attemptNumber} · ${a.source} · ${a.responseTimeMs || 0}ms`}
            >
              {a.outcome === "success" ? (
                <Check size={16} weight="bold" />
              ) : (
                <X size={15} weight="bold" />
              )}
            </div>

            <div className="absolute top-11 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
              <div className="text-[11px] font-bold text-slate-200 capitalize">
                {a.method === "fallback" ? "Browser" : a.method}
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                {a.responseTimeMs || 0}ms
              </div>
            </div>

            {i < run.attempts.length - 1 && (
              <div className="w-20 h-0.5 bg-white/15 relative shrink-0">
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-[10px] text-amber-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-amber-500/30 whitespace-nowrap">
                  {a.delayMs ? `+${(a.delayMs / 1000).toFixed(1)}s` : "direct"}
                </span>
              </div>
            )}
          </div>
        ))}

        {run.status === "degraded" && (
          <div className="flex items-center relative shrink-0 ml-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold bg-slate-800 border-2 border-dashed border-slate-600 text-slate-400">
              <Clock size={16} />
            </div>
            <div className="absolute top-11 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
              <div className="text-[11px] font-bold text-slate-400">Cooldown</div>
              <div className="text-[10px] font-mono text-slate-500">Circuit trip</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 border-t border-white/10 pt-4">
        <div className="grid grid-cols-[36px_85px_90px_80px_75px_1fr] gap-2 py-2 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
          <span>#</span>
          <span>Time</span>
          <span>Source</span>
          <span>Status</span>
          <span>Latency</span>
          <span>Diagnostic Detail</span>
        </div>
        {run.attempts.map((a, i) => (
          <div
            className="grid grid-cols-[36px_85px_90px_80px_75px_1fr] gap-2 py-2.5 text-xs font-mono text-slate-300 border-b border-white/5 items-center hover:bg-white/5"
            key={`${a.attemptNumber}-log-${i}`}
          >
            <span className="text-slate-400">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-slate-400">
              {new Date(a.timestamp).toLocaleTimeString([], { hour12: false })}
            </span>
            <span className="text-slate-200">{sourceName(a.source)}</span>
            <span>
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  a.outcome === "success"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}
              >
                {a.outcome}
              </span>
            </span>
            <span className="text-slate-300">{a.responseTimeMs || 0}ms</span>
            <span className="truncate">
              {a.errorType ? (
                <span className="text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 text-[11px]">
                  {a.errorType}: {a.errorMessage || "Request failed"}
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold text-[11px]">
                  200 OK · Payload Normalized
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Runs({ runs, selected, setSelected, busy, trigger, pagination, setPage }) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Pipeline Runs & Diagnostics
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Full audit trail of HTTP fetches, browser fallbacks, retry backoffs, and circuit states.
          </p>
        </div>
        <button
          className="flex items-center gap-2 h-10 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={() => trigger("all")}
          disabled={busy}
        >
          <Play size={16} weight="fill" />
          Trigger Pipeline Run
        </button>
      </div>

      {!runs.length ? (
        <div className="glass-panel rounded-2xl flex flex-col items-center justify-center p-12 text-center text-slate-400 gap-3">
          <div className="w-14 h-14 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-emerald-400">
            <Pulse size={30} />
          </div>
          <div className="text-lg font-bold text-white">No Pipeline Runs Recorded</div>
          <div className="text-sm text-slate-400">Execute an ingestion run to inspect retry paths and telemetry.</div>
          <button
            className="mt-3 flex items-center gap-2 h-9 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg"
            onClick={() => trigger("all")}
            disabled={busy}
          >
            <Play size={15} weight="fill" />
            Run Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(340px,0.9fr)_minmax(480px,1.4fr)] gap-5 items-start">
          <div className="glass-panel rounded-2xl overflow-hidden flex flex-col divide-y divide-white/5">
            {runs.map((run) => (
              <button
                className={`flex items-center justify-between p-4 text-left transition-all hover:bg-white/5 relative ${
                  selected?._id === run._id ? "bg-emerald-500/10 border-l-4 border-emerald-400" : "border-l-4 border-transparent"
                }`}
                onClick={() => setSelected(run)}
                key={run._id}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span>{formatDate(run.startedAt)}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
                      {run.methodUsed}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    {run.jobsFound || 0} retrieved · <span className="text-emerald-400">+{run.jobsNew || 0} new</span>
                  </div>
                </div>
                <StatusBadge status={run.status} />
              </button>
            ))}
          </div>

          <div className="glass-panel rounded-2xl p-6 shadow-xl">
            {selected ? (
              <>
                <div className="flex items-start justify-between pb-5 border-b border-white/10 mb-5">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full mb-2">
                      <TerminalWindow size={14} />
                      Run Telemetry
                    </span>
                    <h3 className="font-display text-xl font-bold text-white">
                      {formatDate(selected.startedAt)}
                    </h3>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 border border-white/10 rounded-xl p-4 mb-6">
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase text-slate-400 block">Target Source</span>
                    <span className="font-mono text-sm font-bold text-slate-100">{sourceName(selected.requestedSource)}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase text-slate-400 block">Resolved Source</span>
                    <span className="font-mono text-sm font-bold text-cyan-400">{selected.successfulSource || "None"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase text-slate-400 block">Pipeline Duration</span>
                    <span className="font-mono text-sm font-bold text-slate-100">
                      {durationMs(selected.startedAt, selected.finishedAt) == null
                        ? "Running..."
                        : `${durationMs(selected.startedAt, selected.finishedAt)}ms`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase text-slate-400 block">Trigger Mode</span>
                    <span className="font-mono text-sm font-bold text-slate-100 capitalize">{selected.trigger || "manual"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase text-slate-400 block">Jobs Retrieved</span>
                    <span className="font-mono text-sm font-bold text-slate-100">{selected.jobsFound || 0}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase text-slate-400 block">New Inserted</span>
                    <span className="font-mono text-sm font-bold text-emerald-400">+{selected.jobsNew || 0}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase text-slate-400 block">Deduplicated</span>
                    <span className="font-mono text-sm font-bold text-slate-100">
                      {Math.max(0, (selected.jobsFound || 0) - (selected.jobsNew || 0))}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase text-slate-400 block">Attempts</span>
                    <span className="font-mono text-sm font-bold text-slate-100">{selected.attempts?.length || 0}</span>
                  </div>
                </div>

                <AttemptTimeline run={selected} />

                {selected.errorSummary && (
                  <div className="mt-5 flex items-center gap-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                    <Warning size={20} className="shrink-0" />
                    <span>{selected.errorSummary}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <div className="text-base font-bold text-white">Select a run from the list</div>
                <div className="text-xs text-slate-400 mt-1">Click any historical run to inspect detailed telemetry.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {pagination?.pages > 1 && (
        <div className="flex items-center justify-center gap-4 py-6">
          <button
            className="px-4 py-2 bg-slate-900/80 hover:bg-slate-800 border border-white/10 rounded-lg text-xs font-semibold text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            disabled={pagination.page <= 1}
            onClick={() => setPage(pagination.page - 1)}
          >
            ← Previous
          </button>
          <span className="font-mono text-xs text-slate-400">
            Page {pagination.page} of {pagination.pages} · {pagination.total} total runs
          </span>
          <button
            className="px-4 py-2 bg-slate-900/80 hover:bg-slate-800 border border-white/10 rounded-lg text-xs font-semibold text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            disabled={pagination.page >= pagination.pages}
            onClick={() => setPage(pagination.page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}

function Jobs({ jobs, query, setQuery, sources, source, setSource, pagination, setPage }) {
  const [sort, setSort] = useState({ key: "scrapedAt", dir: "desc" });
  const [inspectJob, setInspectJob] = useState(null);

  const sorted = [...jobs].sort((a, b) => {
    const valA = String(a[sort.key] || "");
    const valB = String(b[sort.key] || "");
    return valA.localeCompare(valB) * (sort.dir === "asc" ? 1 : -1);
  });

  const changeSort = (key) =>
    setSort((s) => ({
      key,
      dir: s.key === key && s.dir === "asc" ? "desc" : "asc",
    }));

  return (
    <section>
      <div className="glass-panel rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              source === "all"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
            onClick={() => setSource("all")}
          >
            All Sources
          </button>
          {sources.map((item) => (
            <button
              key={item.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                source === item.id
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
              onClick={() => setSource(item.id)}
              disabled={!item.configured}
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="relative flex items-center w-full sm:w-80">
          <MagnifyingGlass size={18} className="absolute left-3 text-slate-400 pointer-events-none" />
          <input
            className="w-full h-10 pl-9 pr-8 bg-slate-950/80 border border-white/10 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 outline-none transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search role, company, skills..."
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Normalized Job Inventory
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time deduplicated listings synchronized from all configured providers.
          </p>
        </div>
        <div className="font-mono text-xs text-slate-400">
          MongoDB Index: <span className="text-emerald-400 font-bold">[source, rawHash]</span>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-950/80 border-b border-white/10">
                <th className="px-4 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Job Title & Role
                </th>
                <th
                  className="px-4 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-emerald-400 transition-colors"
                  onClick={() => changeSort("company")}
                >
                  Company {sort.key === "company" ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
                </th>
                <th
                  className="px-4 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-emerald-400 transition-colors"
                  onClick={() => changeSort("location")}
                >
                  Location {sort.key === "location" ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
                </th>
                <th className="px-4 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Tags & Skills
                </th>
                <th className="px-4 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Provider
                </th>
                <th
                  className="px-4 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-emerald-400 transition-colors"
                  onClick={() => changeSort("scrapedAt")}
                >
                  Scraped {sort.key === "scrapedAt" ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
                </th>
                <th className="px-4 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Inspector
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map((job) => (
                <tr key={job._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3.5">
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-bold text-sm text-slate-100 hover:text-emerald-400 transition-colors"
                    >
                      <span>{job.title}</span>
                      <ArrowSquareOut size={14} className="text-slate-400" />
                    </a>
                  </td>
                  <td className="px-4 py-3.5 text-sm font-medium text-slate-300 max-w-[180px]">
                    <span className="truncate block" title={job.company}>
                      {job.company}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-300 max-w-[220px]">
                    <span
                      className="inline-flex items-center gap-1.5 max-w-full text-slate-300"
                      title={job.location || "Remote"}
                    >
                      <MapPin size={14} className="text-cyan-400 shrink-0" />
                      <span className="truncate">{job.location || "Remote"}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {job.tags?.slice(0, 3).map((tag) => (
                        <span
                          className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[11px] font-mono text-slate-400"
                          key={tag}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {(() => {
                      const displaySource = !job.source || /^\d+$/.test(String(job.source).trim()) ? "RemoteOK" : job.source;
                      const isRemoteOK = displaySource.toLowerCase() === "remoteok";
                      const isArbeitnow = displaySource.toLowerCase() === "arbeitnow";
                      const isRemotive = displaySource.toLowerCase() === "remotive";
                      
                      const badgeClass = isRemoteOK
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                        : isArbeitnow
                        ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                        : isRemotive
                        ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                        : "bg-slate-500/10 text-slate-300 border-slate-500/20";

                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold border ${badgeClass}`}>
                          {displaySource}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                      {relativeTime(job.scrapedAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-xs font-mono text-slate-300 hover:text-emerald-300 transition-all"
                      onClick={() => setInspectJob(job)}
                      title="Inspect Raw SHA-256 Hash and Database Payload"
                    >
                      <Code size={13} />
                      Raw
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!jobs.length && (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 gap-2">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-slate-400">
              <Briefcase size={24} />
            </div>
            <div className="text-base font-bold text-white">No Matching Records Found</div>
            <div className="text-xs text-slate-400">Try adjusting your search query or selecting another provider.</div>
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-4 py-6">
          <button
            className="px-4 py-2 bg-slate-900/80 hover:bg-slate-800 border border-white/10 rounded-lg text-xs font-semibold text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            disabled={pagination.page <= 1}
            onClick={() => setPage(pagination.page - 1)}
          >
            ← Previous
          </button>
          <span className="font-mono text-xs text-slate-400">
            Page {pagination.page} of {pagination.pages} · {pagination.total} jobs
          </span>
          <button
            className="px-4 py-2 bg-slate-900/80 hover:bg-slate-800 border border-white/10 rounded-lg text-xs font-semibold text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            disabled={pagination.page >= pagination.pages}
            onClick={() => setPage(pagination.page + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* Raw Job Metadata Modal */}
      {inspectJob && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setInspectJob(null)}
        >
          <div
            className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Code size={20} />
                <h3 className="font-display text-lg font-bold text-white">
                  Record Signature & SHA-256 Identity
                </h3>
              </div>
              <button
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
                onClick={() => setInspectJob(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs font-mono mb-6">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                  SHA-256 Deduplication Hash
                </span>
                <div className="bg-black/60 p-3 rounded-lg border border-white/10 text-cyan-400 break-all select-all">
                  {inspectJob.rawHash}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Provider Source</span>
                  <div className="text-slate-200 font-bold">{inspectJob.source}</div>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Ingested Timestamp</span>
                  <div className="text-slate-200">{formatDate(inspectJob.scrapedAt)}</div>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Target Direct URL</span>
                <div className="text-emerald-400 break-all select-all bg-black/40 p-2 rounded border border-white/5">
                  {inspectJob.url}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all"
                onClick={() => setInspectJob(null)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Sources({ sources, onCheck, onTriggerSingle }) {
  const [checking, setChecking] = useState(false);
  const [activeSourceId, setActiveSourceId] = useState(null);

  const handleCheckAll = async () => {
    setChecking(true);
    try {
      await onCheck();
    } finally {
      setChecking(false);
    }
  };

  const handleTestSingle = async (sourceId) => {
    setActiveSourceId(sourceId);
    try {
      if (onTriggerSingle) {
        await onTriggerSingle(sourceId);
      }
    } finally {
      setActiveSourceId(null);
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Provider Registry & Connectors
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Configured ingestion adapters, response latencies, and uptime telemetry.
          </p>
        </div>
        <button
          className="flex items-center gap-2 h-10 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-60"
          onClick={handleCheckAll}
          disabled={checking}
        >
          <ArrowClockwise size={16} className={checking ? "animate-spin" : ""} />
          {checking ? "Probing Sources..." : "Check All Sources"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sources.map((source) => {
          const isLive = source.status === "live" || (!source.status && source.configured);
          const isDegraded = source.status === "degraded" || source.status === "rate_limited";

          return (
            <article
              className={`glass-panel rounded-2xl p-6 flex flex-col transition-all hover:-translate-y-1 shadow-xl border-l-4 ${
                isLive
                  ? "border-l-emerald-400"
                  : isDegraded
                  ? "border-l-amber-400"
                  : "border-l-slate-600 opacity-75"
              }`}
              key={source.id}
            >
              <div className="flex items-center gap-3.5 pb-4 border-b border-white/10 mb-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-display font-bold text-lg flex items-center justify-center">
                  {source.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">{source.name}</h3>
                  <div
                    className={`font-mono text-xs font-bold uppercase tracking-wider ${
                      isLive ? "text-emerald-400" : isDegraded ? "text-amber-400" : "text-slate-500"
                    }`}
                  >
                    {source.status?.replaceAll("_", " ") || (source.configured ? "Live" : "Not Configured")}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 text-xs mb-6 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Coverage</span>
                  <span className="text-slate-200 font-semibold">{source.coverage}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Pricing / Cost</span>
                  <span className="text-emerald-400 font-semibold">{source.cost}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Auth Protocol</span>
                  <span className="font-mono text-slate-200">{source.auth}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">HTTP Method</span>
                  <span className="font-mono text-slate-200">{source.method}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Avg Latency</span>
                  <span className="font-mono text-cyan-400 font-semibold">
                    {source.avgResponseTimeMs == null ? "No samples" : `${source.avgResponseTimeMs}ms`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Success Rate</span>
                  <span className="font-mono text-slate-200">
                    {source.successRate == null
                      ? "No runs"
                      : `${source.successRate}% (${source.successCount}/${source.attemptCount})`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last Live</span>
                  <span className="font-mono text-slate-200" title={source.lastSuccessfulFetch ? formatDate(source.lastSuccessfulFetch) : "Never"}>
                    {source.lastSuccessfulFetch ? relativeTime(source.lastSuccessfulFetch) : "Never"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-auto">
                <a
                  href={source.docs}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  API Docs <ArrowSquareOut size={13} />
                </a>
                <button
                  className="px-3 py-1.5 bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 rounded-lg text-xs font-semibold text-slate-200 hover:text-emerald-300 transition-all disabled:opacity-40"
                  onClick={() => handleTestSingle(source.id)}
                  disabled={activeSourceId === source.id || !source.configured}
                >
                  {activeSourceId === source.id ? "Syncing..." : "Sync Source"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Dashboard() {
  const [data, setData] = useState({
    jobs: [],
    runs: [],
    health: null,
    sources: [],
  });
  const [selected, setSelected] = useState(null);
  const [runPage, setRunPage] = useState(1);
  const [runPagination, setRunPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [query, setQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const tab =
    location.pathname === "/runs" || location.pathname === "/overview"
      ? "overview"
      : location.pathname === "/sources"
      ? "sources"
      : "home";

  const setTab = (next) => navigate(next === "home" ? "/" : `/${next}`);

  const [jobSource, setJobSource] = useState("all");
  const [jobPage, setJobPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [busy, setBusy] = useState(false);
  const [syncTarget, setSyncTarget] = useState("all");
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    try {
      const [jobs, runs, health, sources] = await Promise.all([
        api.jobs(query, jobSource, jobPage),
        api.runs(runPage),
        api.health(),
        api.sources(),
      ]);
      setData({ jobs: jobs.items, runs: runs.items, health, sources });
      setRunPagination({ page: runs.page, pages: runs.pages, total: runs.total });
      setPagination({ page: jobs.page, pages: jobs.pages, total: jobs.total });
      setSelected(
        (old) => runs.items.find((r) => r._id === old?._id) || runs.items[0] || null,
      );
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(timer);
      clearInterval(tick);
    };
  }, [runPage]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const jobs = await api.jobs(query, jobSource, jobPage);
        setData((v) => ({ ...v, jobs: jobs.items }));
        setPagination({ page: jobs.page, pages: jobs.pages, total: jobs.total });
      } catch (e) {
        setError(e.message);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, jobSource, jobPage]);

  useEffect(() => {
    setJobPage(1);
  }, [query, jobSource]);

  const stats = useMemo(
    () => ({
      success: data.runs.filter((r) => r.status === "success").length,
      degraded: data.runs.filter((r) => r.status === "degraded").length,
    }),
    [data.runs],
  );

  const trigger = async (source = "all") => {
    setBusy(true);
    setError("");
    setStage("Dispatching fetcher...");
    const stageTimer = setTimeout(() => setStage("Normalizing records..."), 1600);
    try {
      const response = await api.ingest(typeof source === "string" ? source : syncTarget);
      const run = Array.isArray(response) ? response.at(-1) : response;
      setStage(
        run.methodUsed === "fallback" ? "Browser fallback executed" : "Ingestion complete",
      );
      await load();
      if (run) setSelected(run);
    } catch (e) {
      setStage("Pipeline alert");
      setError(e.message);
    } finally {
      clearTimeout(stageTimer);
      setTimeout(() => {
        setBusy(false);
        setStage("");
      }, 800);
    }
  };

  const breaker = data.health?.circuitBreaker;
  const cooldown = breaker?.retryAt
    ? Math.max(0, Math.ceil((new Date(breaker.retryAt).getTime() - now) / 1000))
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100 cyber-bg-matrix relative">
      <div className="fixed inset-0 pointer-events-none cyber-grid-overlay z-0" />

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 h-18 px-6 lg:px-12 flex items-center justify-between bg-[#07090e]/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/25">
            <Broadcast size={22} weight="bold" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Acdyon Telemetry
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              Multi-Source Ingestion Engine
              <span className="font-mono text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30">
                v2.4
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border font-mono text-xs font-semibold ${
              breaker?.status === "tripped"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : breaker?.status === "cooldown"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                breaker?.status === "tripped"
                  ? "bg-rose-500 shadow-sm shadow-rose-500"
                  : breaker?.status === "cooldown"
                  ? "bg-amber-400 shadow-sm shadow-amber-400"
                  : "bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse-glow"
              }`}
            />
            <span>
              {breaker?.status === "tripped"
                ? `Tripped (${cooldown}s)`
                : `Circuit ${breaker?.status || "Armed"}`}
            </span>
          </div>

          <button
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all"
            onClick={load}
            title="Refresh Live Data"
          >
            <ArrowClockwise size={17} />
          </button>

          <div className="flex items-center">
            <button
              className="flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs rounded-l-lg shadow-md shadow-emerald-500/20 transition-all disabled:opacity-60"
              onClick={() => trigger(syncTarget)}
              disabled={busy}
            >
              <Play size={14} weight="fill" />
              {busy ? stage : "Sync Ingestion"}
            </button>
            <select
              className="h-9 px-2.5 bg-slate-900 border border-white/10 border-l-0 rounded-r-lg font-mono text-xs text-slate-300 outline-none cursor-pointer hover:bg-slate-800 transition-all"
              value={syncTarget}
              onChange={(e) => setSyncTarget(e.target.value)}
              disabled={busy}
            >
              <option value="all">All Sources</option>
              {data.sources.map((s) => (
                <option key={s.id} value={s.id} disabled={!s.configured}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-12 py-8 z-10">
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm mb-6 backdrop-blur-md">
            <Warning size={20} className="shrink-0" />
            <span>{error} — Ensure MongoDB service and backend API are operational.</span>
          </div>
        )}

        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center mb-10">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkle size={14} weight="fill" />
              Autonomous Feed Orchestration
            </span>
            <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-none mb-4">
              Real-time Ingestion & <br />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                Fault Observability.
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-lg">
              Resilient web scraping, adaptive retry backoffs, Playwright headless browser fallbacks,
              and circuit breaker protection for distributed job feeds.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-xs font-mono font-bold uppercase">Catalog Records</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Briefcase size={18} />
                </div>
              </div>
              <div className="font-mono text-2xl font-bold text-white">{pagination.total.toLocaleString()}</div>
              <div className="text-[11px] text-slate-400 mt-1">Normalized & Deduplicated</div>
            </div>

            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-xs font-mono font-bold uppercase">Successful Runs</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CheckCircle size={18} />
                </div>
              </div>
              <div className="font-mono text-2xl font-bold text-white">{stats.success}</div>
              <div className="text-[11px] text-slate-400 mt-1">Zero data loss pipeline</div>
            </div>

            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-xs font-mono font-bold uppercase">Degraded Runs</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <ShieldWarning size={18} />
                </div>
              </div>
              <div className="font-mono text-2xl font-bold text-white">{stats.degraded}</div>
              <div className="text-[11px] text-slate-400 mt-1">Handled via retry / circuit</div>
            </div>

            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-xs font-mono font-bold uppercase">Active Sources</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Globe size={18} />
                </div>
              </div>
              <div className="font-mono text-2xl font-bold text-white">{data.sources.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Connected API adapters</div>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2 p-1.5 bg-slate-900/80 border border-white/10 rounded-xl mb-8 w-fit backdrop-blur-md">
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "home"
                ? "bg-slate-800 border border-white/15 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
            onClick={() => setTab("home")}
          >
            <Briefcase size={16} className={tab === "home" ? "text-emerald-400" : ""} />
            <span>Job Inventory</span>
            <span className="font-mono text-xs px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
              {pagination.total}
            </span>
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "overview"
                ? "bg-slate-800 border border-white/15 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
            onClick={() => setTab("overview")}
          >
            <Pulse size={16} className={tab === "overview" ? "text-emerald-400" : ""} />
            <span>Pipeline Runs</span>
            <span className="font-mono text-xs px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
              {runPagination.total}
            </span>
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "sources"
                ? "bg-slate-800 border border-white/15 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
            onClick={() => setTab("sources")}
          >
            <Globe size={16} className={tab === "sources" ? "text-emerald-400" : ""} />
            <span>Source Registry</span>
            <span className="font-mono text-xs px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
              {data.sources.length}
            </span>
          </button>
        </nav>

        {/* Tab Views */}
        {tab === "home" && (
          <Jobs
            jobs={data.jobs}
            query={query}
            setQuery={setQuery}
            sources={data.sources}
            source={jobSource}
            setSource={setJobSource}
            pagination={pagination}
            setPage={setJobPage}
          />
        )}

        {tab === "overview" && (
          <Runs
            runs={data.runs}
            selected={selected}
            setSelected={setSelected}
            busy={busy}
            trigger={trigger}
            pagination={runPagination}
            setPage={setRunPage}
          />
        )}

        {tab === "sources" && (
          <Sources
            sources={data.sources}
            onCheck={async () => {
              await api.checkSources();
              await load();
            }}
            onTriggerSingle={(srcId) => trigger(srcId)}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
}
