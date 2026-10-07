// sfx/quest.js — مأموریت کامل: سه نت شادِ آرام E4-G4-B4
import { pluck } from './engine.js';
export function sfxQuest(ctx, out, t0) {
  for (let i = 0; i < 3; i++) pluck(ctx, out, [329.6, 392, 493.9][i], t0 + i * 0.11, 0.07, 0.4);
}
