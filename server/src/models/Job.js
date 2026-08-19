import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true }, company: { type: String, required: true, index: true },
  location: { type: String, default: 'Remote' }, tags: [String], url: { type: String, required: true },
  source: { type: String, default: 'RemoteOK', index: true }, scrapedAt: { type: Date, default: Date.now },
  rawHash: { type: String, required: true },
  sourceRaw: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

jobSchema.index({ source: 1, rawHash: 1 }, { unique: true });

export const Job = mongoose.model('Job', jobSchema);
