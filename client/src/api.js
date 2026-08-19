const rawBase = (import.meta.env.VITE_API_URL || 'https://acdyontelemetry.onrender.com/api').trim();
const cleanBase = rawBase.replace(/\/+$/, '');
const base = import.meta.env.DEV
  ? '/api'
  : (cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`);

async function request(path, options) {
  const response = await fetch(`${base}${path}`, options);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${response.status})`);
  }
  return response.json();
}

export const api = {
  jobs: (q = '', source = 'all', page = 1) =>
    request(`/jobs?limit=20&page=${page}&q=${encodeURIComponent(q)}&source=${encodeURIComponent(source)}`),
  runs: (page = 1) =>
    request(`/runs?limit=20&page=${page}`),
  health: () =>
    request('/health'),
  sources: () =>
    request('/sources'),
  checkSources: () =>
    request('/sources/check', { method: 'POST' }),
  ingest: (source = 'all') =>
    request('/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    }),
};
