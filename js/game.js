const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const START_LIVES = 5;
const FOLLOW_GAP = 100;
const HI_KEY = 'nowa-gra-hi';
const MAX_VIEW_WIDTH = 1700;
const SAFE = { left: 0, right: 0, bottom: 0 };
const WIPE_TIME = 0.6;

const NO_INPUT = { move: 0, jumpPressed: false, jumpHeld: false, downPressed: false };
const KEYS = {
  solo: { left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], jump: ['ArrowUp', 'KeyW', 'Space'], down: ['ArrowDown', 'KeyS'] },
  p1: { left: ['KeyA'], right: ['KeyD'], jump: ['KeyW'], down: ['KeyS'] },
  p2: { left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'], down: ['ArrowDown'] },
};
const MENU_UP = ['ArrowUp', 'KeyW', 'ArrowLeft', 'KeyA'];
const MENU_DOWN = ['ArrowDown', 'KeyS', 'ArrowRight', 'KeyD'];
const MENU_OK = ['Enter', 'Space'];
const PAUSE_KEYS = ['Escape', 'KeyP'];
const SWITCH_KEYS = ['ShiftLeft', 'ShiftRight', 'KeyC', 'Tab'];

const G = {
  state: 'menu',
  mode: 1,
  menuIdx: 0,
  items: [],
  levelIdx: 0,
  lives: START_LIVES,
  score: 0,
  hi: readHi(),
  time: 0,
  level: null,
  themeName: 'forest',
  players: [],
  active: 0,
  cam: 0,
  levelTime: 0,
  lockT: 0,
  bannerT: 0,
  clearT: 0,
  bonus: 0,
  fade: 0,
  fadeDir: 0,
  fadeCb: null,
  fadeColor: '0, 0, 0',
  portalOpen: 0,
  arrival: null,
  finale: null,
  fullscreenHintT: 0,
  particles: [],
  floats: [],
  flyers: [],
  total: { J: 0, S: 0 },
  got: { J: 0, S: 0 },
  exitHintT: 0,
  renderCap: 2,
};

function readHi() {
  try {
    return Number(localStorage.getItem(HI_KEY)) || 0;
  } catch (e) {
    return 0;
  }
}

function saveHi() {
  if (G.score <= G.hi) return;
  G.hi = G.score;
  try {
    localStorage.setItem(HI_KEY, String(G.hi));
  } catch (e) {}
}

// ---------- Przejścia między ekranami ----------

function fadeTo(cb) {
  if (G.fadeDir === 1) return;
  G.fadeDir = 1;
  G.fadeCb = cb;
  G.fadeColor = '0, 0, 0';
}

function setItems(items) {
  G.items = items;
  G.menuIdx = 0;
  Input.fresh.clear();
  Input.tapQueue.length = 0;
}

// Przeglądarka puszcza dźwięk dopiero po geście gracza, więc pierwszy ekran o niego prosi.
function showStart() {
  G.state = 'start';
  Sound.playTrack(MENU_TRACK);
  Input.setButtons(menuButtons());
}

function showMenu() {
  G.state = 'menu';
  G.level = null;
  G.finale = null;
  Sound.playTrack(MENU_TRACK);
  Sound.setMusicPaused(false);
  G.themeName = 'forest';
  G.cam = 0;
  G.players = [];
  G.particles.length = 0;
  G.floats.length = 0;
  G.flyers.length = 0;
  setItems([
    { label: '1 GRACZ', run: () => startGame(1) },
    { label: '2 GRACZY', run: () => startGame(2) },
  ]);
  Input.setButtons(menuButtons());
}

function startGame(mode) {
  G.mode = mode;
  G.lives = START_LIVES;
  G.score = 0;
  loadLevel(0);
}

function makePlayer(who, x) {
  return Object.assign(makeBody(x), {
    who, facing: 1, anim: 0, hurtT: 0, invuln: 0, safeX: x, safeY: PHYS.GROUND_Y,
    holdT: 0, stuckT: 0, hintT: 0, queue: [], lastGround: true,
    portalT: null, gone: false, emergeT: 1, tumble: null,
  });
}

function loadLevel(idx, viaPortal = false) {
  G.levelIdx = idx;
  const src = LEVELS[idx];
  G.level = Object.assign({}, src, {
    platforms: src.platforms.map((p) => Object.assign({}, p)),
    guitars: src.guitars.map((g) => Object.assign({ taken: false }, g)),
  });
  preparePlatforms(G.level);
  updatePlatforms(G.level, 0);
  G.themeName = src.theme;
  // Kolejność to numer gracza (blondyn to P1), a pozycje startowe są jak w teledysku.
  G.players = [makePlayer('blond', 212), makePlayer('dark', 118)];
  G.portalOpen = 0;
  G.finale = null;
  Sound.playTrack(idx);
  G.arrival = viaPortal ? { x: 62, open: 1 } : null;
  if (viaPortal) {
    G.players[0].emergeT = 0;
    G.players[1].emergeT = -0.6;
    Sound.portalEnter();
  }
  G.active = 0;
  G.cam = -SAFE.left;
  G.levelTime = 0;
  G.lockT = 1.2;
  G.bannerT = 2.2;
  G.exitHintT = 0;
  G.particles.length = 0;
  G.floats.length = 0;
  G.flyers.length = 0;
  G.total = { J: 0, S: 0 };
  G.got = { J: 0, S: 0 };
  for (const g of G.level.guitars) G.total[g.t]++;
  G.state = 'play';
  Input.fresh.clear();
  Input.setButtons(playButtons());
}

function pressFullscreen() {
  if (Input.fullscreenSupported()) Input.toggleFullscreen();
  else G.fullscreenHintT = 7;
}

// Gra dodana do ekranu początkowego działa już bez pasków przeglądarki.
function runsAsApp() {
  return navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

function fullscreenButton(x, y) {
  if (runsAsApp()) return [];
  return [{ x, y, r: 28, icon: 'fullscreen', tapOnly: true, onRelease: pressFullscreen }];
}

function menuButtons() {
  return fullscreenButton(VIEW_WIDTH - SAFE.right - 52, 52);
}

function currentButtons() {
  if (G.state === 'start' || G.state === 'menu') return menuButtons();
  return G.state === 'play' ? playButtons() : [];
}

// Kciuk nie musi trafić w kółko: lewa i prawa połowa ekranu są podzielone na strefy.
// Przyciski tapOnly działają tylko przy dotknięciu, nie gdy kciuk na nie zjedzie.
function playButtons() {
  const L = SAFE.left;
  const R = VIEW_WIDTH - SAFE.right;
  const mid = VIEW_WIDTH / 2;
  const y = Math.min(648, VIEW_HEIGHT - SAFE.bottom - 50);
  const pause ={ x: mid + 128, y: 36, r: 28, code: 'KeyP', icon: 'pause', tapOnly: true };
  const zoneBtn = (x, r, code, icon, x0, x1, tag) => ({ x, y, r, code, icon, tag, zone: { x0, x1 } });
  const top = [pause, ...fullscreenButton(mid + 196, 36)];

  if (G.mode === 1) {
    const lx = L + 88;
    const rx = L + 244;
    const split = (lx + rx) / 2;
    return [
      ...top,
      { x: R - 256, y: y + 14, r: 50, code: 'KeyC', icon: 'swap', tapOnly: true },
      zoneBtn(lx, 68, 'ArrowLeft', 'left', 0, split),
      zoneBtn(rx, 68, 'ArrowRight', 'right', split, mid),
      { ...zoneBtn(R - 100, 78, 'ArrowUp', 'jump', mid, VIEW_WIDTH), y: y - 14 },
    ];
  }
  const step = 122;
  const a = [L + 66, L + 66 + step, L + 66 + 2 * step];
  const b = [R - 66 - 2 * step, R - 66 - step, R - 66];
  return [
    ...top,
    zoneBtn(a[0], 56, 'KeyA', 'left', 0, a[0] + step / 2),
    zoneBtn(a[1], 56, 'KeyD', 'right', a[0] + step / 2, a[1] + step / 2),
    zoneBtn(a[2], 56, 'KeyW', 'jump', a[1] + step / 2, mid, 'GRACZ 1'),
    zoneBtn(b[0], 56, 'ArrowUp', 'jump', mid, b[0] + step / 2, 'GRACZ 2'),
    zoneBtn(b[1], 56, 'ArrowLeft', 'left', b[0] + step / 2, b[1] + step / 2),
    zoneBtn(b[2], 56, 'ArrowRight', 'right', b[1] + step / 2, VIEW_WIDTH),
  ];
}

// ---------- Efekty ----------

function burst(x, y, n, color = '#fff') {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 80 + Math.random() * 220;
    G.particles.push({
      kind: 'star', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
      life: 0.5 + Math.random() * 0.4, size: 4 + Math.random() * 7, color,
    });
  }
}

function dust(x, y, color) {
  for (let i = 0; i < 5; i++) {
    G.particles.push({
      kind: 'dust', x: x + (Math.random() - 0.5) * 34, y,
      vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 50,
      life: 0.25 + Math.random() * 0.15, size: 3 + Math.random() * 4, color,
    });
  }
}

function floatText(x, y, text, color = '#fff') {
  G.floats.push({ x, y, text, color, life: 1.3 });
}

function updateFx(dt) {
  for (const p of G.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.kind === 'star' ? 420 : 120) * dt;
  }
  G.particles = G.particles.filter((p) => p.life > 0);
  for (const f of G.floats) {
    f.life -= dt;
    f.y -= 34 * dt;
  }
  G.floats = G.floats.filter((f) => f.life > 0);
  for (const f of G.flyers) f.t += dt / 0.55;
  G.flyers = G.flyers.filter((f) => f.t < 1);
}

// ---------- Sterowanie ----------

function humanControls(map) {
  return {
    move: (Input.held(map.right) ? 1 : 0) - (Input.held(map.left) ? 1 : 0),
    jumpPressed: Input.take(map.jump),
    jumpHeld: Input.held(map.jump),
    downPressed: Input.take(map.down),
  };
}

function spikesAhead(p, dir) {
  for (const s of G.level.spikes) {
    const edge = dir > 0 ? s.x - p.x : p.x - (s.x + s.n * PHYS.SPIKE_W);
    if (edge > 20 && edge < 90) return true;
  }
  return false;
}

// Tryb 1P: kompan biegnie za graczem i powtarza jego skoki w tych samych miejscach.
function cpuControls(cpu, leader, dt) {
  const dx = leader.x - cpu.x;
  const move = Math.abs(dx) > FOLLOW_GAP ? Math.sign(dx) : 0;
  let jumpPressed = false;
  cpu.holdT = Math.max(0, cpu.holdT - dt);

  const q = cpu.queue;
  while (q.length && (G.time - q[0].t > 4 || (Math.abs(q[0].x - cpu.x) > 40 && Math.sign(q[0].x - cpu.x) !== Math.sign(dx)))) q.shift();

  if (cpu.onGround) {
    if (q.length && Math.abs(q[0].x - cpu.x) < 26) {
      cpu.holdT = q.shift().hold;
      jumpPressed = true;
    } else if (move && spikesAhead(cpu, move)) {
      cpu.holdT = 0.5;
      jumpPressed = true;
    } else if (leader.onGround && leader.y < cpu.y - 40 && Math.abs(dx) < 170) {
      cpu.holdT = 0.5;
      jumpPressed = true;
    }
  }

  const lost = Math.abs(dx) > FOLLOW_GAP + 60 || Math.abs(leader.y - cpu.y) > 60;
  cpu.stuckT = leader.onGround && lost ? cpu.stuckT + dt : 0;
  if (cpu.stuckT > 1.8 || Math.abs(dx) > 720) warpTo(cpu, leader);

  return { move, jumpPressed, jumpHeld: cpu.holdT > 0, downPressed: false };
}

function warpTo(cpu, leader) {
  burst(cpu.x, cpu.y - 60, 6);
  cpu.x = Math.max(40, leader.x - leader.facing * 70);
  cpu.y = leader.y - 4;
  cpu.vx = 0;
  cpu.vy = 0;
  cpu.on = null;
  cpu.onGround = false;
  cpu.stuckT = 0;
  cpu.queue.length = 0;
  burst(cpu.x, cpu.y - 60, 6);
  Sound.warp();
}

function switchCharacter() {
  const next = G.players[1 - G.active];
  if (touchingSpikes(next, G.level) || next.hurtT > 0) {
    Sound.deny();
    return;
  }
  G.active = 1 - G.active;
  for (const p of G.players) {
    p.queue.length = 0;
    p.stuckT = 0;
    p.holdT = 0;
  }
  burst(next.x, next.y - 150, 5);
  Sound.blip();
}

// ---------- Rozgrywka ----------

function hurt(p) {
  if (p.hurtT > 0 || p.invuln > 0) return;
  G.lives--;
  p.hurtT = 0.65;
  p.vy = -760;
  p.vx = -p.facing * 180;
  p.on = null;
  p.onGround = false;
  Sound.hurt();
  Input.buzz(60);
  burst(p.x, p.y - 40, 8, '#ff9a8a');
}

function respawn(p) {
  const other = G.players[1 - G.players.indexOf(p)];
  const offscreen = p.safeX < G.cam + 40 || p.safeX > G.cam + VIEW_WIDTH - 40;
  const useOther = G.mode === 2 && offscreen;
  p.x = useOther ? other.safeX : p.safeX;
  p.y = useOther ? other.safeY : p.safeY;
  p.vx = 0;
  p.vy = 0;
  p.on = null;
  p.onGround = false;
  p.invuln = 1.6;
  burst(p.x, p.y - 60, 8);
}

function updateSafeSpot(p) {
  if (!p.onGround || (p.on && p.on.move)) return;
  for (const s of G.level.spikes) {
    if (p.x > s.x - 90 && p.x < s.x + s.n * PHYS.SPIKE_W + 90 && !p.on) return;
  }
  p.safeX = p.x;
  p.safeY = p.y;
}

function stepPlayer(p, ctl, dt) {
  const wasGround = p.onGround;
  const fallSpeed = p.vy;
  stepBody(p, ctl, G.level, dt);

  if (ctl.move) p.facing = ctl.move;
  p.anim += Math.abs(p.vx) * dt * 0.036;
  p.invuln = Math.max(0, p.invuln - dt);
  p.hintT = Math.max(0, p.hintT - dt);

  if (p.jumped) Sound.jump();
  if (!wasGround && p.onGround && fallSpeed > 300) {
    dust(p.x, p.y + 2, THEMES[G.themeName].grassDark);
    if (fallSpeed > 700) Sound.land();
  }
}

function collectGuitars() {
  for (const g of G.level.guitars) {
    if (g.taken) continue;
    for (let i = 0; i < G.players.length; i++) {
      const p = G.players[i];
      if (p.hurtT > 0 || !touchesGuitar(p, g)) continue;
      const owner = g.t === 'J' ? 'dark' : 'blond';
      if (p.who === owner) {
        g.taken = true;
        G.got[g.t]++;
        G.score += 100;
        burst(g.x, g.y, 12);
        floatText(g.x, g.y - 40, '+100', '#f5f06e');
        G.flyers.push({ type: g.t, x0: g.x - G.cam, y0: g.y, t: 0 });
        Sound.collect();
        if (allGuitarsTaken()) {
          floatText(p.x, p.y - 180, 'PORTAL OTWARTY!', '#f5f06e');
          burst(G.level.exit.x, PORTAL_CY, 14);
          Sound.portalOpen();
        }
        break;
      }
      if (p.hintT <= 0 && (G.mode === 2 || i === G.active)) {
        p.hintT = 1.4;
        floatText(p.x, p.y - 150, 'NIE MOJA!', '#fff');
        Sound.deny();
      }
    }
  }
}

function allGuitarsTaken() {
  return G.got.J + G.got.S >= G.total.J + G.total.S;
}

function enterPortal(p) {
  p.portalT = 0;
  p.vx = 0;
  p.vy = 0;
  burst(G.level.exit.x, PORTAL_CY, 10);
  Sound.portalEnter();
}

function advancePortal(p, dt) {
  p.portalT = Math.min(1, p.portalT + dt / 0.45);
  if (p.portalT >= 1) p.gone = true;
}

function updatePortals(dt) {
  G.portalOpen = approach(G.portalOpen, allGuitarsTaken() ? 1 : 0, dt / 0.6);
  if (G.arrival && G.lockT <= 0) {
    G.arrival.open -= dt / 0.4;
    if (G.arrival.open <= 0) G.arrival = null;
  }
}

function checkExit() {
  G.exitHintT = Math.max(0, G.exitHintT - PHYS.DT);
  const humans = G.mode === 1 ? [G.players[G.active]] : G.players;
  const touching = humans.filter((p) => p.portalT === null && p.hurtT <= 0 && touchesExit(p, G.level));
  if (touching.length && !allGuitarsTaken()) {
    if (G.exitHintT <= 0) {
      G.exitHintT = 1.6;
      floatText(G.level.exit.x, 280, `ZBIERZ WSZYSTKIE GITARY ${G.got.J + G.got.S}/${G.total.J + G.total.S}`, '#fff');
      Sound.deny();
    }
    return;
  }
  touching.forEach(enterPortal);
  if (humans.every((p) => p.portalT !== null)) levelClear();
}

function addLevelBonus() {
  const timeBonus = Math.max(0, Math.round(G.level.par - G.levelTime)) * 10;
  G.bonus = timeBonus + G.lives * 50;
  G.score += G.bonus;
  saveHi();
}

function levelClear() {
  addLevelBonus();
  G.state = 'clear';
  G.clearT = 2.8;
  Sound.clear();
  Input.setButtons([]);
}

function cameraTarget() {
  if (G.finale && G.finale.phase !== 'walk') {
    return G.level.exit.x - FINALE_PORTAL_SCREEN_X - (VIEW_WIDTH - 1280) / 2;
  }
  const here = G.players.filter((p) => p.portalT === null);
  if (!here.length) return G.level.exit.x - VIEW_WIDTH / 2;
  if (G.mode === 2) return here.reduce((sum, p) => sum + p.x, 0) / here.length - VIEW_WIDTH / 2;
  const lead = G.players[G.active];
  return lead.x - VIEW_WIDTH * 0.42 + lead.facing * 60;
}

function updateCamera(dt) {
  // Świat zaczyna się i kończy przy notchu, a nie pod nim.
  const target = Math.max(-SAFE.left, Math.min(G.level.length - VIEW_WIDTH + SAFE.right, cameraTarget()));
  G.cam += (target - G.cam) * (1 - Math.exp(-dt * (G.finale ? 2.5 : 6)));
  if (G.mode === 2 && !G.finale) {
    const lo = G.cam + SAFE.left + 40;
    const hi = G.cam + VIEW_WIDTH - SAFE.right - 40;
    for (const p of G.players) {
      if (p.portalT !== null) continue;
      if (p.x < lo) {
        p.x = lo;
        p.vx = Math.max(0, p.vx);
      }
      if (p.x > hi) {
        p.x = hi;
        p.vx = Math.min(0, p.vx);
      }
    }
  }
}

function tickPlay(dt) {
  G.levelTime += dt;
  G.lockT = Math.max(0, G.lockT - dt);
  G.bannerT = Math.max(0, G.bannerT - dt);
  updatePlatforms(G.level, G.levelTime);

  if (Input.take(PAUSE_KEYS)) {
    G.state = 'pause';
    Sound.setMusicPaused(true);
    setItems([
      { label: 'GRAJ DALEJ', run: resumeGame },
      { label: 'WYJDŹ', run: () => fadeTo(showMenu) },
    ]);
    Input.setButtons([]);
    return;
  }

  const locked = G.lockT > 0;
  if (G.mode === 1 && !locked && Input.take(SWITCH_KEYS)) switchCharacter();

  const leader = G.players[G.active];
  for (let i = 0; i < G.players.length; i++) {
    const p = G.players[i];
    if (p.portalT !== null) {
      advancePortal(p, dt);
      continue;
    }
    if (p.emergeT < 1) p.emergeT = Math.min(1, p.emergeT + dt / 0.45);
    let ctl = NO_INPUT;
    if (!locked && p.hurtT <= 0) {
      if (G.mode === 2) ctl = humanControls(i === 0 ? KEYS.p1 : KEYS.p2);
      else if (i === G.active) ctl = humanControls(KEYS.solo);
      else ctl = cpuControls(p, leader, dt);
    }
    const risingUncut = !p.cutDone;
    stepPlayer(p, ctl, dt);

    if (G.mode === 1 && i === G.active) {
      const q = G.players[1 - i].queue;
      if (p.jumped) q.push({ x: p.x, t: G.time, hold: 0.5 });
      else if (risingUncut && p.cutDone && q.length) q[q.length - 1].hold = G.time - q[q.length - 1].t;
    }

    if (p.hurtT > 0) {
      p.hurtT -= dt;
      if (p.hurtT <= 0) {
        if (G.lives <= 0) {
          gameOver();
          return;
        }
        respawn(p);
      }
    }
  }

  for (let i = 0; i < G.players.length; i++) {
    const p = G.players[i];
    if (p.portalT !== null) continue;
    const human = G.mode === 2 || i === G.active;
    if (touchingSpikes(p, G.level)) {
      if (human) hurt(p);
      else warpTo(p, leader);
    } else if (human && p.hurtT <= 0) {
      updateSafeSpot(p);
    }
  }

  collectGuitars();
  updatePortals(dt);
  if (!checkFinale()) checkExit();
  updateCamera(dt);
  updateFx(dt);
}

// ---------- Zakończenie gry: blondyn potyka się o kamień ----------

function checkFinale() {
  const finale = G.level.finale;
  if (!finale || !allGuitarsTaken()) return false;
  const humans = G.mode === 1 ? [G.players[G.active]] : G.players;
  if (!humans.some((p) => p.x >= finale.rockX - 30)) return false;
  startFinale();
  return true;
}

function startFinale() {
  addLevelBonus();
  G.state = 'finale';
  G.finale = { phase: 'walk', t: 0 };
  setItems([]);
  Input.setButtons([]);
  const { rockX } = G.level.finale;
  for (const p of G.players) {
    p.hurtT = 0;
    p.invuln = 0;
    p.queue.length = 0;
    // Blondyn musi dobiec do kamienia z lewej, nawet jeśli czekał już dalej.
    const misplaced = p.who === 'blond' ? p.x > rockX || p.x < rockX - 700 : p.x < rockX - 900;
    if (misplaced) warpTo(p, { x: rockX - 100, y: PHYS.GROUND_Y, facing: 1 });
  }
}

function tripBlond(p) {
  p.tumble = { angle: 0, landed: false };
  p.vx = 650;
  p.vy = -620;
  p.on = null;
  p.onGround = false;
  G.finale.phase = 'fall';
  Sound.hurt();
  Input.buzz(60);
}

function updateTumble(p, dt) {
  const t = p.tumble;
  t.angle = Math.min(Math.PI / 2, t.angle + (dt * Math.PI) / 2 / 0.42);
  p.x += p.vx * dt;
  p.vy += PHYS.GRAVITY * dt;
  p.y += p.vy * dt;
  if (p.y < PHYS.GROUND_Y) return;
  p.y = PHYS.GROUND_Y;
  p.vy = 0;
  p.vx = approach(p.vx, 0, 1100 * dt);
  if (!t.landed) {
    t.landed = true;
    dust(p.x, p.y, THEMES[G.themeName].grassDark);
    Sound.land();
  }
}

function tickFinale(dt) {
  const f = G.finale;
  f.t += dt;
  G.levelTime += dt;
  updatePlatforms(G.level, G.levelTime);
  const { rockX } = G.level.finale;
  for (const p of G.players) {
    if (p.tumble) {
      updateTumble(p, dt);
      continue;
    }
    let move;
    if (p.who === 'blond') {
      // Bez sterowania w powietrzu ląduje przy kamieniu, a nie daleko za nim.
      move = p.onGround ? 1 : 0;
    } else {
      const dx = rockX + 310 - p.x;
      move = Math.abs(dx) > 10 ? Math.sign(dx) : 0;
    }
    stepPlayer(p, { move, jumpPressed: false, jumpHeld: false, downPressed: false }, dt);
    if (p.who === 'blond' && p.onGround && p.x >= rockX - 8) tripBlond(p);
  }
  updatePortals(dt);
  updateCamera(dt);
  updateFx(dt);

  const blond = G.players[0];
  if (f.phase === 'fall' && blond.tumble.landed && blond.vx === 0) {
    f.phase = 'down';
    f.t = 0;
  } else if (f.phase === 'down' && f.t > 1.1) {
    f.phase = 'over';
    f.t = 0;
    Sound.playTrack(MENU_TRACK);
    Sound.gameOver();
  } else if (f.phase === 'over') {
    if (f.t > 0.8 && !G.items.length) setItems([{ label: 'NOWA GRA', run: () => fadeTo(showMenu) }]);
    if (G.items.length) tickItems();
  }
}

function resumeGame() {
  G.state = 'play';
  Sound.setMusicPaused(false);
  Input.setButtons(playButtons());
}

function gameOver() {
  saveHi();
  G.state = 'gameover';
  Sound.playTrack(MENU_TRACK);
  Sound.gameOver();
  setItems([
    { label: 'JESZCZE RAZ', run: () => fadeTo(() => { G.lives = START_LIVES; loadLevel(G.levelIdx); }) },
    { label: 'MENU', run: () => fadeTo(showMenu) },
  ]);
  Input.setButtons([]);
}

function tickClear(dt) {
  G.levelTime += dt;
  updatePlatforms(G.level, G.levelTime);
  G.clearT -= dt;
  const exitX = G.level.exit.x;
  for (const p of G.players) {
    if (p.portalT !== null) {
      advancePortal(p, dt);
      continue;
    }
    // Kompan z trybu 1P sam dobiega do portalu.
    if (touchesExit(p, G.level)) {
      enterPortal(p);
      continue;
    }
    if (Math.abs(exitX - p.x) > 480 || touchingSpikes(p, G.level)) {
      warpTo(p, { x: exitX, y: PHYS.GROUND_Y, facing: 1 });
    }
    stepPlayer(p, { move: Math.sign(exitX - p.x), jumpPressed: false, jumpHeld: false, downPressed: false }, dt);
  }
  updatePortals(dt);
  updateCamera(dt);
  updateFx(dt);
  if (!G.players.every((p) => p.gone)) G.clearT = Math.max(G.clearT, WIPE_TIME);
  if (G.clearT <= 0) finishClear();
}

// Biel portalu wypełniła ekran: nowy poziom wyłania się z niej.
function finishClear() {
  G.fade = 1;
  G.fadeDir = -1;
  G.fadeColor = '255, 255, 255';
  G.lives = Math.min(START_LIVES, G.lives + 1);
  loadLevel(G.levelIdx + 1, true);
}

// ---------- Menu ----------

function isEndScreen() {
  return G.state === 'gameover' || G.state === 'finale';
}

// Na dotyku napisy są większe, żeby dało się w nie trafić palcem.
// Na ekranach końcowych opcje stoją w jednym rzędzie pod kafelkami.
function itemLayout(i) {
  const mid = VIEW_WIDTH / 2;
  if (isEndScreen()) {
    const u = Input.touchMode ? 5 : 3;
    const gap = 120;
    const widths = G.items.map((item) => textWidth(item.label, u, 'bold'));
    const total = widths.reduce((sum, w) => sum + w, 0) + gap * (widths.length - 1);
    const x = mid - total / 2 + widths.slice(0, i).reduce((sum, w) => sum + w + gap, 0);
    return { x, y: 362, u, top: 18, bottom: 18 };
  }
  const u = Input.touchMode ? 5 : 3;
  const widest = Math.max(...G.items.map((item) => textWidth(item.label, u, 'bold')));
  const x = mid - widest / 2;
  if (Input.touchMode) return { x, y: 372 + i * 84, u, top: 24, bottom: 25 };
  const y0 = G.state === 'menu' ? 404 : 400;
  return { x, y: y0 + i * 49, u, top: 14, bottom: 14 };
}

function tickItems() {
  if (Input.take(MENU_UP) && G.items.length > 1) {
    G.menuIdx = (G.menuIdx + G.items.length - 1) % G.items.length;
    Sound.blip();
  }
  if (Input.take(MENU_DOWN) && G.items.length > 1) {
    G.menuIdx = (G.menuIdx + 1) % G.items.length;
    Sound.blip();
  }
  let chosen = Input.take(MENU_OK) ? G.menuIdx : -1;
  let tap;
  while ((tap = Input.takeTap())) {
    G.items.forEach((item, i) => {
      const { x, y, u, top, bottom } = itemLayout(i);
      const w = textWidth(item.label, u, 'bold');
      if (tap.x > x - 70 && tap.x < x + w + 70 && tap.y > y - top && tap.y < y + 7 * u + bottom) chosen = i;
    });
  }
  if (chosen >= 0) {
    G.menuIdx = chosen;
    Sound.select();
    G.items[chosen].run();
  }
}

function tick(dt) {
  G.time += dt;
  G.fullscreenHintT = Math.max(0, G.fullscreenHintT - dt);

  if (Input.take(['KeyM'])) Sound.toggleMute();

  if (G.fadeDir === 1) {
    G.fade = Math.min(1, G.fade + dt / 0.35);
    if (G.fade >= 1) {
      G.fadeDir = -1;
      const cb = G.fadeCb;
      G.fadeCb = null;
      if (cb) cb();
    }
    return;
  }
  if (G.fadeDir === -1) {
    G.fade = Math.max(0, G.fade - dt / 0.35);
    if (G.fade <= 0) G.fadeDir = 0;
  }

  switch (G.state) {
    case 'start':
      if (Input.fresh.size > 0 || Input.takeTap()) {
        Sound.select();
        showMenu();
      }
      break;
    case 'menu':
      tickItems();
      break;
    case 'play':
      Input.tapQueue.length = 0;
      tickPlay(dt);
      break;
    case 'pause':
      if (Input.take(PAUSE_KEYS)) {
        resumeGame();
      } else {
        tickItems();
      }
      break;
    case 'clear':
      tickClear(dt);
      break;
    case 'gameover':
      updateFx(dt);
      tickItems();
      break;
    case 'finale':
      if (G.finale.phase !== 'over') Input.tapQueue.length = 0;
      tickFinale(dt);
      break;
  }
}

// ---------- Rysowanie ----------

function drawParticles(c) {
  for (const p of G.particles) {
    c.globalAlpha = Math.min(1, p.life * 3);
    c.fillStyle = p.color;
    if (p.kind === 'star') star(c, p.x, p.y, p.size * 0.6, p.size);
    else {
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.globalAlpha = 1;
}

// Wejście do portalu i wyjście z niego: postać zmierza ku środkowi i maleje.
function portalPose(p) {
  const entering = p.portalT !== null;
  const k = entering ? p.portalT : 1 - Math.max(0, p.emergeT);
  if (k <= 0) return { x: p.x, y: p.y, scale: 1, alpha: 1 };
  const portalX = entering ? G.level.exit.x : G.arrival ? G.arrival.x : p.x;
  const e = k * k;
  return {
    x: p.x + (portalX - p.x) * e,
    y: p.y + (PORTAL_CY + 40 - p.y) * e,
    scale: 1 - 0.85 * e,
    alpha: 1 - 0.6 * e,
  };
}

function drawPlayers(c) {
  const order = G.mode === 1 ? [1 - G.active, G.active] : [0, 1];
  for (const i of order) {
    const p = G.players[i];
    if (!p || p.gone || p.emergeT < 0) continue;
    if (p.invuln > 0 && Math.floor(G.time * 14) % 2 === 0) continue;
    if (p.tumble) {
      const lying = p.tumble.angle / (Math.PI / 2);
      const flail = Math.sin(G.time * 26) * 0.25;
      const limbs = p.tumble.landed
        ? { legA: 0.12, legB: -0.12, armA: 0.1, armB: -0.1, bob: 0, blink: true }
        : { legA: 0.7 + flail, legB: -0.7 - flail, armA: 2.1 + flail, armB: -2.1 - flail, bob: 0, blink: false };
      drawCharacterTilted(c, p.who, p.x, p.y - 65 + 30 * lying, p.facing, limbs, p.tumble.angle);
      continue;
    }
    const pose = portalPose(p);
    c.globalAlpha = pose.alpha;
    drawCharacter(c, p.who, pose.x, pose.y, p.facing, poseFor(p, G.time), pose.scale);
    c.globalAlpha = 1;
  }
  if (G.state !== 'play') return;
  if (G.mode === 1) {
    const p = G.players[G.active];
    if (p.emergeT < 1) return;
    const y = p.y - 150 + Math.sin(G.time * 6) * 4;
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(p.x - 9, y - 10);
    c.lineTo(p.x + 9, y - 10);
    c.lineTo(p.x, y);
    c.closePath();
    c.fill();
    // Na klawiaturze przypomina, jak przełączyć się na drugą postać.
    const other = G.players[1 - G.active];
    if (!Input.touchMode && other.emergeT >= 1) {
      const labelY = other.y - 160 + Math.sin(G.time * 6) * 4;
      drawText(c, 'SHIFT', other.x, labelY, { u: 1.5, align: 'center', shadow: '#000a' });
    }
  } else if (G.bannerT > 0) {
    G.players.forEach((p, i) => {
      if (p.emergeT >= 1) drawText(c, `GRACZ ${i + 1}`, p.x, p.y - 158, { u: 2, align: 'center', shadow: '#000a' });
    });
  }
}

function drawWorld(c) {
  const lvl = G.level;
  const theme = G.themeName;
  drawBackdrop(c, theme, G.cam, G.time, lvl);
  if (lvl) drawLamps(c, theme, G.cam, lvl);
  drawGroundBand(c, theme, G.cam);
  if (!lvl) return;

  c.save();
  c.translate(-G.cam, 0);
  const opening = Math.sin((G.portalOpen * Math.PI) / 2);
  drawPortal(c, lvl.exit.x, PORTAL_CLOSED + (1 - PORTAL_CLOSED) * opening, G.time);
  if (G.arrival) drawPortal(c, G.arrival.x, G.arrival.open, G.time);
  if (lvl.finale) drawRock(c, lvl.finale.rockX);
  for (const p of lvl.platforms) {
    if (p.cx + p.w > G.cam - 10 && p.cx < G.cam + VIEW_WIDTH + 10) drawPlatform(c, theme, p);
  }
  for (const s of lvl.spikes) drawSpikes(c, s);
  for (const g of lvl.guitars) {
    if (g.taken || g.x < G.cam - 80 || g.x > G.cam + VIEW_WIDTH + 80) continue;
    const phase = g.x * 0.01;
    drawGuitar(c, g.t, g.x, g.y + Math.sin(G.time * 2.4 + phase) * 5, 0.72 + Math.sin(G.time * 1.7 + phase) * 0.05);
  }
  drawPlayers(c);
  drawParticles(c);
  const floatU = Input.touchMode ? 3 : 2;
  for (const f of G.floats) {
    c.globalAlpha = Math.min(1, f.life * 2.5);
    // Długi komunikat przy końcu poziomu nie może wyjść poza ekran.
    const half = textWidth(f.text, floatU, 'bold') / 2 + 10;
    const x = Math.max(G.cam + half, Math.min(G.cam + VIEW_WIDTH - half, f.x));
    drawText(c, f.text, x, f.y, { u: floatU, style: 'bold', align: 'center', color: f.color, shadow: '#000a' });
  }
  c.globalAlpha = 1;
  c.restore();
}

function hudPos(type) {
  return type === 'S' ? { x: SAFE.left + 104, y: 44 } : { x: VIEW_WIDTH - SAFE.right - 104, y: 44 };
}

function drawHud(c) {
  const shadow = '#0008';
  const dim = (who) => (G.mode === 1 && G.players[G.active].who !== who ? 0.55 : 1);
  const L = SAFE.left;
  const R = VIEW_WIDTH - SAFE.right;

  c.globalAlpha = dim('blond');
  drawHeadIcon(c, 'blond', L + 48, 42, 0.56);
  drawGuitar(c, 'S', L + 104, 44, 0.72, 0.52);
  drawText(c, `${G.got.S}/${G.total.S}`, L + 142, 32, { u: 3, style: 'bold', shadow });

  c.globalAlpha = dim('dark');
  drawHeadIcon(c, 'dark', R - 48, 42, 0.56);
  drawGuitar(c, 'J', R - 104, 44, 0.72, 0.52);
  drawText(c, `${G.got.J}/${G.total.J}`, R - 142, 32, { u: 3, style: 'bold', align: 'right', shadow });
  c.globalAlpha = 1;

  const heartW = 32;
  const startX = VIEW_WIDTH / 2 - (START_LIVES * heartW) / 2 + 3;
  for (let i = 0; i < START_LIVES; i++) drawHeart(c, startX + i * heartW, 16, i < G.lives);
  drawText(c, String(G.score).padStart(6, '0'), VIEW_WIDTH / 2, 48, { u: 3, style: 'bold', align: 'center', shadow });

  for (const f of G.flyers) {
    const to = hudPos(f.type);
    const e = f.t * f.t * (3 - 2 * f.t);
    drawGuitar(c, f.type, f.x0 + (to.x - f.x0) * e, f.y0 + (to.y - f.y0) * e, 0.72 + e * 6.28, 1 - e * 0.48);
  }
}

const HEART = [0x36, 0x7f, 0x7f, 0x3e, 0x1c, 0x08];
function drawHeart(c, x, y, full) {
  c.fillStyle = full ? '#e8534f' : '#0005';
  c.beginPath();
  for (let r = 0; r < HEART.length; r++) {
    for (let k = 0; k < 7; k++) {
      if (HEART[r] & (0x40 >> k)) c.rect(x + k * 3.5, y + r * 3.5, 3.8, 3.8);
    }
  }
  c.fill();
}

function drawItems(c) {
  G.items.forEach((item, i) => {
    const { x, y, u } = itemLayout(i);
    const selected = i === G.menuIdx;
    const shadow = G.state === 'menu' ? null : '#000c';
    drawText(c, item.label, x, y, { u, style: 'bold', color: selected ? '#f5f06e' : '#fff', shadow });
    if (selected) {
      const s = u / 3;
      c.fillStyle = '#fff';
      c.beginPath();
      c.moveTo(x - 17 * s, y + 2 * s);
      c.lineTo(x - 5 * s, y + 10 * s);
      c.lineTo(x - 17 * s, y + 18 * s);
      c.closePath();
      c.fill();
    }
  });
}

function drawDim(c, alpha) {
  c.fillStyle = `rgba(8, 10, 22, ${alpha})`;
  c.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}

function drawStartScreen(c) {
  drawDim(c, 0.42);
  const mid = VIEW_WIDTH / 2;
  drawLogo(c, mid, 60, 176);
  drawText(c, 'NOWA GRA', mid, 262, { u: 4, style: 'outline', align: 'center', inner: '#1b2550' });
  drawInstagram(c);
  if (G.time % 1.1 > 0.8) return;
  const prompt = Input.touchMode ? 'DOTKNIJ, ABY ZAGRAĆ' : 'KLIKNIJ LUB NACIŚNIJ ENTER';
  drawText(c, prompt, mid, 404, { u: Input.touchMode ? 4 : 3, style: 'bold', align: 'center', color: '#f5f06e' });
}

function drawMenu(c) {
  drawDim(c, 0.42);
  drawLogo(c, VIEW_WIDTH / 2, 60, 176);
  drawText(c, 'NOWA GRA', VIEW_WIDTH / 2, 262, { u: 4, style: 'outline', align: 'center', inner: '#1b2550' });
  drawItems(c);
  drawInstagram(c);
  const mid = VIEW_WIDTH / 2;
  if (Input.touchMode) {
    const hint = { u: 3, align: 'center', color: '#a3a39a' };
    drawText(c, 'LEWY KCIUK: BIEG, PRAWY KCIUK: SKOK', mid, 640, hint);
    if (G.hi > 0) drawText(c, `REKORD ${String(G.hi).padStart(6, '0')}`, mid, 676, hint);
    return;
  }
  const hint = { u: 2, align: 'center', color: '#a3a39a' };
  drawText(c, '1 GRACZ: STRZAŁKI LUB WASD, SPACJA = SKOK, SHIFT = ZMIANA POSTACI', mid, 642, hint);
  drawText(c, '2 GRACZY: KAMIL = WASD, WOJTEK = STRZAŁKI', mid, 664, hint);
  if (G.hi > 0) drawText(c, `REKORD ${String(G.hi).padStart(6, '0')}`, mid, 686, hint);
}

function drawBanner(c) {
  if (G.state === 'play' && G.bannerT > 0) {
    c.globalAlpha = Math.min(1, G.bannerT * 2);
    drawText(c, G.level.name, VIEW_WIDTH / 2, 316, {
      u: 5, style: 'outline', align: 'center', inner: THEMES[G.themeName].bannerInner,
    });
    c.globalAlpha = 1;
  }
  if (G.state === 'clear') {
    const inner = THEMES[G.themeName].bannerInner;
    drawText(c, 'ETAP ZALICZONY', VIEW_WIDTH / 2, 230, { u: 5, style: 'outline', align: 'center', inner });
    drawText(c, `BONUS +${G.bonus}`, VIEW_WIDTH / 2, 300, { u: 3, style: 'bold', align: 'center', color: '#f5f06e', shadow: '#0008' });
  }
}

// Trójkąt z kwadratowych pikseli, w stylu napisów; grot w stronę (dx, dy).
function pixelArrow(c, x, y, dx, dy, px) {
  c.beginPath();
  for (let i = -4; i <= 4; i++) {
    const len = 5 - Math.abs(i);
    for (let j = 0; j < len; j++) {
      const along = j - 2;
      const gx = dx ? dx * along : i;
      const gy = dx ? i : dy * along;
      c.rect(x + gx * px - px / 2, y + gy * px - px / 2, px + 0.3, px + 0.3);
    }
  }
  c.fill();
}

function drawEndScreen(c, shown) {
  drawDim(c, 0.62 * shown);
  c.globalAlpha = shown;
  const mid = VIEW_WIDTH / 2;
  drawText(c, 'KONIEC GRY', mid, 26, { u: 5, style: 'outline', align: 'center', inner: '#141a22' });
  const score = String(G.score).padStart(6, '0');
  const hi = String(G.hi).padStart(6, '0');
  drawText(c, `WYNIK ${score}  REKORD ${hi}`, mid, 86, { u: 3, style: 'bold', align: 'center', shadow: '#000c' });
  drawPromoTiles(c);
  drawLogo(c, VIEW_WIDTH - SAFE.right - 96, VIEW_HEIGHT - SAFE.bottom - 112, 96);
  drawInstagram(c);
  c.globalAlpha = 1;
  drawItems(c);
}

function drawFinaleOverlay(c) {
  if (G.finale.phase === 'over') drawEndScreen(c, Math.min(1, G.finale.t / 0.8));
  else drawHud(c);
}

function drawFullscreenHint(c) {
  if (G.fullscreenHintT <= 0) return;
  c.globalAlpha = Math.min(1, G.fullscreenHintT * 3);
  c.fillStyle = 'rgba(8, 10, 22, 0.9)';
  c.fillRect(0, 500, VIEW_WIDTH, 96);
  const mid = VIEW_WIDTH / 2;
  const text = { u: 3, style: 'bold', align: 'center' };
  drawText(c, 'IPHONE: W SAFARI WYBIERZ UDOSTĘPNIJ', mid, 516, text);
  drawText(c, 'A POTEM DO EKRANU POCZĄTKOWEGO', mid, 554, text);
  c.globalAlpha = 1;
}

function drawPortalWipe(c) {
  if (G.state !== 'clear' || G.clearT > WIPE_TIME) return;
  const e = 1 - Math.max(0, G.clearT) / WIPE_TIME;
  const grow = e * e * e * 3000;
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(G.level.exit.x - G.cam, PORTAL_CY, 35 + grow, 110 + grow, 0, 0, Math.PI * 2);
  c.fill();
}

function drawTouchButtons(c) {
  if (!Input.touchMode || !Input.buttons.length) return;
  for (const b of Input.buttons) {
    const active = Input.touchDown.has(b.code);
    c.beginPath();
    c.arc(b.x, b.y, active ? b.r * 0.94 : b.r, 0, Math.PI * 2);
    c.fillStyle = active ? 'rgba(255,255,255,0.36)' : 'rgba(10,12,24,0.3)';
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.stroke();

    c.fillStyle = 'rgba(255,255,255,0.88)';
    const px = b.r * 0.115;
    if (b.icon === 'left') pixelArrow(c, b.x, b.y, -1, 0, px);
    if (b.icon === 'right') pixelArrow(c, b.x, b.y, 1, 0, px);
    if (b.icon === 'jump') pixelArrow(c, b.x, b.y, 0, -1, px);
    if (b.icon === 'swap') drawHeadIcon(c, G.players[1 - G.active].who, b.x, b.y, b.r * 0.0165);
    if (b.icon === 'pause') {
      c.fillRect(b.x - 9, b.y - 11, 6, 22);
      c.fillRect(b.x + 3, b.y - 11, 6, 22);
    }
    if (b.icon === 'fullscreen') {
      const corner = 13;
      const len = 9;
      const thick = 4;
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          const cx = b.x + sx * corner;
          const cy = b.y + sy * corner;
          c.fillRect(sx > 0 ? cx - len : cx, sy > 0 ? cy - thick : cy, len, thick);
          c.fillRect(sx > 0 ? cx - thick : cx, sy > 0 ? cy - len : cy, thick, len);
        }
      }
    }
    if (b.tag) drawText(c, b.tag, b.x, b.y - b.r - 28, { u: 3, style: 'bold', align: 'center', shadow: '#000a' });
  }
}

let layoutKey = '';
let layoutFrames = 0;
let viewTransform = [1, 0, 0, 1, 0, 0];

function cssInset(name) {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
}

// Pionowy telefon rysuje grę obróconą o 90°: działa też przy włączonej blokadzie obrotu.
function updateLayout() {
  const pr = Math.min(window.devicePixelRatio || 1, G.renderCap);
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (canvas.width !== Math.round(cw * pr) || canvas.height !== Math.round(ch * pr)) {
    canvas.width = Math.round(cw * pr);
    canvas.height = Math.round(ch * pr);
  }
  const rotated = Input.touchMode && ch > cw;
  const fullW = canvas.width;
  const screenW = rotated ? canvas.height : canvas.width;
  const screenH = rotated ? canvas.width : canvas.height;
  VIEW_WIDTH = Math.max(1280, Math.min(MAX_VIEW_WIDTH, Math.round((VIEW_HEIGHT * screenW) / screenH)));
  const k = Math.min(screenW / VIEW_WIDTH, screenH / VIEW_HEIGHT);
  const ox = (screenW - VIEW_WIDTH * k) / 2;
  const oy = (screenH - VIEW_HEIGHT * k) / 2;
  viewTransform = rotated ? [0, k, -k, 0, fullW - oy, ox] : [k, 0, 0, k, ox, oy];
  Input.toLogical = rotated
    ? (x, y) => ({ x: (y * pr - ox) / k, y: (fullW - oy - x * pr) / k })
    : (x, y) => ({ x: (x * pr - ox) / k, y: (y * pr - oy) / k });

  // iOS podaje nowe marginesy z opóźnieniem po obrocie, więc czytamy je co jakiś czas.
  if (layoutFrames++ % 30 === 0) {
    const edge = rotated ? ['--sat', '--sab', '--sal'] : ['--sal', '--sar', '--sab'];
    SAFE.left = Math.max(0, cssInset(edge[0]) * pr - ox) / k;
    SAFE.right = Math.max(0, cssInset(edge[1]) * pr - ox) / k;
    SAFE.bottom = Math.max(0, cssInset(edge[2]) * pr - oy) / k;
  }
  const key = [VIEW_WIDTH, SAFE.left, SAFE.right, SAFE.bottom, ...viewTransform].join('|');
  if (key !== layoutKey) {
    layoutKey = key;
    Input.setButtons(currentButtons());
    layoutPromoLinks(viewTransform.map((v) => v / pr));
  }
}

function render() {
  if (!canvas.clientWidth || !canvas.clientHeight) return;
  updateLayout();

  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#000';
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.setTransform(...viewTransform);
  c.save();
  c.beginPath();
  c.rect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  c.clip();

  drawWorld(c);

  switch (G.state) {
    case 'start':
      drawStartScreen(c);
      drawTouchButtons(c);
      break;
    case 'menu':
      drawMenu(c);
      drawTouchButtons(c);
      break;
    case 'play':
    case 'clear':
      drawHud(c);
      drawBanner(c);
      drawTouchButtons(c);
      drawPortalWipe(c);
      break;
    case 'pause':
      drawHud(c);
      drawDim(c, 0.45);
      drawText(c, 'PAUZA', VIEW_WIDTH / 2, 280, { u: 5, style: 'outline', align: 'center', inner: '#1b2550' });
      drawItems(c);
      break;
    case 'gameover':
      drawEndScreen(c, 1);
      break;
    case 'finale':
      drawFinaleOverlay(c);
      break;
  }

  drawFullscreenHint(c);

  const songLinks = G.fadeDir === 0 && isEndScreen() && G.items.length > 0;
  const socialLink = G.fadeDir === 0 && (songLinks || G.state === 'start' || G.state === 'menu');
  showPromoLinks(songLinks, socialLink);

  if (G.fade > 0) {
    c.fillStyle = `rgba(${G.fadeColor}, ${G.fade})`;
    c.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
  c.restore();
}

// ---------- Pętla ----------

let lastFrame = performance.now();
let accumulator = 0;
let sampledFrames = 0;
let slowFrames = 0;

// Słabszy telefon dostaje niższą rozdzielczość zamiast klatkowania.
// Próg 25 kl./s, bo tryb oszczędzania na iOS sam ogranicza do 30.
function watchPerformance(delta) {
  if (delta > 0.2) return;
  sampledFrames++;
  if (delta > 0.04) slowFrames++;
  if (sampledFrames < 120) return;
  if (slowFrames > 60 && G.renderCap > 1) G.renderCap -= 0.5;
  sampledFrames = 0;
  slowFrames = 0;
}

function frame(now) {
  const delta = (now - lastFrame) / 1000;
  watchPerformance(delta);
  accumulator += Math.min(0.05, delta);
  lastFrame = now;
  while (accumulator >= PHYS.DT) {
    tick(PHYS.DT);
    accumulator -= PHYS.DT;
  }
  render();
  requestAnimationFrame(frame);
}

function autoPause() {
  Input.reset();
  if (G.state === 'play') Input.fresh.add('KeyP');
}
addEventListener('blur', autoPause);
document.addEventListener('visibilitychange', () => {
  Sound.setHidden(document.hidden);
  if (document.hidden) autoPause();
});

Input.attach(canvas);
showStart();
requestAnimationFrame(frame);
