import { primaryFetch } from '../primaryFetcher.js';
export const remoteok = { id: 'remoteok', configured: () => true, async fetchJobs() { const started = Date.now(); const jobs = await primaryFetch(); return { jobs, source: 'RemoteOK', responseTimeMs: Date.now() - started, status: 'live' }; } };
