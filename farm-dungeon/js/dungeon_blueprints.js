// dungeon_blueprints.js — رجیستری طبقات دست‌ساز (ن۴۲): هر طبقه در فایل خودش (js/dungeon/bpXX.js)
// انتخاب در dungeon.js: تصادفی از استخر + قرینه‌ی افقی؛ طبقه‌ی باس = همیشه تالار تخت
import { BP01 } from './dungeon/bp01.js';
import { BP02 } from './dungeon/bp02.js';
import { BP03 } from './dungeon/bp03.js';
import { BP04 } from './dungeon/bp04.js';
import { BP05 } from './dungeon/bp05.js';
import { BP06 } from './dungeon/bp06.js';
import { BP07 } from './dungeon/bp07.js';
import { BP08 } from './dungeon/bp08.js';
import { BP09 } from './dungeon/bp09.js';
import { BP10 } from './dungeon/bp10.js';
import { BP11 } from './dungeon/bp11.js';
import { BP12 } from './dungeon/bp12.js';
import { BP13 } from './dungeon/bp13.js';
import { BP14 } from './dungeon/bp14.js';
import { BP15 } from './dungeon/bp15.js';
import { BP16 } from './dungeon/bp16.js';
import { BP17 } from './dungeon/bp17.js';
import { BP18 } from './dungeon/bp18.js';
import { BP19 } from './dungeon/bp19.js';
import { BP20 } from './dungeon/bp20.js';
import { BP21 } from './dungeon/bp21.js';
import { BP_BOSS } from './dungeon/bp_boss.js';

export const BLUEPRINTS = [
  BP01,
  BP02,
  BP03,
  BP04,
  BP05,
  BP06,
  BP07,
  BP08,
  BP09,
  BP10,
  BP11,
  BP12,
  BP13,
  BP14,
  BP15,
  BP16,
  BP17,
  BP18,
  BP19,
  BP20,
  BP21,
];
export const BOSS_BLUEPRINT = BP_BOSS;

// اعتبارسنجی: همه‌ی سطرها ۳۰ کاراکتر، ۲۰ سطر، دقیقاً یک S و یک >
export function validateBlueprints() {
  const errs = [];
  const all = [...BLUEPRINTS, BOSS_BLUEPRINT];
  for (const bp of all) {
    if (bp.rows.length !== 20) errs.push(bp.name + ': ' + bp.rows.length + ' سطر');
    bp.rows.forEach((row, y) => {
      if (row.length !== 30) errs.push(bp.name + ' سطر ' + y + ': ' + row.length + ' کاراکتر');
      if (/[^#.S>CHTPWDREB]/.test(row)) errs.push(bp.name + ' سطر ' + y + ': کاراکتر مجهول');
    });
    const s = bp.rows.join('').split('S').length - 1, g = bp.rows.join('').split('>').length - 1;
    if (s !== 1) errs.push(bp.name + ': S=' + s);
    if (g !== 1) errs.push(bp.name + ': >=' + g);
  }
  return errs;
}
