// monster_registry.js — رجیستری ادغام بدنه‌ها: کلاسیک (۷) + ن۴۴ (۷) — تک‌منبع انتخاب kind (ن۴۷)
import { MBODY_A, MOUT_A, MSHW_A } from './monster_bodies.js';
import { MBODY2, MOUT2, MSHW2 } from './monster_bodies2.js';
export const MBODY = Object.assign({}, MBODY_A, MBODY2);
export const MOUT = Object.assign({}, MOUT_A, MOUT2);
export const MSHW = Object.assign({}, MSHW_A, MSHW2);
