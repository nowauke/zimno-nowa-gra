// Reżyser rolki na Instagram: bot gra skrót całej gry, a pionowy kadr 1080x1920
// razem z dźwiękiem gry trafia do nagrania MP4.
const REEL_W = 1080;
const REEL_H = 1920;
const GAME_Y = 600;
const GAME_H = (REEL_W * 9) / 16;
const BG = '#0d1330';
// Instagram dostaje „LINK W BIO”; na Facebooku link jest w opisie posta, więc tam tego napisu nie ma.
const FOR_FACEBOOK = new URLSearchParams(location.search).get('wersja') === 'facebook';

const gameCanvas = document.getElementById('game');
const reel = document.createElement('canvas');
reel.width = REEL_W;
reel.height = REEL_H;
reel.style.cssText = 'position:absolute;left:0;top:0;width:270px;height:480px';
document.body.append(reel);
const rc = reel.getContext('2d');

const REEL_STARS = Array.from({ length: 26 }, (_, i) => [
  (hash(i * 3 + 1) * REEL_W) | 0,
  (hash(i * 3 + 2) * REEL_H) | 0,
  3 + hash(i * 3 + 3) * 9,
]);

function log(...parts) {
  fetch('/log', { method: 'POST', body: parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ') });
}
addEventListener('error', (e) => log('BŁĄD STRONY', e.message, `${e.filename}:${e.lineno}`));
addEventListener('unhandledrejection', (e) => log('BŁĄD', String(e.reason && e.reason.message)));
log('strona wczytana', { audio: Sound.ctx && Sound.ctx.state });

// Na rolce gra wygląda jak na telefonie, ale bez przycisków zasłaniających akcję.
Input.touchMode = true;
drawTouchButtons = () => {};

// ---------- Dźwięk: wszystko, co gra słyszy, trafia też do nagrania ----------

Sound.unlock();
const audioTap = Sound.ctx.createMediaStreamDestination();
const master = Sound.ctx.createGain();
master.connect(Sound.ctx.destination);
master.connect(audioTap);
const connectNode = AudioNode.prototype.connect;
AudioNode.prototype.connect = function (target, ...rest) {
  return connectNode.call(this, target === Sound.ctx.destination ? master : target, ...rest);
};
Sound.musicBus.disconnect();
Sound.musicBus.connect(master);
// Cała rolka leci na jednym podkładzie, zamiast przeskakiwać przy każdym cięciu.
const playMusic = Sound.playTrack.bind(Sound);
Sound.playTrack = () => {};

// ---------- Sterowanie botem ----------

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const lead = () => G.players[G.active];
let jumpRelease = 0;

async function until(cond, label, timeout = 20) {
  const start = performance.now();
  while (!cond()) {
    if (performance.now() - start > timeout * 1000) throw new Error(`timeout: ${label}`);
    await nextFrame();
  }
}

async function wait(sec) {
  const start = performance.now();
  while (performance.now() - start < sec * 1000) await nextFrame();
}

function holdRight(on) {
  if (on) Input.down.add('ArrowRight');
  else Input.down.delete('ArrowRight');
}

function jump(hold = 0.5) {
  Input.fresh.add('Space');
  Input.down.add('Space');
  jumpRelease = performance.now() + hold * 1000;
}

function takeAllGuitars() {
  for (const g of G.level.guitars) {
    if (!g.taken) {
      g.taken = true;
      G.got[g.t]++;
    }
  }
  G.portalOpen = 1;
}

function place(leadX, otherX) {
  const a = lead();
  const b = G.players[1 - G.active];
  for (const [p, x] of [[a, leadX], [b, otherX]]) {
    Object.assign(p, { x, y: PHYS.GROUND_Y, vx: 0, vy: 0, on: null, onGround: true, emergeT: 1 });
  }
  G.cam = Math.max(-SAFE.left, Math.min(G.level.length - VIEW_WIDTH, cameraTarget()));
}

async function cutTo(setup) {
  holdRight(false);
  fadeTo(setup);
  await until(() => G.fadeDir === 0, 'cut');
}

// ---------- Ujęcia ----------

async function director() {
  // Ekran startowy z logo, potem menu i 1 gracz.
  await wait(1.6);
  Input.fresh.add('Enter');
  await wait(1.1);
  Input.fresh.add('Enter');

  // Etap 1: skok przez kolce, Wojtek łapie Jazzmastera, Kamil zbiera StingRaye.
  await until(() => G.state === 'play' && G.lockT <= 0, 'etap 1');
  holdRight(true);
  for (const x of [650, 1110, 1800]) {
    await until(() => lead().onGround && lead().x >= x, `skok ${x}`);
    jump(0.5);
  }
  await until(() => lead().x >= 2250, 'koniec ujęcia 1');
  log('etap 1 gitary', G.got);

  // Koniec etapu 1: portal i przejście do etapu 2.
  await cutTo(() => {
    loadLevel(0);
    takeAllGuitars();
    place(G.level.exit.x - 380, G.level.exit.x - 480);
    G.lockT = 0;
    G.bannerT = 0;
  });
  holdRight(true);
  await until(() => G.state === 'clear', 'portal');
  holdRight(false);
  G.clearT = Math.min(G.clearT, 1.6);
  await until(() => G.levelIdx === 1 && G.state === 'play', 'etap 2');

  // Etap 2: dwa skoki po platformach nad długim rzędem kolców.
  await until(() => G.lockT <= 0, 'start etapu 2');
  holdRight(true);
  await until(() => lead().onGround && lead().x >= 610, 'skok na małą platformę');
  jump(0.5);
  await until(() => lead().x >= 770, 'hamowanie 1');
  holdRight(false);
  await until(() => lead().onGround, 'mała platforma');
  log('mała platforma', Math.round(lead().x), Math.round(lead().y));
  holdRight(true);
  jump(0.5);
  await until(() => !lead().onGround, 'wybicie');
  await until(() => lead().x >= 1050, 'hamowanie 2');
  holdRight(false);
  await until(() => lead().onGround, 'duża platforma');
  log('duża platforma', Math.round(lead().x), Math.round(lead().y));
  holdRight(true);
  await until(() => lead().x >= 1560, 'koniec ujęcia 2');
  log('etap 2', { lives: G.lives, got: G.got });

  // Etap 3: koniec ulicy, potknięcie i KONIEC GRY z kafelkami piosenek.
  await cutTo(() => {
    loadLevel(2);
    takeAllGuitars();
    place(G.level.finale.rockX - 330, G.level.finale.rockX - 430);
    G.lockT = 0;
    G.bannerT = 1.4;
  });
  holdRight(true);
  await until(() => G.state === 'finale', 'kamień');
  holdRight(false);
  await until(() => G.finale.phase === 'over' && G.items.length > 0, 'koniec gry');
  await wait(2.2);
}

// ---------- Pionowy kadr ----------

let endCardStart = 0;

function drawReel() {
  if (jumpRelease && performance.now() > jumpRelease) {
    Input.down.delete('Space');
    jumpRelease = 0;
  }
  rc.fillStyle = BG;
  rc.fillRect(0, 0, REEL_W, REEL_H);
  rc.fillStyle = 'rgba(255, 255, 255, 0.5)';
  for (const [x, y, s] of REEL_STARS) star(rc, x, y, s * 0.6, s);

  drawLogo(rc, REEL_W / 2, 170, 230);
  drawText(rc, 'NOWA GRA', REEL_W / 2, 432, { u: 10, style: 'outline', align: 'center', inner: BG });

  rc.imageSmoothingQuality = 'high';
  rc.drawImage(gameCanvas, 0, GAME_Y, REEL_W, GAME_H);
  rc.strokeStyle = '#fff';
  rc.lineWidth = 6;
  rc.strokeRect(-3, GAME_Y - 3, REEL_W + 6, GAME_H + 6);

  if (FOR_FACEBOOK) {
    drawText(rc, 'ZAGRAJ W NASZ TELEDYSK', REEL_W / 2, 1300, { u: 6, style: 'bold', align: 'center', color: '#f5f06e' });
  } else {
    drawText(rc, 'ZAGRAJ W NASZ TELEDYSK', REEL_W / 2, 1290, { u: 5, style: 'bold', align: 'center' });
    drawText(rc, 'LINK W BIO', REEL_W / 2, 1380, { u: 9, style: 'bold', align: 'center', color: '#f5f06e' });
  }

  if (endCardStart) {
    const t = (performance.now() - endCardStart) / 1000;
    rc.globalAlpha = Math.min(1, t / 0.4) * 0.9;
    rc.fillStyle = BG;
    rc.fillRect(0, GAME_Y, REEL_W, GAME_H);
    rc.globalAlpha = Math.min(1, t / 0.4);
    const pulse = 1 + Math.sin(t * 6) * 0.04;
    if (FOR_FACEBOOK) {
      drawText(rc, 'ZAGRAJ W NASZ', REEL_W / 2, GAME_Y + 120, { u: 8 * pulse, style: 'bold', align: 'center' });
      drawText(rc, 'TELEDYSK', REEL_W / 2, GAME_Y + 200, { u: 8 * pulse, style: 'bold', align: 'center', color: '#f5f06e' });
    } else {
      drawText(rc, 'LINK W BIO', REEL_W / 2, GAME_Y + 200, { u: 12 * pulse, style: 'bold', align: 'center', color: '#f5f06e' });
    }
    drawText(rc, 'GRAJ NA TELEFONIE', REEL_W / 2, GAME_Y + 340, { u: 5, style: 'bold', align: 'center' });
    drawText(rc, 'I NA KOMPUTERZE', REEL_W / 2, GAME_Y + 400, { u: 5, style: 'bold', align: 'center' });
    rc.globalAlpha = 1;
  }
  reelFrames++;
  // Chrome bez okna sam nie oddaje nowych klatek płótna, więc wysyłamy je ręcznie.
  // Co drugą, czyli 30 kl./s: na rolkę wystarcza, a plik jest mniejszy.
  if (videoTrack && reelFrames % 2 === 0) videoTrack.requestFrame();
  requestAnimationFrame(drawReel);
}

let reelFrames = 0;
let videoTrack = null;

// ---------- Nagranie ----------

async function record() {
  for (const song of PROMO_SONGS) {
    song.thumb = new Image();
    song.thumb.src = `/thumb/${song.id}`;
  }
  await until(() => logoImage.complete && PROMO_SONGS.every((s) => s.thumb.complete), 'obrazki', 15);
  log('miniaturki', PROMO_SONGS.map((s) => s.thumb.naturalWidth));
  Sound.stopMusic();
  playMusic(MENU_TRACK);
  await until(() => Sound.currentLoop, 'muzyka', 15);
  requestAnimationFrame(drawReel);
  await nextFrame();

  const stream = reel.captureStream(0);
  videoTrack = stream.getVideoTracks()[0];
  audioTap.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/mp4;codecs=avc1.640028,mp4a.40.2',
    videoBitsPerSecond: 10e6,
    audioBitsPerSecond: 192e3,
  });
  const chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  const stopped = new Promise((resolve) => (recorder.onstop = resolve));
  recorder.start(1000);
  const startedAt = performance.now();

  try {
    await director();
    endCardStart = performance.now();
    await wait(3.2);
  } catch (err) {
    log('BŁĄD', err.message, { state: G.state, x: Math.round(lead().x), y: Math.round(lead().y) });
  }
  recorder.stop();
  await stopped;
  const seconds = (performance.now() - startedAt) / 1000;
  log('długość', seconds.toFixed(1), 's, klatek na sekundę', (reelFrames / seconds).toFixed(1));
  await fetch('/upload', { method: 'PUT', body: new Blob(chunks, { type: 'video/mp4' }) });
}

record();
