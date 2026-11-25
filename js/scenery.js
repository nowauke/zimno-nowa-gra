// Tła rysowane w skali klatek z teledysku (szerokość 2000), zob. REF.
// Wysokość świata jest stała; szerokość rośnie na podłużnych ekranach telefonów.
let VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;
const REF = 0.64;
const GROUND_TOP = 573;
const GRASS_DARK_TOP = 609;
const DIRT_TOP = 624;
const BASE = GROUND_TOP / REF;
const PLATFORM_SINK = 14;
const PLATFORM_H = 52;

const THEMES = {
  forest: {
    sky: '#4159b3', cloud: '#5873c9', hill: '#344c8a', tree: '#2c3f71',
    grass: '#5a8655', grassDark: '#40613a', dirt: '#31302a',
    dots: ['#3d3a32', '#57503f', '#1f1e1a', '#655a43'],
    platTop: '#5a8655', platDark: '#40613a', platDirt: '#31302a', platDot: '#57503f',
    bannerInner: '#4159b3',
  },
  park: {
    sky: '#092945', hill: '#102d4a', tree: '#081a28',
    grass: '#0e1e20', grassDark: '#0a1b08', dirt: '#23221c',
    dots: ['#3f3932', '#4d463b', '#2d2b24'],
    platTop: '#0d1f20', platDark: '#0d1a0a', platDirt: '#23221e', platDot: '#45413b',
    lamp: '#012029', moon: '#fcfdbd', bannerInner: '#092945',
  },
  city: {
    sky: '#1f3343',
    grass: '#242424', grassDark: '#1a1a18', dirt: '#131313',
    dots: ['#3b3a36', '#2a2925', '#4a4843'],
    platTop: '#0f2020', platDark: '#0d1a0a', platDirt: '#25231f', platDot: '#45413b',
    lamp: '#0b2a33', bannerInner: '#1f3343',
  },
};

const STARS = [
  [337, 115, 15, 24], [754, 65, 8, 13], [1284, 100, 14, 22], [1659, 100, 14, 22],
  [168, 312, 4, 6], [776, 312, 8, 13], [1295, 295, 7, 11], [1827, 283, 4, 6],
];
const STAR_PERIOD = 1920;

// [x0, x1, y0] względem lewego górnego rogu; wszystkie pigułki mają tę samą wysokość.
const CLOUD_A = [[260, 332, 0], [125, 345, 30], [375, 430, 35], [85, 345, 60], [0, 75, 85], [120, 378, 85], [70, 328, 115]];
const CLOUD_B = [[33, 203, 0], [256, 311, 0], [23, 281, 30], [0, 230, 55], [293, 368, 52], [43, 326, 83]];
const CLOUDS = [
  [CLOUD_A, 215, 210], [CLOUD_B, 822, 100], [CLOUD_A, 1435, 265],
];
const CLOUD_PERIOD = 1920;

const TREE_ROWS = [
  [-41, 59, -465, -428], [-84, 71, -430, -391], [-154, 114, -393, -353], [-143, 157, -358, -316],
  [-181, 136, -318, -276], [-141, 176, -278, -236], [-113, -24, -238, -195], [-16, 144, -238, -195],
];
const TREES = [[230, 1], [770, 0.6], [1210, 0.86], [1770, 0.6]];
const TREE_PERIOD = 1920;

const PINE_ROWS = (() => {
  const rows = [];
  const jitter = [12, 0, 16, 4, 20, 8, 0, 18, 6, 22, 2, 14, 8, 24, 4, 16, 10];
  for (let i = 0; i < 17; i++) {
    const hw = 42 + i * 10 + jitter[i];
    rows.push([-hw + (i % 3) * 6, hw + (i % 2) * 8, -495 + i * 27, -495 + i * 27 + 30]);
  }
  return rows;
})();
const PINES = [[45, 1], [1875, 1], [1000, 0.72]];
const PINE_PERIOD = 2750;

function pill(c, x0, y0, x1, y1) {
  c.beginPath();
  rr(c, x0, y0, x1, y1, (y1 - y0) / 2);
  c.fill();
}

function star(c, x, y, w, h) {
  c.beginPath();
  c.moveTo(x, y - h);
  c.quadraticCurveTo(x + w * 0.15, y - h * 0.15, x + w, y);
  c.quadraticCurveTo(x + w * 0.15, y + h * 0.15, x, y + h);
  c.quadraticCurveTo(x - w * 0.15, y + h * 0.15, x - w, y);
  c.quadraticCurveTo(x - w * 0.15, y - h * 0.15, x, y - h);
  c.fill();
}

// Przechodzi po powtórkach wzoru, które są widoczne przy danym przesunięciu warstwy.
function eachRepeat(period, offset, margin, draw) {
  const viewW = VIEW_WIDTH / REF;
  const first = Math.floor((offset - margin) / period);
  const last = Math.floor((offset + viewW + margin) / period);
  for (let k = first; k <= last; k++) draw(k * period - offset, k);
}

function drawStars(c, cam, t) {
  c.fillStyle = '#fff';
  eachRepeat(STAR_PERIOD, (cam * 0.25) / REF, 40, (ox) => {
    for (const [x, y, w, h] of STARS) star(c, ox + x, y, w, h);
  });
}

function drawClouds(c, theme, cam, t) {
  c.fillStyle = theme.cloud;
  eachRepeat(CLOUD_PERIOD, (cam * 0.15 + t * 5) / REF, 420, (ox) => {
    for (const [shape, x, y] of CLOUDS) {
      for (const [a, b, dy] of shape) pill(c, ox + x + a, y + dy, ox + x + b, y + dy + 31);
    }
  });
}

function hillY(x) {
  return 655 - 100 * Math.sin(x / 325) - 58 * Math.sin(x / 148 + 1.3) - 30 * Math.sin(x / 83 + 0.5);
}

function drawHills(c, color, cam) {
  const off = (cam * 0.3) / REF;
  const viewW = VIEW_WIDTH / REF;
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, BASE + 10);
  for (let x = 0; x <= viewW + 16; x += 16) c.lineTo(x, hillY(x + off) + (BASE - 875));
  c.lineTo(viewW + 16, BASE + 10);
  c.closePath();
  c.fill();
}

function drawTree(c, x, s) {
  c.save();
  c.translate(x, BASE);
  c.scale(s, s);
  for (const [a, b, y0, y1] of TREE_ROWS) pill(c, a, y0, b, y1);
  c.fillRect(-21, -235, 42, 240);
  c.restore();
}

function drawPine(c, x, s) {
  c.save();
  c.translate(x, BASE);
  c.scale(s, s);
  for (const [a, b, y0, y1] of PINE_ROWS) pill(c, a, y0, b, y1);
  pill(c, -14, -548, 14, -480);
  c.beginPath();
  rr(c, -38, -50, 38, 5, [0, 0, 14, 14]);
  c.fill();
  c.restore();
}

function drawTrees(c, theme, cam) {
  c.fillStyle = theme.tree;
  eachRepeat(TREE_PERIOD, (cam * 0.55) / REF, 320, (ox) => {
    for (const [x, s] of TREES) drawTree(c, ox + x, s);
  });
}

function drawPines(c, theme, cam) {
  c.fillStyle = theme.tree;
  eachRepeat(PINE_PERIOD, (cam * 0.7) / REF, 320, (ox) => {
    for (const [x, s] of PINES) drawPine(c, ox + x, s);
  });
}

function drawLamp(c, theme, x) {
  c.save();
  c.translate(x, BASE);
  const d = theme.lamp;
  c.fillStyle = d;
  c.beginPath();
  rr(c, -22, -18, 22, 3, 8);
  c.fill();
  c.fillRect(-5, -245, 10, 232);
  c.fillStyle = '#f6e27c';
  c.beginPath();
  c.moveTo(-29, -305);
  c.lineTo(29, -305);
  c.lineTo(20, -243);
  c.lineTo(-20, -243);
  c.closePath();
  c.fill();
  c.fillStyle = d;
  c.fillRect(-4, -305, 8, 62);
  c.beginPath();
  rr(c, -22, -248, 22, -238, 3);
  c.fill();
  c.beginPath();
  c.moveTo(-41, -300);
  c.lineTo(-18, -337);
  c.lineTo(18, -337);
  c.lineTo(41, -300);
  c.closePath();
  c.fill();
  c.restore();
}

function winGrid(c, x, y, w, h, fill, frame, lw, r, vBar, hBar) {
  c.fillStyle = fill;
  c.strokeStyle = frame;
  c.lineWidth = lw;
  c.beginPath();
  rr(c, x, y, x + w, y + h, r);
  c.fill();
  c.stroke();
  c.beginPath();
  if (vBar) {
    c.moveTo(x + w / 2, y);
    c.lineTo(x + w / 2, y + h);
  }
  if (hBar) {
    c.moveTo(x, y + h / 2);
    c.lineTo(x + w, y + h / 2);
  }
  c.stroke();
}

function arched(c, x, y, w, h, fill, frame) {
  c.fillStyle = fill;
  c.strokeStyle = frame;
  c.lineWidth = 5;
  c.beginPath();
  rr(c, x, y, x + w, y + h, [w / 2, w / 2, 8, 8]);
  c.fill();
  c.stroke();
}

function buildingShell(c, color, x, w, h) {
  c.fillStyle = color;
  c.beginPath();
  rr(c, x, BASE - h, x + w, BASE + 5, [40, 40, 0, 0]);
  c.fill();
}

const BUILDINGS = [
  {
    w: 520,
    draw(c, x) {
      const h = 425;
      buildingShell(c, '#3e4334', x, 520, h);
      for (let r = 0; r < 2; r++) {
        for (let k = 0; k < 5; k++) arched(c, x + 70 + k * 83, BASE - h + 68 + r * 122, 62, 97, '#8d8d8d', '#5f645a');
      }
      c.fillStyle = '#b3b3b3';
      c.strokeStyle = '#d8d8d8';
      c.lineWidth = 5;
      for (const sx of [62, 320]) {
        c.beginPath();
        rr(c, x + sx, BASE - 107, x + sx + 140, BASE - 36, 8);
        c.fill();
        c.stroke();
      }
    },
  },
  {
    w: 415,
    draw(c, x) {
      const h = 695;
      buildingShell(c, '#636240', x, 415, h);
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k < 3; k++) {
          winGrid(c, x + 65 + k * 108, BASE - h + 110 + r * 160, 70, 118, '#d3c6b4', '#4b4a3c', 5, 14, true, true);
        }
      }
      c.fillStyle = '#d3c6b4';
      c.beginPath();
      rr(c, x + 178, BASE - 105, x + 240, BASE + 2, [14, 14, 0, 0]);
      c.fill();
    },
  },
  {
    w: 540,
    draw(c, x) {
      const h = 295;
      buildingShell(c, '#4a566b', x, 540, h);
      for (let k = 0; k < 4; k++) {
        winGrid(c, x + 47 + k * 114, BASE - h + 62, 92, 48, '#33343a', '#a7aeba', 4, 14, false, false);
      }
      c.fillStyle = '#b3b3b3';
      c.strokeStyle = '#d6d6d6';
      c.lineWidth = 3;
      c.beginPath();
      rr(c, x + 122, BASE - 135, x + 432, BASE + 3, [18, 18, 0, 0]);
      c.fill();
      c.stroke();
    },
  },
  {
    w: 475,
    draw(c, x) {
      const h = 462;
      buildingShell(c, '#665945', x, 475, h);
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k < 2; k++) {
          winGrid(c, x + 52 + k * 208, BASE - h + 70 + r * 91, 165, 72, '#c3a888', '#4a4033', 4, 10, true, false);
        }
      }
      c.fillStyle = '#6a5549';
      c.strokeStyle = '#4a4033';
      c.lineWidth = 4;
      c.beginPath();
      rr(c, x + 182, BASE - 90, x + 302, BASE + 3, [10, 10, 0, 0]);
      c.fill();
      c.stroke();
    },
  },
  {
    w: 560,
    draw(c, x) {
      const h = 590;
      buildingShell(c, '#6c5a53', x, 560, h);
      for (let r = 0; r < 4; r++) {
        for (let k = 0; k < 3; k++) {
          winGrid(c, x + 42 + k * 164, BASE - h + 62 + r * 126, 140, 92, '#8a9dcb', '#cdcdcd', 5, 16, true, true);
        }
      }
    },
  },
];
const BUILDINGS_TOTAL = BUILDINGS.reduce((sum, b) => sum + b.w, 0);

// Końcówka ulicy w ostatnim poziomie jest pusta, jak w teledysku.
const FINALE_PORTAL_SCREEN_X = 1098;

function cityEndX(level) {
  return level && level.finale ? level.exit.x - FINALE_PORTAL_SCREEN_X : Infinity;
}

function drawBuildings(c, cam, endX) {
  const off = (cam * 0.85) / REF - 45;
  const limit = (endX * 0.85) / REF - 45;
  eachRepeat(BUILDINGS_TOTAL, off, 0, (ox) => {
    let x = ox;
    for (const b of BUILDINGS) {
      if (x + off + b.w <= limit && x + b.w > -5 && x < VIEW_WIDTH / REF + 5) b.draw(c, x);
      x += b.w;
    }
  });
}

function drawBackdrop(c, themeName, cam, t, level) {
  const theme = THEMES[themeName];
  c.fillStyle = theme.sky;
  c.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  c.save();
  c.scale(REF, REF);
  if (theme.moon) {
    c.fillStyle = theme.moon;
    c.beginPath();
    c.arc(1525 - (cam * 0.03) / REF, 303, 83, 0, Math.PI * 2);
    c.fill();
  }
  drawStars(c, cam, t);
  if (theme.cloud) drawClouds(c, theme, cam, t);
  if (theme.hill) drawHills(c, theme.hill, cam);
  if (themeName === 'forest') drawTrees(c, theme, cam);
  if (themeName === 'park') drawPines(c, theme, cam);
  if (themeName === 'city') drawBuildings(c, cam, cityEndX(level));
  c.restore();
}

function drawLamps(c, themeName, cam, level) {
  const theme = THEMES[themeName];
  if (!theme.lamp) return;
  const spacing = themeName === 'park' ? 834 : 695;
  const start = themeName === 'park' ? 176 : 331;
  c.save();
  c.scale(REF, REF);
  const end = Math.min(level.length, cityEndX(level));
  for (let x = start; x < end; x += spacing) {
    if (x > cam - 40 && x < cam + VIEW_WIDTH + 40) drawLamp(c, theme, (x - cam) / REF);
  }
  c.restore();
}

function hash(n) {
  const v = Math.sin(n * 127.1 + 11.7) * 43758.5453;
  return v - Math.floor(v);
}

function drawDirtDots(c, theme, chunkIdx, x, y, w, h, count) {
  for (let i = 0; i < count; i++) {
    const seed = chunkIdx * 31 + i * 7;
    const r = 1.5 + Math.pow(hash(seed + 3), 2) * 7.5;
    c.fillStyle = theme.dots[Math.floor(hash(seed + 4) * theme.dots.length)];
    c.beginPath();
    c.arc(x + hash(seed + 1) * w, y + r + hash(seed + 2) * Math.max(0, h - 2 * r), r, 0, Math.PI * 2);
    c.fill();
  }
}

function drawGroundBand(c, themeName, cam) {
  const theme = THEMES[themeName];
  c.fillStyle = theme.grass;
  c.fillRect(0, GROUND_TOP, VIEW_WIDTH, GRASS_DARK_TOP - GROUND_TOP);
  c.fillStyle = theme.grassDark;
  c.fillRect(0, GRASS_DARK_TOP, VIEW_WIDTH, DIRT_TOP - GRASS_DARK_TOP);
  c.fillStyle = theme.dirt;
  c.fillRect(0, DIRT_TOP, VIEW_WIDTH, VIEW_HEIGHT - DIRT_TOP);

  const chunk = 320;
  const first = Math.floor(cam / chunk);
  for (let k = first; k * chunk < cam + VIEW_WIDTH; k++) {
    drawDirtDots(c, theme, k, k * chunk - cam, DIRT_TOP + 4, chunk, VIEW_HEIGHT - DIRT_TOP - 8, 14);
  }
}

function drawPlatform(c, themeName, p) {
  const theme = THEMES[themeName];
  const top = p.cy - PLATFORM_SINK;
  c.fillStyle = theme.platTop;
  c.fillRect(p.cx, top, p.w, 22);
  c.fillStyle = theme.platDark;
  c.fillRect(p.cx, top + 22, p.w, 6);
  c.fillStyle = theme.platDirt;
  c.fillRect(p.cx, top + 28, p.w, PLATFORM_H - 28);
  c.fillStyle = theme.platDot;
  const n = Math.round(p.w / 34);
  for (let i = 0; i < n; i++) {
    const seed = p.x + i * 13;
    const r = 1.2 + hash(seed) * 4;
    c.beginPath();
    c.arc(
      p.cx + r + hash(seed + 1) * (p.w - 2 * r),
      top + 29 + r + hash(seed + 2) * (PLATFORM_H - 30 - 2 * r),
      r, 0, Math.PI * 2,
    );
    c.fill();
  }
}

function drawSpikes(c, s) {
  const base = PHYS.GROUND_Y + 2;
  c.fillStyle = '#6a6a6a';
  c.strokeStyle = '#6a6a6a';
  c.lineWidth = 3;
  c.lineJoin = 'round';
  c.beginPath();
  for (let i = 0; i < s.n; i++) {
    const x = s.x + i * PHYS.SPIKE_W;
    c.moveTo(x + 2, base);
    c.lineTo(x + PHYS.SPIKE_W / 2, base - 30);
    c.lineTo(x + PHYS.SPIKE_W - 2, base);
    c.closePath();
  }
  c.fill();
  c.stroke();
}

// Kamień, o który blondyn potyka się na końcu teledysku.
function drawRock(c, x) {
  const y = PHYS.GROUND_Y - 3;
  c.fillStyle = '#6d6d6f';
  c.beginPath();
  c.moveTo(x - 18, y);
  c.bezierCurveTo(x - 19, y - 9, x - 13, y - 13, x - 7, y - 15);
  c.bezierCurveTo(x - 2, y - 21, x + 7, y - 20, x + 10, y - 14);
  c.bezierCurveTo(x + 15, y - 11, x + 19, y - 7, x + 18, y);
  c.closePath();
  c.fill();
}

// Portal z teledysku: jasna elipsa z bielą w środku i ciemniejszym rantem po prawej.
const PORTAL_CY = GROUND_TOP - 129;
const PORTAL_CLOSED = 0.12;

function portalEllipse(c, color, x, rx, ry) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, PORTAL_CY, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}

// open: 0 to brak portalu, 1 to portal otwarty na całą szerokość.
function drawPortal(c, x, open, t) {
  if (open <= 0) return;
  const ry = 129 * (1 + Math.sin(t * 3) * 0.006);
  const rim = 9.5 * open;
  const faceX = x - rim / 2;
  portalEllipse(c, '#fdd702', x + rim / 2, 54 * open, ry);
  portalEllipse(c, '#fbf284', faceX, 54 * open, ry);
  portalEllipse(c, '#fef9c8', faceX, 37.5 * open, ry - 17);
  portalEllipse(c, '#ffffff', faceX, 35.5 * open, ry - 19);
}
