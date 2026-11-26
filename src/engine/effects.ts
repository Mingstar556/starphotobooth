import {
  FaceLandmarker,
  FilesetResolver,
  type NormalizedLandmark
} from '@mediapipe/tasks-vision';

export type EffectId =
  | 'star'
  | 'cowboy'
  | 'glasses'
  | 'hearts'
  | 'crown'
  | 'bunny'
  | 'blush';

export interface BoothEffect {
  id: EffectId;
  label: string;
  emoji: string;
}

export const BOOTH_EFFECTS: readonly BoothEffect[] = [
  { id: 'star', label: 'Spin Star', emoji: '✦' },
  { id: 'cowboy', label: 'Cowboy', emoji: '🤠' },
  { id: 'glasses', label: 'Shades', emoji: '🕶️' },
  { id: 'hearts', label: 'Hearts', emoji: '💗' },
  { id: 'crown', label: 'Crown', emoji: '👑' },
  { id: 'bunny', label: 'Bunny', emoji: '🐰' },
  { id: 'blush', label: 'Blush', emoji: '✨' }
];

interface HeartParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  phase: number;
}

interface FaceAnchor {
  foreheadX: number;
  foreheadY: number;
  leftEyeX: number;
  leftEyeY: number;
  rightEyeX: number;
  rightEyeY: number;
  leftCheekX: number;
  leftCheekY: number;
  rightCheekX: number;
  rightCheekY: number;
  faceWidth: number;
  rollRad: number;
}

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export class EffectsEngine {
  private landmarker: FaceLandmarker | null = null;
  private loadingPromise: Promise<void> | null = null;
  private activeEffects = new Set<EffectId>();
  private hearts: HeartParticle[] = [];
  private lastVideoTime = -1;
  private lastAnchor: FaceAnchor | null = null;

  getActive(): EffectId[] {
    return Array.from(this.activeEffects);
  }

  has(id: EffectId): boolean {
    return this.activeEffects.has(id);
  }

  toggle(id: EffectId): boolean {
    if (this.activeEffects.has(id)) {
      this.activeEffects.delete(id);
      return false;
    }
    this.activeEffects.add(id);
    return true;
  }

  clearAll(): void {
    this.activeEffects.clear();
  }

  async initFaceTracking(): Promise<void> {
    if (this.landmarker) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
        this.landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1
        });
      } catch {
        // Fallback silently: particle & center-anchored effects still work without WASM
        this.landmarker = null;
      }
    })();

    return this.loadingPromise;
  }

  renderFrame(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    mirrored: boolean,
    nowMs: number
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (this.activeEffects.size === 0) return;

    if (
      this.landmarker &&
      video.readyState >= 2 &&
      video.currentTime !== this.lastVideoTime
    ) {
      this.lastVideoTime = video.currentTime;
      const result = this.landmarker.detectForVideo(video, nowMs);
      if (result.faceLandmarks.length > 0) {
        this.lastAnchor = this.extractAnchor(
          result.faceLandmarks[0],
          w,
          h,
          mirrored
        );
      } else {
        this.lastAnchor = null;
      }
    }

    const anchor = this.lastAnchor ?? this.fallbackAnchor(w, h);
    const t = nowMs * 0.001;

    if (this.activeEffects.has('blush')) {
      this.drawBlush(ctx, anchor, t);
    }
    if (this.activeEffects.has('glasses')) {
      this.drawGlasses(ctx, anchor);
    }
    if (this.activeEffects.has('bunny')) {
      this.drawBunnyEars(ctx, anchor, t);
    }
    if (this.activeEffects.has('crown')) {
      this.drawCrown(ctx, anchor);
    }
    if (this.activeEffects.has('cowboy')) {
      this.drawCowboyHat(ctx, anchor);
    }
    if (this.activeEffects.has('star')) {
      this.drawSpinningStar(ctx, anchor, t);
    }
    if (this.activeEffects.has('hearts')) {
      this.updateAndDrawHearts(ctx, anchor, w, h, t);
    }
  }

  private extractAnchor(
    lm: NormalizedLandmark[],
    w: number,
    h: number,
    mirrored: boolean
  ): FaceAnchor {
    const mapX = (nx: number) => (mirrored ? 1 - nx : nx) * w;
    const mapY = (ny: number) => ny * h;

    // Key MediaPipe FaceMesh indices
    const forehead = lm[10];
    const leftTemple = lm[234];
    const rightTemple = lm[454];
    const leftEye = lm[33];
    const rightEye = lm[263];
    const leftCheek = lm[116];
    const rightCheek = lm[345];

    const lx = mapX(leftEye.x);
    const ly = mapY(leftEye.y);
    const rx = mapX(rightEye.x);
    const ry = mapY(rightEye.y);

    const tx1 = mapX(leftTemple.x);
    const ty1 = mapY(leftTemple.y);
    const tx2 = mapX(rightTemple.x);
    const ty2 = mapY(rightTemple.y);

    const faceWidth = Math.hypot(tx2 - tx1, ty2 - ty1);
    const dx = rx - lx;
    const dy = ry - ly;
    const rollRad = Math.atan2(dy, dx);

    return {
      foreheadX: mapX(forehead.x),
      foreheadY: mapY(forehead.y),
      leftEyeX: lx,
      leftEyeY: ly,
      rightEyeX: rx,
      rightEyeY: ry,
      leftCheekX: mapX(leftCheek.x),
      leftCheekY: mapY(leftCheek.y),
      rightCheekX: mapX(rightCheek.x),
      rightCheekY: mapY(rightCheek.y),
      faceWidth: Math.max(faceWidth, w * 0.22),
      rollRad: mirrored ? rollRad + Math.PI : rollRad
    };
  }

  private fallbackAnchor(w: number, h: number): FaceAnchor {
    const cx = w * 0.5;
    const cy = h * 0.42;
    const fw = w * 0.34;
    return {
      foreheadX: cx,
      foreheadY: cy - fw * 0.42,
      leftEyeX: cx - fw * 0.22,
      leftEyeY: cy - fw * 0.08,
      rightEyeX: cx + fw * 0.22,
      rightEyeY: cy - fw * 0.08,
      leftCheekX: cx - fw * 0.28,
      leftCheekY: cy + fw * 0.12,
      rightCheekX: cx + fw * 0.28,
      rightCheekY: cy + fw * 0.12,
      faceWidth: fw,
      rollRad: 0
    };
  }

  private drawSpinningStar(
    ctx: CanvasRenderingContext2D,
    a: FaceAnchor,
    t: number
  ): void {
    const hover = Math.sin(t * 3.2) * 8;
    const spinScaleX = Math.cos(t * 2.8);
    const radius = a.faceWidth * 0.22;
    const cx = a.foreheadX;
    const cy = a.foreheadY - a.faceWidth * 0.55 + hover;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a.rollRad * 0.4);
    ctx.scale(Math.abs(spinScaleX) < 0.15 ? 0.15 : spinScaleX, 1);

    ctx.shadowColor = '#FF2D8B';
    ctx.shadowBlur = 18;

    ctx.beginPath();
    const spikes = 5;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? radius : radius * 0.44;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const grad = ctx.createLinearGradient(-radius, -radius, radius, radius);
    grad.addColorStop(0, '#FF2D8B');
    grad.addColorStop(0.5, '#FF8AC2');
    grad.addColorStop(1, '#F5F0E6');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#F5F0E6';
    ctx.stroke();
    ctx.restore();
  }

  private drawCowboyHat(ctx: CanvasRenderingContext2D, a: FaceAnchor): void {
    const hatW = a.faceWidth * 1.48;
    const hatH = hatW * 0.55;
    const cx = a.foreheadX;
    const cy = a.foreheadY - hatH * 0.22;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a.rollRad);

    // Crown
    ctx.fillStyle = '#18181D';
    ctx.strokeStyle = '#F5F0E6';
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.moveTo(-hatW * 0.28, 0);
    ctx.quadraticCurveTo(-hatW * 0.24, -hatH * 0.85, -hatW * 0.08, -hatH * 0.72);
    ctx.quadraticCurveTo(0, -hatH * 0.58, hatW * 0.08, -hatH * 0.72);
    ctx.quadraticCurveTo(hatW * 0.24, -hatH * 0.85, hatW * 0.28, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // True Pink hatband
    ctx.fillStyle = '#FF2D8B';
    ctx.fillRect(-hatW * 0.27, -hatH * 0.16, hatW * 0.54, hatH * 0.14);

    // Brim
    ctx.beginPath();
    ctx.moveTo(-hatW * 0.52, -hatH * 0.06);
    ctx.quadraticCurveTo(0, hatH * 0.24, hatW * 0.52, -hatH * 0.06);
    ctx.quadraticCurveTo(0, hatH * 0.08, -hatW * 0.52, -hatH * 0.06);
    ctx.closePath();
    ctx.fillStyle = '#121217';
    ctx.fill();
    ctx.strokeStyle = '#F5F0E6';
    ctx.stroke();

    ctx.restore();
  }

  private drawGlasses(ctx: CanvasRenderingContext2D, a: FaceAnchor): void {
    const cx = (a.leftEyeX + a.rightEyeX) / 2;
    const cy = (a.leftEyeY + a.rightEyeY) / 2;
    const eyeDist = Math.hypot(a.rightEyeX - a.leftEyeX, a.rightEyeY - a.leftEyeY);
    const lensW = eyeDist * 0.62;
    const lensH = lensW * 0.56;
    const bridge = eyeDist * 0.18;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a.rollRad);

    ctx.fillStyle = 'rgba(255, 45, 139, 0.42)';
    ctx.strokeStyle = '#F5F0E6';
    ctx.lineWidth = 4;

    // Left lens
    ctx.beginPath();
    ctx.roundRect(-bridge / 2 - lensW, -lensH / 2, lensW, lensH, 14);
    ctx.fill();
    ctx.stroke();

    // Right lens
    ctx.beginPath();
    ctx.roundRect(bridge / 2, -lensH / 2, lensW, lensH, 14);
    ctx.fill();
    ctx.stroke();

    // Bridge
    ctx.beginPath();
    ctx.moveTo(-bridge / 2, -lensH * 0.1);
    ctx.lineTo(bridge / 2, -lensH * 0.1);
    ctx.stroke();

    // Specular shine
    ctx.strokeStyle = 'rgba(245, 240, 230, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-bridge / 2 - lensW * 0.78, -lensH * 0.26);
    ctx.lineTo(-bridge / 2 - lensW * 0.48, lensH * 0.18);
    ctx.moveTo(bridge / 2 + lensW * 0.22, -lensH * 0.26);
    ctx.lineTo(bridge / 2 + lensW * 0.52, lensH * 0.18);
    ctx.stroke();

    ctx.restore();
  }

  private drawCrown(ctx: CanvasRenderingContext2D, a: FaceAnchor): void {
    const crownW = a.faceWidth * 0.62;
    const crownH = crownW * 0.46;
    const cx = a.foreheadX;
    const cy = a.foreheadY - a.faceWidth * 0.18;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a.rollRad);

    ctx.beginPath();
    ctx.moveTo(-crownW * 0.5, 0);
    ctx.lineTo(-crownW * 0.54, -crownH * 0.8);
    ctx.lineTo(-crownW * 0.22, -crownH * 0.4);
    ctx.lineTo(0, -crownH);
    ctx.lineTo(crownW * 0.22, -crownH * 0.4);
    ctx.lineTo(crownW * 0.54, -crownH * 0.8);
    ctx.lineTo(crownW * 0.5, 0);
    ctx.closePath();

    ctx.fillStyle = '#F5F0E6';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#FF2D8B';
    ctx.stroke();

    // Center jewel
    ctx.beginPath();
    ctx.arc(0, -crownH * 0.34, crownW * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = '#FF2D8B';
    ctx.fill();

    ctx.restore();
  }

  private drawBunnyEars(
    ctx: CanvasRenderingContext2D,
    a: FaceAnchor,
    t: number
  ): void {
    const earW = a.faceWidth * 0.18;
    const earH = a.faceWidth * 0.54;
    const spread = a.faceWidth * 0.28;
    const wiggle = Math.sin(t * 4) * 0.06;

    const drawEar = (offsetX: number, tilt: number) => {
      ctx.save();
      ctx.translate(a.foreheadX, a.foreheadY - a.faceWidth * 0.12);
      ctx.rotate(a.rollRad);
      ctx.translate(offsetX, 0);
      ctx.rotate(tilt);

      ctx.beginPath();
      ctx.ellipse(0, -earH * 0.5, earW * 0.55, earH * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#F5F0E6';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0A0A0D';
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, -earH * 0.48, earW * 0.28, earH * 0.34, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FF2D8B';
      ctx.fill();

      ctx.restore();
    };

    drawEar(-spread, -0.18 + wiggle);
    drawEar(spread, 0.18 - wiggle);
  }

  private drawBlush(
    ctx: CanvasRenderingContext2D,
    a: FaceAnchor,
    t: number
  ): void {
    const r = a.faceWidth * 0.12;
    const drawCheek = (x: number, y: number) => {
      const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
      grad.addColorStop(0, 'rgba(255, 45, 139, 0.55)');
      grad.addColorStop(1, 'rgba(255, 45, 139, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Twinkle star
      const pulse = 0.7 + Math.sin(t * 5 + x) * 0.3;
      ctx.fillStyle = `rgba(245, 240, 230, ${pulse})`;
      ctx.beginPath();
      ctx.arc(x + r * 0.4, y - r * 0.3, 3.5, 0, Math.PI * 2);
      ctx.fill();
    };

    drawCheek(a.leftCheekX, a.leftCheekY);
    drawCheek(a.rightCheekX, a.rightCheekY);
  }

  private updateAndDrawHearts(
    ctx: CanvasRenderingContext2D,
    a: FaceAnchor,
    w: number,
    h: number,
    t: number
  ): void {
    if (this.hearts.length < 14 && Math.random() < 0.24) {
      this.hearts.push({
        x: a.foreheadX + (Math.random() - 0.5) * a.faceWidth * 1.4,
        y: a.foreheadY + a.faceWidth * 0.4 + Math.random() * 40,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(1.6 + Math.random() * 1.8),
        size: 12 + Math.random() * 14,
        alpha: 0.95,
        color: Math.random() > 0.3 ? '#FF2D8B' : '#F5F0E6',
        phase: Math.random() * Math.PI * 2
      });
    }

    this.hearts = this.hearts.filter((p) => {
      p.x += p.vx + Math.sin(t * 3 + p.phase) * 0.6;
      p.y += p.vy;
      p.alpha -= 0.008;
      if (p.alpha <= 0 || p.y < -40 || p.x < -40 || p.x > w + 40) {
        return false;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      const s = p.size / 20;
      ctx.scale(s, s);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.bezierCurveTo(-12, -4, -18, 10, 0, 22);
      ctx.bezierCurveTo(18, 10, 12, -4, 0, 6);
      ctx.fill();
      ctx.restore();
      return p.y < h + 40;
    });
  }
}
