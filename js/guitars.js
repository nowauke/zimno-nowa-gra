// Gitary rysowane gryfem do góry, początek układu w środku korpusu.
const JAZZ = {
  body: new Path2D('M5,-16 C7,-20 10,-24 14,-25 C17,-25 18,-21 16,-16 C14,-11 13,-6 15,-1 C18,4 23,8 23,15 C23,25 14,30 3,30 C-10,30 -22,27 -24,15 C-25,7 -17,3 -15,-3 C-14,-9 -15,-14 -15,-20 C-15,-28 -12,-36 -9,-37 C-6,-37 -6,-30 -5,-24 C-5,-20 -5,-18 -5,-16 Z'),
  guard: new Path2D('M-5,-18 L5,-18 L7,-10 C10,-5 12,0 13,6 C14,12 12,18 8,21 L2,23 L-3,17 L-10,10 C-13,5 -13,-2 -10,-8 Z'),
  guardLight: new Path2D('M-3,-14 L4,-14 C8,-6 11,0 11,6 C11,12 9,16 6,19 L3,20 L-3,14 C-9,8 -11,3 -9,-5 Z'),
  head: new Path2D('M-3.2,-70 L3.2,-70 L3.6,-76 C5,-82 6.5,-89 3.6,-92 C1.2,-93.5 -0.6,-89 -2.4,-85 L-4.4,-78 Z'),
};

const RAY = {
  body: new Path2D('M5,-14 C8,-18 11,-21 15,-21 C18,-20 17,-15 15,-11 C13,-7 14,-3 16,2 C19,8 22,12 21,18 C19,27 9,32 0,32 C-12,32 -22,26 -23,15 C-24,6 -17,2 -15,-4 C-13,-10 -15,-16 -14,-24 C-13,-31 -9,-36 -7,-35 C-5,-33 -6,-26 -5,-20 L-5,-14 Z'),
  guard: new Path2D('M-5,-13 C-13,-4 -16,8 -10,20 C-4,27 6,23 9,14 C11,6 9,-4 5,-13'),
  head: new Path2D('M-3.4,-70 L3.4,-70 L4.2,-76 L6,-91 C5.5,-94.5 1,-95 -0.5,-93 L-4,-78 Z'),
};

function drawJazzmasterShape(c) {
  c.fillStyle = '#5f5249';
  c.fillRect(-3.2, -71, 6.4, 57);
  c.fillStyle = '#8a7c70';
  for (let i = 0, y = -68; i < 9; i++, y += 3.2 + i * 0.5) c.fillRect(-3.2, y, 6.4, 0.5);
  c.strokeStyle = '#332b26';
  c.lineWidth = 0.6;
  c.strokeRect(-3.2, -71, 6.4, 57);

  c.fillStyle = '#c8955e';
  c.fill(JAZZ.head);
  c.fillStyle = '#d9d9d9';
  for (let i = 0; i < 6; i++) c.fillRect(-5.2 + i * 0.65, -77.5 - i * 2.4, 2, 1.1);

  c.fillStyle = '#050505';
  c.fill(JAZZ.body);
  c.fillStyle = '#4c100f';
  c.fill(JAZZ.guard);
  c.fillStyle = '#6e1d18';
  c.fill(JAZZ.guardLight);

  c.fillStyle = '#e6dcc0';
  c.fillRect(-6.5, -10, 13, 4.6);
  c.fillRect(-5, 2.5, 13, 4.6);
  c.fillStyle = '#c9bf9f';
  c.fillRect(-6.5, -7.9, 13, 0.5);
  c.fillRect(-5, 4.6, 13, 0.5);

  c.fillStyle = '#c3c7cf';
  c.beginPath();
  rr(c, -8, 13, 2, 21, 2);
  c.fill();
  c.fillStyle = '#9ea3ad';
  c.fillRect(-6, 15, 6, 0.6);

  c.fillStyle = '#efe7d3';
  c.beginPath();
  c.arc(11, 9, 1.4, 0, Math.PI * 2);
  c.arc(7.5, 15, 1.4, 0, Math.PI * 2);
  c.fill();
}

function drawStingrayShape(c) {
  c.fillStyle = '#d0ae85';
  c.fillRect(-3.4, -71, 6.8, 58);
  c.fillStyle = '#b8986f';
  for (let i = 0, y = -68; i < 9; i++, y += 3.2 + i * 0.5) c.fillRect(-3.4, y, 6.8, 0.5);

  c.fillStyle = '#d6a86d';
  c.fill(RAY.head);
  c.fillStyle = '#e4e4e4';
  c.fillRect(-5, -83, 3, 3);
  c.fillRect(-3.8, -88, 3, 3);
  c.fillRect(-2.4, -93, 3, 3);
  c.fillRect(5.3, -83, 3, 3);

  c.fillStyle = '#050505';
  c.fill(RAY.body);
  c.strokeStyle = '#8f8f8f';
  c.lineWidth = 0.8;
  c.stroke(RAY.guard);

  c.fillStyle = '#1b1b1b';
  c.beginPath();
  rr(c, -7, 2, 6, 9, 2);
  c.fill();
  c.fillStyle = '#6a6a6a';
  for (let i = 0; i < 4; i++) {
    c.fillRect(-5.2 + i * 2.8, 3.6, 1, 1);
    c.fillRect(-5.2 + i * 2.8, 6.6, 1, 1);
  }

  c.fillStyle = '#d1d0d0';
  c.beginPath();
  c.ellipse(-4, 22, 7.5, 6.5, -0.15, 0, Math.PI * 2);
  c.fill();

  c.strokeStyle = '#b5b5b5';
  c.lineWidth = 0.45;
  c.beginPath();
  for (const s of [-2.4, -0.8, 0.8, 2.4]) {
    c.moveTo(s - 3.4, 18);
    c.lineTo(s * 0.8, -70);
  }
  c.stroke();
}

// x, y to środek całej gitary; rot w radianach (gryf w prawo do góry jak w teledysku).
function drawGuitar(c, type, x, y, rot = 0.72, scale = 1) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(scale, scale);
  c.translate(0, 32);
  if (type === 'J') drawJazzmasterShape(c);
  else drawStingrayShape(c);
  c.restore();
}
