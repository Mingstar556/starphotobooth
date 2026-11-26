import './styles/main.css';
import gsap from 'gsap';
import { CameraController } from './engine/camera';
import { compositePhotoboothStrip } from './engine/compositor';
import { BOOTH_EFFECTS, EffectsEngine } from './engine/effects';
import {
  BOOTH_LAYOUTS,
  getLayoutById,
  STRIP_THEMES,
  type LayoutId,
  type StripTheme
} from './engine/layouts';
import {
  fetchSessionState,
  saveCookieConsent,
  savePreferences,
  type SessionPreferences
} from './ui/api';
import { createEffectsBar } from './ui/EffectsBar';
import { createLayoutPicker } from './ui/LayoutPicker';
import { createPermissionModal } from './ui/PermissionModal';
import { createReviewSheet } from './ui/ReviewSheet';

const appRoot = document.querySelector<HTMLDivElement>('#app')!;

appRoot.innerHTML = `
  <main class="min-h-[100dvh] w-full max-w-lg mx-auto flex flex-col justify-between px-3.5 safe-top safe-bottom gap-3">
    <header data-header class="flex items-center justify-between pt-1 opacity-0 -translate-y-2">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-[#FF2D8B] shadow-[0_0_12px_#FF2D8B]"></span>
        <h1 class="font-display text-lg font-extrabold tracking-tight text-[#F5F0E6]">
          STARBOOTH
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <button
          data-vibe-btn
          type="button"
          title="Randomize layout, frame & AR vibe"
          class="tactile-btn rounded-full bg-[#FF2D8B]/15 border border-[#FF2D8B]/35 px-3 py-1.5 text-xs font-semibold text-[#FF2D8B] cursor-pointer"
        >
          🎲 Vibe
        </button>
        <button
          data-timer-btn
          type="button"
          class="tactile-btn rounded-full bg-[#141418] border border-[#F5F0E6]/12 px-3 py-1.5 text-xs font-semibold text-[#F5F0E6] cursor-pointer"
        >
          ⏱ 3s
        </button>
        <button
          data-flip-btn
          type="button"
          aria-label="Switch camera"
          class="tactile-btn rounded-full bg-[#141418] border border-[#F5F0E6]/12 px-3 py-1.5 text-xs font-semibold text-[#F5F0E6] cursor-pointer"
        >
          ↻ Flip
        </button>
      </div>
    </header>

    <section data-stage class="relative flex-1 flex flex-col items-center justify-center opacity-0 scale-[0.98]">
      <div class="bezel-outer w-full aspect-[3/4] max-h-[54dvh] relative overflow-hidden">
        <div class="bezel-inner w-full h-full relative overflow-hidden bg-[#0E0E12]">
          <video
            data-video
            autoplay
            playsinline
            muted
            class="w-full h-full object-cover transform -scale-x-100"
          ></video>
          <canvas
            data-overlay
            class="absolute inset-0 w-full h-full pointer-events-none"
          ></canvas>

          <div
            data-progress
            class="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-[#0A0A0D]/70 backdrop-blur-md border border-[#F5F0E6]/12 px-3 py-1.5"
          ></div>

          <div
            data-pose-cue
            class="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0A0A0D]/80 backdrop-blur-md border border-[#FF2D8B]/40 px-4 py-1.5 text-xs font-semibold text-[#F5F0E6] whitespace-nowrap pointer-events-none opacity-0"
          ></div>

          <div
            data-countdown
            class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0"
          >
            <span class="font-display text-7xl font-extrabold text-[#F5F0E6] drop-shadow-[0_4px_24px_rgba(255,45,139,0.75)]"></span>
          </div>

          <div
            data-flash
            class="absolute inset-0 bg-[#F5F0E6] pointer-events-none opacity-0"
          ></div>
        </div>
      </div>
    </section>

    <section data-controls class="flex flex-col gap-3 pb-1 opacity-0 translate-y-3">
      <div data-effects-slot></div>
      <div data-layouts-slot></div>

      <div class="flex items-center justify-center pt-1">
        <button
          data-shutter
          type="button"
          aria-label="Take photobooth strip"
          class="tactile-btn relative w-[74px] h-[74px] rounded-full p-1 border-2 border-[#F5F0E6] bg-transparent flex items-center justify-center cursor-pointer shadow-[0_0_28px_rgba(255,45,139,0.35)]"
        >
          <span class="w-full h-full rounded-full bg-[#FF2D8B] flex items-center justify-center text-[#F5F0E6] font-display text-[11px] font-extrabold tracking-wider">
            SHOOT ✦
          </span>
        </button>
      </div>
    </section>
  </main>
`;

const headerEl = appRoot.querySelector<HTMLElement>('[data-header]')!;
const stageEl = appRoot.querySelector<HTMLElement>('[data-stage]')!;
const controlsEl = appRoot.querySelector<HTMLElement>('[data-controls]')!;
const videoEl = appRoot.querySelector<HTMLVideoElement>('[data-video]')!;
const overlayEl = appRoot.querySelector<HTMLCanvasElement>('[data-overlay]')!;
const progressEl = appRoot.querySelector<HTMLElement>('[data-progress]')!;
const poseCueEl = appRoot.querySelector<HTMLElement>('[data-pose-cue]')!;
const countdownEl = appRoot.querySelector<HTMLElement>('[data-countdown]')!;
const countdownText = countdownEl.querySelector('span')!;
const flashEl = appRoot.querySelector<HTMLElement>('[data-flash]')!;
const vibeBtn = appRoot.querySelector<HTMLButtonElement>('[data-vibe-btn]')!;
const timerBtn = appRoot.querySelector<HTMLButtonElement>('[data-timer-btn]')!;
const flipBtn = appRoot.querySelector<HTMLButtonElement>('[data-flip-btn]')!;
const shutterBtn = appRoot.querySelector<HTMLButtonElement>('[data-shutter]')!;
const effectsSlot = appRoot.querySelector<HTMLElement>('[data-effects-slot]')!;
const layoutsSlot = appRoot.querySelector<HTMLElement>('[data-layouts-slot]')!;

const camera = new CameraController();
const effects = new EffectsEngine();

let prefs: SessionPreferences = {
  layoutId: '2x2',
  stripTheme: 'black',
  countdownSeconds: 3,
  mirrorSelfie: true
};
let isShooting = false;

function syncOverlaySize() {
  const rect = overlayEl.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (overlayEl.width !== targetW || overlayEl.height !== targetH) {
      overlayEl.width = targetW;
      overlayEl.height = targetH;
    }
  }
}

function renderProgressDots(completedCount = 0) {
  const layout = getLayoutById(prefs.layoutId);
  progressEl.innerHTML = '';
  for (let i = 0; i < layout.shotCount; i++) {
    const dot = document.createElement('span');
    dot.className = `w-2 h-2 rounded-full transition-colors duration-150 ${
      i < completedCount ? 'bg-[#FF2D8B]' : 'bg-[#F5F0E6]/25'
    }`;
    progressEl.appendChild(dot);
  }
}

function startRenderLoop() {
  const tick = (now: number) => {
    syncOverlaySize();
    effects.renderFrame(videoEl, overlayEl, camera.isMirrored, now);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function captureCompositeFrame(): HTMLCanvasElement {
  const snap = document.createElement('canvas');
  const w = overlayEl.width || 720;
  const h = overlayEl.height || 960;
  snap.width = w;
  snap.height = h;

  const ctx = snap.getContext('2d')!;
  const vw = videoEl.videoWidth || w;
  const vh = videoEl.videoHeight || h;

  // Match object-cover crop of viewfinder
  const srcRatio = vw / vh;
  const dstRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;
  if (srcRatio > dstRatio) {
    sw = vh * dstRatio;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / dstRatio;
    sy = (vh - sh) / 2;
  }

  ctx.save();
  if (camera.isMirrored) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, w, h);
  ctx.restore();

  // Draw active AR effects on top
  ctx.drawImage(overlayEl, 0, 0, w, h);
  return snap;
}

async function runCountdown(seconds: number): Promise<void> {
  for (let s = seconds; s >= 1; s--) {
    countdownText.textContent = String(s);
    gsap.killTweensOf(countdownEl);
    gsap.fromTo(
      countdownEl,
      { opacity: 0, scale: 1.35 },
      { opacity: 1, scale: 1, duration: 0.25, ease: 'power3.out' }
    );
    await new Promise((r) => setTimeout(r, 920));
  }
  gsap.to(countdownEl, { opacity: 0, duration: 0.15, ease: 'power2.in' });
}

function triggerFlash(): void {
  gsap.killTweensOf(flashEl);
  gsap.fromTo(
    flashEl,
    { opacity: 0.9 },
    { opacity: 0, duration: 0.35, ease: 'power2.out' }
  );
}

const layoutPicker = createLayoutPicker({
  initialLayout: prefs.layoutId,
  initialTheme: prefs.stripTheme,
  onSelectLayout: (id: LayoutId) => {
    prefs = { ...prefs, layoutId: id };
    renderProgressDots(0);
    void savePreferences(prefs);
  },
  onSelectTheme: (theme: StripTheme) => {
    prefs = { ...prefs, stripTheme: theme };
    void savePreferences(prefs);
  }
});

const effectsBar = createEffectsBar({
  onToggleEffect: (id) => effects.toggle(id),
  onClearAll: () => effects.clearAll()
});

const reviewSheet = createReviewSheet({
  onRetake: () => {
    renderProgressDots(0);
  }
});

const permissionModal = createPermissionModal({
  onGrantCamera: async () => {
    await saveCookieConsent(true);
    await camera.start(videoEl, 'user');
    void effects.initFaceTracking();
  }
});

effectsSlot.appendChild(effectsBar.el);
layoutsSlot.appendChild(layoutPicker.el);
appRoot.appendChild(reviewSheet.el);
appRoot.appendChild(permissionModal.el);

const POSE_CUES = [
  'Serve face ✨',
  'Peace sign ✌️',
  'Main character ✦',
  'Big smile 💗',
  'Wink 😉',
  'Blow a kiss 💋'
];

function showPoseCue(text: string): void {
  poseCueEl.textContent = text;
  gsap.killTweensOf(poseCueEl);
  gsap.fromTo(
    poseCueEl,
    { opacity: 0, y: 8, scale: 0.94 },
    { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'power3.out' }
  );
}

function hidePoseCue(): void {
  gsap.to(poseCueEl, { opacity: 0, y: 4, duration: 0.2, ease: 'power2.in' });
}

vibeBtn.addEventListener('click', () => {
  if (isShooting) return;
  const randomLayout = BOOTH_LAYOUTS[Math.floor(Math.random() * BOOTH_LAYOUTS.length)];
  const themes = Object.keys(STRIP_THEMES) as StripTheme[];
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];

  effects.clearAll();
  const shuffled = [...BOOTH_EFFECTS].sort(() => Math.random() - 0.5);
  effects.toggle(shuffled[0].id);
  effects.toggle(shuffled[1].id);
  effectsBar.sync(effects.getActive());

  prefs = { ...prefs, layoutId: randomLayout.id, stripTheme: randomTheme };
  layoutPicker.setLayout(randomLayout.id);
  layoutPicker.setTheme(randomTheme);
  renderProgressDots(0);
  void savePreferences(prefs);

  showPoseCue(`Vibe: ${shuffled[0].emoji} + ${shuffled[1].emoji} ${randomLayout.name}`);
  setTimeout(() => {
    if (!isShooting) hidePoseCue();
  }, 1800);
});

timerBtn.addEventListener('click', () => {
  prefs = {
    ...prefs,
    countdownSeconds: prefs.countdownSeconds === 3 ? 5 : 3
  };
  timerBtn.textContent = `⏱ ${prefs.countdownSeconds}s`;
  void savePreferences(prefs);
});

flipBtn.addEventListener('click', async () => {
  if (isShooting) return;
  try {
    const facing = await camera.flip(videoEl);
    videoEl.classList.toggle('-scale-x-100', facing === 'user');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to switch camera.';
    permissionModal.show(msg);
  }
});

shutterBtn.addEventListener('click', async () => {
  if (isShooting) return;
  isShooting = true;
  shutterBtn.disabled = true;

  const layout = getLayoutById(prefs.layoutId);
  const shots: HTMLCanvasElement[] = [];

  try {
    for (let i = 0; i < layout.shotCount; i++) {
      showPoseCue(`Shot ${i + 1}/${layout.shotCount} · ${POSE_CUES[i % POSE_CUES.length]}`);
      await runCountdown(prefs.countdownSeconds);
      triggerFlash();
      shots.push(captureCompositeFrame());
      renderProgressDots(i + 1);
      if (i < layout.shotCount - 1) {
        await new Promise((r) => setTimeout(r, 450));
      }
    }

    hidePoseCue();
    const photo = await compositePhotoboothStrip(shots, layout, prefs.stripTheme);
    reviewSheet.open(photo);
  } finally {
    hidePoseCue();
    isShooting = false;
    shutterBtn.disabled = false;
  }
});

async function bootstrap() {
  const session = await fetchSessionState();
  prefs = session.preferences;
  layoutPicker.setLayout(prefs.layoutId);
  layoutPicker.setTheme(prefs.stripTheme);
  timerBtn.textContent = `⏱ ${prefs.countdownSeconds}s`;
  renderProgressDots(0);
  startRenderLoop();

  // Entrance choreography (composite-only)
  gsap.to(headerEl, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' });
  gsap.to(stageEl, {
    opacity: 1,
    scale: 1,
    duration: 0.45,
    delay: 0.06,
    ease: 'power3.out'
  });
  gsap.to(controlsEl, {
    opacity: 1,
    y: 0,
    duration: 0.45,
    delay: 0.12,
    ease: 'power3.out'
  });

  if (session.consentAccepted) {
    try {
      await camera.start(videoEl, 'user');
      void effects.initFaceTracking();
    } catch (err) {
      const msg = err instanceof Error ? err.message : undefined;
      permissionModal.show(msg);
    }
  } else {
    permissionModal.show();
  }
}

void bootstrap();
