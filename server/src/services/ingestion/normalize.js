import crypto from 'node:crypto';

const text = (value, fallback = '') => String(value ?? fallback).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
export function normalizeJob(raw, source = 'RemoteOK') {
  const sourceName = typeof source === 'string' && source.trim() ? source.trim() : 'RemoteOK';
  const title = text(raw.position || raw.title);
  const company = text(raw.company, 'Unknown company');
  const url = raw.url || (raw.slug ? `https://remoteok.com/remote-jobs/${raw.slug}` : '');
  const rawHash = crypto.createHash('sha256').update(`${raw.id || ''}|${title}|${company}|${url}`).digest('hex');
  return { title, company, location: text(raw.location, 'Remote'), tags: Array.isArray(raw.tags) ? raw.tags.map((v) => text(v)).filter(Boolean) : [], url, source: sourceName, scrapedAt: new Date(), rawHash, sourceRaw: raw };
}
