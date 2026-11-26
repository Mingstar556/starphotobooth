import type { LayoutId, StripTheme } from '../engine/layouts';

export interface SessionPreferences {
  layoutId: LayoutId;
  stripTheme: StripTheme;
  countdownSeconds: 0 | 3 | 5;
  mirrorSelfie: boolean;
}

export interface SessionState {
  preferences: SessionPreferences;
  consentAccepted: boolean;
}

const DEFAULT_STATE: SessionState = {
  preferences: {
    layoutId: '2x2',
    stripTheme: 'black',
    countdownSeconds: 3,
    mirrorSelfie: true
  },
  consentAccepted: false
};

export async function fetchSessionState(): Promise<SessionState> {
  try {
    const res = await fetch('/api/session/preferences', {
      credentials: 'same-origin'
    });
    if (!res.ok) return DEFAULT_STATE;
    return (await res.json()) as SessionState;
  } catch {
    return DEFAULT_STATE;
  }
}

export async function savePreferences(prefs: SessionPreferences): Promise<void> {
  try {
    await fetch('/api/session/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(prefs)
    });
  } catch {
    // Offline PWA mode: ignore network error silently
  }
}

export async function saveCookieConsent(accepted: boolean): Promise<void> {
  try {
    await fetch('/api/session/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ accepted, cameraPrompted: true })
    });
  } catch {
    // Offline PWA mode
  }
}
