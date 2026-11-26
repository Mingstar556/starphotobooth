import { z } from 'zod';

export const LayoutIdSchema = z.enum([
  '1x1',
  '2x2',
  '3x2',
  '3-down',
  '4-down',
  '2x3'
]);

export const StripThemeSchema = z.enum(['black', 'pink', 'bone']);

export const PreferencesSchema = z.object({
  layoutId: LayoutIdSchema.default('2x2'),
  stripTheme: StripThemeSchema.default('black'),
  countdownSeconds: z.union([z.literal(3), z.literal(5)]).default(3),
  mirrorSelfie: z.boolean().default(true)
});

export const ConsentSchema = z.object({
  accepted: z.boolean(),
  cameraPrompted: z.boolean().optional()
});

export type UserPreferences = z.infer<typeof PreferencesSchema>;
export type ConsentPayload = z.infer<typeof ConsentSchema>;

const DEFAULT_PREFS: UserPreferences = {
  layoutId: '2x2',
  stripTheme: 'black',
  countdownSeconds: 3,
  mirrorSelfie: true
};

export function parsePreferencesCookie(raw: string | undefined): UserPreferences {
  if (!raw) return DEFAULT_PREFS;
  try {
    const parsed = JSON.parse(raw);
    const result = PreferencesSchema.safeParse(parsed);
    return result.success ? result.data : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function buildPreferencesPayload(input: unknown): UserPreferences {
  return PreferencesSchema.parse(input);
}

export function buildConsentPayload(input: unknown): ConsentPayload {
  return ConsentSchema.parse(input);
}
