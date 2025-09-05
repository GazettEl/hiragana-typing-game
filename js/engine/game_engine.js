// GameEngine — reusable engine for Hiragana practice
// - Builds dynamic pool from settings (sets + advanced + weights)
// - Provides API: start(), end(), nextItem(), validate(answer), getState(), getPoolSnapshot()
// - Emits events: 'start'|'end'|'next'|'correct'|'wrong'|'poolUpdate'|'settingsChange'
// - Agnostic of timers/modes (lives/time handled externally)

import { TimerBase } from '../timers/timer_base.js';

// Utility: RNG wrapper with crypto fallback
function defaultRng() {
  const cryptoObj = (typeof crypto !== 'undefined' ? crypto : (typeof window !== 'undefined' ? window.crypto : null));
  if (cryptoObj && cryptoObj.getRandomValues) {
    return {
      random() {
        const arr = new Uint32Array(1);
        cryptoObj.getRandomValues(arr);
        // Map to [0,1)
        return arr[0] / 0x100000000;
      },
    };
  }
  return { random: Math.random };
}

function clampWeight(v) {
  v = Number(v ?? 1);
  if (!Number.isFinite(v)) return 1;
  return Math.max(1, Math.min(5, Math.trunc(v)));
}

function normalizeString(s) {
  if (s == null) return '';
  try { s = s.normalize('NFKC'); } catch {}
  s = String(s).trim().toLowerCase();
  // Remove combining marks
  s = s.replace(/[\u0300-\u036f]/g, '');
  // Remove spaces
  s = s.replace(/\s+/g, '');
  return s;
}

function buildPool(dataset, settings) {
  if (!settings || !dataset) return [];
  const active = new Set(Object.entries(settings.sets || {}).filter(([,v]) => !!v).map(([k]) => k));
  let pool = dataset.filter((e) => active.has(e.set));

  if (settings.advanced?.enabled) {
    const sel = new Set(settings.advanced.selectedKana || []);
    if (settings.advanced.mode === 'blacklist') {
      pool = pool.filter((e) => !sel.has(e.kana));
    } else {
      pool = pool.filter((e) => sel.has(e.kana));
    }
  }
  const weights = settings.advanced?.weights || {};
  pool = pool.map((e) => ({ ...e, weight: clampWeight(weights[e.kana]) }));
  return pool;
}

function weightedPick(pool, rng) {
  const total = pool.reduce((acc, e) => acc + clampWeight(e.weight), 0);
  if (total <= 0) return null;
  const t = rng.random() * total;
  let cum = 0;
  for (const e of pool) {
    cum += clampWeight(e.weight);
    if (t <= cum) return e;
  }
  return pool[pool.length - 1] || null;
}

export class GameEngine extends TimerBase {
  constructor({ dataset = [], settingsStore, rng = null, noRepeatWindow = 2 } = {}) {
    super();
    this._dataset = dataset;
    this._settingsStore = settingsStore;
    this._rng = rng || defaultRng();
    this._noRepeatWindow = Math.max(0, Number(noRepeatWindow || 0));

    this._pool = [];
    this._recent = [];
    this._started = false;
    this._ended = false;
    this._busy = false;

    this._state = {
      score: 0,
      combo: 0,
      total: 0,
      correct: 0,
      wrong: 0,
      current: null,
      lastResult: null,
      history: [],
      startedAt: null,
    };

    this._settings = this._settingsStore?.getSettings ? this._settingsStore.getSettings() : {};
    this.rebuildPool();

    this._onSettingsChange = (nextSettings) => {
      const prev = this._settings;
      this._settings = nextSettings || this._settings;
      this._emit('settingsChange', { prevSettings: prev, nextSettings: this._settings });
      this.rebuildPool();
      if (this._started && this._pool.length === 0) {
        this.end('settings-changed');
      }
    };
    this._settingsStore?.onChange?.(this._onSettingsChange);
  }

  start(force = false) {
    if (this._started && !force) return;
    this._started = true;
    this._ended = false;
    this._busy = false;
    this._state = {
      score: 0,
      combo: 0,
      total: 0,
      correct: 0,
      wrong: 0,
      current: null,
      lastResult: null,
      history: [],
      startedAt: Date.now(),
    };
    this._recent = [];
    this.rebuildPool();
    this._emit('start', { startedAt: this._state.startedAt });
    if (this._pool.length === 0) {
      this.end('empty-pool');
      return;
    }
    this.nextItem();
  }

  end(reason = 'manual') {
    if (!this._started || this._ended) return;
    this._ended = true;
    const snap = this.getState();
    this._emit('end', { reason, endedAt: Date.now(), stateSnapshot: snap });
  }

  rebuildPool() {
    this._pool = buildPool(this._dataset, this._settings);
    this._emit('poolUpdate', {
      size: this._pool.length,
      sets: { ...(this._settings?.sets || {}) },
      advanced: { ...(this._settings?.advanced || {}) },
    });
  }

  getPoolSnapshot() {
    return this._pool.slice();
  }

  getState() {
    // Return a shallow clone without functions
    return JSON.parse(JSON.stringify(this._state));
  }

  nextItem() {
    if (!this._started || this._ended || this._busy) return;
    if (this._pool.length === 0) {
      this.end('empty-pool');
      return;
    }
    this._busy = true;

    // Reroll to avoid recent repeats
    let pick = null;
    const recentSet = new Set(this._recent);
    const limit = Math.max(1, this._pool.length);
    for (let i = 0; i < limit; i++) {
      const candidate = weightedPick(this._pool, this._rng);
      if (!candidate) break;
      if (this._noRepeatWindow > 0 && recentSet.has(candidate.kana) && this._pool.length > 1) {
        continue;
      }
      pick = candidate; break;
    }
    // Fallback
    pick = pick || weightedPick(this._pool, this._rng);

    this._state.current = pick || null;
    if (pick) {
      // Update recent buffer
      if (this._noRepeatWindow > 0) {
        this._recent.unshift(pick.kana);
        if (this._recent.length > this._noRepeatWindow) this._recent.length = this._noRepeatWindow;
      }
    }
    this._busy = false;
    this._emit('next', { item: pick });
  }

  validate(answer) {
    if (!this._started || this._ended) return;
    const item = this._state.current;
    if (!item) return;
    const settings = this._settings || {};
    const strict = !!settings.hepburnStrict;
    const norm = normalizeString(answer || '');

    let ok = false;
    let acceptedAs = null;
    if (norm) {
      if (norm === item.romaji_canon) {
        ok = true; acceptedAs = 'canon';
      } else if (!strict) {
        const alts = new Set([...(item.romaji_alt || [])]);
        // Tolerances common
        const tolMap = new Map([
          ['si','shi'], ['ti','chi'], ['tu','tsu'], ['zi','ji'], ['di','ji'], ['du','zu'], ['dzu','zu']
        ]);
        const tol = tolMap.get(norm);
        if (alts.has(norm) || (tol && (tol === item.romaji_canon || alts.has(tol)))) {
          ok = true; acceptedAs = 'alt';
        }
      }
    }

    if (ok) {
      this._state.score += 1;
      this._state.combo += 1;
      this._state.correct += 1;
      this._state.total = this._state.correct + this._state.wrong;
      this._state.lastResult = { correct: true, expected: item.romaji_canon, acceptedAs: acceptedAs || 'canon', normalizedAnswer: norm, item: { kana: item.kana, romaji_canon: item.romaji_canon, romaji_alt: item.romaji_alt, set: item.set } };
      this._state.history.push({ kana: item.kana, ok: true, at: Date.now() });
      this._emit('correct', { item, normalizedAnswer: norm, acceptedAs: acceptedAs || 'canon', score: this._state.score, combo: this._state.combo });
    } else {
      this._state.combo = 0;
      this._state.wrong += 1;
      this._state.total = this._state.correct + this._state.wrong;
      this._state.lastResult = { correct: false, expected: item.romaji_canon, acceptedAs: null, normalizedAnswer: norm, item: { kana: item.kana, romaji_canon: item.romaji_canon, romaji_alt: item.romaji_alt, set: item.set } };
      this._state.history.push({ kana: item.kana, ok: false, at: Date.now() });
      this._emit('wrong', { item, normalizedAnswer: norm, expected: item.romaji_canon, score: this._state.score, combo: this._state.combo });
    }
  }

  on(name, handler) { return super.on(name, handler); }
  off(name, handler) { return super.off(name, handler); }

  dispose() {
    this._settingsStore?.offChange?.(this._onSettingsChange);
    this._events?.clear?.();
  }
}

export default GameEngine;

