// ui.js — لایه‌ی DOM: toast/بنر باس، آیکون‌های پیکسلی HUD، منوی ارتقاها
import { t, faNum, getLang } from './i18n.js';
import { UPG, upgradeCost, MEALS } from './app.js';
import { questLabel } from './quests.js';
import { paintIcon, iconEl } from './art/icons.js';
import { CROPS } from './farm.js';
import { ITEMS, SLOTS } from './items.js';
import { rasterToCanvas } from './raster.js';
import { cropSprite } from './tiles.js';

export const $ = (id) => document.getElementById(id);

// ---------- toast ----------
let toastT = null;
export function toast(msg) {
  const el = $('toast');
  el.textContent = msg; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1700);
}

// ---------- بنر باس ----------
let bannerT = null;
export function showBanner(txt, small) {
  const el = $('banner');
  el.textContent = txt || t('bossName') + ' — ' + t('bossFloor');
  el.classList.toggle('small', !!small);
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(bannerT);
  bannerT = setTimeout(() => el.classList.remove('show'), small ? 1600 : 2400);
}

// ---------- آیکون‌های پیکسلی HUD (به‌جای ایموجی) ----------
export function paintSndIcon(muted) { paintIcon($('sndIcon'), muted ? 'sndOff' : 'snd'); }
export function paintHudIcons() {
  paintIcon($('coinIcon'), 'coin');
  paintIcon($('coinIcon2'), 'coin');
  paintIcon($('gemIcon'), 'gem');
  paintIcon($('gemIcon2'), 'gem');
  paintIcon($('gearIcon'), 'gear');
  paintIcon($('sndIcon'), 'snd'); // حالت پیش‌فرض؛ خاموش با paintSndIcon
  paintIcon($('hi-worker'), 'worker');
  paintIcon($('hi-sprinkler'), 'drop');
  paintIcon($('hi-basket'), 'basket');
  for (const type of Object.keys(CROPS)) {
    const cv = $('ci-' + type);
    if (!cv) continue;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, cv.width, cv.height);
    c.drawImage(rasterToCanvas(cropSprite(type, 3)), 0, 0, 16, 16, 0, 0, cv.width, cv.height);
  }
}

// ---------- منوی ارتقاها ----------
const MENU_KINDS = ['land', 'farm2', 'worker', 'wTill', 'wPlant', 'wWater', 'wHarvest', 'wSpeed', 'sprinkler', 'basket', 'hoe', 'can', 'sickle', 'sword', 'armor', 'boots', 'fert'];

export function buildMenu(app, hooks) {
  const list = $('menuList');
  list.innerHTML = '';
  // ---- مأموریت‌های چرخان ----
  const qh = document.createElement('div');
  qh.className = 'mealHead';
  qh.textContent = t('questsTitle');
  list.appendChild(qh);
  for (const q of (app.s.quests || [])) {
    const row = document.createElement('div');
    row.className = 'upgRow';
    row.innerHTML = `<div class="upgInfo"><b>${questLabel(q)}</b>` +
      `<span class="qProg">${faNum(Math.min(q.cur, q.n))}/${faNum(q.n)}</span></div>` +
      `<span class="qRw">+${faNum(q.rn)}</span>`;
    row.querySelector('.qRw').appendChild(iconEl(q.rcur === 'coins' ? 'coin' : 'gem', 14));
    list.appendChild(row);
  }
  for (const kind of MENU_KINDS) {
    const u = UPG[kind], lvl = app.s.upgrades[kind];
    const row = document.createElement('div');
    row.className = 'upgRow';
    const maxed = lvl >= u.max;
    // نقطه‌های سطح با CSS (بدون نویسه‌های تصویری)
    let dots = '';
    for (let i = 0; i < u.max; i++) dots += `<i class="lvlDot${i < lvl ? ' on' : ''}"></i>`;
    row.innerHTML =
      `<div class="upgInfo"><b>${u.name[getLang()]}</b>` +
      `<span class="dots">${dots}</span>` +
      `<small>${t('fx_' + kind)}</small></div>` +
      `<button class="btn upgBuy ${maxed ? 'maxed' : app.canBuy(kind) ? 'can' : ''}">${maxed ? t('maxed') : `<span class="cost">${faNum(upgradeCost(kind, lvl))}</span>`}</button>`;
    if (!maxed) {
      const btn = row.querySelector('button');
      btn.appendChild(iconEl(u.cur === 'coins' ? 'coin' : 'gem', 14));
      btn.addEventListener('click', () => hooks.onBuy(kind));
    }
    list.appendChild(row);
  }
  // ---- آیتم‌های پوشیدنی: هر جا یک پوشیده + بقیه‌ی موجودی ----
  const ih = document.createElement('div');
  ih.className = 'mealHead';
  ih.textContent = t('equipTitle');
  list.appendChild(ih);
  const owned = app.s.items || {};
  const eq = app.s.equipped || {};
  let anyItem = false;
  for (const slot of SLOTS) {
    const ids = Object.keys(owned).filter((id) => ITEMS[id] && ITEMS[id].slot === slot && owned[id] > 0);
    if (!ids.length) continue;
    anyItem = true;
    for (const id of ids) {
      const it = ITEMS[id];
      const row = document.createElement('div');
      row.className = 'upgRow';
      const worn = eq[slot] === id;
      const stat = (it.stat.dmg ? '+' + faNum(it.stat.dmg) + ' ' + t('statDmg') + ' · ' : '') + (it.stat.hp ? '+' + faNum(it.stat.hp) + ' ' + t('statHp') + ' · ' : '') + (it.stat.speed ? '+' + faNum(Math.round(it.stat.speed * 100)) + '% ' + t('statSpd') + ' · ' : '') + (it.stat.crit ? '+' + faNum(Math.round(it.stat.crit * 100)) + '% ' + t('statCrit') : '');
      row.innerHTML =
        `<div class="upgInfo"><b>${it.name[getLang()]} <small style="opacity:.6">${t('slot_' + slot)} · ${t('tier')} ${faNum(it.tier)}</small></b>` +
        `<small>${stat || '—'} ×${faNum(owned[id])}</small></div>` +
        `<button class="btn upgBuy ${worn ? 'maxed' : 'can'}">${worn ? t('equipped2') : t('equipBtn')}</button>`;
      if (!worn) {
        const btn = row.querySelector('button');
        btn.addEventListener('click', () => hooks.onEquip(slot, id));
      }
      list.appendChild(row);
    }
  }
  if (!anyItem) {
    const row = document.createElement('div');
    row.className = 'upgRow';
    row.innerHTML = `<div class="upgInfo"><small>${t('noItems')}</small></div>`;
    list.appendChild(row);
  }
  // ---- غذای سفر: محصول → باف دور بعد ----
  const head = document.createElement('div');
  head.className = 'mealHead';
  head.textContent = t('mealsTitle');
  list.appendChild(head);
  for (const kind of Object.keys(MEALS)) {
    const m = MEALS[kind];
    const row = document.createElement('div');
    row.className = 'upgRow';
    const equipped = app.s.buff === kind;
    const can = app.s.inventory[m.crop] >= m.n;
    row.innerHTML =
      `<div class="upgInfo"><b>${m.name[getLang()]}</b>` +
      `<small>${t(m.fx)}</small></div>` +
      `<button class="btn upgBuy ${equipped ? 'maxed' : can ? 'can' : ''}">${equipped ? t('equipped') : `<span class="cost">${faNum(m.n)}</span>`}</button>`;
    if (!equipped) {
      const btn = row.querySelector('button');
      // آیکون پیکسلی محصول (به‌جای ایموجی)
      const cv2 = document.createElement('canvas');
      cv2.width = 14; cv2.height = 14; cv2.className = 'pico';
      const c2 = cv2.getContext('2d');
      c2.imageSmoothingEnabled = false;
      c2.drawImage(rasterToCanvas(cropSprite(m.crop, 3)), 0, 0, 16, 16, 0, 0, 14, 14);
      btn.appendChild(cv2);
      btn.addEventListener('click', () => hooks.onMeal(kind));
    }
    list.appendChild(row);
  }
  $('statsLine').textContent = t('statsLine')
    .replace('{b}', faNum(app.s.stats.bestFloor)).replace('{k}', faNum(app.s.stats.kills))
    .replace('{d}', faNum(app.s.stats.deaths)).replace('{r}', faNum(app.s.stats.runs));
}
