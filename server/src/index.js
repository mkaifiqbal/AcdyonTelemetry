import mongoose from 'mongoose';
import cron from 'node-cron';
import { app } from './app.js';
import { config } from './config.js';
import { ingestAll } from './services/ingestion/index.js';

await mongoose.connect(config.mongoUri);
// Migrate the original global dedupe index to a source-scoped identity. This
// preserves cross-provider listings while preventing repeats within a provider.
const jobIndexes = await mongoose.connection.collection('jobs').indexes();
if (jobIndexes.some((index) => index.name === 'rawHash_1' && index.unique)) {
  await mongoose.connection.collection('jobs').dropIndex('rawHash_1');
}
await mongoose.connection.collection('jobs').createIndex({ source: 1, rawHash: 1 }, { unique: true, name: 'source_1_rawHash_1' });
// Fix any existing documents where source was stored as a numeric index
await mongoose.connection.collection('jobs').updateMany(
  { $or: [{ source: { $not: { $type: 'string' } } }, { source: { $regex: /^\d+$/ } }] },
  { $set: { source: 'RemoteOK' } }
);
app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));
cron.schedule(config.cronSchedule, () => ingestAll('scheduled').catch((error) => console.error('Scheduled ingestion failed', error)), { timezone: 'UTC' });
