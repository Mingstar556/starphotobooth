import {
  computeLayoutSlots,
  STRIP_THEMES,
  type BoothLayout,
  type StripTheme
} from './layouts';

export interface CompositedPhoto {
  blob: Blob;
  dataUrl: string;
  filename: string;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
): void {
  const srcRatio = img.width / img.height;
  const dstRatio = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (srcRatio > dstRatio) {
    sw = img.height * dstRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / dstRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

export type TextFontId = 'display' | 'sans' | 'serif' | 'mono' | 'handwriting';

export interface TextOverlay {
  id: string;
  text: string;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  fontSize: number; // base px (scaled to 720px width)
  fontFamily: TextFontId;
  color: string;
}

const FONT_FAMILY_MAP: Record<TextFontId, string> = {
  display: '"Syne", sans-serif',
  sans: '"Plus Jakarta Sans", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  handwriting: '"Caveat", "Brush Script MT", cursive'
};

function decorateThemeBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  themeId: StripTheme
): void {
  ctx.save();

  if (themeId === 'black') {
    // Film strip edge sprockets + viewfinder corner brackets
    ctx.fillStyle = 'rgba(245, 240, 230, 0.12)';
    for (let y = 32; y < h - 32; y += 44) {
      ctx.fillRect(14, y, 10, 22);
      ctx.fillRect(w - 24, y, 10, 22);
    }
    ctx.strokeStyle = 'rgba(255, 45, 139, 0.55)';
    ctx.lineWidth = 4;
    const b = 36;
    // Top-left & top-right brackets
    ctx.beginPath();
    ctx.moveTo(28, 28 + b); ctx.lineTo(28, 28); ctx.lineTo(28 + b, 28);
    ctx.moveTo(w - 28 - b, 28); ctx.lineTo(w - 28, 28); ctx.lineTo(w - 28, 28 + b);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 45, 139, 0.75)';
    ctx.font = '700 16px "JetBrains Mono", monospace';
    ctx.fillText('REC ●', 40, 48);
    ctx.restore();
    return;
  }

  if (themeId === 'pink') {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#FF2D8B');
    grad.addColorStop(0.5, '#FF479B');
    grad.addColorStop(1, '#E01A75');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(245, 240, 230, 0.45)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(245, 240, 230, 0.25)';
    ctx.font = '26px sans-serif';
    const marks = ['✦', '♡', '✧', '✿'];
    let idx = 0;
    for (let y = 44; y < h; y += 116) {
      for (let x = 34; x < w; x += 116) {
        ctx.fillText(marks[idx % marks.length], x, y);
        idx++;
      }
    }
    ctx.restore();
    return;
  }

  if (themeId === 'bone') {
    // Warm editorial gallery frame with corner registration marks
    ctx.strokeStyle = 'rgba(10, 10, 13, 0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 22, w - 44, h - 44);
    ctx.fillStyle = 'rgba(10, 10, 13, 0.05)';
    for (let y = 30; y < h; y += 48) {
      for (let x = 30; x < w; x += 48) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
    ctx.fillStyle = 'rgba(10, 10, 13, 0.35)';
    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('STUDIO EDITION · 35MM', 36, 42);
    ctx.restore();
    return;
  }

  if (themeId === 'tiktok') {
    // Dual cyan & magenta chromatic offset frame + floating music notes
    ctx.strokeStyle = '#25F4EE';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 26, h - 26);
    ctx.strokeStyle = '#FE2C55';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, w - 26, h - 26);

    ctx.fillStyle = 'rgba(37, 244, 238, 0.22)';
    ctx.font = '28px sans-serif';
    const notes = ['♪', '♫', '✦'];
    let idx = 0;
    for (let y = 52; y < h; y += 120) {
      for (let x = 32; x < w; x += 124) {
        ctx.fillStyle = idx % 2 === 0 ? 'rgba(37, 244, 238, 0.2)' : 'rgba(254, 44, 85, 0.2)';
        ctx.fillText(notes[idx % notes.length], x, y);
        idx++;
      }
    }
    ctx.restore();
    return;
  }

  if (themeId === 'heart') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2D0A1D');
    grad.addColorStop(1, '#1A0510');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 107, 176, 0.45)';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.font = '30px sans-serif';
    const icons = ['💗', '💖', '💕', '✨'];
    let idx = 0;
    for (let y = 38; y < h; y += 92) {
      for (let x = 28; x < w; x += 92) {
        ctx.fillStyle = 'rgba(255, 179, 217, 0.22)';
        ctx.fillText(icons[idx % icons.length], x, y);
        idx++;
      }
    }
    ctx.restore();
    return;
  }

  if (themeId === 'halloween') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1A0E26');
    grad.addColorStop(1, '#0D0614');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 107, 26, 0.5)';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 10]);
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.setLineDash([]);

    ctx.font = '30px sans-serif';
    const icons = ['🎃', '🦇', '🕸️', '👻', '🕷️'];
    let idx = 0;
    for (let y = 42; y < h; y += 104) {
      for (let x = 26; x < w; x += 104) {
        ctx.fillStyle = 'rgba(255, 107, 26, 0.22)';
        ctx.fillText(icons[idx % icons.length], x, y);
        idx++;
      }
    }
    ctx.restore();
    return;
  }

  if (themeId === 'christmas') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0D2B1D');
    grad.addColorStop(1, '#071A11');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.strokeStyle = 'rgba(225, 29, 72, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(26, 26, w - 52, h - 52);

    ctx.font = '28px sans-serif';
    const icons = ['❄️', '🎄', '⭐', '🎁', '🔔'];
    let idx = 0;
    for (let y = 40; y < h; y += 102) {
      for (let x = 28; x < w; x += 102) {
        ctx.fillStyle = 'rgba(245, 240, 230, 0.22)';
        ctx.fillText(icons[idx % icons.length], x, y);
        idx++;
      }
    }
  }

  ctx.restore();
}

export async function compositePhotoboothStrip(
  frames: HTMLCanvasElement[],
  layout: BoothLayout,
  themeId: StripTheme,
  customCaption?: string,
  overlays?: TextOverlay[]
): Promise<CompositedPhoto> {
  const canvas = document.createElement('canvas');
  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D canvas context');
  }

  const theme = STRIP_THEMES[themeId];
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  decorateThemeBackground(ctx, canvas.width, canvas.height, themeId);

  if (themeId !== 'tiktok') {
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  }

  const slots = computeLayoutSlots(layout);
  const cornerRadius = 18;

  slots.forEach((slot, idx) => {
    const frame = frames[idx] ?? frames[frames.length - 1];
    if (!frame) return;

    ctx.save();
    drawRoundedRectPath(ctx, slot.x, slot.y, slot.width, slot.height, cornerRadius);
    ctx.clip();
    drawImageCover(ctx, frame, slot.x, slot.y, slot.width, slot.height);
    ctx.restore();

    ctx.save();
    drawRoundedRectPath(ctx, slot.x, slot.y, slot.width, slot.height, cornerRadius);
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  });

  // Footer brand & timestamp
  const footerCenterY = canvas.height - layout.footerHeight / 2;
  ctx.fillStyle = theme.text;
  ctx.font = '700 30px "Syne", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const titleText = customCaption?.trim() ? customCaption.trim() : 'STARPHOTOBOOTH';
  ctx.fillText(titleText, layout.padding, footerCenterY - 12);

  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  ctx.fillStyle = theme.accent;
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`★ ${dateStr} · #STARBOOTH`, layout.padding, footerCenterY + 20);

  // Decorative mark on bottom right
  const badgeMap: Record<StripTheme, string> = {
    black: '✦',
    pink: '💗',
    bone: '✦',
    tiktok: '♪',
    heart: '💕',
    halloween: '🎃',
    christmas: '🎄'
  };
  ctx.textAlign = 'right';
  ctx.font = '700 30px "Syne", sans-serif';
  ctx.fillStyle = theme.secondary ?? theme.accent;
  ctx.fillText(badgeMap[themeId], canvas.width - layout.padding, footerCenterY);

  if (overlays && overlays.length > 0) {
    const scale = canvas.width / 720;
    for (const item of overlays) {
      if (!item.text.trim()) continue;
      ctx.save();
      const px = Math.round(item.fontSize * scale);
      ctx.font = `700 ${px}px ${FONT_FAMILY_MAP[item.fontFamily]}`;
      ctx.fillStyle = item.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = Math.max(4, px * 0.14);
      ctx.shadowOffsetY = Math.max(2, px * 0.05);
      ctx.fillText(item.text, item.x * canvas.width, item.y * canvas.height);
      ctx.restore();
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Failed to encode JPEG'));
      },
      'image/jpeg',
      0.92
    );
  });

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `starphotobooth-${layout.id}-${timestamp}.jpg`;

  return { blob, dataUrl, filename };
}
