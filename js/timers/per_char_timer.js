import { TimerBase } from './timer_base.js';

// Per-character countdown with SVG ring visualization
// API: start/pause/resume/reset/stop/dispose, on/off, isRunning, getRemainingMs, setDuration
export class PerCharTimer extends TimerBase {
  constructor(rootEl, { durationMs = 10000, autoStart = false, onExpire = null } = {}) {
    super();
    this.root = rootEl;
    this._duration = durationMs;
    this._running = false;
    this._paused = false;
    this._startTs = 0; // performance.now()
    this._pauseTs = 0;
    this._accumPaused = 0;
    this._rafId = 0;
    this._lastTickEmit = 0;
    this._expired = false;
    if (onExpire) this.on('expire', onExpire);

    this._C = 2 * Math.PI * 54; // ~339.292; keep exact calc
    this._buildDOM();
    this.reset();
    if (autoStart) this.start();
  }

  _now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

  _buildDOM() {
    if (this.root.querySelector('.char-timer')) return; // don't duplicate
    const wrap = document.createElement('div');
    wrap.className = 'char-timer';
    wrap.setAttribute('role', 'timer');
    wrap.setAttribute('aria-live', 'polite');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ring');
    svg.setAttribute('viewBox', '0 0 120 120');

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bg.setAttribute('class', 'ring-bg');
    bg.setAttribute('cx', '60'); bg.setAttribute('cy', '60'); bg.setAttribute('r', '54');

    const fg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fg.setAttribute('class', 'ring-fg');
    fg.setAttribute('cx', '60'); fg.setAttribute('cy', '60'); fg.setAttribute('r', '54');

    svg.append(bg, fg);
    const label = document.createElement('div');
    label.className = 'char-timer__label';
    label.textContent = `${Math.ceil(this._duration/1000)}s`;

    wrap.append(svg, label);
    this.root.appendChild(wrap);

    this._el = { wrap, svg, bg, fg, label };
    this._el.fg.style.strokeDasharray = `${this._C}`;
    this._el.fg.style.strokeDashoffset = '0';
  }

  _loop = () => {
    if (!this._running) return;
    const now = this._now();
    const elapsed = Math.max(0, now - this._startTs - this._accumPaused);
    const remaining = Math.max(0, this._duration - elapsed);
    const progress = Math.min(1, elapsed / this._duration);
    const offset = this._C * progress;
    this._el.fg.style.strokeDashoffset = `${offset}`;

    // update label every frame; aria-live is polite
    const secRem = Math.ceil(remaining / 1000);
    this._el.label.textContent = `${secRem}s`;

    // Throttle tick to ~100ms
    if (now - this._lastTickEmit >= 100) {
      this._lastTickEmit = now;
      this._emit('tick', { remainingMs: remaining, progress });
    }

    if (elapsed >= this._duration) {
      this._el.fg.style.strokeDashoffset = `${this._C}`;
      this._running = false;
      if (!this._expired) {
        this._expired = true;
        this._emit('expire');
      }
      return; // stop looping; don't schedule new frame
    }
    this._rafId = requestAnimationFrame(this._loop);
  };

  start(durationMs) {
    if (typeof durationMs === 'number' && durationMs > 0) this._duration = durationMs;
    if (this._running && !this._paused) return; // idempotent
    // restart fresh
    cancelAnimationFrame(this._rafId);
    this._startTs = this._now();
    this._accumPaused = 0;
    this._paused = false;
    this._expired = false;
    this._running = true;
    this._emit('start');
    this._rafId = requestAnimationFrame(this._loop);
  }

  pause() {
    if (!this._running || this._paused) return;
    this._paused = true;
    this._pauseTs = this._now();
    this._running = false;
    cancelAnimationFrame(this._rafId);
    this._emit('pause');
  }

  resume() {
    if (!this._paused) return;
    const now = this._now();
    this._accumPaused += (now - this._pauseTs);
    this._paused = false;
    this._running = true;
    this._emit('resume');
    this._rafId = requestAnimationFrame(this._loop);
  }

  reset() {
    this._running = false;
    this._paused = false;
    cancelAnimationFrame(this._rafId);
    this._accumPaused = 0;
    this._expired = false;
    if (this._el) {
      this._el.fg.style.strokeDashoffset = '0';
      this._el.label.textContent = `${Math.ceil(this._duration/1000)}s`;
    }
    this._emit('stop');
  }

  stop() {
    // stop and show empty ring
    this._running = false;
    this._paused = false;
    cancelAnimationFrame(this._rafId);
    if (this._el) {
      this._el.fg.style.strokeDashoffset = `${this._C}`;
      this._el.label.textContent = '0s';
    }
    this._emit('stop');
  }

  dispose() {
    this.stop();
    // detach references
    this._events?.clear?.();
    this.root = null; this._el = null;
  }

  isRunning() { return !!this._running && !this._paused; }
  getRemainingMs() {
    const now = this._now();
    if (!this._startTs) return this._duration;
    const pausedExtra = this._paused ? (now - this._pauseTs) : 0;
    const elapsed = Math.max(0, now - this._startTs - this._accumPaused - pausedExtra);
    return Math.max(0, this._duration - elapsed);
  }
  setDuration(durationMs) {
    if (typeof durationMs === 'number' && durationMs > 0) this._duration = durationMs;
  }
}

export default PerCharTimer;

