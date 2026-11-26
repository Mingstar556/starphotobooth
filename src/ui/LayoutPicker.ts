import gsap from 'gsap';
import {
  BOOTH_LAYOUTS,
  getLayoutById,
  STRIP_THEMES,
  type BoothLayout,
  type LayoutId,
  type StripTheme
} from '../engine/layouts';

function renderMiniGrid(layout: BoothLayout, large = false): string {
  const cells = Array.from({ length: layout.shotCount })
    .map(() => `<span class="rounded-[3px] bg-current opacity-85"></span>`)
    .join('');

  const sizeClass = large ? 'w-[72px] h-[88px] gap-[4px]' : 'w-5 h-6 gap-[2px]';

  return `
    <span
      class="grid ${sizeClass} shrink-0"
      style="grid-template-columns: repeat(${layout.cols}, minmax(0, 1fr)); grid-template-rows: repeat(${layout.rows}, minmax(0, 1fr));"
    >
      ${cells}
    </span>
  `;
}

export function createLayoutPicker(options: {
  initialLayout: LayoutId;
  initialTheme: StripTheme;
  onSelectLayout: (id: LayoutId) => void;
  onSelectTheme: (theme: StripTheme) => void;
}): {
  el: HTMLElement;
  setLayout: (id: LayoutId) => void;
  setTheme: (theme: StripTheme) => void;
} {
  let activeLayout = options.initialLayout;
  let activeTheme = options.initialTheme;

  const el = document.createElement('div');
  el.className = 'w-full flex flex-col gap-[6px]';

  // Compact bar: active layout trigger + slide-up button + scrollable themes
  const topRow = document.createElement('div');
  topRow.className = 'flex items-center gap-[6px]';

  const triggerBtn = document.createElement('button');
  triggerBtn.type = 'button';
  triggerBtn.className =
    'tactile-btn shrink-0 flex items-center gap-2 rounded-xl px-2.5 py-1.5 bg-[#FF2D8B] text-[#F5F0E6] shadow-[0_0_16px_rgba(255,45,139,0.3)] cursor-pointer';

  const themesContainer = document.createElement('div');
  themesContainer.className = 'flex items-center gap-[6px] overflow-x-auto no-scrollbar py-[2px] flex-1';

  topRow.appendChild(triggerBtn);
  topRow.appendChild(themesContainer);
  el.appendChild(topRow);

  // Slide-up 2-column layout drawer
  const drawer = document.createElement('div');
  drawer.className =
    'fixed inset-0 z-40 flex items-end justify-center bg-[#0A0A0D]/80 backdrop-blur-lg p-3 safe-bottom opacity-0 pointer-events-none';
  drawer.innerHTML = `
    <div data-drawer-card class="w-full max-w-md bezel-outer transform translate-y-12">
      <div class="bezel-inner p-4 flex flex-col gap-3 max-h-[72dvh]">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-display text-base font-bold text-[#F5F0E6]">Choose Layout</h3>
            <p class="text-[11px] text-[#A9A396]">Tap any booth grid or strip</p>
          </div>
          <button
            data-close
            type="button"
            class="tactile-btn rounded-full bg-[#1C1C22] border border-[#F5F0E6]/12 px-3 py-1 text-xs font-semibold text-[#F5F0E6] cursor-pointer"
          >
            Done ▾
          </button>
        </div>
        <div data-grid class="flex items-stretch gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2 px-1"></div>
      </div>
    </div>
  `;
  document.body.appendChild(drawer);

  const drawerCard = drawer.querySelector<HTMLElement>('[data-drawer-card]')!;
  const closeBtn = drawer.querySelector<HTMLButtonElement>('[data-close]')!;
  const gridEl = drawer.querySelector<HTMLElement>('[data-grid]')!;

  function openDrawer() {
    drawer.classList.remove('pointer-events-none');
    gsap.killTweensOf([drawer, drawerCard]);
    gsap.to(drawer, { opacity: 1, duration: 0.2, ease: 'power2.out' });
    gsap.fromTo(
      drawerCard,
      { y: 48 },
      { y: 0, duration: 0.34, ease: 'power3.out' }
    );
  }

  function closeDrawer() {
    gsap.killTweensOf([drawer, drawerCard]);
    gsap.to(drawerCard, { y: 40, duration: 0.2, ease: 'power2.in' });
    gsap.to(drawer, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        drawer.classList.add('pointer-events-none');
      }
    });
  }

  triggerBtn.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', closeDrawer);
  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) closeDrawer();
  });

  function renderTrigger() {
    const current = getLayoutById(activeLayout);
    triggerBtn.innerHTML = `
      ${renderMiniGrid(current)}
      <span class="text-xs font-bold whitespace-nowrap">${current.name}</span>
      <span class="text-[10px] opacity-90">▴</span>
    `;
  }

  function renderGrid() {
    gridEl.innerHTML = '';
    for (const layout of BOOTH_LAYOUTS) {
      const isSelected = layout.id === activeLayout;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `layout-card snap-center shrink-0 min-w-[116px] flex flex-col items-center justify-between gap-2.5 rounded-2xl p-3 border text-center cursor-pointer transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-[1.04] active:scale-95 ${
        isSelected
          ? 'bg-[#FF2D8B] border-[#FF2D8B] text-[#F5F0E6] shadow-[0_8px_24px_rgba(255,45,139,0.45)] scale-[1.02]'
          : 'bg-[#141418] border-[#F5F0E6]/12 text-[#F5F0E6] hover:border-[#FF2D8B]/60 hover:bg-[#1C1C22] hover:shadow-[0_6px_20px_rgba(0,0,0,0.45)]'
      }`;
      btn.innerHTML = `
        <span class="flex items-center justify-center rounded-xl p-2 ${
          isSelected ? 'bg-[#0A0A0D]/20' : 'bg-[#0A0A0D]/50'
        }">
          ${renderMiniGrid(layout, true)}
        </span>
        <span class="flex flex-col leading-tight w-full">
          <span class="text-xs font-bold truncate">${layout.name}</span>
          <span class="text-[10px] mt-0.5 ${
            isSelected ? 'text-[#F5F0E6]/90' : 'text-[#A9A396]'
          } truncate">${layout.subtitle}</span>
        </span>
      `;
      btn.addEventListener('click', () => {
        activeLayout = layout.id;
        gsap.fromTo(
          btn,
          { scale: 0.9 },
          { scale: 1.05, duration: 0.18, ease: 'back.out(2.5)', yoyo: true, repeat: 1 }
        );
        renderTrigger();
        renderGrid();
        options.onSelectLayout(layout.id);
        setTimeout(closeDrawer, 140);
      });
      gridEl.appendChild(btn);
    }
  }

  function renderThemes() {
    themesContainer.innerHTML = '';
    (Object.keys(STRIP_THEMES) as StripTheme[]).forEach((themeId) => {
      const t = STRIP_THEMES[themeId];
      const isSelected = themeId === activeTheme;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.ariaLabel = `${t.label} frame`;
      btn.className = `tactile-btn shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border cursor-pointer ${
        isSelected
          ? 'border-[#FF2D8B] bg-[#1C1C22] text-[#F5F0E6]'
          : 'border-[#F5F0E6]/10 bg-[#141418] text-[#A9A396]'
      }`;
      btn.innerHTML = `
        <span class="w-3 h-3 rounded-full border border-[#F5F0E6]/30" style="background:${t.bg}"></span>
        <span>${t.label}</span>
      `;
      btn.addEventListener('click', () => {
        if (activeTheme === themeId) return;
        activeTheme = themeId;
        renderThemes();
        options.onSelectTheme(themeId);
      });
      themesContainer.appendChild(btn);
    });
  }

  renderTrigger();
  renderGrid();
  renderThemes();

  return {
    el,
    setLayout(id: LayoutId) {
      activeLayout = id;
      renderTrigger();
      renderGrid();
    },
    setTheme(theme: StripTheme) {
      activeTheme = theme;
      renderThemes();
    }
  };
}
