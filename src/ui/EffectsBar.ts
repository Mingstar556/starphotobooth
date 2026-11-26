import { BOOTH_EFFECTS, type EffectId } from '../engine/effects';

export function createEffectsBar(options: {
  onToggleEffect: (id: EffectId) => boolean;
  onClearAll: () => void;
}): {
  el: HTMLElement;
  sync: (activeIds: EffectId[]) => void;
} {
  let active = new Set<EffectId>();

  const el = document.createElement('div');
  el.className = 'w-full flex items-center gap-[6px] overflow-x-auto no-scrollbar py-[2px]';

  function render() {
    el.innerHTML = '';

    const noneBtn = document.createElement('button');
    noneBtn.type = 'button';
    const noneActive = active.size === 0;
    noneBtn.className = `tactile-btn shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border cursor-pointer ${
      noneActive
        ? 'bg-[#F5F0E6] border-[#F5F0E6] text-[#0A0A0D]'
        : 'bg-[#141418] border-[#F5F0E6]/12 text-[#A9A396]'
    }`;
    noneBtn.textContent = 'Natural ✨';
    noneBtn.addEventListener('click', () => {
      active.clear();
      options.onClearAll();
      render();
    });
    el.appendChild(noneBtn);

    for (const fx of BOOTH_EFFECTS) {
      const isOn = active.has(fx.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tactile-btn shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border cursor-pointer ${
        isOn
          ? 'bg-[#FF2D8B] border-[#FF2D8B] text-[#F5F0E6] shadow-[0_0_16px_rgba(255,45,139,0.35)]'
          : 'bg-[#141418] border-[#F5F0E6]/12 text-[#F5F0E6] hover:border-[#F5F0E6]/25'
      }`;
      btn.innerHTML = `<span>${fx.emoji}</span><span>${fx.label}</span>`;
      btn.addEventListener('click', () => {
        const nextState = options.onToggleEffect(fx.id);
        if (nextState) active.add(fx.id);
        else active.delete(fx.id);
        render();
      });
      el.appendChild(btn);
    }
  }

  render();

  return {
    el,
    sync(activeIds: EffectId[]) {
      active = new Set(activeIds);
      render();
    }
  };
}
