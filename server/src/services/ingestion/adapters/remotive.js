import { axios, timed } from './base.js'; import { normalizeJob } from '../normalize.js';
// Remotive attribution is retained in the source field and must remain visible per their API terms.
export const remotive = { id: 'remotive', configured: () => true, fetchJobs: () => timed('Remotive', () => axios.get('https://remotive.com/api/remote-jobs', { timeout: 15000 }), (body) => (body.jobs || []).map((j) => normalizeJob({ id:j.id,title:j.title,company:j.company_name,location:j.candidate_required_location,tags:[j.category,j.job_type],url:j.url }, 'Remotive'))) };
