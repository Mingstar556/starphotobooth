import {
  BOOTH_LAYOUTS,
  STRIP_THEMES,
  type BoothLayout,
  type LayoutId,
  type StripTheme
} from '../engine/layouts';

function renderMiniGrid(layout: BoothLayout): string {
  const cells = Array.from({ length: layout.shotCount })
    .map(() => `<span class="rounded-[2px] bg-current opacity-85"></span>`)
    .join('');

  return `
    <span
      class="grid gap-[2px] w-5 h-6 shrink-0"
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
  el.className = 'w-full flex flex-col gap-2.5';

  const layoutRow = document.createElement('div');
  layoutRow.className = 'flex items-center gap-2 overflow-x-auto no-scrollbar px-1 py-0.5';

  const themeRow = document.createElement('div');
  themeRow.className = 'flex items-center justify-between px-1';
  themeRow.innerHTML = `
    <span class="text-[11px] font-medium uppercase tracking-[0.14em] text-[#A9A396]">
      Strip Frame
    </span>
    <div data-themes class="flex items-center gap-2"></div>
  `;

  const themesContainer = themeRow.querySelector<HTMLElement>('[data-themes]')!;

  function renderLayouts() {
    layoutRow.innerHTML = '';
    for (const layout of BOOTH_LAYOUTS) {
      const isSelected = layout.id === activeLayout;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tactile-btn shrink-0 flex items-center gap-2.5 rounded-2xl px-3.5 py-2 border text-left cursor-pointer ${
        isSelected
          ? 'bg-[#FF2D8B] border-[#FF2D8B] text-[#F5F0E6] shadow-[0_0_18px_rgba(255,45,139,0.35)]'
          : 'bg-[#141418] border-[#F5F0E6]/10 text-[#F5F0E6] hover:border-[#F5F0E6]/25'
      }`;
      btn.innerHTML = `
        ${renderMiniGrid(layout)}
        <span class="flex flex-col leading-tight">
          <span class="text-xs font-semibold whitespace-nowrap">${layout.name}</span>
          <span class="text-[10px] ${
            isSelected ? 'text-[#F5F0E6]/90' : 'text-[#A9A396]'
          } whitespace-nowrap">${layout.subtitle}</span>
        </span>
      `;
      btn.addEventListener('click', () => {
        if (activeLayout === layout.id) return;
        activeLayout = layout.id;
        renderLayouts();
        options.onSelectLayout(layout.id);
      });
      layoutRow.appendChild(btn);
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
      btn.className = `tactile-btn flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border cursor-pointer ${
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

  renderLayouts();
  renderThemes();

  el.appendChild(layoutRow);
  el.appendChild(themeRow);

  return {
    el,
    setLayout(id: LayoutId) {
      activeLayout = id;
      renderLayouts();
    },
    setTheme(theme: StripTheme) {
      activeTheme = theme;
      renderThemes();
    }
  };
}
