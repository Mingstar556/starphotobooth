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

function decorateThemeBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  themeId: StripTheme
): void {
  if (themeId === 'tiktok') {
    // Dual cyan & magenta chromatic offset frame
    ctx.strokeStyle = '#25F4EE';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 26, h - 26);
    ctx.strokeStyle = '#FE2C55';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, w - 26, h - 26);
    return;
  }

  if (themeId === 'heart') {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 45, 139, 0.16)';
    ctx.font = '32px sans-serif';
    for (let y = 36; y < h; y += 96) {
      for (let x = 28; x < w; x += 96) {
        ctx.fillText('💗', x, y);
      }
    }
    ctx.restore();
    return;
  }

  if (themeId === 'halloween') {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 107, 26, 0.18)';
    ctx.font = '30px sans-serif';
    const icons = ['🎃', '🦇', '🕸️'];
    let idx = 0;
    for (let y = 40; y < h; y += 110) {
      for (let x = 26; x < w; x += 110) {
        ctx.fillText(icons[idx % icons.length], x, y);
        idx++;
      }
    }
    ctx.restore();
    return;
  }

  if (themeId === 'christmas') {
    ctx.save();
    ctx.fillStyle = 'rgba(245, 240, 230, 0.18)';
    ctx.font = '28px sans-serif';
    const icons = ['❄️', '🎄', '⭐'];
    let idx = 0;
    for (let y = 38; y < h; y += 108) {
      for (let x = 28; x < w; x += 108) {
        ctx.fillText(icons[idx % icons.length], x, y);
        idx++;
      }
    }
    ctx.restore();
  }
}

export async function compositePhotoboothStrip(
  frames: HTMLCanvasElement[],
  layout: BoothLayout,
  themeId: StripTheme
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
  ctx.fillText('STARPHOTOBOOTH', layout.padding, footerCenterY - 12);

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
