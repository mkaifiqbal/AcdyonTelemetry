import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { api } from './routes/api.js';

export const app = express();

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      const isVercel = /^https:\/\/.*\.vercel\.app$/.test(origin);
      const isConfigured =
        config.clientOrigins.includes('*') ||
        config.clientOrigins.includes(origin) ||
        config.clientOrigins.some((allowed) => allowed && origin.startsWith(allowed));

      if (isLocal || isVercel || isConfigured) {
        return callback(null, true);
      }

      // Permissive fallback so any web client can query the public API
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use('/api', api);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: error.message || 'Internal server error' });
});
