// ui_shrine.js — محراب باستانی: پنجره‌ی انتخاب برکت (جداسازی از app_ui.js — ن۳۴)
// نزدیکش که بروی باز می‌شود (مزرعه‌ی main در حلقه چک می‌کند)؛ انتخاب = برکتِ فقط همین دور
import { t } from './i18n.js';
import { playSfx } from './sfx/sounds.js';

export function makeShrine() {
  let open = false;
  function box() {
    let el = document.getElementById('shrineBox');
    if (!el) {
      el = document.createElement('div');
      el.id = 'shrineBox'; el.className = 'shrineBox';
      document.body.appendChild(el);
    }
    return el;
  }
  function openShrine(run) {
    const POOL = ['dmg', 'hp', 'speed', 'crit', 'greed', 'range'];
    const a = POOL[(Math.random() * POOL.length) | 0];
    let b = POOL[(Math.random() * POOL.length) | 0];
    while (b === a) b = POOL[(Math.random() * POOL.length) | 0];
    const el = box();
    el.innerHTML = '<h4>' + t('shrineTitle') + '</h4><div class="boons"></div>';
    const boons = el.querySelector('.boons');
    for (const id of [a, b]) {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = t('boon_' + id);
      btn.addEventListener('click', () => {
        playSfx('upgrade');
        run.applyBoon(id);
        const sh = run.dungeon.shrine;
        sh.used = true;
        run.fx.burst(sh.x, sh.y - 6, [[150, 225, 255, 255], [255, 255, 255, 255]], 16, { sp: 48, up: 24, life: 0.55 });
        closeShrine();
      });
      boons.appendChild(btn);
    }
    el.classList.add('show');
    playSfx('shrine');
    open = true;
  }
  function closeShrine() {
    box().classList.remove('show');
    open = false;
  }
  return { openShrine, closeShrine, isShrineOpen: () => open };
}
