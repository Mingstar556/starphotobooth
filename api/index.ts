import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import {
  getSessionPreferences,
  recordCookieConsent,
  updateSessionPreferences
} from '../server/controllers/session.controller.js';
import { errorMiddleware } from '../server/middleware/error.middleware.js';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true, app: 'StarPhotobooth' });
});
app.get('/api/session/preferences', getSessionPreferences);
app.post('/api/session/preferences', updateSessionPreferences);
app.post('/api/session/consent', recordCookieConsent);
app.use(errorMiddleware);

export default app;
