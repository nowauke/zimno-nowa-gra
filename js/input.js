// Klawiatura i dotyk sprowadzone do jednego zestawu kodów klawiszy.
const GAME_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab', 'Enter',
  'ShiftLeft', 'ShiftRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyC', 'KeyP', 'KeyM', 'Escape',
]);

function buttonHit(b, pos) {
  if (b.zone) return pos.x >= b.zone.x0 && pos.x < b.zone.x1;
  return Math.hypot(pos.x - b.x, pos.y - b.y) <= b.r * 1.25;
}

const Input = {
  down: new Set(),
  fresh: new Set(),
  touchDown: new Set(),
  pointers: new Map(),
  tapQueue: [],
  buttons: [],
  touchMode: window.matchMedia('(pointer: coarse)').matches,
  triedFullscreen: false,
  releaseActions: new Map(),
  toLogical: (x, y) => ({ x, y }),

  buzz(ms) {
    if (this.touchMode && navigator.vibrate) navigator.vibrate(ms);
  },

  // Safari na iPhonie nie ma pełnego ekranu dla stron, Android i iPad go mają.
  fullscreenSupported() {
    return Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  },

  isFullscreen() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  },

  enterFullscreen() {
    const el = document.documentElement;
    const request = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!request || !this.fullscreenSupported() || this.isFullscreen()) return;
    const entering = request.call(el, { navigationUI: 'hide' });
    if (!entering) return;
    entering
      .then(() => (screen.orientation && screen.orientation.lock ? screen.orientation.lock('landscape') : null))
      .catch(() => {});
  },

  toggleFullscreen() {
    this.triedFullscreen = true;
    if (!this.isFullscreen()) {
      this.enterFullscreen();
      return;
    }
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    const leaving = exit.call(document);
    if (leaving) leaving.catch(() => {});
  },

  // Pierwsze dotknięcie gry od razu próbuje przejść na pełny ekran.
  enterFullscreenOnce() {
    if (this.triedFullscreen) return;
    this.triedFullscreen = true;
    this.enterFullscreen();
  },

  held(codes) {
    return codes.some((k) => this.down.has(k) || this.touchDown.has(k));
  },

  take(codes) {
    let hit = false;
    for (const k of codes) if (this.fresh.delete(k)) hit = true;
    return hit;
  },

  takeTap() {
    return this.tapQueue.shift() || null;
  },

  reset() {
    this.down.clear();
    this.fresh.clear();
    this.touchDown.clear();
    this.tapQueue.length = 0;
  },

  setButtons(list) {
    this.buttons = list;
    this.syncTouch();
  },

  syncTouch() {
    const next = new Set();
    for (const pos of this.pointers.values()) {
      const hit = this.buttons.find((b) => !b.tapOnly && buttonHit(b, pos));
      if (hit) next.add(hit.code);
    }
    for (const code of next) {
      if (!this.touchDown.has(code)) {
        this.fresh.add(code);
        this.buzz(8);
      }
    }
    this.touchDown = next;
  },

  attach(canvas) {
    addEventListener('keydown', (e) => {
      if (!GAME_KEYS.has(e.code)) return;
      e.preventDefault();
      Sound.unlock();
      if (!e.repeat) {
        this.down.add(e.code);
        this.fresh.add(e.code);
      }
    });
    addEventListener('keyup', (e) => {
      if (GAME_KEYS.has(e.code)) this.down.delete(e.code);
    });

    const logical = (e) => {
      const rect = canvas.getBoundingClientRect();
      return this.toLogical(e.clientX - rect.left, e.clientY - rect.top);
    };
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      Sound.unlock();
      const pos = logical(e);
      const tapButton = this.touchMode ? this.buttons.find((b) => b.tapOnly && buttonHit(b, pos)) : null;
      if (tapButton) {
        this.buzz(8);
        // Pełny ekran wymaga gestu, a gest liczy się dopiero po puszczeniu palca.
        if (tapButton.onRelease) this.releaseActions.set(e.pointerId, tapButton.onRelease);
        else this.fresh.add(tapButton.code);
        return;
      }
      this.tapQueue.push(pos);
      if (e.pointerType !== 'touch') return;
      this.touchMode = true;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {}
      this.pointers.set(e.pointerId, pos);
      this.syncTouch();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, logical(e));
      this.syncTouch();
    });
    const release = (e) => {
      if (this.pointers.delete(e.pointerId)) this.syncTouch();
    };
    canvas.addEventListener('pointerup', (e) => {
      release(e);
      // iOS i Android uznają za gest dopiero puszczenie palca, nie samo dotknięcie.
      Sound.unlock();
      const action = this.releaseActions.get(e.pointerId);
      this.releaseActions.delete(e.pointerId);
      if (action) action();
      else if (e.pointerType === 'touch') this.enterFullscreenOnce();
    });
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('touchend', () => Sound.unlock());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());
  },
};
