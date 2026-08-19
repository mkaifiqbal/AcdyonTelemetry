import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/acdyon',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((v) => v.trim()),
  cronSchedule: process.env.CRON_SCHEDULE || '*/15 * * * *',
  sourceUrl: process.env.REMOTEOK_URL || 'https://remoteok.com/api',
  playwrightEnabled: process.env.PLAYWRIGHT_ENABLED !== 'false',
};
