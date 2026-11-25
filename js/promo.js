// Piosenki z epoki, pokazywane po przegranej i na końcu gry.
// Miniaturki pobierają się same z linku.
const PROMO_SONGS = [
  { title: 'Bohater', url: 'https://youtu.be/Xw3MiqL_SCo' },
  { title: 'Nowa gra', url: 'https://youtu.be/eHRoO68uVlQ' },
];
const INSTAGRAM = { handle: '@ZIMNO.BRR', url: 'https://www.instagram.com/zimno.brr/' };

const promoLinks = document.getElementById('promo');
const logoImage = new Image();
logoImage.src = 'assets/logo.png';

function drawLogo(c, cx, y, h) {
  if (!logoImage.complete || !logoImage.naturalWidth) return;
  const w = (h * logoImage.naturalWidth) / logoImage.naturalHeight;
  c.imageSmoothingQuality = 'high';
  c.drawImage(logoImage, cx - w / 2, y, w, h);
}

function youtubeId(url) {
  const match = /(?:youtu\.be\/|[?&]v=|shorts\/|embed\/)([\w-]{11})/.exec(url);
  return match ? match[1] : null;
}

// Kafelek rysuje canvas, a nad nim leży przezroczysty, prawdziwy link.
// Dzięki temu na telefonie YouTube i Instagram otwierają się od razu, bez blokady wyskakujących okien.
function makeLink(url, label) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.hidden = true;
  link.setAttribute('aria-label', label);
  promoLinks.append(link);
  return link;
}

function setupPromoLinks() {
  promoLinks.textContent = '';
  for (const song of PROMO_SONGS) {
    song.id = youtubeId(song.url);
    song.thumb = null;
    song.link = song.url ? makeLink(song.url, song.title) : null;
  }
  INSTAGRAM.link = makeLink(INSTAGRAM.url, `Instagram ${INSTAGRAM.handle}`);
}

function promoRects() {
  const n = PROMO_SONGS.length;
  const gap = 24;
  const margin = 40 + Math.max(SAFE.left, SAFE.right);
  const w = Math.min(380, (VIEW_WIDTH - 2 * margin - (n - 1) * gap) / n);
  const h = (w * 9) / 16;
  const x0 = (VIEW_WIDTH - (n * w + (n - 1) * gap)) / 2;
  return PROMO_SONGS.map((song, i) => ({ song, x: x0 + i * (w + gap), y: 124, w, h }));
}

// Instagram stoi w lewym dolnym rogu ekranu startowego, menu i ekranów końcowych.
// Na dotyku jest większy, żeby dało się w niego trafić palcem.
function instagramRect() {
  const u = Input.touchMode ? 3 : 2;
  const icon = Input.touchMode ? 34 : 26;
  const h = Input.touchMode ? 64 : 48;
  const w = 8 + icon + 12 + textWidth(INSTAGRAM.handle, u, 'bold') + 14;
  return { x: SAFE.left + 24, y: VIEW_HEIGHT - SAFE.bottom - h - 16, w, h, u, icon };
}

function placeLink(link, { x, y, w, h }) {
  link.style.left = `${x}px`;
  link.style.top = `${y}px`;
  link.style.width = `${w}px`;
  link.style.height = `${h}px`;
}

function layoutPromoLinks(cssMatrix) {
  promoLinks.style.width = `${VIEW_WIDTH}px`;
  promoLinks.style.height = `${VIEW_HEIGHT}px`;
  promoLinks.style.transform = `matrix(${cssMatrix.join(',')})`;
  for (const rect of promoRects()) {
    if (rect.song.link) placeLink(rect.song.link, rect);
  }
  placeLink(INSTAGRAM.link, instagramRect());
}

function showPromoLinks(songs, social) {
  for (const song of PROMO_SONGS) {
    if (song.link && song.link.hidden === songs) song.link.hidden = !songs;
  }
  if (INSTAGRAM.link.hidden === social) INSTAGRAM.link.hidden = !social;
}

function drawInstagram(c) {
  const { x, y, h, u, icon } = instagramRect();
  const ix = x + 8;
  const iy = y + (h - icon) / 2;
  c.strokeStyle = '#fff';
  c.lineWidth = icon / 9;
  c.beginPath();
  rr(c, ix, iy, ix + icon, iy + icon, icon * 0.3);
  c.stroke();
  c.beginPath();
  c.arc(ix + icon / 2, iy + icon / 2, icon * 0.23, 0, Math.PI * 2);
  c.stroke();
  dot(c, '#fff', ix + icon * 0.75, iy + icon * 0.25, icon * 0.08);
  drawText(c, INSTAGRAM.handle, ix + icon + 12, y + (h - 7 * u) / 2, { u, style: 'bold', shadow: '#000a' });
}

function drawPromoTiles(c) {
  for (const { song, x, y, w, h } of promoRects()) {
    if (song.id && !song.thumb) {
      song.thumb = new Image();
      song.thumb.src = `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`;
    }
    // hqdefault ma czarne pasy u góry i u dołu, więc bierzemy sam środek. Szerokość 120 to zaślepka YouTube.
    if (song.thumb && song.thumb.complete && song.thumb.naturalWidth > 120) {
      const crop = song.thumb.naturalWidth * (9 / 16);
      c.drawImage(song.thumb, 0, (song.thumb.naturalHeight - crop) / 2, song.thumb.naturalWidth, crop, x, y, w, h);
    } else {
      c.fillStyle = '#1b2433';
      c.fillRect(x, y, w, h);
    }

    const cx = x + w / 2;
    const cy = y + h / 2;
    box(c, '#e0282e', cx - 34, cy - 24, cx + 34, cy + 24, 12);
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(cx - 10, cy - 13);
    c.lineTo(cx + 15, cy);
    c.lineTo(cx - 10, cy + 13);
    c.closePath();
    c.fill();

    c.strokeStyle = '#fff';
    c.lineWidth = 3;
    c.strokeRect(x, y, w, h);
  }
}

setupPromoLinks();
