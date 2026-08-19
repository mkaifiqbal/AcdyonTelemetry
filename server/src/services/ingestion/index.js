import { Job } from "../../models/Job.js";
import { IngestionRun } from "../../models/IngestionRun.js";
import { adapters, fallbackOrder } from "./adapters/index.js";
import { canRequest, recordFailure, recordSuccess } from "./circuitBreaker.js";
import { addAttempt, finishRun } from "./runLogger.js";
import { retryDelay, sleep } from "./retryPolicy.js";

let activeRun = null;
export async function ingest(trigger = "manual", requestedSource = "remoteok") {
  if (activeRun) return activeRun;
  activeRun = execute(trigger, requestedSource).finally(() => {
    activeRun = null;
  });
  return activeRun;
}
export async function ingestAll(trigger = "manual") {
  const runs = [];
  for (const sourceId of fallbackOrder)
    runs.push(await ingest(trigger, sourceId));
  return runs;
}
async function execute(trigger, requestedSource) {
  const run = await IngestionRun.create({ trigger, requestedSource });
  if (!canRequest())
    return finishRun(run, {
      status: "degraded",
      errorSummary: "Circuit breaker is open",
    });
  const order = [
    requestedSource,
    ...fallbackOrder.filter((id) => id !== requestedSource),
  ];
  let result;
  let lastError;
  for (const sourceId of order) {
    const adapter = adapters[sourceId];
    if (!adapter || !adapter.configured()) {
      await addAttempt(run, {
        attemptNumber: run.attempts.length + 1,
        method: "api",
        source: sourceId,
        delayMs: 0,
        responseTimeMs: 0,
        outcome: "failed",
        errorType: "NOT_CONFIGURED",
        errorMessage: `${sourceId} credentials are not configured`,
      });
      continue;
    }
    for (let retry = 1; retry <= 2; retry += 1) {
      const delayMs = retry === 1 ? 0 : retryDelay(retry);
      if (delayMs) await sleep(delayMs);
      const started = Date.now();
      try {
        result = await adapter.fetchJobs();
        await addAttempt(run, {
          attemptNumber: run.attempts.length + 1,
          method: "api",
          source: sourceId,
          delayMs,
          responseTimeMs: result.responseTimeMs || Date.now() - started,
          outcome: "success",
        });
        break;
      } catch (error) {
        lastError = error;
        await addAttempt(run, {
          attemptNumber: run.attempts.length + 1,
          method: "api",
          source: sourceId,
          delayMs,
          responseTimeMs: Date.now() - started,
          outcome: "failed",
          errorType: error.type || "UNKNOWN",
          errorMessage: error.message,
        });
      }
    }
    if (result?.jobs?.length) break;
  }
  const jobs = result?.jobs || [];
  if (!jobs.length) {
    recordFailure();
    return finishRun(run, {
      status: "degraded",
      methodUsed: "none",
      errorSummary: `${lastError?.type || "NO_SOURCE"}: ${lastError?.message || "No configured source returned jobs"}`,
    });
  }
  const operations = jobs.map((job) => {
    const { scrapedAt, ...insertFields } = job;
    return {
      updateOne: {
          filter: { source: job.source, rawHash: job.rawHash },
        update: {
          $set: { ...insertFields, scrapedAt: scrapedAt || new Date() },
        },
        upsert: true,
      },
    };
  });
  const resultWrite = await Job.bulkWrite(operations, { ordered: false });
  recordSuccess();
  return finishRun(run, {
    status: "success",
    methodUsed: "api",
    successfulSource: result.source,
    jobsFound: jobs.length,
    jobsNew: resultWrite.upsertedCount || 0,
  });
}
