import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import {
  getSessionPreferences,
  recordCookieConsent,
  updateSessionPreferences
} from './controllers/session.controller.js';
import { errorMiddleware } from './middleware/error.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'wasm-unsafe-eval'",
          'https://cdn.jsdelivr.net'
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'blob:'],
        connectSrc: [
          "'self'",
          'https://cdn.jsdelivr.net',
          'https://storage.googleapis.com'
        ],
        workerSrc: ["'self'", 'blob:']
      }
    }
  })
);

app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true, app: 'StarPhotobooth' });
});

app.get('/api/session/preferences', getSessionPreferences);
app.post('/api/session/preferences', updateSessionPreferences);
app.post('/api/session/consent', recordCookieConsent);

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`StarPhotobooth server running on http://localhost:${PORT}`);
});
