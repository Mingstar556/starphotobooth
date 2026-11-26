export type LayoutId = '1x1' | '2x2' | '3x2' | '3-down' | '4-down' | '2x3';
export type StripTheme = 'black' | 'pink' | 'bone';

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
    name: '2 × 2 Grid',
    subtitle: '4 shots · Square',
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
    id: '3-down',
    name: '3-Down Strip',
    subtitle: '3 shots · Classic',
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
    id: '4-down',
    name: '4-Down Strip',
    subtitle: '4 shots · Studio',
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
    id: '3x2',
    name: '3 × 2 Wide',
    subtitle: '6 shots · Panorama',
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
    name: '2 × 3 Strip',
    subtitle: '6 shots · Double',
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
    id: '1x1',
    name: '1 × 1 Solo',
    subtitle: '1 shot · Portrait',
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
  { label: string; bg: string; text: string; accent: string; border: string }
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
  }
};
