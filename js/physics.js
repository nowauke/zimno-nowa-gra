// Fizyka bez rysowania: używana przez grę i przez tools/verify-levels.js.
const PHYS = {
  DT: 1 / 120,
  GRAVITY: 2600,
  RUN: 400,
  ACC_GROUND: 3600,
  ACC_AIR: 2600,
  JUMP_V: 1120,
  JUMP_CUT: 0.45,
  MAX_FALL: 1500,
  COYOTE: 0.08,
  BUFFER: 0.11,
  HALF_W: 20,
  H: 124,
  GROUND_Y: 596,
  SPIKE_W: 36,
  PLATFORM_PERIOD: 4,
};

function makeBody(x, y = PHYS.GROUND_Y) {
  return {
    x, y, vx: 0, vy: 0,
    onGround: true, on: null,
    coyote: 0, buffer: 0,
    dropT: 0, dropFrom: null,
    cutDone: true, jumped: false,
  };
}

function preparePlatforms(level) {
  for (const p of level.platforms) {
    p.cx = p.x;
    p.cy = p.y;
    p.dx = 0;
    p.dy = 0;
  }
}

function updatePlatforms(level, t) {
  for (const p of level.platforms) {
    if (!p.move) continue;
    const s = Math.sin((t / PHYS.PLATFORM_PERIOD + (p.move.phase || 0)) * Math.PI * 2);
    const nx = p.x + (p.move.dx || 0) * s;
    const ny = p.y + (p.move.dy || 0) * s;
    p.dx = nx - p.cx;
    p.dy = ny - p.cy;
    p.cx = nx;
    p.cy = ny;
  }
}

function approach(v, target, step) {
  return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
}

// ctl: { move: -1|0|1, jumpPressed, jumpHeld, downPressed }
function stepBody(b, ctl, level, dt) {
  if (b.on) {
    b.x += b.on.dx;
    b.y = b.on.cy;
  }

  const acc = b.onGround ? PHYS.ACC_GROUND : PHYS.ACC_AIR;
  b.vx = approach(b.vx, ctl.move * PHYS.RUN, acc * dt);

  b.coyote = b.onGround ? PHYS.COYOTE : Math.max(0, b.coyote - dt);
  b.buffer = ctl.jumpPressed ? PHYS.BUFFER : Math.max(0, b.buffer - dt);
  b.dropT = Math.max(0, b.dropT - dt);
  b.jumped = false;

  if (ctl.downPressed && b.on) {
    b.dropT = 0.25;
    b.dropFrom = b.on;
    b.on = null;
    b.onGround = false;
    b.coyote = 0;
  }

  if (b.buffer > 0 && b.coyote > 0) {
    b.vy = -PHYS.JUMP_V;
    b.buffer = 0;
    b.coyote = 0;
    b.onGround = false;
    b.on = null;
    b.cutDone = false;
    b.jumped = true;
  }
  if (!b.cutDone && !ctl.jumpHeld && b.vy < 0) {
    b.vy *= PHYS.JUMP_CUT;
    b.cutDone = true;
  }

  b.vy = Math.min(b.vy + PHYS.GRAVITY * dt, PHYS.MAX_FALL);
  const prevY = b.y;
  b.x = Math.max(30, Math.min(level.length - 30, b.x + b.vx * dt));
  b.y += b.vy * dt;

  b.onGround = false;
  b.on = null;
  if (b.vy >= 0) {
    for (const p of level.platforms) {
      if (b.dropT > 0 && b.dropFrom === p) continue;
      if (b.x + PHYS.HALF_W > p.cx && b.x - PHYS.HALF_W < p.cx + p.w && prevY <= p.cy + 6 && b.y >= p.cy) {
        b.y = p.cy;
        b.vy = 0;
        b.onGround = true;
        b.on = p;
        break;
      }
    }
    if (!b.onGround && b.y >= PHYS.GROUND_Y) {
      b.y = PHYS.GROUND_Y;
      b.vy = 0;
      b.onGround = true;
    }
  }
}

function touchingSpikes(b, level) {
  for (const s of level.spikes) {
    const x0 = s.x + 9;
    const x1 = s.x + PHYS.SPIKE_W * s.n - 9;
    if (b.x + PHYS.HALF_W > x0 && b.x - PHYS.HALF_W < x1 && b.y > PHYS.GROUND_Y - 20) return true;
  }
  return false;
}

function touchesGuitar(b, g) {
  return Math.abs(g.x - b.x) < 42 && g.y > b.y - PHYS.H - 14 && g.y < b.y + 24;
}

function touchesExit(b, level) {
  return Math.abs(b.x - level.exit.x) < 44 && b.y > PHYS.GROUND_Y - 230;
}
