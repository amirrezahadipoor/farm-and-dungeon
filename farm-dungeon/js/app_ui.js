// app_ui.js — چسب DOM رابط کاربری: منوی ارتقا/تجهیز، دکمه‌های بذر و اقدام،
// خوش‌آمد آفلاین — همه‌ی لمس‌های DOM در یک جا؛ حلقه/بوت در main_app.js می‌ماند
// (محراب در ui_shrine.js · HUD در ui_hud.js — ن۳۴)
import { t, setLang, toggleLang, onLangChange, applyTranslations, faNum, getLang } from './i18n.js';
import { $, toast, buildMenu, paintHudIcons, paintSndIcon } from './ui.js';
import { equipStats, equipSig } from './items.js';
import { CROPS } from './farm.js';
import { resetSave } from './save.js';
import { playSfx, setMute, unlockAudio } from './sfx/sounds.js';
import { makeShrine } from './ui_shrine.js';
import { makeHud } from './ui_hud.js';

export function initAppUI(env) {
  // env: { app, farmScene, saveNow, getRun, getScene, input }
  const { app, farmScene, saveNow } = env;

  // ---------- محراب باستانی (ui_shrine.js) ----------
  const shrine = makeShrine();

  // ---------- منوی ارتقاها + تجهیز ----------
  function syncEquip() { // آمار تجهیز → کش (صفر تخصیص در حلقه) + مزرعه
    app._eqSig = equipSig(app.s.equipped);
    app._eqStats = equipStats(app.s.equipped);
    farmScene.equip = app.s.equipped;
    farmScene.equipSig = app._eqSig;
  }
  const menuHooks = {
    onEquip(slot, id) {
      playSfx('ui');
      if (!app.s.equipped) app.s.equipped = {};
      app.s.equipped[slot] = (app.s.equipped[slot] === id) ? null : id;
      syncEquip();
      refreshHud(true);
      buildMenu(app, menuHooks);
      saveNow();
    },
    onMeal(kind) {
      if (app.buyMeal(kind)) { playSfx('apple'); buildMenu(app, menuHooks); refreshHud(true); saveNow(); }
      else toast(t('needCrops'));
    },
    onBuy(kind) {
      if (app.buy(kind)) { playSfx('upgrade'); buildMenu(app, menuHooks); refreshHud(true); saveNow(); }
      else toast(t('noCoins'));
    },
  };
  function buildMenuIfOpen() { if ($('menu').classList.contains('show')) buildMenu(app, menuHooks); }
  $('menuBtn').addEventListener('click', () => { playSfx('ui'); buildMenu(app, menuHooks); $('menu').classList.add('show'); });
  $('menuClose').addEventListener('click', () => { playSfx('ui'); $('menu').classList.remove('show'); });
  $('resetBtn').addEventListener('click', () => {
    if (confirm(t('resetSure'))) {
      resetSave();
      location.reload();
    }
  });

  // ---------- دکمه‌های مزرعه (بذر/فروش/مهارت/جهش/زبان) ----------
  function syncSeedButtons() { // بذرهای باغ شمالی فقط بعد از خرید دیده شوند
    const f2 = !!app.s.upgrades.farm2;
    for (const type of Object.keys(CROPS)) {
      if (!CROPS[type].farm2) continue;
      const b = $('s-' + type); if (b) b.hidden = !f2;
    }
    document.querySelectorAll('.chip.f2').forEach((el) => { el.style.display = f2 ? '' : 'none'; });
  }
  for (const type of Object.keys(CROPS)) {
    $('s-' + type).addEventListener('click', () => {
      playSfx('ui');
      if (CROPS[type].farm2 && !app.s.upgrades.farm2) { toast(t('orchardOnly')); return; }
      app.s.selectedCrop = type;
      for (const k of Object.keys(CROPS)) $('s-' + k).classList.toggle('on', k === type);
    });
  }
  $('sell').addEventListener('click', () => farmScene.sellAll());
  $('skill').addEventListener('click', () => { const r = env.getRun(); if (r) r.trySkill(); });
  $('dash').addEventListener('click', () => {
    const run = env.getRun();
    if (!run) return;
    let dx = 0, dy = 0;
    const k = env.input.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) dy -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) dy += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) dx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) dx += 1;
    if (!dx && !dy) { dx = run.hero.dir === 'left' ? -1 : run.hero.dir === 'right' ? 1 : 0; dy = run.hero.dir === 'up' ? -1 : run.hero.dir === 'down' ? 1 : 0; }
    run.tryDash(dx, dy);
  });
  $('lang').addEventListener('click', () => { playSfx('ui'); toggleLang(); buildMenuIfOpen(); });
  onLangChange(applyTranslations);
  applyTranslations();
  for (const type of Object.keys(CROPS)) $('s-' + type).classList.toggle('on', type === app.s.selectedCrop);
  syncSeedButtons();
  setLang(app.s.lang === 'en' ? 'en' : 'fa');
  syncEquip();
  paintHudIcons();
  // ---- صدا: بازیابی حالت خاموش + دکمه‌ی بلندگو (ن۳۳) ----
  setMute(!!app.s.mute);
  paintSndIcon(!!app.s.mute);
  $('sndBtn').addEventListener('click', () => {
    app.s.mute = app.s.mute ? 0 : 1;
    setMute(!!app.s.mute);
    paintSndIcon(!!app.s.mute);
    unlockAudio();
    toast(t(app.s.mute ? 'sndOff' : 'sndOn'));
    playSfx('ui');
    saveNow();
  });

  // ---------- خوش‌آمد آفلاین ----------
  {
    const away = (Date.now() - (app.s.lastSeen || Date.now())) / 1000;
    const rep = app.simulateOffline(away);
    if (rep && rep.earned > 0) {
      const h = Math.floor(rep.sec / 3600), m = Math.floor((rep.sec % 3600) / 60);
      $('wbTime').textContent = (h ? faNum(h) + ' ' + t('hour') + ' ' : '') + faNum(m) + ' ' + t('minute');
      $('wbEarn').textContent = '+' + faNum(rep.earned);
      $('wbDetail').textContent = t('wbDetail').replace('{p}', faNum(rep.planted)).replace('{h}', faNum(rep.harvested));
      $('welcome').classList.add('show');
      $('welcome').addEventListener('click', () => $('welcome').classList.remove('show'), { once: true });
    }
  }

  // ---------- HUD (ui_hud.js) ----------
  const hud = makeHud({ app, getScene: env.getScene, getRun: env.getRun, syncSeeds: syncSeedButtons });
  const refreshHud = hud.refreshHud;

  return { refreshHud, syncEquip, syncSeedButtons, buildMenuIfOpen, openShrine: shrine.openShrine, closeShrine: shrine.closeShrine, isShrineOpen: shrine.isShrineOpen, menuHooks };
}
