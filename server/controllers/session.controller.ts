import type { Request, Response, NextFunction } from 'express';
import {
  buildConsentPayload,
  buildPreferencesPayload,
  parsePreferencesCookie
} from '../services/session.service.js';

const PREFS_COOKIE = 'starbooth_prefs';
const CONSENT_COOKIE = 'starbooth_consent';
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: ONE_YEAR_MS,
    path: '/'
  };
}

export function getSessionPreferences(req: Request, res: Response): void {
  const prefs = parsePreferencesCookie(req.cookies?.[PREFS_COOKIE]);
  const consentAccepted = req.cookies?.[CONSENT_COOKIE] === '1';

  res.status(200).json({
    preferences: prefs,
    consentAccepted
  });
}

export function updateSessionPreferences(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const prefs = buildPreferencesPayload(req.body);
    res.cookie(PREFS_COOKIE, JSON.stringify(prefs), cookieOptions());
    res.status(200).json({ preferences: prefs });
  } catch (err) {
    next(err);
  }
}

export function recordCookieConsent(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const consent = buildConsentPayload(req.body);
    res.cookie(CONSENT_COOKIE, consent.accepted ? '1' : '0', cookieOptions());
    res.status(200).json({ consentAccepted: consent.accepted });
  } catch (err) {
    next(err);
  }
}
