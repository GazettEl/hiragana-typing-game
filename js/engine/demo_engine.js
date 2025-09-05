// Demo for GameEngine — logs to console and allows quick testing
import { HIRAGANA } from '../hiragana.js';
import { GameEngine } from './game_engine.js';

// Minimal settings store that reads/writes localStorage.settings
function createSettingsStore() {
  const KEY = 'settings';
  let listeners = new Set();
  function getSettings() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }
  function apply(next) {
    localStorage.setItem(KEY, JSON.stringify(next));
    emitChange(next);
  }
  function emitChange(next) {
    listeners.forEach((cb) => { try { cb(next || getSettings()); } catch (e) { console.error(e); } });
  }
  function onChange(cb) { listeners.add(cb); }
  function offChange(cb) { listeners.delete(cb); }
  // listen to storage from other tabs
  window.addEventListener('storage', (e) => { if (e.key === KEY) emitChange(getSettings()); });
  return { getSettings, onChange, offChange, apply, emitChange };
}

const store = createSettingsStore();
const engine = new GameEngine({ dataset: HIRAGANA, settingsStore: store, noRepeatWindow: 2 });

// Log events
engine.on('start', (p) => console.log('[engine] start', p));
engine.on('end', (p) => console.log('[engine] end', p));
engine.on('poolUpdate', (p) => console.log('[engine] poolUpdate', p));
engine.on('settingsChange', (p) => console.log('[engine] settingsChange', p));
engine.on('next', (p) => console.log('[engine] next', p.item));
engine.on('correct', (p) => console.log('[engine] correct', p));
engine.on('wrong', (p) => console.log('[engine] wrong', p));

// Quick demo flow
engine.start();
for (let i = 0; i < 5; i++) {
  console.log('[demo] current', engine.getState().current);
  engine.validate('shi');
  engine.nextItem();
}

// Expose helpers
window.__engine = engine;
window.__settingsStore = store;

// Example: change to only youon at runtime
window.__demoYouonOnly = function () {
  const s = store.getSettings();
  s.sets = { gojuon: false, dakuten: false, handakuten: false, youon: true, small: false, sokuon: false, n: false };
  store.apply(s);
};

// Weighted test: {'し':3, 'か':1}
window.__demoWeightsTest = function (N = 1000) {
  const s = store.getSettings();
  s.sets = { gojuon: true, dakuten: false, handakuten: false, youon: false, small: false, sokuon: false, n: false };
  s.advanced = s.advanced || { enabled: false, mode: 'whitelist', selectedKana: [], weights: {}, presets: [] };
  s.advanced.enabled = true; s.advanced.mode = 'whitelist';
  s.advanced.selectedKana = ['し','か'];
  s.advanced.weights = { 'し': 3, 'か': 1 };
  store.apply(s);

  const freq = new Map();
  for (let i = 0; i < N; i++) {
    engine.nextItem();
    const cur = engine.getState().current;
    if (!cur) break;
    freq.set(cur.kana, (freq.get(cur.kana) || 0) + 1);
  }
  console.log('[demo] freq', Object.fromEntries(freq));
};

