import gsap from 'gsap';

export interface PermissionModalHandlers {
  onGrantCamera: () => Promise<void>;
}

export function createPermissionModal(handlers: PermissionModalHandlers): {
  el: HTMLElement;
  show: (errorMessage?: string) => void;
  hide: () => void;
} {
  const el = document.createElement('div');
  el.className =
    'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0A0A0D]/85 backdrop-blur-xl p-4 opacity-0 pointer-events-none';
  el.innerHTML = `
    <div data-card class="w-full max-w-md bezel-outer transform translate-y-6">
      <div class="bezel-inner p-6 flex flex-col gap-5">
        <div class="flex items-center justify-between">
          <span class="inline-flex items-center gap-2 rounded-full bg-[#FF2D8B]/15 border border-[#FF2D8B]/30 px-3 py-1 text-xs font-semibold tracking-wide text-[#FF2D8B]">
            ✦ MAIN CHARACTER ENERGY
          </span>
          <span class="text-xs text-[#A9A396]">STARBOOTH</span>
        </div>

        <div class="space-y-2">
          <h2 class="font-display text-2xl font-bold tracking-tight text-[#F5F0E6]">
            Lights. Camera. Pose.
          </h2>
          <p class="text-sm leading-relaxed text-[#A9A396]">
            Pick your strip, stack live AR props, and drop crisp photobooth strips
            straight to your camera roll. We use a tiny cookie to remember your vibe.
          </p>
        </div>

        <p data-error class="hidden rounded-xl bg-[#FF2D8B]/15 border border-[#FF2D8B]/40 px-3.5 py-2.5 text-xs text-[#F5F0E6]"></p>

        <button
          data-allow
          type="button"
          class="tactile-btn w-full rounded-full bg-[#FF2D8B] px-6 py-3.5 text-sm font-semibold text-[#F5F0E6] shadow-[0_0_24px_rgba(255,45,139,0.35)] hover:bg-[#FF4297] cursor-pointer"
        >
          Open Camera &amp; Glow ✦
        </button>
      </div>
    </div>
  `;

  const card = el.querySelector<HTMLElement>('[data-card]')!;
  const allowBtn = el.querySelector<HTMLButtonElement>('[data-allow]')!;
  const errorBox = el.querySelector<HTMLElement>('[data-error]')!;

  function show(errorMessage?: string) {
    if (errorMessage) {
      errorBox.textContent = errorMessage;
      errorBox.classList.remove('hidden');
    } else {
      errorBox.classList.add('hidden');
    }
    el.classList.remove('pointer-events-none');
    gsap.killTweensOf([el, card]);
    gsap.to(el, { opacity: 1, duration: 0.22, ease: 'power2.out' });
    gsap.to(card, { y: 0, duration: 0.34, ease: 'power3.out' });
  }

  function hide() {
    gsap.killTweensOf([el, card]);
    gsap.to(card, { y: 20, duration: 0.2, ease: 'power2.in' });
    gsap.to(el, {
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => {
        el.classList.add('pointer-events-none');
      }
    });
  }

  allowBtn.addEventListener('click', async () => {
    allowBtn.disabled = true;
    allowBtn.textContent = 'Starting camera...';
    try {
      await handlers.onGrantCamera();
      hide();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera permission failed.';
      show(msg);
    } finally {
      allowBtn.disabled = false;
      allowBtn.textContent = 'Allow Camera & Continue';
    }
  });

  return { el, show, hide };
}
