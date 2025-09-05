import { PerCharTimer } from '../timers/per_char_timer.js';
import { mountClassicView } from '../ui/classic_view.js';

export class ClassicMode {
  constructor({ rootEl, engine, settingsStore, revealMsWrong = 800, revealMsCorrect = 250 }) {
    this.rootEl = rootEl;
    this.engine = engine;
    this.settingsStore = settingsStore;
    this.revealMsWrong = revealMsWrong;
    this.revealMsCorrect = revealMsCorrect;

    this.state = { locked: false, ended: false };
    this.view = mountClassicView(rootEl);
    this._handlers = {};
    this._disposed = false;
    this._started = false;
    this._paused = false;
    this._bound = false;

    // Create timer attached to view mount BEFORE binding events
    const qp = new URLSearchParams(location.search);
    this.debugSpeeds = qp.get('debugSpeeds') === 'true';
    const durationMs = this.debugSpeeds ? 3000 : 10_000;
    this.timer = new PerCharTimer(this.view.getTimerMountEl(), { durationMs });

    // Now bind events that rely on timer being present
    this._bindEvents();

    // Debug helpers
    window.__classicDebug = {
      engineState: () => this.engine.getState(),
    };
  }

  _bindEvents() {
    if (this._bound) return;
    // View handlers (reassigned per mount)
    this.view.onSubmit = () => this._submit();
    this.view.onRestart = () => this._restart();
    this.view.onSkip = () => this._skip();

    // Engine event handlers (kept for unsubscribe)
    this._handlers.onNext = ({ item }) => this._show(item);
    this._handlers.onCorrect = (p) => this._onCorrect(p);
    this._handlers.onWrong = (p) => this._onWrong(p);
    this._handlers.onEnd = (p) => this._onEnd(p);
    this._handlers.onSettingsChange = () => this.view.flagFiltersChanged(true);
    this._handlers.onPoolUpdate = () => this.view.flagFiltersChanged(true);
    this._handlers.onStart = () => { this._started = true; this.state.ended = false; this._debug('start'); };

    this.engine.on('start', this._handlers.onStart);
    this.engine.on('next', this._handlers.onNext);
    this.engine.on('correct', this._handlers.onCorrect);
    this.engine.on('wrong', this._handlers.onWrong);
    this.engine.on('end', this._handlers.onEnd);
    this.engine.on('settingsChange', this._handlers.onSettingsChange);
    this.engine.on('poolUpdate', this._handlers.onPoolUpdate);

    // Timer
    this._handlers.onExpire = () => this._onExpire();
    this.timer?.on('expire', this._handlers.onExpire);
    this._bound = true;
  }

  _unbindEvents() {
    try {
      if (this._handlers.onStart) this.engine.off('start', this._handlers.onStart);
      if (this._handlers.onNext) this.engine.off('next', this._handlers.onNext);
      if (this._handlers.onCorrect) this.engine.off('correct', this._handlers.onCorrect);
      if (this._handlers.onWrong) this.engine.off('wrong', this._handlers.onWrong);
      if (this._handlers.onEnd) this.engine.off('end', this._handlers.onEnd);
      if (this._handlers.onSettingsChange) this.engine.off('settingsChange', this._handlers.onSettingsChange);
      if (this._handlers.onPoolUpdate) this.engine.off('poolUpdate', this._handlers.onPoolUpdate);
      if (this._handlers.onExpire) this.timer?.off?.('expire', this._handlers.onExpire);
    } catch (e) { console.error(e); }
    this._handlers = {};
    this._bound = false;
  }

  _ts() { try { return new Date().toISOString().split('T')[1].replace('Z',''); } catch { return String(Date.now()); } }
  _debug(evt, detail) {
    if (window.DEBUG === true) {
      const cur = this.engine?.getState?.().current;
      const kana = cur?.kana || '(none)';
      // Keep logs lightweight
      console.log(`[Classic ${this._ts()}] ${evt}`, kana, detail || '');
    }
  }

  _currentSettings() { return this.settingsStore?.getSettings ? this.settingsStore.getSettings() : {}; }

  _show(item) {
    if (!item) { this._onEnd({ reason: 'empty-pool' }); return; }
    this.state.locked = false; this.state.ended = false;
    this.view.renderItem(item.kana);
    this.view.clearInput();
    this.view.setInputEnabled(true);
    this.view.focusInput();
    this.timer?.reset();
    this.timer?.start(this.debugSpeeds ? 3000 : 10_000);
    // badge reset
    this.view.flagFiltersChanged(false);
    this._debug('next', item.kana);
    try { const gMode = document.getElementById('status-mode'); if (gMode) gMode.textContent = 'Básico'; } catch {}
  }

  _submit() {
    if (this.state.locked || this.state.ended) return;
    const cur = this.engine?.getState?.().current;
    if (!cur) return; // guard: no current
    this.state.locked = true;
    this.view.setInputEnabled(false);
    this.timer?.stop?.();
    const answer = (this.view.getInputValue() || '').trim().toLowerCase();
    this._debug('submit', answer);
    this.engine.validate(answer);
  }

  _onCorrect(p) {
    this._debug('correct');
    this.view.showFeedback('correct', null);
    this.view.updateScoreboard(this.engine.getState());
    try { const gMode = document.getElementById('status-mode'); if (gMode) gMode.textContent = 'Básico'; } catch {}
    setTimeout(() => this.engine.nextItem(), this.revealMsCorrect);
  }

  _onWrong(p) {
    this._debug('wrong', p?.item?.kana || p?.expected);
    this.view.showFeedback('wrong', p?.expected);
    this.view.updateScoreboard(this.engine.getState());
    try { const gMode = document.getElementById('status-mode'); if (gMode) gMode.textContent = 'Básico'; } catch {}
    const s = this._currentSettings();
    if (s?.vibration) { try { navigator.vibrate?.(60); } catch {} }
    setTimeout(() => this.engine.nextItem(), this.revealMsWrong);
  }

  _onExpire() {
    if (this.state.locked || this.state.ended) return;
    this._debug('expire');
    this.state.locked = true;
    this.view.setInputEnabled(false);
    this.engine.validate('');
    // _onWrong will handle the rest via event
  }

  _skip() {
    if (this.state.ended) return;
    this.timer?.stop?.();
    this.engine.nextItem();
  }

  _restart() {
    // Clean slate without triggering end summary
    this._unbindEvents();
    this.state.ended = false; this.state.locked = false;
    this.view.clearSummary?.();
    this.view.showFeedback(null);
    this.timer?.reset?.();
    // Rebind and force-start engine
    this._bindEvents();
    this.engine.start(true);
    this.view.updateScoreboard(this.engine.getState());
    this._debug('restart');
  }

  _onEnd({ reason }) {
    this._debug('end', reason);
    this.state.ended = true;
    this.state.locked = true;
    this.view.setInputEnabled(false);
    this.timer?.stop?.();
    this.view.showEndSummary(this.engine.getState(), reason || 'manual');
    // Avoid leaks: detach listeners on end; will be rebound on restart
    this._unbindEvents();
    this._started = false;
    this._paused = false;
  }

  // Public controls for main wiring
  start(force = false) {
    if (this._disposed) return;
    if (!this._bound) this._bindEvents();
    // Call engine.start only via user intent
    this.engine.start(force);
  }

  isStarted() { return !!this._started && !this.state.ended; }

  // Public pause/resume/stop/restart controls to be wired by main
  pause() {
    if (!this.isStarted() || this._paused) return;
    this.state.locked = true;
    this.view.setInputEnabled(false);
    try { this.timer?.pause?.(); } catch {}
    this._paused = true;
    this._debug('pause');
  }

  resume() {
    if (!this.isStarted() || !this._paused) return;
    this.state.locked = false;
    this.view.setInputEnabled(true);
    this.view.focusInput();
    try { this.timer?.resume?.(); } catch {}
    this._paused = false;
    this._debug('resume');
  }

  stop() {
    if (!this.isStarted() && !this._paused) return;
    try { this.timer?.stop?.(); } catch {}
    try { this.engine?.end?.('manual'); } catch {}
    this._paused = false;
    this._debug('stop');
  }

  restart() {
    // Expose existing restart behavior
    this._restart();
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    try {
      this._unbindEvents();
      this.timer?.dispose?.();
      this.view?.unmount?.();
    } finally {
      // keep engine instance for app reuse; do not dispose engine here
    }
  }
}

export default ClassicMode;
