import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema({
  attemptNumber: Number, method: { type: String, enum: ['primary', 'fallback', 'api'] }, source: String, delayMs: Number,
  responseTimeMs: Number, outcome: { type: String, enum: ['success', 'failed'] }, errorType: String,
  errorMessage: String, timestamp: { type: Date, default: Date.now },
}, { _id: false });

const runSchema = new mongoose.Schema({
  startedAt: { type: Date, default: Date.now }, finishedAt: Date,
  status: { type: String, enum: ['running', 'success', 'degraded', 'failed'], default: 'running', index: true },
  methodUsed: { type: String, enum: ['primary', 'fallback', 'api', 'none'], default: 'none' },
  trigger: { type: String, enum: ['manual', 'scheduled'], default: 'manual' }, attempts: [attemptSchema],
  requestedSource: { type: String, default: 'remoteok' }, successfulSource: String,
  jobsFound: { type: Number, default: 0 }, jobsNew: { type: Number, default: 0 }, errorSummary: String,
}, { timestamps: true });

export const IngestionRun = mongoose.model('IngestionRun', runSchema);
