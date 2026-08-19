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
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider border ${
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

function SourceBadge({ source }) {
  const displaySource = !source || /^\d+$/.test(String(source).trim()) ? "RemoteOK" : source;
  const isRemoteOK = displaySource.toLowerCase() === "remoteok";
  const isArbeitnow = displaySource.toLowerCase() === "arbeitnow";
  const isRemotive = displaySource.toLowerCase() === "remotive";

  const badgeClass = isRemoteOK
    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
    : isArbeitnow
    ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/25"
    : isRemotive
    ? "bg-purple-500/10 text-purple-300 border-purple-500/25"
    : "bg-slate-500/10 text-slate-300 border-slate-500/25";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${badgeClass}`}>
      {displaySource}
    </span>
  );
}

function AttemptTimeline({ run }) {
  if (!run?.attempts?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center text-slate-400 gap-2.5">
        <div className="w-10 h-10 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center">
          <Pulse size={20} />
        </div>
        <div className="text-sm font-semibold text-slate-200">No Pipeline Attempts</div>
        <div className="text-xs text-slate-400">Diagnostic logs and retry steps will appear once ingestion starts.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 sm:mb-4">
        <Pulse size={16} className="text-emerald-400" />
        <span>Execution Pipeline Graph</span>
      </div>

      <div className="flex items-center overflow-x-auto no-scrollbar py-3 px-1 mb-5">
        {run.attempts.map((a, i) => (
          <div className="flex items-center relative shrink-0" key={`${a.attemptNumber}-${i}`}>
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-white z-10 relative transition-transform hover:scale-110 shadow-lg ${
                a.outcome === "success"
                  ? "bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-emerald-300 shadow-emerald-500/30"
                  : "bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-300 shadow-amber-500/30"
              }`}
              title={`Attempt ${a.attemptNumber} · ${a.source} · ${a.responseTimeMs || 0}ms`}
            >
              {a.outcome === "success" ? (
                <Check size={15} weight="bold" />
              ) : (
                <X size={14} weight="bold" />
              )}
            </div>

            <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-200 capitalize">
                {a.method === "fallback" ? "Browser" : a.method}
              </div>
              <div className="text-[9px] sm:text-[10px] font-mono text-slate-400">
                {a.responseTimeMs || 0}ms
              </div>
            </div>

            {i < run.attempts.length - 1 && (
              <div className="w-16 sm:w-20 h-0.5 bg-white/15 relative shrink-0">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 font-mono text-[9px] text-amber-400 bg-slate-900/90 px-1 py-0.2 rounded border border-amber-500/30 whitespace-nowrap">
                  {a.delayMs ? `+${(a.delayMs / 1000).toFixed(1)}s` : "direct"}
                </span>
              </div>
            )}
          </div>
        ))}

        {run.status === "degraded" && (
          <div className="flex items-center relative shrink-0 ml-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold bg-slate-800 border-2 border-dashed border-slate-600 text-slate-400">
              <Clock size={15} />
            </div>
            <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-400">Cooldown</div>
              <div className="text-[9px] font-mono text-slate-500">Circuit trip</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-white/10 pt-3 overflow-x-auto no-scrollbar">
        <div className="min-w-[500px]">
          <div className="grid grid-cols-[30px_75px_80px_70px_65px_1fr] gap-2 py-1.5 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
            <span>#</span>
            <span>Time</span>
            <span>Source</span>
            <span>Status</span>
            <span>Latency</span>
            <span>Diagnostic Detail</span>
          </div>
          {run.attempts.map((a, i) => (
            <div
              className="grid grid-cols-[30px_75px_80px_70px_65px_1fr] gap-2 py-2 text-xs font-mono text-slate-300 border-b border-white/5 items-center hover:bg-white/5"
              key={`${a.attemptNumber}-log-${i}`}
            >
              <span className="text-slate-500">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-slate-400 text-[11px]">
                {new Date(a.timestamp).toLocaleTimeString([], { hour12: false })}
              </span>
              <span className="text-slate-200 text-[11px]">{sourceName(a.source)}</span>
              <span>
                <span
                  className={`inline-block px-1 py-0.2 rounded text-[9px] font-bold uppercase ${
                    a.outcome === "success"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {a.outcome}
                </span>
              </span>
              <span className="text-slate-300 text-[11px]">{a.responseTimeMs || 0}ms</span>
              <span className="truncate text-[11px]">
                {a.errorType ? (
                  <span className="text-rose-400 bg-rose-500/10 px-1 py-0.2 rounded border border-rose-500/20">
                    {a.errorType}: {a.errorMessage || "Request failed"}
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold">
                    200 OK · Payload Normalized
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Runs({ runs, selected, setSelected, busy, trigger, pagination, setPage }) {
  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
            Pipeline Runs & Diagnostics
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">
            Full audit trail of HTTP fetches, browser fallbacks, retry backoffs, and circuit states.
          </p>
        </div>
        <button
          className="flex items-center justify-center gap-2 h-9 sm:h-10 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs sm:text-sm rounded-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-60"
          onClick={() => trigger("all")}
          disabled={busy}
        >
          <Play size={15} weight="fill" />
          Trigger Pipeline Run
        </button>
      </div>

      {!runs.length ? (
        <div className="glass-panel rounded-2xl flex flex-col items-center justify-center p-8 sm:p-12 text-center text-slate-400 gap-3">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-emerald-400">
            <Pulse size={26} />
          </div>
          <div className="text-base sm:text-lg font-bold text-white">No Pipeline Runs Recorded</div>
          <div className="text-xs sm:text-sm text-slate-400">Execute an ingestion run to inspect retry paths and telemetry.</div>
          <button
            className="mt-2 flex items-center gap-2 h-9 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg"
            onClick={() => trigger("all")}
            disabled={busy}
          >
            <Play size={14} weight="fill" />
            Run Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,0.9fr)_minmax(460px,1.4fr)] gap-4 sm:gap-5 items-start">
          <div className="glass-panel rounded-2xl overflow-hidden flex flex-col divide-y divide-white/5">
            {runs.map((run) => (
              <button
                className={`flex items-center justify-between p-3.5 sm:p-4 text-left transition-all hover:bg-white/5 relative ${
                  selected?._id === run._id ? "bg-emerald-500/10 border-l-4 border-emerald-400" : "border-l-4 border-transparent"
                }`}
                onClick={() => {
                  setSelected(run);
                  if (window.innerWidth < 1024) {
                    const el = document.getElementById("run-inspector-detail");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                key={run._id}
              >
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-white">
                    <span>{formatDate(run.startedAt)}</span>
                    <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300 border border-white/10">
                      {run.methodUsed}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {run.jobsFound || 0} retrieved · <span className="text-emerald-400">+{run.jobsNew || 0} new</span>
                  </div>
                </div>
                <StatusBadge status={run.status} />
              </button>
            ))}
          </div>

          <div className="glass-panel rounded-2xl p-4 sm:p-6 shadow-xl" id="run-inspector-detail">
            {selected ? (
              <>
                <div className="flex items-start justify-between pb-4 border-b border-white/10 mb-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full mb-1.5">
                      <TerminalWindow size={13} />
                      Run Telemetry
                    </span>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                      {formatDate(selected.startedAt)}
                    </h3>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-950/60 border border-white/10 rounded-xl p-3 sm:p-4 mb-5">
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-slate-400 block">Target</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-slate-100">{sourceName(selected.requestedSource)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-slate-400 block">Resolved</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-cyan-400">{selected.successfulSource || "None"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-slate-400 block">Duration</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-slate-100">
                      {durationMs(selected.startedAt, selected.finishedAt) == null
                        ? "Running..."
                        : `${durationMs(selected.startedAt, selected.finishedAt)}ms`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-slate-400 block">Trigger</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-slate-100 capitalize">{selected.trigger || "manual"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-slate-400 block">Found</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-slate-100">{selected.jobsFound || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-slate-400 block">New Upserted</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400">+{selected.jobsNew || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-slate-400 block">Deduplicated</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-slate-100">
                      {Math.max(0, (selected.jobsFound || 0) - (selected.jobsNew || 0))}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-slate-400 block">Attempts</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-slate-100">{selected.attempts?.length || 0}</span>
                  </div>
                </div>

                <AttemptTimeline run={selected} />

                {selected.errorSummary && (
                  <div className="mt-4 flex items-center gap-2.5 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                    <Warning size={18} className="shrink-0" />
                    <span>{selected.errorSummary}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center text-slate-400">
                <div className="text-sm sm:text-base font-bold text-white">Select a run from the list</div>
                <div className="text-xs text-slate-400 mt-1">Click any historical run to inspect detailed telemetry.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {pagination?.pages > 1 && (
        <div className="flex items-center justify-center gap-3 sm:gap-4 py-5 sm:py-6">
          <button
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900/80 hover:bg-slate-800 border border-white/10 rounded-lg text-xs font-semibold text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            disabled={pagination.page <= 1}
            onClick={() => setPage(pagination.page - 1)}
          >
            ← Prev
          </button>
          <span className="font-mono text-[11px] sm:text-xs text-slate-400">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900/80 hover:bg-slate-800 border border-white/10 rounded-lg text-xs font-semibold text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
      {/* Controls Bar */}
      <div className="glass-panel rounded-2xl p-3 sm:p-4 mb-5 sm:mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <button
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border whitespace-nowrap shrink-0 ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border whitespace-nowrap shrink-0 ${
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

        <div className="relative flex items-center w-full md:w-80">
          <MagnifyingGlass size={17} className="absolute left-3 text-slate-400 pointer-events-none" />
          <input
            className="w-full h-9 sm:h-10 pl-9 pr-8 bg-slate-950/80 border border-white/10 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 rounded-lg text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 outline-none transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search role, company, skills..."
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 text-slate-400 hover:text-white"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-4 mb-4 sm:mb-5">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
            Normalized Job Inventory
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">
            Real-time deduplicated listings synchronized from all configured providers.
          </p>
        </div>
        <div className="font-mono text-[11px] sm:text-xs text-slate-400">
          MongoDB Index: <span className="text-emerald-400 font-bold">[source, rawHash]</span>
        </div>
      </div>

      {/* Mobile Card List View (< md) */}
      <div className="block md:hidden space-y-3">
        {sorted.map((job) => (
          <div key={job._id} className="glass-panel rounded-xl p-4 flex flex-col gap-2.5 border border-white/10">
            <div className="flex items-start justify-between gap-2">
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-sm text-slate-100 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
              >
                <span>{job.title}</span>
                <ArrowSquareOut size={14} className="text-slate-400 shrink-0" />
              </a>
              <SourceBadge source={job.source} />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-medium text-slate-200">{job.company}</span>
              <span className="inline-flex items-center gap-1 text-slate-300 max-w-[140px] truncate" title={job.location || "Remote"}>
                <MapPin size={13} className="text-cyan-400 shrink-0" />
                <span className="truncate">{job.location || "Remote"}</span>
              </span>
            </div>

            {job.tags && job.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {job.tags.slice(0, 4).map((tag) => (
                  <span
                    className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] font-mono text-slate-400"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                {relativeTime(job.scrapedAt)}
              </span>
              <button
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-emerald-500/10 border border-white/10 text-xs font-mono text-slate-300 hover:text-emerald-300 transition-all"
                onClick={() => setInspectJob(job)}
              >
                <Code size={13} />
                Raw Hash
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block glass-panel rounded-2xl overflow-hidden shadow-xl">
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
                    <SourceBadge source={job.source} />
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
      </div>

      {!jobs.length && (
        <div className="glass-panel rounded-2xl flex flex-col items-center justify-center p-8 sm:p-12 text-center text-slate-400 gap-2 mt-4">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-slate-400">
            <Briefcase size={24} />
          </div>
          <div className="text-base font-bold text-white">No Matching Records Found</div>
          <div className="text-xs text-slate-400">Try adjusting your search query or selecting another provider.</div>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 sm:gap-4 py-5 sm:py-6">
          <button
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900/80 hover:bg-slate-800 border border-white/10 rounded-lg text-xs font-semibold text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            disabled={pagination.page <= 1}
            onClick={() => setPage(pagination.page - 1)}
          >
            ← Prev
          </button>
          <span className="font-mono text-[11px] sm:text-xs text-slate-400">
            Page {pagination.page} of {pagination.pages} · {pagination.total} jobs
          </span>
          <button
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900/80 hover:bg-slate-800 border border-white/10 rounded-lg text-xs font-semibold text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
          onClick={() => setInspectJob(null)}
        >
          <div
            className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-lg p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Code size={18} />
                <h3 className="font-display text-base sm:text-lg font-bold text-white">
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

            <div className="flex flex-col gap-3.5 text-xs font-mono mb-5">
              <div>
                <span className="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 block mb-1">
                  SHA-256 Deduplication Hash
                </span>
                <div className="bg-black/60 p-2.5 sm:p-3 rounded-lg border border-white/10 text-cyan-400 break-all select-all text-[11px]">
                  {inspectJob.rawHash}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 block mb-1">Provider</span>
                  <div className="text-slate-200 font-bold">{inspectJob.source}</div>
                </div>
                <div>
                  <span className="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 block mb-1">Ingested</span>
                  <div className="text-slate-200 text-[11px]">{formatDate(inspectJob.scrapedAt)}</div>
                </div>
              </div>

              <div>
                <span className="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 block mb-1">Target URL</span>
                <div className="text-emerald-400 break-all select-all bg-black/40 p-2 rounded border border-white/5 text-[11px]">
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
            Provider Registry & Connectors
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">
            Configured ingestion adapters, response latencies, and uptime telemetry.
          </p>
        </div>
        <button
          className="flex items-center justify-center gap-2 h-9 sm:h-10 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs sm:text-sm rounded-lg shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-60"
          onClick={handleCheckAll}
          disabled={checking}
        >
          <ArrowClockwise size={16} className={checking ? "animate-spin" : ""} />
          {checking ? "Probing Sources..." : "Check All Sources"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {sources.map((source) => {
          const isLive = source.status === "live" || (!source.status && source.configured);
          const isDegraded = source.status === "degraded" || source.status === "rate_limited";

          return (
            <article
              className={`glass-panel rounded-2xl p-4 sm:p-6 flex flex-col transition-all hover:-translate-y-1 shadow-xl border-l-4 ${
                isLive
                  ? "border-l-emerald-400"
                  : isDegraded
                  ? "border-l-amber-400"
                  : "border-l-slate-600 opacity-75"
              }`}
              key={source.id}
            >
              <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b border-white/10 mb-3 sm:mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-display font-bold text-base sm:text-lg flex items-center justify-center">
                  {source.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-white">{source.name}</h3>
                  <div
                    className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                      isLive ? "text-emerald-400" : isDegraded ? "text-amber-400" : "text-slate-500"
                    }`}
                  >
                    {source.status?.replaceAll("_", " ") || (source.configured ? "Live" : "Not Configured")}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-xs mb-5 flex-1">
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
                  <span className="font-mono text-slate-200 text-[11px]" title={source.lastSuccessfulFetch ? formatDate(source.lastSuccessfulFetch) : "Never"}>
                    {source.lastSuccessfulFetch ? relativeTime(source.lastSuccessfulFetch) : "Never"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-white/10 mt-auto">
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
    setStage("Dispatching...");
    const stageTimer = setTimeout(() => setStage("Normalizing..."), 1600);
    try {
      const response = await api.ingest(typeof source === "string" ? source : syncTarget);
      const run = Array.isArray(response) ? response.at(-1) : response;
      setStage(
        run.methodUsed === "fallback" ? "Browser fallback" : "Complete",
      );
      await load();
      if (run) setSelected(run);
    } catch (e) {
      setStage("Alert");
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
      <header className="sticky top-0 z-40 px-4 sm:px-6 lg:px-12 py-3 bg-[#07090e]/85 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/25 shrink-0">
              <Broadcast size={20} weight="bold" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-base sm:text-lg font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Acdyon Telemetry
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 font-medium">
                Multi-Source Ingestion
                <span className="font-mono text-[9px] bg-emerald-500/15 text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/30">
                  v2.4
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`flex items-center gap-1.5 h-8 sm:h-9 px-2 sm:px-3 rounded-lg border font-mono text-[11px] sm:text-xs font-semibold ${
                breaker?.status === "tripped"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  : breaker?.status === "cooldown"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${
                  breaker?.status === "tripped"
                    ? "bg-rose-500 shadow-sm shadow-rose-500"
                    : breaker?.status === "cooldown"
                    ? "bg-amber-400 shadow-sm shadow-amber-400"
                    : "bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse-glow"
                }`}
              />
              <span className="truncate max-w-[100px] sm:max-w-none">
                {breaker?.status === "tripped"
                  ? `Tripped (${cooldown}s)`
                  : `Circuit ${breaker?.status || "Armed"}`}
              </span>
            </div>

            <button
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all shrink-0"
              onClick={load}
              title="Refresh Live Data"
            >
              <ArrowClockwise size={16} />
            </button>

            <div className="flex items-center">
              <button
                className="flex items-center gap-1.5 h-8 sm:h-9 px-3 sm:px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs rounded-l-lg shadow-md shadow-emerald-500/20 transition-all disabled:opacity-60 whitespace-nowrap"
                onClick={() => trigger(syncTarget)}
                disabled={busy}
              >
                <Play size={13} weight="fill" />
                <span>{busy ? stage : "Sync"}</span>
              </button>
              <select
                className="h-8 sm:h-9 px-2 bg-slate-900 border border-white/10 border-l-0 rounded-r-lg font-mono text-[11px] sm:text-xs text-slate-300 outline-none cursor-pointer hover:bg-slate-800 transition-all"
                value={syncTarget}
                onChange={(e) => setSyncTarget(e.target.value)}
                disabled={busy}
              >
                <option value="all">All</option>
                {data.sources.map((s) => (
                  <option key={s.id} value={s.id} disabled={!s.configured}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-12 py-5 sm:py-8 z-10">
        {error && (
          <div className="flex items-center gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs sm:text-sm mb-5 backdrop-blur-md">
            <Warning size={18} className="shrink-0" />
            <span>{error} — Ensure MongoDB service and backend API are operational.</span>
          </div>
        )}

        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 sm:gap-8 items-center mb-6 sm:mb-10">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] font-bold uppercase tracking-wider mb-2 sm:mb-3">
              <Sparkle size={13} weight="fill" />
              Autonomous Feed Orchestration
            </span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-3">
              Real-time Ingestion & <br />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                Fault Observability.
              </span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-lg">
              Resilient web scraping, adaptive retry backoffs, Playwright headless browser fallbacks,
              and circuit breaker protection for distributed job feeds.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="glass-panel rounded-xl sm:rounded-2xl p-3.5 sm:p-5 relative overflow-hidden transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between text-slate-400 mb-2 sm:mb-3">
                <span className="text-[10px] sm:text-xs font-mono font-bold uppercase">Catalog Records</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Briefcase size={16} />
                </div>
              </div>
              <div className="font-mono text-xl sm:text-2xl font-bold text-white">{pagination.total.toLocaleString()}</div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Normalized & Deduplicated</div>
            </div>

            <div className="glass-panel rounded-xl sm:rounded-2xl p-3.5 sm:p-5 relative overflow-hidden transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between text-slate-400 mb-2 sm:mb-3">
                <span className="text-[10px] sm:text-xs font-mono font-bold uppercase">Successful</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CheckCircle size={16} />
                </div>
              </div>
              <div className="font-mono text-xl sm:text-2xl font-bold text-white">{stats.success}</div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Zero data loss runs</div>
            </div>

            <div className="glass-panel rounded-xl sm:rounded-2xl p-3.5 sm:p-5 relative overflow-hidden transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between text-slate-400 mb-2 sm:mb-3">
                <span className="text-[10px] sm:text-xs font-mono font-bold uppercase">Degraded</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <ShieldWarning size={16} />
                </div>
              </div>
              <div className="font-mono text-xl sm:text-2xl font-bold text-white">{stats.degraded}</div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Handled via circuit</div>
            </div>

            <div className="glass-panel rounded-xl sm:rounded-2xl p-3.5 sm:p-5 relative overflow-hidden transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between text-slate-400 mb-2 sm:mb-3">
                <span className="text-[10px] sm:text-xs font-mono font-bold uppercase">Active Feeds</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Globe size={16} />
                </div>
              </div>
              <div className="font-mono text-xl sm:text-2xl font-bold text-white">{data.sources.length}</div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Connected API adapters</div>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-slate-900/80 border border-white/10 rounded-xl mb-6 sm:mb-8 w-full sm:w-fit overflow-x-auto no-scrollbar backdrop-blur-md">
          <button
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              tab === "home"
                ? "bg-slate-800 border border-white/15 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
            onClick={() => setTab("home")}
          >
            <Briefcase size={15} className={tab === "home" ? "text-emerald-400" : ""} />
            <span>Job Inventory</span>
            <span className="font-mono text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
              {pagination.total}
            </span>
          </button>
          <button
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              tab === "overview"
                ? "bg-slate-800 border border-white/15 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
            onClick={() => setTab("overview")}
          >
            <Pulse size={15} className={tab === "overview" ? "text-emerald-400" : ""} />
            <span>Pipeline Runs</span>
            <span className="font-mono text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
              {runPagination.total}
            </span>
          </button>
          <button
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              tab === "sources"
                ? "bg-slate-800 border border-white/15 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
            onClick={() => setTab("sources")}
          >
            <Globe size={15} className={tab === "sources" ? "text-emerald-400" : ""} />
            <span>Source Registry</span>
            <span className="font-mono text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
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
