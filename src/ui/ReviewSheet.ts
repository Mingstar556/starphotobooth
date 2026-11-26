import gsap from 'gsap';
import type { CompositedPhoto } from '../engine/compositor';

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
          <h2 class="font-display text-xl font-bold text-[#F5F0E6]">Your Strip is Ready</h2>
          <p class="text-xs text-[#A9A396]">Save as JPEG or discard to re-take</p>
        </div>
        <span data-badge class="rounded-full bg-[#FF2D8B]/15 border border-[#FF2D8B]/30 px-3 py-1 text-[11px] font-semibold text-[#FF2D8B]">
          JPEG · HD
        </span>
      </div>

      <div class="bezel-outer max-h-[62dvh] flex items-center justify-center overflow-hidden">
        <div class="bezel-inner w-full h-full flex items-center justify-center p-2 overflow-hidden">
          <img
            data-preview
            alt="Captured photobooth strip"
            class="max-h-[56dvh] w-auto object-contain rounded-xl"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 pt-1">
        <button
          data-retake
          type="button"
          class="tactile-btn rounded-full bg-[#141418] border border-[#F5F0E6]/15 px-5 py-3.5 text-sm font-semibold text-[#F5F0E6] hover:border-[#F5F0E6]/35 cursor-pointer"
        >
          Discard &amp; Retake
        </button>
        <button
          data-save
          type="button"
          class="tactile-btn rounded-full bg-[#FF2D8B] px-5 py-3.5 text-sm font-semibold text-[#F5F0E6] shadow-[0_0_24px_rgba(255,45,139,0.4)] hover:bg-[#FF4297] cursor-pointer"
        >
          Save JPEG
        </button>
      </div>
    </div>
  `;

  const sheet = el.querySelector<HTMLElement>('[data-sheet]')!;
  const previewImg = el.querySelector<HTMLImageElement>('[data-preview]')!;
  const retakeBtn = el.querySelector<HTMLButtonElement>('[data-retake]')!;
  const saveBtn = el.querySelector<HTMLButtonElement>('[data-save]')!;

  function open(photo: CompositedPhoto) {
    currentPhoto = photo;
    previewImg.src = photo.dataUrl;
    saveBtn.textContent = 'Save JPEG';
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

  retakeBtn.addEventListener('click', () => {
    currentPhoto = null;
    close();
    options.onRetake();
  });

  saveBtn.addEventListener('click', async () => {
    if (!currentPhoto) return;
    const file = new File([currentPhoto.blob], currentPhoto.filename, {
      type: 'image/jpeg'
    });

    // Prefer native share sheet on mobile iOS/Android when supported
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'StarPhotobooth'
        });
        saveBtn.textContent = 'Saved ✓';
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }

    const url = URL.createObjectURL(currentPhoto.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentPhoto.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    saveBtn.textContent = 'Saved JPEG ✓';
  });

  return { el, open, close };
}
