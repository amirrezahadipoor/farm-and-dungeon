// main_scene.js — وضعیت صحنه و تعویض مزرعه⇄دانجن (جداسازی از main_app.js — ن۳۴):
// گذار مشکی (fade)، ورود/خروج از دانجن، و «پایان دور» — واریز یک‌باره‌ی گوهر/آمار/مأموریت
// (ن۳۴: باگ مخفی — مرگ→تلاش‌دوباره، مأموریت‌ها و بهترین طبقه را می‌بلعید یا دوبار می‌شمرد)
import { t, faNum, getLang } from './i18n.js';
import { Run } from './run.js';
import { MEALS } from './app.js';
import { ITEMS } from './items.js';
import { questLabel } from './quests.js';
import { $, toast } from './ui.js';
import { playSfx } from './sfx/sounds.js';

export function initScenes(env) {
  // env: { app, farmScene, saveNow, getView, getUI }
  const { app, farmScene, saveNow } = env;
  let run = null;
  let scene = 'farm';
  let fade = 0; // 0 = سیاه، 1 = کاملاً روشن — بوت با fade-in از تاریکی شروع می‌شود
  let fadeDir = 1, fadeMid = null; // ظهور در بوت
  window.__getRun = () => run;  // برای تست
  window.__getFade = () => fade; // برای تست

  function transition(mid) {
    if (fadeDir < 0) return; // در حال محو شدن: تعویض جدید را دور بریز
    if (fadeDir > 0) fade = 1; // در حال ظهور: فوری روشن و تعویض جدید
    fadeDir = -1; fadeMid = mid;
  }

  function enterDungeon() {
    transition(() => {
      saveNow();
      app.s.stats.runs++;
      const meal = app.s.buff ? MEALS[app.s.buff] : null; // غذا هنگام ورود مصرف می‌شود
      run = new Run((Date.now() % 100000) | 0, { swordLvl: app.s.upgrades.sword, armorLvl: app.s.upgrades.armor, bootsLvl: app.s.upgrades.boots, meal: meal ? meal.buff : null, equip: app.s.equipped });
      if (meal) { app.s.buff = null; toast(t('buffOn') + ' ' + meal.name[getLang()]); }
      run.view = env.getView();
      run.onSfx = (n) => playSfx(n);
      playSfx('gate'); // گذر از دروازه
      scene = 'dungeon';
      document.body.classList.add('inDungeon');
      toast(t('floor') + ' 1');
    });
  }

  // پایان دور (مرگ یا خروج): گوهر/آمار/مأموریت — فقط یک‌بار (تلاش‌دوباره فلگ را نو می‌کند)
  function bankRun() {
    if (!run || run._banked) return;
    run._banked = true;
    const got = app.bankEssence(run);
    app.s.stats.bestFloor = Math.max(app.s.stats.bestFloor, run.floor);
    app.s.stats.kills += run.kills;
    if (got > 0) toast('+' + faNum(got) + ' ' + t('essence'));
    const qs = [...app.track('kill', run.kills), ...app.track('elite', run.eliteKills || 0), ...app.track('floor', run.floor), ...app.track('combo', run._maxCombo || 0)];
    for (const q of qs) toast(t('questDone') + ' — ' + questLabel(q));
    if (qs.length) { playSfx('quest'); env.getUI().buildMenuIfOpen(); }
  }

  function exitDungeon() {
    transition(() => {
      if (run) {
        bankRun();
        // ---- بانک غنیمت: سکه/بذر/آیتم (بعد از مرگ: نصف‌شده؛ بعد از تلاش‌دوباره: انباشته) ----
        const banked = app.bankLoot(run);
        if (banked.coins || banked.seedN) toast(t('lootSummary').replace('{c}', faNum(banked.coins)).replace('{s}', faNum(banked.seedN)));
        for (const k in (banked.items || {})) toast(t('gotItem') + ' ' + (ITEMS[k] ? ITEMS[k].name[getLang()] : k));
      }
      run = null; scene = 'farm';
      farmScene.fx.burst(farmScene.hero.x, farmScene.hero.y - 8, [[150, 145, 165, 200], [90, 85, 105, 200]], 12, { sp: 30, up: 15, life: 0.5 }); // پاف بازگشت
      document.body.classList.remove('inDungeon');
      $('dead').classList.remove('show');
      saveNow();
    });
  }

  $('exitD').addEventListener('click', () => exitDungeon());
  $('retry').addEventListener('click', () => {
    if (run) { run.restart(); run.view = env.getView(); }
    $('dead').classList.remove('show');
  });
  $('toFarm').addEventListener('click', () => exitDungeon());

  // تیره‌سازی پیکسلی گذار + تیک fade — از حلقه‌ی اصلی صدا می‌شود
  function applyFade(sc, dt) {
    if (fade < 0.99) { // گذار مشکی — مقدار تاریکی = 1 - fade
      const dark = 1 - fade;
      const a = Math.round(dark * 255);
      for (let i = 0; i < sc.d.length; i += 4) {
        if (sc.d[i + 3] < 8) { sc.d[i] = 10; sc.d[i + 1] = 8; sc.d[i + 2] = 24; sc.d[i + 3] = a; }
        else { sc.d[i] = sc.d[i] * (1 - dark) + 10 * dark; sc.d[i + 1] = sc.d[i + 1] * (1 - dark) + 8 * dark; sc.d[i + 2] = sc.d[i + 2] * (1 - dark) + 24 * dark; }
      }
    }
    if (fadeDir !== 0) {
      fade += fadeDir * Math.min(1, dt / 0.22);
      if (fadeDir < 0 && fade <= 0) { fade = 0; fadeDir = 1; if (fadeMid) { fadeMid(); fadeMid = null; } }
      else if (fadeDir > 0 && fade >= 1) { fade = 1; fadeDir = 0; }
    }
  }

  return { enterDungeon, exitDungeon, bankRun, getRun: () => run, getScene: () => scene, getFade: () => fade, applyFade };
}
