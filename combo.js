// Each physical tap can buffer one more punch, at most two punches ahead.
export const ATTACKS = {
  punch: { duration: .32, active: .10, end: .19, reach: 108, damage: 8, cooldown: .38 },
  kick: { duration: .55, active: .20, end: .32, reach: 153, damage: 13, cooldown: .65 }
};
export const PUNCH_LINK_TIME = .24;
export function startAttack(f, type) {
  if (f.cooldown > 0 || f.attack || f.stun > 0 || f.block) return false;
  f.attack = {type, time: 0, hit: false, comboIndex: 0, chained: false};
  f.cooldown = ATTACKS[type].cooldown;
  return true;
}
export function requestPunch(f) {
  if (f.stun > 0 || f.block) return;
  if (f.attack?.type === 'punch') {
    f.punchQueue = Math.min(2, f.punchQueue + 1);
  } else if (!f.attack) {
    if (!startAttack(f, 'punch')) {
      // A tap during the final few milliseconds of recovery is not lost.
      f.punchQueue = 1; f.punchBufferTime = .15;
    }
  }
}
export function advancePunchBuffer(f, dt) {
  if (f.stun > 0 || f.block) { f.punchQueue = 0; f.punchBufferTime = 0; return; }
  if (!f.attack && f.punchQueue > 0) {
    f.punchBufferTime = Math.max(0, f.punchBufferTime - dt);
    if (f.punchBufferTime > 0 && startAttack(f, 'punch')) f.punchQueue = 0;
    else if (f.punchBufferTime === 0) f.punchQueue = 0;
  }
}
export function finishAttack(f) {
  const a = f.attack;
  if (!a) return;
  if (a.type === 'punch' && f.punchQueue > 0 && f.stun <= 0 && a.time >= PUNCH_LINK_TIME) {
    f.punchQueue--;
    // Replace the attack directly: there is never an idle simulation frame.
    f.attack = {type:'punch',time:Math.max(0,a.time-PUNCH_LINK_TIME),hit:false,
      comboIndex:(a.comboIndex+1) % f.punchCount,chained:true};
    f.cooldown = ATTACKS.punch.cooldown;
  } else if (a.time >= ATTACKS[a.type].duration) {
    f.attack = null;
  }
}
