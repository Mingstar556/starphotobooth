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
  | 'cat'
  | 'visor'
  | 'halo'
  | 'blush';

export interface BoothEffect {
  id: EffectId;
  label: string;
  emoji: string;
}

export const BOOTH_EFFECTS: readonly BoothEffect[] = [
  { id: 'star', label: 'Star Halo', emoji: '✦' },
  { id: 'cowboy', label: 'Yeehaw', emoji: '🤠' },
  { id: 'glasses', label: 'Pink Baddie', emoji: '🕶️' },
  { id: 'visor', label: 'Cyber Visor', emoji: '⚡' },
  { id: 'hearts', label: 'Love Float', emoji: '💗' },
  { id: 'halo', label: 'Angel Halo', emoji: '😇' },
  { id: 'crown', label: 'Main Character', emoji: '👑' },
  { id: 'bunny', label: 'Bun-Bun', emoji: '🐰' },
  { id: 'cat', label: 'Kitty', emoji: '🐱' },
  { id: 'blush', label: 'Peach Glow', emoji: '✨' }
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
  noseX: number;
  noseY: number;
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
          numFaces: 1,
          minFaceDetectionConfidence: 0.4,
          minFacePresenceConfidence: 0.4,
          minTrackingConfidence: 0.4
        });
      } catch {
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
        const next = this.extractAnchor(
          result.faceLandmarks[0],
          w,
          h,
          mirrored
        );
        if (this.lastAnchor) {
          const a = 0.55;
          const lerp = (p: number, n: number) => p + (n - p) * a;
          this.lastAnchor = {
            foreheadX: lerp(this.lastAnchor.foreheadX, next.foreheadX),
            foreheadY: lerp(this.lastAnchor.foreheadY, next.foreheadY),
            noseX: lerp(this.lastAnchor.noseX, next.noseX),
            noseY: lerp(this.lastAnchor.noseY, next.noseY),
            leftEyeX: lerp(this.lastAnchor.leftEyeX, next.leftEyeX),
            leftEyeY: lerp(this.lastAnchor.leftEyeY, next.leftEyeY),
            rightEyeX: lerp(this.lastAnchor.rightEyeX, next.rightEyeX),
            rightEyeY: lerp(this.lastAnchor.rightEyeY, next.rightEyeY),
            leftCheekX: lerp(this.lastAnchor.leftCheekX, next.leftCheekX),
            leftCheekY: lerp(this.lastAnchor.leftCheekY, next.leftCheekY),
            rightCheekX: lerp(this.lastAnchor.rightCheekX, next.rightCheekX),
            rightCheekY: lerp(this.lastAnchor.rightCheekY, next.rightCheekY),
            faceWidth: lerp(this.lastAnchor.faceWidth, next.faceWidth),
            rollRad: next.rollRad
          };
        } else {
          this.lastAnchor = next;
        }
      } else {
        this.lastAnchor = null;
      }
    }

    const anchor = this.lastAnchor ?? this.fallbackAnchor(w, h);
    const t = nowMs * 0.001;

    if (this.activeEffects.has('blush')) this.drawBlush(ctx, anchor, t);
    if (this.activeEffects.has('cat')) this.drawCat(ctx, anchor);
    if (this.activeEffects.has('glasses')) this.drawGlasses(ctx, anchor);
    if (this.activeEffects.has('visor')) this.drawCyberVisor(ctx, anchor, t);
    if (this.activeEffects.has('bunny')) this.drawBunnyEars(ctx, anchor, t);
    if (this.activeEffects.has('crown')) this.drawCrown(ctx, anchor);
    if (this.activeEffects.has('cowboy')) this.drawCowboyHat(ctx, anchor);
    if (this.activeEffects.has('halo')) this.drawAngelHalo(ctx, anchor, t);
    if (this.activeEffects.has('star')) this.drawSpinningStar(ctx, anchor, t);
    if (this.activeEffects.has('hearts')) this.updateAndDrawHearts(ctx, anchor, w, h, t);
  }

  private extractAnchor(
    lm: NormalizedLandmark[],
    w: number,
    h: number,
    mirrored: boolean
  ): FaceAnchor {
    const mapX = (nx: number) => (mirrored ? 1 - nx : nx) * w;
    const mapY = (ny: number) => ny * h;

    const forehead = lm[10];
    const nose = lm[1];
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

    const faceWidth = Math.max(Math.hypot(tx2 - tx1, ty2 - ty1), w * 0.24) * 1.28;
    const rollRad = Math.atan2(ry - ly, rx - lx);

    return {
      foreheadX: mapX(forehead.x),
      foreheadY: mapY(forehead.y),
      noseX: mapX(nose.x),
      noseY: mapY(nose.y),
      leftEyeX: lx,
      leftEyeY: ly,
      rightEyeX: rx,
      rightEyeY: ry,
      leftCheekX: mapX(leftCheek.x),
      leftCheekY: mapY(leftCheek.y),
      rightCheekX: mapX(rightCheek.x),
      rightCheekY: mapY(rightCheek.y),
      faceWidth,
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
      noseX: cx,
      noseY: cy + fw * 0.08,
      leftEyeX: cx - fw * 0.22,
      leftEyeY: cy - fw * 0.08,
      rightEyeX: cx + fw * 0.22,
      rightEyeY: cy - fw * 0.08,
      leftCheekX: cx - fw * 0.28,
      leftCheekY: cy + fw * 0.14,
      rightCheekX: cx + fw * 0.28,
      rightCheekY: cy + fw * 0.14,
      faceWidth: fw,
      rollRad: 0
    };
  }

  private drawSpinningStar(ctx: CanvasRenderingContext2D, a: FaceAnchor, t: number): void {
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
    ctx.shadowBlur = 22;

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
    grad.addColorStop(0.5, '#FF9BD2');
    grad.addColorStop(1, '#F5F0E6');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#F5F0E6';
    ctx.stroke();
    ctx.restore();
  }

  private drawAngelHalo(ctx: CanvasRenderingContext2D, a: FaceAnchor, t: number): void {
    const hover = Math.sin(t * 2.5) * 6;
    const rx = a.faceWidth * 0.4;
    const ry = rx * 0.24;
    const cx = a.foreheadX;
    const cy = a.foreheadY - a.faceWidth * 0.42 + hover;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a.rollRad * 0.6);

    ctx.shadowColor = '#FDE047';
    ctx.shadowBlur = 24;
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, -1, rx * 0.96, ry * 0.9, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.restore();
  }

  private drawCowboyHat(ctx: CanvasRenderingContext2D, a: FaceAnchor): void {
    const hatW = a.faceWidth * 1.54;
    const hatH = hatW * 0.56;
    const cx = a.foreheadX;
    const cy = a.foreheadY - hatH * 0.2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a.rollRad);

    // Soft drop shadow on forehead
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;

    // Rich leather crown gradient
    const crownGrad = ctx.createLinearGradient(-hatW * 0.28, -hatH * 0.8, hatW * 0.28, 0);
    crownGrad.addColorStop(0, '#3D2618');
    crownGrad.addColorStop(0.5, '#5E3A24');
    crownGrad.addColorStop(1, '#26170E');

    ctx.fillStyle = crownGrad;
    ctx.strokeStyle = '#1A0F09';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(-hatW * 0.28, 0);
    ctx.quadraticCurveTo(-hatW * 0.24, -hatH * 0.86, -hatW * 0.08, -hatH * 0.72);
    ctx.quadraticCurveTo(0, -hatH * 0.58, hatW * 0.08, -hatH * 0.72);
    ctx.quadraticCurveTo(hatW * 0.24, -hatH * 0.86, hatW * 0.28, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // True Pink leather hatband + metallic star buckle
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FF2D8B';
    ctx.fillRect(-hatW * 0.27, -hatH * 0.16, hatW * 0.54, hatH * 0.14);

    ctx.fillStyle = '#F5F0E6';
    ctx.beginPath();
    ctx.arc(0, -hatH * 0.09, hatH * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // Curved 3D-shaded brim
    const brimGrad = ctx.createLinearGradient(-hatW * 0.52, 0, hatW * 0.52, 0);
    brimGrad.addColorStop(0, '#26170E');
    brimGrad.addColorStop(0.5, '#6A4229');
    brimGrad.addColorStop(1, '#26170E');

    ctx.beginPath();
    ctx.moveTo(-hatW * 0.54, -hatH * 0.08);
    ctx.quadraticCurveTo(0, hatH * 0.26, hatW * 0.54, -hatH * 0.08);
    ctx.quadraticCurveTo(0, hatH * 0.09, -hatW * 0.54, -hatH * 0.08);
    ctx.closePath();
    ctx.fillStyle = brimGrad;
    ctx.fill();
    ctx.strokeStyle = '#1A0F09';
    ctx.stroke();

    ctx.restore();
  }

  private drawGlasses(ctx: CanvasRenderingContext2D, a: FaceAnchor): void {
    const cx = (a.leftEyeX + a.rightEyeX) / 2;
    const cy = (a.leftEyeY + a.rightEyeY) / 2;
    const eyeDist = Math.hypot(a.rightEyeX - a.leftEyeX, a.rightEyeY - a.leftEyeY);
    const lensW = eyeDist * 0.64;
    const lensH = lensW * 0.56;
    const bridge = eyeDist * 0.18;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a.rollRad);

    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    const lensGrad = ctx.createLinearGradient(0, -lensH / 2, 0, lensH / 2);
    lensGrad.addColorStop(0, 'rgba(255, 45, 139, 0.72)');
    lensGrad.addColorStop(1, 'rgba(20, 10, 22, 0.85)');

    ctx.fillStyle = lensGrad;
    ctx.strokeStyle = '#F5F0E6';
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.roundRect(-bridge / 2 - lensW, -lensH / 2, lensW, lensH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(bridge / 2, -lensH / 2, lensW, lensH, 14);
    ctx.fill();
    ctx.stroke();

    // Bridge & temple arms
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-bridge / 2, -lensH * 0.12);
    ctx.lineTo(bridge / 2, -lensH * 0.12);
    ctx.moveTo(-bridge / 2 - lensW, -lensH * 0.2);
    ctx.lineTo(-bridge / 2 - lensW - eyeDist * 0.22, -lensH * 0.28);
    ctx.moveTo(bridge / 2 + lensW, -lensH * 0.2);
    ctx.lineTo(bridge / 2 + lensW + eyeDist * 0.22, -lensH * 0.28);
    ctx.stroke();

    // Glossy specular reflection
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-bridge / 2 - lensW * 0.78, -lensH * 0.28);
    ctx.lineTo(-bridge / 2 - lensW * 0.48, lensH * 0.18);
    ctx.moveTo(bridge / 2 + lensW * 0.22, -lensH * 0.28);
    ctx.lineTo(bridge / 2 + lensW * 0.52, lensH * 0.18);
    ctx.stroke();

    ctx.restore();
  }

  private drawCyberVisor(ctx: CanvasRenderingContext2D, a: FaceAnchor, t: number): void {
    const cx = (a.leftEyeX + a.rightEyeX) / 2;
    const cy = (a.leftEyeY + a.rightEyeY) / 2;
    const eyeDist = Math.hypot(a.rightEyeX - a.leftEyeX, a.rightEyeY - a.leftEyeY);
    const visorW = eyeDist * 1.75;
    const visorH = eyeDist * 0.52;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a.rollRad);

    const grad = ctx.createLinearGradient(-visorW / 2, 0, visorW / 2, 0);
    grad.addColorStop(0, 'rgba(37, 244, 238, 0.55)');
    grad.addColorStop(0.5, 'rgba(255, 45, 139, 0.58)');
    grad.addColorStop(1, 'rgba(37, 244, 238, 0.55)');

    ctx.shadowColor = '#25F4EE';
    ctx.shadowBlur = 16;
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#F5F0E6';
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.roundRect(-visorW / 2, -visorH / 2, visorW, visorH, 16);
    ctx.fill();
    ctx.stroke();

    // Animated scan line
    const scanX = ((t * 140) % visorW) - visorW / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scanX, -visorH * 0.35);
    ctx.lineTo(scanX, visorH * 0.35);
    ctx.stroke();

    ctx.restore();
  }

  private drawCrown(ctx: CanvasRenderingContext2D, a: FaceAnchor): void {
    const crownW = a.faceWidth * 0.64;
    const crownH = crownW * 0.48;
    const cx = a.foreheadX;
    const cy = a.foreheadY - a.faceWidth * 0.18;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a.rollRad);

    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 12;

    const goldGrad = ctx.createLinearGradient(-crownW / 2, -crownH, crownW / 2, 0);
    goldGrad.addColorStop(0, '#FDE047');
    goldGrad.addColorStop(0.5, '#F5F0E6');
    goldGrad.addColorStop(1, '#F59E0B');

    ctx.beginPath();
    ctx.moveTo(-crownW * 0.5, 0);
    ctx.lineTo(-crownW * 0.54, -crownH * 0.8);
    ctx.lineTo(-crownW * 0.22, -crownH * 0.4);
    ctx.lineTo(0, -crownH);
    ctx.lineTo(crownW * 0.22, -crownH * 0.4);
    ctx.lineTo(crownW * 0.54, -crownH * 0.8);
    ctx.lineTo(crownW * 0.5, 0);
    ctx.closePath();

    ctx.fillStyle = goldGrad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FF2D8B';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -crownH * 0.34, crownW * 0.065, 0, Math.PI * 2);
    ctx.fillStyle = '#FF2D8B';
    ctx.fill();

    ctx.restore();
  }

  private drawBunnyEars(ctx: CanvasRenderingContext2D, a: FaceAnchor, t: number): void {
    const earW = a.faceWidth * 0.19;
    const earH = a.faceWidth * 0.56;
    const spread = a.faceWidth * 0.28;
    const wiggle = Math.sin(t * 4) * 0.06;

    const drawEar = (offsetX: number, tilt: number) => {
      ctx.save();
      ctx.translate(a.foreheadX, a.foreheadY - a.faceWidth * 0.12);
      ctx.rotate(a.rollRad);
      ctx.translate(offsetX, 0);
      ctx.rotate(tilt);

      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.ellipse(0, -earH * 0.5, earW * 0.55, earH * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#F5F0E6';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#18181D';
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, -earH * 0.48, earW * 0.28, earH * 0.34, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FF5CA8';
      ctx.fill();

      ctx.restore();
    };

    drawEar(-spread, -0.18 + wiggle);
    drawEar(spread, 0.18 - wiggle);
  }

  private drawCat(ctx: CanvasRenderingContext2D, a: FaceAnchor): void {
    const earS = a.faceWidth * 0.26;
    const spread = a.faceWidth * 0.34;

    const drawEar = (dir: -1 | 1) => {
      ctx.save();
      ctx.translate(a.foreheadX, a.foreheadY - a.faceWidth * 0.08);
      ctx.rotate(a.rollRad);
      ctx.translate(dir * spread, 0);
      ctx.rotate(dir * 0.25);

      ctx.beginPath();
      ctx.moveTo(-earS * 0.5, 0);
      ctx.lineTo(0, -earS * 1.15);
      ctx.lineTo(earS * 0.5, 0);
      ctx.closePath();
      ctx.fillStyle = '#18181D';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#F5F0E6';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-earS * 0.25, -earS * 0.1);
      ctx.lineTo(0, -earS * 0.78);
      ctx.lineTo(earS * 0.25, -earS * 0.1);
      ctx.closePath();
      ctx.fillStyle = '#FF2D8B';
      ctx.fill();
      ctx.restore();
    };

    drawEar(-1);
    drawEar(1);

    // Cute pink nose + whiskers
    ctx.save();
    ctx.translate(a.noseX, a.noseY);
    ctx.rotate(a.rollRad);
    ctx.fillStyle = '#FF2D8B';
    ctx.beginPath();
    ctx.arc(0, 0, a.faceWidth * 0.045, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(245, 240, 230, 0.85)';
    ctx.lineWidth = 2.5;
    const wLen = a.faceWidth * 0.22;
    const wGap = a.faceWidth * 0.14;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * wGap, -4);
      ctx.lineTo(side * (wGap + wLen), -12);
      ctx.moveTo(side * wGap, 4);
      ctx.lineTo(side * (wGap + wLen), 12);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBlush(ctx: CanvasRenderingContext2D, a: FaceAnchor, t: number): void {
    const r = a.faceWidth * 0.13;
    const drawCheek = (x: number, y: number) => {
      const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
      grad.addColorStop(0, 'rgba(255, 45, 139, 0.58)');
      grad.addColorStop(1, 'rgba(255, 45, 139, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

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
    if (this.hearts.length < 16 && Math.random() < 0.28) {
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
