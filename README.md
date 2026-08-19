# Acdyon RemoteOK Ingestion Monitor

A Vite React dashboard and Express ingestion service demonstrating observable retries, browser fallback, circuit breaking, deduplication, and scheduled ingestion against RemoteOK's public source.

## Local setup

1. Run MongoDB locally or create an Atlas database.
2. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI`.
3. Copy `client/.env.example` to `client/.env`.
4. Run `npm install`, then `npm run install:all`.
5. Install Chromium with `npx playwright install chromium --prefix server`.
6. Run `npm run dev` and open `http://localhost:5173`.

The API runs at `http://localhost:4000`. Trigger ingestion with the dashboard or `POST /api/ingest`.

## Deployment

Create an Atlas cluster and allow the Render service to connect. Deploy the root `render.yaml` blueprint, setting `MONGODB_URI` and `CLIENT_ORIGIN` to the final Vercel origin. Deploy the repository to Vercel and set `VITE_API_URL` to `https://<render-service>/api`. The included `vercel.json` builds the Vite client. Verify `/api/health`, trigger one manual run, then inspect its attempt timeline.

See [DECISIONS.md](DECISIONS.md) and [DESIGN.md](DESIGN.md) for the assessment rationale and ethical scope.
