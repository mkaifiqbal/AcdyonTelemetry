import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { api } from './routes/api.js';

export const app = express();
app.use(cors({ origin(origin, callback) {
  const isLocalDevelopment = origin && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  if (!origin || isLocalDevelopment || config.clientOrigins.includes('*') || config.clientOrigins.includes(origin)) return callback(null, true);
  return callback(new Error(`Origin not allowed by CORS: ${origin}`));
} }));
app.use(express.json()); app.use('/api', api);
app.use((error, req, res, next) => { console.error(error); res.status(500).json({ error: error.message || 'Internal server error' }); });
