import gsap from 'gsap';
import type { CompositedPhoto } from '../engine/compositor';

const SAVE_PERMISSION_KEY = 'starbooth_save_permission';

function triggerDirectJpegDownload(photo: CompositedPhoto): void {
  const url = URL.createObjectURL(photo.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = photo.filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function createReviewSheet(options: {
  onRetake: () => void;
}): {
  el: HTMLElement;
  open: (photo: CompositedPhoto) => void;
  close: () => void;
} {
  let currentPhoto: CompositedPhoto | null = null;

  const el = document.createElement('div');
  el.className =
    'fixed inset-0 z-40 flex flex-col justify-end sm:justify-center items-center bg-[#0A0A0D]/90 backdrop-blur-2xl p-4 safe-bottom opacity-0 pointer-events-none';
  el.innerHTML = `
    <div data-sheet class="w-full max-w-md flex flex-col gap-4 transform translate-y-10">
      <div class="flex items-center justify-between px-1">
        <div>
          <h2 class="font-display text-xl font-bold text-[#F5F0E6]">Slayed the Booth ✦</h2>
          <p class="text-xs text-[#A9A396]">Save JPEG to your device or run it back</p>
        </div>
        <span data-badge class="rounded-full bg-[#FF2D8B]/15 border border-[#FF2D8B]/30 px-3 py-1 text-[11px] font-semibold text-[#FF2D8B]">
          JPEG · READY
        </span>
      </div>

      <div class="bezel-outer max-h-[58dvh] flex items-center justify-center overflow-hidden">
        <div class="bezel-inner w-full h-full flex items-center justify-center p-2 overflow-hidden">
          <img
            data-preview
            alt="Captured photobooth strip"
            class="max-h-[52dvh] w-auto object-contain rounded-xl"
          />
        </div>
      </div>

      <div data-perm-prompt class="hidden rounded-2xl bg-[#141418] border border-[#FF2D8B]/40 p-3.5 flex flex-col gap-2.5">
        <p class="text-xs text-[#F5F0E6] leading-relaxed">
          Allow <strong>StarPhotobooth</strong> to save JPEG photos directly to your device downloads/gallery?
        </p>
        <div class="flex gap-2 justify-end">
          <button
            data-perm-deny
            type="button"
            class="tactile-btn rounded-full px-3.5 py-1.5 text-xs font-medium text-[#A9A396] bg-[#1C1C22] cursor-pointer"
          >
            Not now
          </button>
          <button
            data-perm-allow
            type="button"
            class="tactile-btn rounded-full px-4 py-1.5 text-xs font-semibold text-[#F5F0E6] bg-[#FF2D8B] cursor-pointer"
          >
            Allow &amp; Save JPEG
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2.5 pt-1">
        <button
          data-retake
          type="button"
          class="tactile-btn flex-1 rounded-full bg-[#141418] border border-[#F5F0E6]/15 px-4 py-3.5 text-sm font-semibold text-[#F5F0E6] hover:border-[#F5F0E6]/35 cursor-pointer"
        >
          Run It Back ↺
        </button>
        <button
          data-save
          type="button"
          class="tactile-btn flex-[1.3] rounded-full bg-[#FF2D8B] px-4 py-3.5 text-sm font-semibold text-[#F5F0E6] shadow-[0_0_24px_rgba(255,45,139,0.4)] hover:bg-[#FF4297] cursor-pointer"
        >
          Save JPEG ✦
        </button>
        <button
          data-share
          type="button"
          title="Share strip"
          aria-label="Share strip"
          class="tactile-btn rounded-full bg-[#141418] border border-[#F5F0E6]/15 px-3.5 py-3.5 text-sm font-semibold text-[#F5F0E6] cursor-pointer"
        >
          ↗
        </button>
      </div>
    </div>
  `;

  const sheet = el.querySelector<HTMLElement>('[data-sheet]')!;
  const previewImg = el.querySelector<HTMLImageElement>('[data-preview]')!;
  const permPrompt = el.querySelector<HTMLElement>('[data-perm-prompt]')!;
  const permAllowBtn = el.querySelector<HTMLButtonElement>('[data-perm-allow]')!;
  const permDenyBtn = el.querySelector<HTMLButtonElement>('[data-perm-deny]')!;
  const retakeBtn = el.querySelector<HTMLButtonElement>('[data-retake]')!;
  const saveBtn = el.querySelector<HTMLButtonElement>('[data-save]')!;
  const shareBtn = el.querySelector<HTMLButtonElement>('[data-share]')!;

  function open(photo: CompositedPhoto) {
    currentPhoto = photo;
    previewImg.src = photo.dataUrl;
    saveBtn.textContent = 'Save JPEG ✦';
    permPrompt.classList.add('hidden');
    el.classList.remove('pointer-events-none');

    gsap.killTweensOf([el, sheet]);
    gsap.to(el, { opacity: 1, duration: 0.22, ease: 'power2.out' });
    gsap.fromTo(
      sheet,
      { y: 36, scale: 0.97 },
      { y: 0, scale: 1, duration: 0.36, ease: 'power3.out' }
    );
  }

  function close() {
    gsap.killTweensOf([el, sheet]);
    gsap.to(sheet, { y: 28, duration: 0.2, ease: 'power2.in' });
    gsap.to(el, {
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => {
        el.classList.add('pointer-events-none');
      }
    });
  }

  function performDirectSave() {
    if (!currentPhoto) return;
    triggerDirectJpegDownload(currentPhoto);
    saveBtn.textContent = 'Saved JPEG ✓';
  }

  retakeBtn.addEventListener('click', () => {
    currentPhoto = null;
    close();
    options.onRetake();
  });

  permDenyBtn.addEventListener('click', () => {
    permPrompt.classList.add('hidden');
  });

  permAllowBtn.addEventListener('click', () => {
    localStorage.setItem(SAVE_PERMISSION_KEY, 'granted');
    permPrompt.classList.add('hidden');
    performDirectSave();
  });

  saveBtn.addEventListener('click', () => {
    if (!currentPhoto) return;
    if (localStorage.getItem(SAVE_PERMISSION_KEY) !== 'granted') {
      permPrompt.classList.remove('hidden');
      return;
    }
    performDirectSave();
  });

  shareBtn.addEventListener('click', async () => {
    if (!currentPhoto) return;
    const file = new File([currentPhoto.blob], currentPhoto.filename, {
      type: 'image/jpeg'
    });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'StarPhotobooth' });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    } else {
      performDirectSave();
    }
  });

  return { el, open, close };
}
