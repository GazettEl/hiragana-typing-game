import { TimerBase } from './timer_base.js';

export class SessionTimer extends TimerBase {
  constructor(rootEl, { durationMs = 3 * 60_000, autoStart = false, onExpire = null } = {}) {
    super();
    this.root = rootEl;
    this._duration = durationMs;
    this._running = false;
    this._paused = false;
    this._plannedEnd = 0; // epoch ms
    this._remainingAtPause = 0;
    this._interval = 0;
    this._lastTickEmit = 0;
    if (onExpire) this.on('expire', onExpire);

    this._buildDOM();
    this._renderText(this._duration);
    if (autoStart) this.start();
  }

  _now() { return Date.now(); }

  _buildDOM() {
    if (this.root.querySelector('.session-timer')) return;
    const wrap = document.createElement('div');
    wrap.className = 'session-timer';
    wrap.setAttribute('role', 'timer');
    wrap.setAttribute('aria-live', 'polite');
    const text = document.createElement('span');
    text.className = 'session-timer__text';
    text.textContent = '00:00';
    wrap.appendChild(text);
    this.root.appendChild(wrap);
    this._el = { wrap, text };
  }

  _renderText(ms) {
    const remaining = Math.max(0, ms|0);
    const mm = Math.floor(remaining / 60000);
    const ss = Math.floor((remaining % 60000) / 1000);
    const str = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    this._el.text.textContent = str;
    return str;
  }

  _tick = () => {
    const now = this._now();
    const rem = Math.max(0, this._plannedEnd - now);
    const throttled = (now - this._lastTickEmit) >= 200;
    if (throttled) {
      this._lastTickEmit = now;
      this._emit('tick', { remainingMs: rem });
    }
    this._renderText(rem);
    if (rem <= 0) {
      this.stop();
      this._emit('expire');
    }
  };

  start(durationMs) {
    if (this._running && !this._paused) return; // idempotent
    if (typeof durationMs === 'number' && durationMs > 0) this._duration = durationMs;
    this._paused = false;
    this._running = true;
    this._plannedEnd = this._now() + this._duration;
    this._emit('start');
    clearInterval(this._interval);
    this._interval = setInterval(this._tick, 250);
    this._tick(); // immediate update
  }

  pause() {
    if (!this._running || this._paused) return;
    this._remainingAtPause = Math.max(0, this._plannedEnd - this._now());
    this._paused = true;
    this._running = false;
    clearInterval(this._interval);
    this._emit('pause');
  }

  resume() {
    if (!this._paused) return;
    this._plannedEnd = this._now() + this._remainingAtPause;
    this._paused = false;
    this._running = true;
    this._emit('resume');
    clearInterval(this._interval);
    this._interval = setInterval(this._tick, 250);
    this._tick();
  }

  reset() {
    this._running = false;
    this._paused = false;
    clearInterval(this._interval);
    this._renderText(this._duration);
    this._emit('stop');
  }

  stop() {
    this._running = false;
    this._paused = false;
    clearInterval(this._interval);
    this._renderText(0);
    this._emit('stop');
  }

  dispose() {
    this.stop();
    this._events?.clear?.();
    this.root = null; this._el = null;
  }

  isRunning() { return !!this._running && !this._paused; }
  getRemainingMs() { return Math.max(0, (this._plannedEnd || 0) - this._now()); }
  setDuration(durationMs) { if (typeof durationMs === 'number' && durationMs > 0) this._duration = durationMs; }
  format() { return this._renderText(this.getRemainingMs()); }
}

export default SessionTimer;

