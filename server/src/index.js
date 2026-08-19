import mongoose from 'mongoose';
import cron from 'node-cron';
import { app } from './app.js';
import { config } from './config.js';
import { Job } from './models/Job.js';
import { ingestAll } from './services/ingestion/index.js';

await mongoose.connect(config.mongoUri);

try {
  // Initialize Mongoose schema indexes safely
  await Job.init();

  const collections = await mongoose.connection.db.listCollections({ name: 'jobs' }).toArray();
  if (collections.length > 0) {
    const jobIndexes = await mongoose.connection.collection('jobs').indexes().catch(() => []);
    if (jobIndexes.some((index) => index.name === 'rawHash_1' && index.unique)) {
      await mongoose.connection.collection('jobs').dropIndex('rawHash_1').catch(() => {});
    }
    await mongoose.connection.collection('jobs').createIndex(
      { source: 1, rawHash: 1 },
      { unique: true, name: 'source_1_rawHash_1' }
    ).catch(() => {});

    // Normalize any legacy numeric source entries to RemoteOK
    await Job.updateMany(
      { $or: [{ source: { $not: { $type: 'string' } } }, { source: { $regex: /^\d+$/ } }] },
      { $set: { source: 'RemoteOK' } }
    ).catch(() => {});
  }
} catch (err) {
  console.warn('Database initialization note:', err.message);
}

app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));
cron.schedule(config.cronSchedule, () => ingestAll('scheduled').catch((error) => console.error('Scheduled ingestion failed', error)), { timezone: 'UTC' });
