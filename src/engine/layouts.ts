export type LayoutId =
  | '1x1'
  | '1x2'
  | '2x1'
  | '2x2'
  | '3x2'
  | '3-down'
  | '4-down'
  | '2x3'
  | '3x3'
  | '4x2';
export type StripTheme =
  | 'black'
  | 'pink'
  | 'bone'
  | 'tiktok'
  | 'heart'
  | 'halloween'
  | 'christmas';

export interface BoothLayout {
  id: LayoutId;
  name: string;
  subtitle: string;
  cols: number;
  rows: number;
  shotCount: number;
  canvasWidth: number;
  canvasHeight: number;
  padding: number;
  gap: number;
  footerHeight: number;
}

export const BOOTH_LAYOUTS: readonly BoothLayout[] = [
  {
    id: '2x2',
    name: '2 × 2 Pop',
    subtitle: '4 shots · Bestie Grid',
    cols: 2,
    rows: 2,
    shotCount: 4,
    canvasWidth: 1200,
    canvasHeight: 1380,
    padding: 52,
    gap: 28,
    footerHeight: 130
  },
  {
    id: '4-down',
    name: '4-Down Idol',
    subtitle: '4 shots · K-Booth',
    cols: 1,
    rows: 4,
    shotCount: 4,
    canvasWidth: 720,
    canvasHeight: 2120,
    padding: 46,
    gap: 24,
    footerHeight: 140
  },
  {
    id: '3-down',
    name: '3-Down Classic',
    subtitle: '3 shots · Booth Strip',
    cols: 1,
    rows: 3,
    shotCount: 3,
    canvasWidth: 720,
    canvasHeight: 1680,
    padding: 48,
    gap: 28,
    footerHeight: 140
  },
  {
    id: '1x2',
    name: '2-Down Duo',
    subtitle: '2 shots · Tall Strip',
    cols: 1,
    rows: 2,
    shotCount: 2,
    canvasWidth: 820,
    canvasHeight: 1480,
    padding: 50,
    gap: 28,
    footerHeight: 140
  },
  {
    id: '2x1',
    name: '2-Up Polaroid',
    subtitle: '2 shots · Side by Side',
    cols: 2,
    rows: 1,
    shotCount: 2,
    canvasWidth: 1440,
    canvasHeight: 960,
    padding: 48,
    gap: 28,
    footerHeight: 130
  },
  {
    id: '3x2',
    name: '3 × 2 Party',
    subtitle: '6 shots · Squad Wide',
    cols: 3,
    rows: 2,
    shotCount: 6,
    canvasWidth: 1620,
    canvasHeight: 1220,
    padding: 48,
    gap: 24,
    footerHeight: 120
  },
  {
    id: '2x3',
    name: '2 × 3 Cinema',
    subtitle: '6 shots · Double Strip',
    cols: 2,
    rows: 3,
    shotCount: 6,
    canvasWidth: 1120,
    canvasHeight: 1760,
    padding: 48,
    gap: 24,
    footerHeight: 130
  },
  {
    id: '4x2',
    name: '4 × 2 Booth',
    subtitle: '8 shots · Double 4-Cut',
    cols: 2,
    rows: 4,
    shotCount: 8,
    canvasWidth: 1120,
    canvasHeight: 2080,
    padding: 44,
    gap: 22,
    footerHeight: 130
  },
  {
    id: '3x3',
    name: '3 × 3 Mega',
    subtitle: '9 shots · Arcade Grid',
    cols: 3,
    rows: 3,
    shotCount: 9,
    canvasWidth: 1500,
    canvasHeight: 1680,
    padding: 46,
    gap: 22,
    footerHeight: 130
  },
  {
    id: '1x1',
    name: '1 × 1 Poster',
    subtitle: '1 shot · Cover Star',
    cols: 1,
    rows: 1,
    shotCount: 1,
    canvasWidth: 1080,
    canvasHeight: 1350,
    padding: 56,
    gap: 0,
    footerHeight: 150
  }
];

export interface SlotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getLayoutById(id: LayoutId): BoothLayout {
  return BOOTH_LAYOUTS.find((l) => l.id === id) ?? BOOTH_LAYOUTS[0];
}

export function computeLayoutSlots(layout: BoothLayout): SlotRect[] {
  const innerW = layout.canvasWidth - layout.padding * 2 - layout.gap * (layout.cols - 1);
  const innerH =
    layout.canvasHeight -
    layout.padding * 2 -
    layout.footerHeight -
    layout.gap * (layout.rows - 1);

  const slotW = innerW / layout.cols;
  const slotH = innerH / layout.rows;
  const slots: SlotRect[] = [];

  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      slots.push({
        x: layout.padding + c * (slotW + layout.gap),
        y: layout.padding + r * (slotH + layout.gap),
        width: slotW,
        height: slotH
      });
    }
  }

  return slots;
}

export const STRIP_THEMES: Record<
  StripTheme,
  { label: string; bg: string; text: string; accent: string; border: string; secondary?: string }
> = {
  black: {
    label: 'Obsidian',
    bg: '#0A0A0D',
    text: '#F5F0E6',
    accent: '#FF2D8B',
    border: '#25252D'
  },
  pink: {
    label: 'True Pink',
    bg: '#FF2D8B',
    text: '#F5F0E6',
    accent: '#0A0A0D',
    border: '#FF6BB0'
  },
  bone: {
    label: 'White Bone',
    bg: '#F5F0E6',
    text: '#0A0A0D',
    accent: '#FF2D8B',
    border: '#DDD6C7'
  },
  tiktok: {
    label: 'TikTok',
    bg: '#09090C',
    text: '#F5F0E6',
    accent: '#FE2C55',
    border: '#25F4EE',
    secondary: '#25F4EE'
  },
  heart: {
    label: 'Hearts',
    bg: '#230916',
    text: '#F5F0E6',
    accent: '#FF2D8B',
    border: '#FF6BB0',
    secondary: '#FFB3D9'
  },
  halloween: {
    label: 'Spooky',
    bg: '#130B1A',
    text: '#F5F0E6',
    accent: '#FF6B1A',
    border: '#FF6B1A',
    secondary: '#A855F7'
  },
  christmas: {
    label: 'Holiday',
    bg: '#0B2418',
    text: '#F5F0E6',
    accent: '#E11D48',
    border: '#F5F0E6',
    secondary: '#FACC15'
  }
};
