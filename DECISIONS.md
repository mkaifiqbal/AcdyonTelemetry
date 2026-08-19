# Decisions

## Why this ingestion strategy?
The hybrid fetcher keeps the common path fast and cheap with Axios plus Cheerio, while retaining Playwright as a targeted fallback after two primary failures or malformed/empty data. A Playwright-only design was rejected because every run would pay its memory, startup, and rendering cost. An Axios-only design was rejected because it cannot recover if a source begins requiring client-side rendering. The fallback is resilience for a permitted public source, not an attempt to bypass authentication or access controls.

## Time-limit trade-off
No IP/proxy rotation is implemented. Requests use conservative pacing, jitter, and consistent browser-like headers. With a week, I would add persistent source-specific sessions, distributed locking for multiple API instances, durable circuit-breaker state, metrics/alerts, contract fixtures for markup changes, and a compliant managed egress pool only where source terms permit it.

## AI use and ownership
AI tools helped scaffold the project, enumerate failure modes, and draft the dashboard styling and documentation. I personally verified the module boundaries, RemoteOK normalization, retry/fallback threshold, error taxonomy, MongoDB upsert key, API validation, CORS configuration, responsive layout, tests, and deployment manifests. Every generated dependency and behavior remains subject to manual review before production deployment.
