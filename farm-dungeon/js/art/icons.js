// icons.js — آیکون‌های پیکسلی UI (به‌جای ایموجی) — همه با کد ترسیم می‌شوند
// هر آیکون = گرید کاراکتری + پالت رنگ؛ روی بوم مقیاس‌پذیر نقاشی می‌شود

const LIB = {
  coin: {
    pal: { o: '#8a5a1e', y: '#e6b34d', Y: '#ffe89a', d: '#c4922e' },
    rows: [
      '................',
      '.....oooooo.....',
      '....oyyyyyyo....',
      '...oyyYYYYyyo...',
      '..oyYyyyyyyYyo..',
      '..oyYyyyyyyyYo..',
      '..oyYyyyydddYo..',
      '..oyYyyyydddYo..',
      '..oyYyyyydddYo..',
      '..oyYyyyyyyyYo..',
      '..oyYyyyyyyYyo..',
      '...oyyYYYYyyo...',
      '....oyyyyyyo....',
      '.....oooooo.....',
      '................',
      '................',
    ],
  },
  gem: {
    pal: { g: '#1f8a72', W: '#d8fff4', C: '#43d6b5', c: '#2aa98c' },
    rows: [
      '................',
      '.....gggggg.....',
      '....gWWCCWCg....',
      '...gWCCCCCCCg...',
      '..gWCCcCCCcCCg..',
      '..gWCCCCCCCCCg..',
      '..gWCCcCCCcCCg..',
      '...gWCCCCCCCg...',
      '...gWCCcCCCcg...',
      '....gWCCCCCg....',
      '....gWCCcCCg....',
      '.....gWCCCg.....',
      '.....gWCcCg.....',
      '......gWCg......',
      '.......gg.......',
      '................',
    ],
  },
  snd: {
    pal: { x: '#b9c2d4', W: '#e8edf7', y: '#43d6b5' },
    rows: [
      '................',
      '.......xx.......',
      '......xxx..y....',
      '.....Wxxx..yy...',
      '....WWxxx...yy..',
      '....WWxxx....yy.',
      '....WWxxx....yy.',
      '....WWxxx....yy.',
      '....WWxxx....yy.',
      '.....Wxxx...yy..',
      '......xxx..yy...',
      '.......xx..y....',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  sndOff: {
    pal: { x: '#b9c2d4', W: '#e8edf7', r: '#d4506a' },
    rows: [
      '................',
      '.......xx.......',
      '......xxx.......',
      '.....Wxxx.......',
      '....WWxxx.r..r..',
      '....WWxxx..rr...',
      '....WWxxx...r...',
      '....Wxxx...rr...',
      '....Wxxx..r..r..',
      '.....xxx........',
      '......xxx.......',
      '.......xx.......',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  gear: {
    pal: { x: '#7c8698', y: '#b9c2d4', Y: '#e8edf7', d: '#5a6375' },
    rows: [
      '................',
      '...x...xx...x...',
      '...xx.xxxx.xx...',
      '....xxYYyyxx....',
      '..xxxYyyyyYxxx..',
      '..xxYyyyyyyyYx..',
      '..xYyyyyyyyyyYx.',
      '..xYyyyyyyyyyx..',
      '..xYyyyyyyyyyx..',
      '..xYyyyyyyyyyYx.',
      '..xxYyyyyyyyYx..',
      '..xxxYyyyyYxxx..',
      '....xxYYyyxx....',
      '...xx.xxxx.xx...',
      '...x...xx...x...',
      '................',
    ],
  },
  worker: {
    pal: { h: '#d9a441', H: '#b5832c', s: '#f0c8a0', e: '#3a2e20', b: '#4e7a3a', B: '#3a5c2b' },
    rows: [
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '..hHhhhhhhhhHh..',
      '....ssssssss....',
      '....sesssses....',
      '....ssssssss....',
      '.....ssssss.....',
      '....bbbbbbbb....',
      '...BbbbbbbbbB...',
      '...sBbbbbbbBs...',
      '....BbbbbbbB....',
      '....BB....BB....',
      '....ss....ss....',
      '................',
    ],
  },
  drop: {
    pal: { W: '#d8f2ff', w: '#4aa8e0', d: '#2f7fb8' },
    rows: [
      '................',
      '.......W........',
      '.......WW.......',
      '......WWww......',
      '......Wwww......',
      '.....WwwwwW.....',
      '....WwwwwwwW....',
      '...WwwwwwwwwW...',
      '...WwWwwwwwww...',
      '...WwWwwwwwwd...',
      '...Wwwwwwwwdd...',
      '...Wwwwwwwwdd...',
      '....Wwwwwwdd....',
      '.....WWWWWW.....',
      '................',
      '................',
    ],
  },
  basket: {
    pal: { K: '#b07a42', k: '#8a5a2e', d: '#6b4522' },
    rows: [
      '................',
      '......KKKK......',
      '.....K....K.....',
      '....K......K....',
      '...K........K...',
      '...kkkkkkkkkk...',
      '..kKkKkKkKkKkk..',
      '..kKkKkKkKkKkk..',
      '..kkkkkkkkkkkk..',
      '...kdkkdkkdkk...',
      '...kkkkkkkkkk...',
      '....dddddddd....',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  salad: {
    pal: { g: '#5d9e3a', G: '#8fd35f', o: '#e8823c', w: '#f2ede2', r: '#c95c5c', s: '#9a4a4a' },
    rows: [
      '............',
      '...G..g.G...',
      '..gG.Gg.gG..',
      '..o.Go.o.G..',
      '.wGgwGgwGgw.',
      '.wrrrrrrrrw.',
      '..wrrrrrrw..',
      '...swwwws...',
      '............',
    ],
  },
  bread: {
    pal: { b: '#c98a4b', B: '#e8b878', d: '#9a6234' },
    rows: [
      '............',
      '...BBBBBB...',
      '..BBdBBdBB..',
      '.BdBBDdBBDb.',
      '.BbBbBbBbBb.',
      '.dddddddddd.',
      '............',
    ],
  },
  pie: {
    pal: { c: '#e8b878', o: '#e8823c', O: '#f2a25c', w: '#f5f0e5' },
    rows: [
      '............',
      '...cccccc...',
      '..cOOOOOOc..',
      '.cOwOOwOOwc.',
      '.cOOOOOOOOc.',
      '..cccccccc..',
      '............',
    ],
  },
  sword: {
    pal: { s: '#cdd6e4', S: '#f4f8ff', g: '#8a5a2e', G: '#e6b34d' },
    rows: [
      '................',
      '..........Ss....',
      '.........Ss.....',
      '........Ss......',
      '.......Ss.......',
      '......Ss........',
      '.....Ss.........',
      '....Ss..........',
      '...Gg...........',
      '..GGgG..........',
      '.Gg..gG.........',
      '......g.........',
      '................',
      '................',
      '................',
      '................',
    ],
  },
};

// نقاشی آیکون روی بوم موجود (با مقیاس صحیح، بدون AA)
export function paintIcon(cv, kind) {
  const art = LIB[kind];
  if (!cv || !art) return;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, cv.width, cv.height);
  const gw = art.rows[0].length, gh = art.rows.length;
  const tmp = document.createElement('canvas');
  tmp.width = gw; tmp.height = gh;
  const tc = tmp.getContext('2d');
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const ch = art.rows[y][x];
    if (ch === '.') continue;
    tc.fillStyle = art.pal[ch];
    tc.fillRect(x, y, 1, 1);
  }
  c.drawImage(tmp, 0, 0, gw, gh, 0, 0, cv.width, cv.height);
}

// ساخت المان بوم با آیکون (برای درج در DOM)
export function iconEl(kind, size = 16) {
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  cv.className = 'pico';
  paintIcon(cv, kind);
  return cv;
}
