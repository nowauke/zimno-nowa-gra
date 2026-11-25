// Współrzędne pochodzą z powiększonych klatek teledysku; postać ma 680 jednostek wysokości.
const CHAR_SCALE = 0.191;
const CHAR_ORIGIN_X = 225;
const CHAR_ORIGIN_Y = 732;

const SKIN = '#e6c0a6';
const EAR = '#efd3bd';

function rr(c, x0, y0, x1, y1, r) {
  const m = Math.min(x1 - x0, y1 - y0) / 2;
  const a = Array.isArray(r) ? r : [r, r, r, r];
  const tl = Math.min(a[0], m), tr = Math.min(a[1], m), br = Math.min(a[2], m), bl = Math.min(a[3], m);
  c.moveTo(x0 + tl, y0);
  c.lineTo(x1 - tr, y0);
  c.arcTo(x1, y0, x1, y0 + tr, tr);
  c.lineTo(x1, y1 - br);
  c.arcTo(x1, y1, x1 - br, y1, br);
  c.lineTo(x0 + bl, y1);
  c.arcTo(x0, y1, x0, y1 - bl, bl);
  c.lineTo(x0, y0 + tl);
  c.arcTo(x0, y0, x0 + tl, y0, tl);
  c.closePath();
}

function box(c, color, x0, y0, x1, y1, r = 0) {
  c.fillStyle = color;
  c.beginPath();
  rr(c, x0, y0, x1, y1, r);
  c.fill();
}

function dot(c, color, x, y, r) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function limb(c, px, py, angle, draw) {
  c.save();
  c.translate(px, py);
  c.rotate(angle);
  c.translate(-px, -py);
  draw();
  c.restore();
}

function ear(c, x, y) {
  c.fillStyle = EAR;
  c.beginPath();
  c.ellipse(x, y, 20, 24, 0, Math.PI / 2, Math.PI * 1.5);
  c.closePath();
  c.fill();
}

function eye(c, x, y, r, blink) {
  if (blink) box(c, '#111', x - r, y - 2, x + r, y + 2, 2);
  else dot(c, '#111', x, y, r);
}

function drawDarkHead(c, blink) {
  box(c, '#96755e', 122, 250, 382, 360, [0, 0, 72, 72]);
  box(c, SKIN, 122, 198, 382, 330, [40, 40, 62, 62]);
  ear(c, 96, 268);
  box(c, '#6e4a24', 170, 222, 232, 238, 4);
  box(c, '#6e4a24', 285, 222, 345, 238, 4);
  c.strokeStyle = '#2c2018';
  c.lineWidth = 6;
  c.beginPath();
  rr(c, 168, 247, 240, 302, 18);
  rr(c, 278, 247, 350, 302, 18);
  c.moveTo(240, 270);
  c.lineTo(278, 270);
  c.stroke();
  eye(c, 205, 273, 12, blink);
  eye(c, 313, 273, 12, blink);
  box(c, '#2a2a2a', 55, 52, 400, 175, [95, 95, 0, 0]);
  box(c, '#232323', 38, 150, 420, 197, 24);
}

function drawDarkGuy(c, p) {
  limb(c, 335, 598, p.legB, () => {
    box(c, '#232b4d', 300, 590, 372, 712);
    box(c, '#000', 300, 696, 372, 732, [0, 0, 32, 32]);
  });
  c.save();
  c.translate(0, p.bob);
  box(c, '#432f13', 50, 170, 410, 435, [0, 0, 80, 90]);
  box(c, '#1f1f1f', 148, 362, 372, 618, [50, 50, 95, 95]);
  c.restore();
  limb(c, 200, 575, p.legA, () => {
    box(c, '#232b4d', 165, 565, 238, 712, [36, 36, 0, 0]);
    box(c, '#000', 165, 700, 238, 733, [0, 0, 32, 32]);
  });
  c.save();
  c.translate(0, p.bob);
  limb(c, 398, 412, p.armB, () => {
    box(c, '#1f1f1f', 372, 395, 420, 490, [10, 24, 0, 0]);
    box(c, '#8c9cab', 375, 480, 420, 560);
    box(c, SKIN, 352, 556, 420, 592, [0, 0, 34, 34]);
  });
  limb(c, 125, 412, p.armA, () => {
    box(c, '#1f1f1f', 80, 392, 170, 500, [30, 30, 0, 0]);
    box(c, '#8c9cab', 80, 488, 170, 578);
    box(c, SKIN, 80, 572, 168, 612, [0, 0, 44, 44]);
  });
  drawDarkHead(c, p.blink);
  c.restore();
}

function drawBlondHead(c, blink) {
  box(c, '#a78951', 50, 90, 405, 378, [60, 60, 112, 112]);
  box(c, '#ecccb4', 128, 190, 382, 315, 62);
  ear(c, 104, 258);
  box(c, '#c49f63', 178, 224, 235, 240, 8);
  box(c, '#c49f63', 290, 224, 345, 240, 8);
  eye(c, 208, 264, 13, blink);
  eye(c, 320, 264, 13, blink);
  box(c, '#856f50', 55, 42, 403, 150, [90, 90, 0, 0]);
  box(c, '#5e4b32', 40, 142, 500, 193, 25);
}

function drawBlondGuy(c, p) {
  limb(c, 292, 605, p.legB, () => {
    box(c, '#262626', 256, 600, 328, 712);
    box(c, '#000', 256, 704, 328, 738, [0, 0, 32, 32]);
  });
  c.save();
  c.translate(0, p.bob);
  box(c, '#b46061', 110, 368, 330, 630, [30, 30, 95, 95]);
  c.restore();
  limb(c, 145, 575, p.legA, () => {
    box(c, '#262626', 108, 566, 182, 712, [36, 36, 0, 0]);
    box(c, '#000', 108, 702, 180, 735, [0, 0, 32, 32]);
  });
  c.save();
  c.translate(0, p.bob);
  limb(c, 350, 410, p.armB, () => {
    box(c, '#864c50', 330, 390, 372, 568, [6, 20, 0, 0]);
    box(c, SKIN, 310, 562, 375, 600, [0, 0, 36, 36]);
  });
  limb(c, 96, 410, p.armA, () => {
    box(c, '#864c50', 52, 392, 140, 582, [26, 26, 0, 0]);
    box(c, SKIN, 50, 572, 135, 608, [0, 0, 42, 42]);
  });
  drawBlondHead(c, p.blink);
  c.restore();
}

// Kąty dodatnie odchylają rękę i nogę do tyłu postaci.
function poseFor(b, t) {
  const blink = t % 3.7 < 0.12;
  if (b.hurtT > 0) {
    const w = Math.sin(t * 30) * 0.2;
    return { legA: 0.7 + w, legB: -0.7 - w, armA: 2.3 + w, armB: -2.3 - w, bob: 0, blink: true };
  }
  if (!b.onGround) {
    if (b.vy < 0) return { legA: 0.55, legB: -0.35, armA: 0.5, armB: -0.5, bob: 0, blink };
    return { legA: 0.25, legB: -0.2, armA: 0.95, armB: -0.95, bob: 0, blink };
  }
  if (Math.abs(b.vx) > 20) {
    const s = Math.sin(b.anim);
    return {
      legA: 0.72 * s,
      legB: -0.72 * s,
      armA: 0.2 - 0.75 * s,
      armB: -0.2 + 0.75 * s,
      bob: Math.abs(s) * 26,
      blink,
    };
  }
  const breathe = Math.sin(t * 2.2);
  return { legA: 0, legB: 0, armA: 0.02 + breathe * 0.015, armB: -0.02 - breathe * 0.015, bob: breathe * 3, blink };
}

function drawCharacter(c, who, x, y, facing, pose, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(CHAR_SCALE * facing * scale, CHAR_SCALE * scale);
  c.translate(-CHAR_ORIGIN_X, -CHAR_ORIGIN_Y);
  if (who === 'dark') drawDarkGuy(c, pose);
  else drawBlondGuy(c, pose);
  c.restore();
}

// Obrót wokół środka ciała: (cx, cy) to środek postaci, a nie stopy.
function drawCharacterTilted(c, who, cx, cy, facing, pose, angle) {
  c.save();
  c.translate(cx, cy);
  c.rotate(angle);
  drawCharacter(c, who, 0, 65, facing, pose);
  c.restore();
}

function drawHeadIcon(c, who, x, y, scale) {
  c.save();
  c.translate(x, y);
  c.scale(CHAR_SCALE * scale, CHAR_SCALE * scale);
  c.translate(-CHAR_ORIGIN_X, -205);
  if (who === 'dark') {
    box(c, '#432f13', 50, 170, 410, 400, [0, 0, 80, 90]);
    drawDarkHead(c, false);
  } else {
    drawBlondHead(c, false);
  }
  c.restore();
}
