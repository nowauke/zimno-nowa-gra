// Efekty generowane w WebAudio. Muzyka to pętla na każdy poziom i jedna na menu oraz ekrany końcowe.
// Brak pliku oznacza ciszę, a gra działa dalej.
const MUSIC_FILES = [
  'assets/music/lvl1.wav',
  'assets/music/lvl2.wav',
  'assets/music/lvl3.wav',
  'assets/music/menu.wav',
];
const MENU_TRACK = 3;
const MUSIC_VOLUME = 0.7;

const Sound = {
  ctx: null,
  muted: false,
  musicPaused: false,
  musicBus: null,
  wantedTrack: -1,
  trackStarted: false,
  trackToken: 0,
  currentLoop: null,
  fallbackAudio: null,
  buffers: {},

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        this.ctx = new AC();
        this.musicBus = this.ctx.createGain();
        this.musicBus.connect(this.ctx.destination);
        this.applyMusicVolume();
        MUSIC_FILES.forEach((file, i) => this.loadTrack(i));
        if (this.wantedTrack >= 0) this.playTrack(this.wantedTrack);
      }
    }
    if (this.ctx && this.ctx.state !== 'running') {
      const resuming = this.ctx.resume();
      if (resuming) resuming.catch(() => {});
    }
    if (this.fallbackAudio && this.fallbackAudio.paused) {
      const playing = this.fallbackAudio.play();
      if (playing) playing.catch(() => {});
    }
  },

  // 'missing' to brak pliku; 'blocked' to otwarcie z dysku, gdzie fetch nie działa.
  loadTrack(i) {
    if (!this.buffers[i]) {
      this.buffers[i] = fetch(MUSIC_FILES[i])
        .then((res) => (res.ok ? res.arrayBuffer().then((data) => this.ctx.decodeAudioData(data)) : 'missing'))
        .catch(() => 'blocked');
    }
    return this.buffers[i];
  },

  // Ten sam podkład gra dalej, np. przy przejściu z ekranu końcowego do menu.
  playTrack(i) {
    if (i === this.wantedTrack && this.trackStarted) return;
    this.stopMusic();
    this.wantedTrack = i;
    if (!this.ctx) return;
    this.trackStarted = true;
    const token = this.trackToken;
    this.loadTrack(i).then((buffer) => {
      if (token !== this.trackToken || buffer === 'missing') return;
      if (buffer === 'blocked') this.startFallback(i);
      else this.startLoop(buffer);
    });
  },

  // Bufor WebAudio zapętla się bez przerwy i na iPhonie nie wymaga kolejnego dotknięcia.
  startLoop(buffer) {
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = this.ctx.createGain();
    source.connect(gain).connect(this.musicBus);
    source.start();
    this.currentLoop = { source, gain };
  },

  startFallback(i) {
    this.fallbackAudio = new Audio(MUSIC_FILES[i]);
    this.fallbackAudio.loop = true;
    this.applyMusicVolume();
    const playing = this.fallbackAudio.play();
    if (playing) playing.catch(() => {});
  },

  stopMusic() {
    this.trackToken++;
    this.wantedTrack = -1;
    this.trackStarted = false;
    if (this.currentLoop) {
      const { source, gain } = this.currentLoop;
      const t = this.ctx.currentTime;
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.3);
      source.stop(t + 0.32);
      this.currentLoop = null;
    }
    if (this.fallbackAudio) {
      this.fallbackAudio.pause();
      this.fallbackAudio = null;
    }
  },

  applyMusicVolume() {
    const volume = this.muted || this.musicPaused ? 0 : MUSIC_VOLUME;
    if (this.musicBus) this.musicBus.gain.value = volume;
    if (this.fallbackAudio) this.fallbackAudio.volume = volume;
  },

  setMusicPaused(paused) {
    this.musicPaused = paused;
    this.applyMusicVolume();
  },

  // Telefon nie może grać w tle po przełączeniu aplikacji.
  setHidden(hidden) {
    if (!this.ctx) return;
    if (hidden) {
      const suspending = this.ctx.suspend();
      if (suspending) suspending.catch(() => {});
      if (this.fallbackAudio) this.fallbackAudio.pause();
    } else {
      this.unlock();
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    this.applyMusicVolume();
    return this.muted;
  },

  tone(freq, endFreq, dur, type = 'square', vol = 0.12, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  arp(notes, step, type = 'square', vol = 0.1) {
    notes.forEach((f, i) => this.tone(f, f, step * 1.6, type, vol, i * step));
  },

  jump() { this.tone(300, 620, 0.13, 'square', 0.07); },
  land() { this.tone(140, 80, 0.06, 'triangle', 0.1); },
  collect() { this.arp([659, 880, 1319], 0.06); },
  hurt() { this.tone(320, 60, 0.35, 'sawtooth', 0.13); },
  warp() { this.tone(500, 900, 0.12, 'triangle', 0.09); },
  portalOpen() { this.arp([392, 523, 659, 784, 1047], 0.07, 'triangle', 0.13); },
  portalEnter() { this.tone(220, 1400, 0.4, 'triangle', 0.13); },
  blip() { this.tone(520, 520, 0.05, 'square', 0.07); },
  select() { this.arp([523, 784], 0.07); },
  deny() { this.tone(160, 120, 0.12, 'square', 0.08); },
  clear() { this.arp([523, 659, 784, 1047, 1319], 0.09, 'square', 0.1); },
  gameOver() { this.arp([392, 330, 262, 196], 0.16, 'triangle', 0.14); },
};
