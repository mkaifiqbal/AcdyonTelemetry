import { Router } from "express";
import mongoose from "mongoose";
import { Job } from "../models/Job.js";
import { IngestionRun } from "../models/IngestionRun.js";
import { ingest, ingestAll } from "../services/ingestion/index.js";
import { breakerStatus } from "../services/ingestion/circuitBreaker.js";
import { sources } from "../sources.js";
import { adapters } from "../services/ingestion/adapters/index.js";

export const api = Router();
api.get("/sources", async (req, res, next) => {
  try {
    const runs = await IngestionRun.find({ finishedAt: { $ne: null } })
      .sort({ startedAt: -1 })
      .limit(200)
      .lean();
    const enriched = sources.map((source) => {
      const adapter = adapters[source.id];
      const attempts = runs
        .flatMap((run) => run.attempts || [])
        .filter((a) => a.source === source.id);
      const successful = attempts.filter((a) => a.outcome === "success");
      const latestSuccess = successful[0];
      const rateLimited = attempts[0]?.errorType === "RATE_LIMIT";
      return {
        ...source,
        configured: adapter?.configured() || false,
        status: !adapter?.configured()
          ? "not_configured"
          : rateLimited
            ? "rate_limited"
            : attempts[0]?.outcome === "failed"
              ? "degraded"
              : "live",
        lastSuccessfulFetch: latestSuccess?.timestamp || null,
        avgResponseTimeMs: attempts.length
          ? Math.round(
              attempts.reduce((sum, a) => sum + (a.responseTimeMs || 0), 0) /
                attempts.length,
            )
          : null,
        successCount: successful.length,
        attemptCount: attempts.length,
        successRate: attempts.length
          ? Math.round((successful.length / attempts.length) * 100)
          : null,
      };
    });
    res.json(enriched);
  } catch (e) {
    next(e);
  }
});
api.post("/sources/check", async (req, res) => {
  const results = [];
  for (const source of sources) {
    const adapter = adapters[source.id];
    if (!adapter?.configured()) {
      results.push({ id: source.id, status: "not_configured" });
      continue;
    }
    const started = Date.now();
    try {
      await adapter.fetchJobs();
      results.push({
        id: source.id,
        status: "live",
        responseTimeMs: Date.now() - started,
      });
    } catch (error) {
      results.push({
        id: source.id,
        status: error.type === "RATE_LIMIT" ? "rate_limited" : "degraded",
        responseTimeMs: Date.now() - started,
        error: error.message,
      });
    }
  }
  res.json(results);
});
api.get("/jobs", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 20));
    const q = String(req.query.q || "").trim();
    const source = String(req.query.source || "all");
    const clauses = [];
    if (q)
      clauses.push({
        $or: ["title", "company", "location", "tags"].map((field) => ({
          [field]: { $regex: q, $options: "i" },
        })),
      });
    if (source !== "all")
      clauses.push({ source: { $regex: `^${source}$`, $options: "i" } });
    const filter = clauses.length ? { $and: clauses } : {};
    const [items, total] = await Promise.all([
      Job.find(filter)
        .sort({ scrapedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Job.countDocuments(filter),
    ]);
    const sanitized = items.map((j) => ({
      ...j,
      source: !j.source || /^\d+$/.test(String(j.source)) ? 'RemoteOK' : j.source,
    }));
    res.json({ items: sanitized, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    next(e);
  }
});
api.post("/ingest", async (req, res, next) => {
  try {
    const requested = String(req.body?.source || "all");
    const result =
      requested === "all"
        ? await ingestAll("manual")
        : await ingest("manual", requested);
    return res.status(202).json(result);
  } catch (e) {
    return next(e);
  }
});
api.get("/runs", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 20));
    const [items, total] = await Promise.all([
      IngestionRun.find()
        .sort({ startedAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      IngestionRun.countDocuments(),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    next(e);
  }
});
api.get("/runs/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ error: "Invalid run id" });
    const run = await IngestionRun.findById(req.params.id).lean();
    return run
      ? res.json(run)
      : res.status(404).json({ error: "Run not found" });
  } catch (e) {
    return next(e);
  }
});
api.get("/health", (req, res) =>
  res.json({
    service: "ok",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    circuitBreaker: breakerStatus(),
    timestamp: new Date(),
  }),
);
