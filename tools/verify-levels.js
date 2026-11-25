#!/usr/bin/env node
// Przeszukuje poziomy prawdziwą fizyką gry: sprawdza, czy każdą gitarę i metę da się
// osiągnąć bez dotknięcia kolców. Uruchom po każdej zmianie w js/levels.js:
//   node tools/verify-levels.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
for (const file of ['js/physics.js', 'js/levels.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
}

const X_BUCKET = 30;
const PHASE_BUCKET = 0.25;
const DIRS = [-1, 0, 1];
const JUMP_HOLDS = [0.06, 0.16, 0.6];
const STEER_STOP = [Infinity, 0.2];

function verify(src) {
  const level = Object.assign({}, src, { platforms: src.platforms.map((p) => Object.assign({}, p)) });
  preparePlatforms(level);
  const hasMovers = level.platforms.some((p) => p.move);
  const dt = PHYS.DT;

  const seen = new Set();
  const queue = [];
  const reachedGuitars = new Set();
  let exitReached = false;

  const keyOf = (s) => {
    const surface = s.on ? level.platforms.indexOf(s.on) : -1;
    const phase = hasMovers ? Math.floor((s.t % PHYS.PLATFORM_PERIOD) / PHASE_BUCKET) : 0;
    return `${Math.round(s.x / X_BUCKET)}|${surface}|${Math.sign(Math.round(s.vx / 100))}|${phase}`;
  };

  const push = (s) => {
    const key = keyOf(s);
    if (!seen.has(key)) {
      seen.add(key);
      queue.push(s);
    }
  };

  const run = (start, plan) => {
    const b = makeBody(start.x, start.y);
    b.vx = start.vx;
    b.on = start.on;
    b.onGround = true;
    let t = start.t;
    updatePlatforms(level, t);
    let elapsed = 0;

    for (;;) {
      t += dt;
      elapsed += dt;
      updatePlatforms(level, t);
      const ctl = plan(elapsed, b);
      stepBody(b, ctl, level, dt);
      if (touchingSpikes(b, level)) return;
      for (let i = 0; i < level.guitars.length; i++) {
        if (!reachedGuitars.has(i) && touchesGuitar(b, level.guitars[i])) reachedGuitars.add(i);
      }
      if (touchesExit(b, level)) exitReached = true;
      if (ctl.done && b.onGround) break;
      if (elapsed > 4) return;
    }
    push({ x: b.x, y: b.y, vx: b.vx, on: b.on, t });
  };

  push({ x: 118, y: PHYS.GROUND_Y, vx: 0, on: null, t: 0 });

  while (queue.length) {
    const s = queue.pop();

    for (const dir of [-1, 1]) {
      run(s, (e) => ({ move: dir, jumpPressed: false, jumpHeld: false, downPressed: false, done: e > 0.15 }));
    }
    run(s, (e) => ({ move: 0, jumpPressed: false, jumpHeld: false, downPressed: false, done: e > 0.25 }));
    if (s.on) {
      run(s, (e) => ({ move: 0, jumpPressed: false, jumpHeld: false, downPressed: e < dt * 1.5, done: e > 0.1 }));
    }
    for (const dir of DIRS) {
      for (const hold of JUMP_HOLDS) {
        for (const stop of STEER_STOP) {
          if (stop !== Infinity && dir === 0) continue;
          run(s, (e) => ({
            move: e < stop ? dir : 0,
            jumpPressed: e < dt * 1.5,
            jumpHeld: e < hold,
            downPressed: false,
            done: e > 0.05,
          }));
        }
      }
    }
  }

  const missing = level.guitars
    .map((g, i) => ({ g, i }))
    .filter(({ i }) => !reachedGuitars.has(i))
    .map(({ g }) => `${g.t}@${g.x},${g.y}`);
  return { name: level.name, states: seen.size, got: reachedGuitars.size, total: level.guitars.length, exitReached, missing };
}

let failed = false;
for (const lvl of LEVELS) {
  const r = verify(lvl);
  const rockOk = !lvl.finale || lvl.guitars.every((g) => g.x < lvl.finale.rockX);
  const ok = r.exitReached && r.missing.length === 0 && rockOk;
  if (!ok) failed = true;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${r.name}: gitary ${r.got}/${r.total}, meta ${r.exitReached ? 'tak' : 'NIE'}, stany ${r.states}`);
  if (!rockOk) console.log('     gitara leży za kamieniem: scenka końcowa ruszyłaby przed jej zebraniem');
  if (r.missing.length) console.log(`     nieosiągalne: ${r.missing.join(' ')}`);
}
process.exit(failed ? 1 : 0);
