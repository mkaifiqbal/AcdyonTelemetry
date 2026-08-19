import axios from 'axios';
import { IngestionError } from '../errors.js';
export const configured = (...values) => values.every(Boolean);
export async function timed(source, request, map) { const started = Date.now(); try { const response = await request(); const jobs = map(response.data); if (!jobs.length) throw new IngestionError(`${source} returned no valid jobs`, 'EMPTY_RESPONSE'); return { jobs, source, responseTimeMs: Date.now() - started, status: 'live' }; } catch (error) { if (error instanceof IngestionError) throw error; throw new IngestionError(error.message, error.response?.status === 429 ? 'RATE_LIMIT' : 'NETWORK'); } }
export { axios };
