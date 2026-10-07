// ui_hud.js — تازه‌سازی HUD مزرعه/دانجن (جداسازی از app_ui.js — ن۳۴)
// چک عددی Float64Array بدون رشته/تخصیص — حالت پایدار: صفر زباله در هر فریم
import { faNum, getLang } from './i18n.js';
import { $ } from './ui.js';
import { CROPS } from './farm.js';

export function makeHud(env) {
  // env: { app, getScene, getRun }
  const app = env.app;
  let shownCoins = null;
  const _fs = new Float64Array(20); let _fn = 0;
  function refreshHud(force) {
    if (env.getScene() === 'farm') {
      let sellTotal = 0, seedSum = 0;
      for (const k of Object.keys(CROPS)) { sellTotal += app.s.inventory[k] * CROPS[k].sell; seedSum += app.s.seeds ? (app.s.seeds[k] || 0) : 0; }
      _fn = 0;
      let dirty = force;
      const chk = (v) => { if (_fs[_fn] !== v) { _fs[_fn] = v; dirty = true; } _fn++; };
      chk(app.s.coins); chk(app.s.essence); chk(sellTotal); chk(app.s.upgrades.land);
      chk(app.s.upgrades.farm2 ? 1 : 0); chk(seedSum); chk(app.s.inventory.apple | 0); chk(getLang() === 'fa' ? 1 : 0);
      for (const k of Object.keys(CROPS)) chk(app.s.inventory[k] | 0);
      if (!dirty) return;
      {
        env.syncSeeds(); // بذرهای باغ شمالی: نمایانی به‌روز (هر مسیر خریدی)
        if (shownCoins == null) shownCoins = app.s.coins;
        $('essN').textContent = faNum(app.s.essence);
        $('sellTotal').textContent = '+' + faNum(sellTotal);
        for (const k of Object.keys(CROPS)) {
          $('i-' + k).textContent = faNum(app.s.inventory[k]);
          $('pr-' + k).textContent = faNum(app.s.seeds ? app.s.seeds[k] : 0); // شمارنده‌ی بذر — خریدنی نیست!
          $('s-' + k).classList.toggle('dim', !app.s.seeds || app.s.seeds[k] <= 0);
        }
        $('landN').textContent = faNum(app.s.upgrades.land);
        if (Math.abs(shownCoins - app.s.coins) >= 1) { // انیمیشن شمارش
          shownCoins += (app.s.coins - shownCoins) * 0.25;
          if (Math.abs(shownCoins - app.s.coins) < 1) shownCoins = app.s.coins;
          $('coinN').textContent = faNum(Math.round(shownCoins));
        } else $('coinN').textContent = faNum(app.s.coins);
        for (const h of ['worker', 'sprinkler', 'basket']) $('hl-' + h).textContent = app.s.upgrades[h] ? 'Lv' + faNum(app.s.upgrades[h]) : '—';
      }
    } else {
      const run = env.getRun();
      if (run) {
        const h = run.hero;
        const boss = run.dungeon.enemies.find((e) => e.isBoss && e.state !== 'die');
        _fn = 0;
        let dirty = force;
        const chk = (v) => { if (_fs[_fn] !== v) { _fs[_fn] = v; dirty = true; } _fn++; };
        chk(h.hp); chk(run.floor); chk(run.essence); chk(run.kills);
        chk(Math.ceil(h.skillCd * 10)); chk(Math.ceil(h.dashCd * 10)); chk(boss ? Math.ceil(boss.hp) : -1);
        if (!dirty) return;
        {
          $('hpFill2').style.width = Math.max(0, Math.round(h.hp / h.maxHp * 100)) + '%';
          $('floorN').textContent = faNum(run.floor);
          $('essN').textContent = faNum(app.s.essence + run.essence);
          $('essN2').textContent = faNum(run.essence);
          $('killN').textContent = faNum(run.kills);
          $('skill').style.setProperty('--cd', Math.min(1, h.skillCd / 5));
          $('dash').style.setProperty('--cd', Math.min(1, h.dashCd / 2.2));
          $('skill').classList.toggle('ready', h.skillCd <= 0);
          $('dash').classList.toggle('ready', h.dashCd <= 0);
          if (boss) { $('bossBar').classList.add('show'); $('bossFill').style.width = Math.round(boss.hp / boss.maxHp * 100) + '%'; }
          else $('bossBar').classList.remove('show');
        }
      }
    }
  }
  return { refreshHud };
}
