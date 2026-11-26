import gsap from 'gsap';
import type { CompositedPhoto, TextFontId, TextOverlay } from '../engine/compositor';

const SAVE_PERMISSION_KEY = 'starbooth_save_permission';

const QUICK_STICKERS_AND_TEXT = [
  '💗',
  '✨',
  '🔥',
  '🦋',
  '🎀',
  'Besties 4Ever 💗',
  'Main Character ✦',
  'Core Memory ✨'
];

const FONT_OPTIONS: { id: TextFontId; label: string; css: string }[] = [
  { id: 'display', label: 'Syne', css: '"Syne", sans-serif' },
  { id: 'sans', label: 'Sans', css: '"Plus Jakarta Sans", sans-serif' },
  { id: 'serif', label: 'Serif', css: 'Georgia, serif' },
  { id: 'mono', label: 'Mono', css: 'ui-monospace, monospace' },
  { id: 'handwriting', label: 'Script', css: '"Caveat", cursive' }
];

const COLOR_SWATCHES = ['#FFFFFF', '#0A0A0D', '#FF2D8B', '#25F4EE', '#FACC15', '#A855F7', '#FF6B1A'];

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
  onUpdateOverlays: (overlays: TextOverlay[]) => Promise<CompositedPhoto | null>;
}): {
  el: HTMLElement;
  open: (photo: CompositedPhoto) => void;
  close: () => void;
} {
  let currentPhoto: CompositedPhoto | null = null;
  let overlays: TextOverlay[] = [];
  let selectedId: string | null = null;
  let activeFont: TextFontId = 'display';
  let activeSize = 44;
  let activeColor = '#FFFFFF';

  const el = document.createElement('div');
  el.className =
    'fixed inset-0 z-40 flex flex-col justify-end sm:justify-center items-center bg-[#0A0A0D]/90 backdrop-blur-2xl p-3 safe-bottom opacity-0 pointer-events-none';
  el.innerHTML = `
    <div data-sheet class="w-full max-w-md flex flex-col gap-[6px] transform translate-y-10">
      <div class="flex items-center justify-between px-1">
        <div>
          <h2 class="font-display text-lg font-bold text-[#F5F0E6]">Slayed the Booth ✦</h2>
          <p class="text-[11px] text-[#A9A396]">Add text or stickers anywhere · drag to move</p>
        </div>
        <span data-badge class="rounded-full bg-[#FF2D8B]/15 border border-[#FF2D8B]/30 px-2.5 py-1 text-[10px] font-semibold text-[#FF2D8B]">
          READY
        </span>
      </div>

      <div class="bezel-outer">
        <div class="bezel-inner p-2.5 flex items-center justify-center max-h-[42dvh] overflow-hidden">
          <div data-preview-stage class="relative inline-block max-h-[38dvh] select-none touch-none">
            <img data-preview alt="Photobooth strip" class="max-h-[38dvh] w-auto rounded-xl object-contain shadow-2xl block pointer-events-none" />
            <div data-overlay-layer class="absolute inset-0 overflow-hidden rounded-xl"></div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-1.5 rounded-2xl bg-[#141418]/90 border border-[#F5F0E6]/10 p-2.5">
        <div class="flex items-center gap-1.5">
          <input
            data-text-input
            type="text"
            maxlength="60"
            placeholder="Type text or phone keyboard stickers..."
            class="flex-1 min-w-0 rounded-xl bg-[#0A0A0D] border border-[#F5F0E6]/15 px-3 py-1.5 text-xs text-[#F5F0E6] placeholder-[#A9A396] focus:outline-none focus:border-[#FF2D8B]"
          />
          <button
            data-add-text
            type="button"
            class="tactile-btn shrink-0 rounded-xl bg-[#FF2D8B] px-3 py-1.5 text-xs font-semibold text-[#F5F0E6] cursor-pointer"
          >
            + Add
          </button>
          <button
            data-delete-text
            type="button"
            title="Delete selected"
            class="tactile-btn shrink-0 rounded-xl bg-[#1C1C22] border border-[#F5F0E6]/12 px-2.5 py-1.5 text-xs font-semibold text-[#A9A396] hover:text-[#F5F0E6] cursor-pointer hidden"
          >
            ✕
          </button>
        </div>

        <div data-templates class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"></div>

        <div class="flex items-center justify-between gap-2 pt-0.5">
          <div data-fonts class="flex items-center gap-1 overflow-x-auto no-scrollbar"></div>
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="text-[10px] text-[#A9A396]">Size</span>
            <input
              data-size-slider
              type="range"
              min="18"
              max="120"
              value="44"
              class="w-20 accent-[#FF2D8B] cursor-pointer"
            />
          </div>
        </div>

        <div data-colors class="flex items-center gap-1.5 pt-0.5">
          <input
            data-color-picker
            type="color"
            value="#FFFFFF"
            title="Custom color"
            class="w-6 h-6 rounded-full border border-[#F5F0E6]/25 bg-transparent cursor-pointer shrink-0"
          />
        </div>
      </div>

      <div data-permission-card class="hidden rounded-2xl bg-[#141418] border border-[#F5F0E6]/12 p-3 flex-col gap-2">
        <p class="text-xs text-[#F5F0E6] leading-relaxed">
          Allow <span class="font-semibold text-[#FF2D8B]">StarPhotobooth</span> to export JPEG photos to your device?
        </p>
        <div class="flex items-center justify-end gap-2">
          <button data-perm-deny type="button" class="tactile-btn rounded-full px-3 py-1.5 text-xs font-medium text-[#A9A396] bg-[#1C1C22] cursor-pointer">
            Not Now
          </button>
          <button data-perm-allow type="button" class="tactile-btn rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#F5F0E6] bg-[#FF2D8B] cursor-pointer">
            Allow & Export
          </button>
        </div>
      </div>

      <div class="flex items-center gap-[6px]">
        <button data-retake type="button" class="tactile-btn flex-1 rounded-full bg-[#141418] border border-[#F5F0E6]/15 px-4 py-3 text-xs font-semibold text-[#F5F0E6] hover:border-[#F5F0E6]/35 cursor-pointer">
          Retake
        </button>
        <button data-save type="button" class="tactile-btn flex-[1.4] rounded-full bg-[#FF2D8B] px-4 py-3 text-xs font-semibold text-[#F5F0E6] shadow-[0_0_24px_rgba(255,45,139,0.4)] hover:bg-[#FF4297] cursor-pointer">
          Export JPEG ✦
        </button>
        <button data-share type="button" class="tactile-btn rounded-full bg-[#141418] border border-[#F5F0E6]/15 px-3.5 py-3 text-xs font-semibold text-[#F5F0E6] cursor-pointer">
          Share
        </button>
      </div>
    </div>
  `;

  const sheet = el.querySelector<HTMLElement>('[data-sheet]')!;
  const previewImg = el.querySelector<HTMLImageElement>('[data-preview]')!;
  const overlayLayer = el.querySelector<HTMLElement>('[data-overlay-layer]')!;
  const textInput = el.querySelector<HTMLInputElement>('[data-text-input]')!;
  const addBtn = el.querySelector<HTMLButtonElement>('[data-add-text]')!;
  const deleteBtn = el.querySelector<HTMLButtonElement>('[data-delete-text]')!;
  const templatesEl = el.querySelector<HTMLElement>('[data-templates]')!;
  const fontsEl = el.querySelector<HTMLElement>('[data-fonts]')!;
  const sizeSlider = el.querySelector<HTMLInputElement>('[data-size-slider]')!;
  const colorsEl = el.querySelector<HTMLElement>('[data-colors]')!;
  const colorPicker = el.querySelector<HTMLInputElement>('[data-color-picker]')!;
  const badgeEl = el.querySelector<HTMLElement>('[data-badge]')!;
  const permCard = el.querySelector<HTMLElement>('[data-permission-card]')!;
  const permDeny = el.querySelector<HTMLButtonElement>('[data-perm-deny]')!;
  const permAllow = el.querySelector<HTMLButtonElement>('[data-perm-allow]')!;
  const retakeBtn = el.querySelector<HTMLButtonElement>('[data-retake]')!;
  const saveBtn = el.querySelector<HTMLButtonElement>('[data-save]')!;
  const shareBtn = el.querySelector<HTMLButtonElement>('[data-share]')!;

  function getSelected(): TextOverlay | undefined {
    return overlays.find((o) => o.id === selectedId);
  }

  function syncControlsFromSelected() {
    const sel = getSelected();
    if (sel) {
      textInput.value = sel.text;
      activeFont = sel.fontFamily;
      activeSize = sel.fontSize;
      activeColor = sel.color;
      sizeSlider.value = String(sel.fontSize);
      colorPicker.value = sel.color;
      deleteBtn.classList.remove('hidden');
    } else {
      deleteBtn.classList.add('hidden');
    }
    renderFonts();
  }

  function renderOverlays() {
    overlayLayer.innerHTML = '';
    const stageRect = overlayLayer.getBoundingClientRect();
    const previewScale = stageRect.width > 0 ? stageRect.width / 720 : 0.35;

    for (const item of overlays) {
      const node = document.createElement('div');
      const isSelected = item.id === selectedId;
      const fontCss = FONT_OPTIONS.find((f) => f.id === item.fontFamily)?.css ?? 'sans-serif';
      node.textContent = item.text;
      node.style.position = 'absolute';
      node.style.left = `${item.x * 100}%`;
      node.style.top = `${item.y * 100}%`;
      node.style.transform = 'translate(-50%, -50%)';
      node.style.fontFamily = fontCss;
      node.style.fontWeight = '700';
      node.style.fontSize = `${Math.max(10, Math.round(item.fontSize * previewScale))}px`;
      node.style.color = item.color;
      node.style.textShadow = '0 2px 6px rgba(0,0,0,0.55)';
      node.style.whiteSpace = 'nowrap';
      node.style.cursor = 'grab';
      node.style.padding = '2px 6px';
      node.style.borderRadius = '6px';
      node.style.border = isSelected ? '1.5px dashed #FF2D8B' : '1.5px solid transparent';
      node.style.background = isSelected ? 'rgba(10,10,13,0.35)' : 'transparent';

      node.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        selectedId = item.id;
        syncControlsFromSelected();
        renderOverlays();

        const rect = overlayLayer.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const onMove = (ev: PointerEvent) => {
          item.x = Math.min(0.95, Math.max(0.05, (ev.clientX - rect.left) / rect.width));
          item.y = Math.min(0.95, Math.max(0.05, (ev.clientY - rect.top) / rect.height));
          node.style.left = `${item.x * 100}%`;
          node.style.top = `${item.y * 100}%`;
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });

      overlayLayer.appendChild(node);
    }
  }

  function addOverlay(text: string) {
    const clean = text.trim();
    if (!clean) return;
    const item: TextOverlay = {
      id: `txt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: clean,
      x: 0.5,
      y: 0.45 + (overlays.length % 4) * 0.08,
      fontSize: activeSize,
      fontFamily: activeFont,
      color: activeColor
    };
    overlays.push(item);
    selectedId = item.id;
    textInput.value = '';
    syncControlsFromSelected();
    renderOverlays();
  }

  function renderFonts() {
    fontsEl.innerHTML = '';
    for (const f of FONT_OPTIONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = f.id === activeFont;
      btn.className = `shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold border cursor-pointer ${
        active
          ? 'bg-[#FF2D8B] border-[#FF2D8B] text-[#F5F0E6]'
          : 'bg-[#0A0A0D] border-[#F5F0E6]/12 text-[#A9A396]'
      }`;
      btn.style.fontFamily = f.css;
      btn.textContent = f.label;
      btn.addEventListener('click', () => {
        activeFont = f.id;
        const sel = getSelected();
        if (sel) {
          sel.fontFamily = f.id;
          renderOverlays();
        }
        renderFonts();
      });
      fontsEl.appendChild(btn);
    }
  }

  // Quick stickers & templates
  for (const tpl of QUICK_STICKERS_AND_TEXT) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'tactile-btn shrink-0 rounded-full bg-[#0A0A0D] border border-[#F5F0E6]/12 px-2.5 py-1 text-[11px] font-medium text-[#F5F0E6] hover:border-[#FF2D8B] cursor-pointer';
    btn.textContent = tpl;
    btn.addEventListener('click', () => addOverlay(tpl));
    templatesEl.appendChild(btn);
  }

  // Color swatches
  for (const hex of COLOR_SWATCHES) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'w-5 h-5 rounded-full border border-[#F5F0E6]/30 shrink-0 cursor-pointer';
    swatch.style.background = hex;
    swatch.addEventListener('click', () => {
      activeColor = hex;
      colorPicker.value = hex;
      const sel = getSelected();
      if (sel) {
        sel.color = hex;
        renderOverlays();
      }
    });
    colorsEl.appendChild(swatch);
  }

  colorPicker.addEventListener('input', () => {
    activeColor = colorPicker.value;
    const sel = getSelected();
    if (sel) {
      sel.color = activeColor;
      renderOverlays();
    }
  });

  sizeSlider.addEventListener('input', () => {
    activeSize = Number(sizeSlider.value);
    const sel = getSelected();
    if (sel) {
      sel.fontSize = activeSize;
      renderOverlays();
    }
  });

  textInput.addEventListener('input', () => {
    const sel = getSelected();
    if (sel && textInput.value.trim()) {
      sel.text = textInput.value;
      renderOverlays();
    }
  });

  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOverlay(textInput.value);
    }
  });

  addBtn.addEventListener('click', () => addOverlay(textInput.value));

  deleteBtn.addEventListener('click', () => {
    if (!selectedId) return;
    overlays = overlays.filter((o) => o.id !== selectedId);
    selectedId = null;
    textInput.value = '';
    syncControlsFromSelected();
    renderOverlays();
  });

  overlayLayer.addEventListener('pointerdown', () => {
    selectedId = null;
    syncControlsFromSelected();
    renderOverlays();
  });

  renderFonts();

  function open(photo: CompositedPhoto) {
    currentPhoto = photo;
    overlays = [];
    selectedId = null;
    previewImg.src = photo.dataUrl;
    textInput.value = '';
    saveBtn.textContent = 'Export JPEG ✦';
    badgeEl.textContent = 'READY';
    permCard.classList.add('hidden');
    syncControlsFromSelected();
    renderOverlays();

    el.classList.remove('pointer-events-none');
    gsap.killTweensOf([el, sheet]);
    gsap.to(el, { opacity: 1, duration: 0.22, ease: 'power2.out' });
    gsap.fromTo(sheet, { y: 36, scale: 0.98 }, { y: 0, scale: 1, duration: 0.34, ease: 'power3.out' });
  }

  function close() {
    gsap.killTweensOf([el, sheet]);
    gsap.to(sheet, { y: 28, duration: 0.2, ease: 'power2.in' });
    gsap.to(el, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        el.classList.add('pointer-events-none');
      }
    });
  }

  async function syncAndExport() {
    if (!currentPhoto) return;
    if (overlays.length > 0) {
      const updated = await options.onUpdateOverlays(overlays);
      if (updated) currentPhoto = updated;
    }
    triggerDirectJpegDownload(currentPhoto);
    saveBtn.textContent = 'Exported JPEG ✓';
    badgeEl.textContent = 'EXPORTED';
  }

  saveBtn.addEventListener('click', () => {
    if (!currentPhoto) return;
    const hasPermission = localStorage.getItem(SAVE_PERMISSION_KEY) === 'granted';
    if (!hasPermission) {
      permCard.classList.remove('hidden');
      permCard.classList.add('flex');
      return;
    }
    void syncAndExport();
  });

  permDeny.addEventListener('click', () => {
    permCard.classList.add('hidden');
    permCard.classList.remove('flex');
  });

  permAllow.addEventListener('click', () => {
    localStorage.setItem(SAVE_PERMISSION_KEY, 'granted');
    permCard.classList.add('hidden');
    permCard.classList.remove('flex');
    void syncAndExport();
  });

  shareBtn.addEventListener('click', async () => {
    if (!currentPhoto) return;
    if (overlays.length > 0) {
      const updated = await options.onUpdateOverlays(overlays);
      if (updated) currentPhoto = updated;
    }
    try {
      const file = new File([currentPhoto.blob], currentPhoto.filename, { type: 'image/jpeg' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'StarPhotobooth',
          text: 'Made with StarPhotobooth ✦'
        });
      } else {
        triggerDirectJpegDownload(currentPhoto);
      }
    } catch {
      // User dismissed share sheet
    }
  });

  retakeBtn.addEventListener('click', () => {
    close();
    options.onRetake();
  });

  return { el, open, close };
}
