// Hiragana Rush — vanilla JS
// Works on GitHub Pages (static). Uses relative fetch for ./data/hiragana.json

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  screens: {
    start: $("#screen-start"),
    game: $("#screen-game"),
    result: $("#screen-result"),
  },
  start: {
    mode: $("#mode"),
    difficulty: $("#difficulty"),
    timePerChar: $("#timePerChar"),
    timeAttackTotal: $("#timeAttackTotal"),
    timeAttackRow: $("#timeAttackRow"),
    permissive: $("#permissive"),
    soundEnabled: $("#soundEnabled"),
    theme: $("#theme"),
    startBtn: $("#btn-start"),
  },
  game: {
    score: $("#score"),
    combo: $("#combo"),
    lives: $("#lives"),
    livesLabel: $("#livesLabel"),
    timeBox: $("#timeBox"),
    timeLeft: $("#timeLeft"),
    timerFill: $("#timerFill"),
    kana: $("#kana"),
    answer: $("#answer"),
    feedback: $("#feedback"),
    quitBtn: $("#btn-quit"),
  },
  result: {
    score: $("#rScore"),
    hits: $("#rHits"),
    miss: $("#rMiss"),
    acc: $("#rAcc"),
    combo: $("#rCombo"),
    time: $("#rTime"),
    highscores: $("#highscores"),
    retry: $("#btn-retry"),
    home: $("#btn-home"),
  }
};

const STORAGE_KEYS = {
  settings: "htg_settings_v2",
  scores: "htg_highscores_v1",
  theme: "htg_theme_v1",
};

const state = {
  mode: "survival",          // survival | time
  difficulty: "easy",        // easy | medium | hard
  permissive: true,
  timePerChar: 10,           // seconds
  timeAttackTotal: 60,       // seconds
  livesStart: 3,

  pool: [],
  kanaData: [],
  current: null,
  score: 0,
  combo: 0,
  comboMax: 0,
  lives: 3,
  hits: 0,
  misses: 0,
  startedAt: 0,
  endedAt: 0,

  // timers
  charDeadline: 0,
  globalDeadline: 0,
  rafId: 0,
  rafGlobalId: 0,
  paused: false,
  pauseStamp: 0,
  remainingCharMs: 0,
  remainingGlobalMs: 0,
};

// -------------- Utils --------------
// -------------- Audio (WebAudio minimal) --------------
const audio = {
  ctx: null,
  enabled: true,
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  },
  beep(freq=440, ms=130, type='sine', gain=0.05) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms/1000);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + ms/1000);
  },
  good() { this.beep(660, 110, 'sine', 0.06); },
  bad() { this.beep(220, 160, 'square', 0.05); },
  timeout() { this.beep(110, 220, 'sawtooth', 0.05); },
};

// -------------- Theme handling --------------
function applyTheme(mode) {
  const html = document.documentElement;
  if (!['auto','dark','light'].includes(mode)) mode = 'auto';
  html.setAttribute('data-theme', mode);
  try { localStorage.setItem(STORAGE_KEYS.theme, mode); } catch {}
}
function loadTheme() {
  try { return localStorage.getItem(STORAGE_KEYS.theme) || 'auto'; } catch { return 'auto'; }
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const now = () => performance.now();
const normalize = (s) => s.toLowerCase().trim();

function saveSettings() {
  const payload = {
    mode: state.mode,
    difficulty: state.difficulty,
    permissive: state.permissive,
    timePerChar: state.timePerChar,
    timeAttackTotal: state.timeAttackTotal,
    soundEnabled: audio.enabled,
    theme: loadTheme(),
  };
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(payload));
}

function loadSettings() {
  try {
    const cfg = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}");
    if (cfg.mode) state.mode = cfg.mode;
    if (cfg.difficulty) state.difficulty = cfg.difficulty;
    if (typeof cfg.permissive === "boolean") state.permissive = cfg.permissive;
    if (cfg.timePerChar) state.timePerChar = Number(cfg.timePerChar);
    if (cfg.timeAttackTotal) state.timeAttackTotal = Number(cfg.timeAttackTotal);
    if (typeof cfg.soundEnabled === "boolean") audio.enabled = cfg.soundEnabled;
  } catch {}
}

function hsKey() {
  const base = `${state.mode}-${state.difficulty}-${state.timePerChar}s`;
  return (state.mode === "time") ? `${base}-${state.timeAttackTotal}s` : base;
}

function saveHighscore(entry) {
  let db = {};
  try { db = JSON.parse(localStorage.getItem(STORAGE_KEYS.scores) || "{}"); } catch {}
  const key = hsKey();
  const list = Array.isArray(db[key]) ? db[key] : [];
  list.push(entry);
  list.sort((a,b) => b.score - a.score);
  db[key] = list.slice(0, 5);
  localStorage.setItem(STORAGE_KEYS.scores, JSON.stringify(db));
  return db[key];
}

function getHighscores() {
  try {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEYS.scores) || "{}");
    return db[hsKey()] || [];
  } catch {
    return [];
  }
}

// Select a random item
function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Build kana pool based on difficulty
function buildPool() {
  const levels = state.difficulty === "easy"
    ? ["easy"]
    : state.difficulty === "medium"
      ? ["easy", "medium"]
      : ["easy", "medium", "hard"];
  state.pool = state.kanaData.filter(k => levels.includes(k.level));
}

// -------------- Screens --------------
function showScreen(which) {
  els.screens.start.classList.add("hidden");
  els.screens.game.classList.add("hidden");
  els.screens.result.classList.add("hidden");
  which.classList.remove("hidden");
}

// -------------- Game flow --------------
function resetStats() {
  state.score = 0;
  state.combo = 0;
  state.comboMax = 0;
  state.lives = state.livesStart;
  state.hits = 0;
  state.misses = 0;
  updateHUD();
}

function startGame() {
  resetStats();
  state.startedAt = Date.now();
  state.endedAt = 0;

  // UI mode specifics
  els.game.timeBox.hidden = (state.mode !== "time");
  els.game.livesLabel.textContent = (state.mode === "time") ? "—" : "Vidas";
  els.game.lives.textContent = (state.mode === "time") ? "—" : String(state.lives);

  // Global timer
  if (state.mode === "time") {
    state.remainingGlobalMs = state.timeAttackTotal * 1000;
    state.globalDeadline = now() + state.remainingGlobalMs;
    tickGlobal();
  }

  nextRound();
  showScreen(els.screens.game);
  els.game.answer.focus();
}

function endGame() {
  cancelAnimationFrame(state.rafId);
  cancelAnimationFrame(state.rafGlobalId);
  state.rafId = 0; state.rafGlobalId = 0;
  state.endedAt = Date.now();

  // Stats
  const duration = Math.round((state.endedAt - state.startedAt) / 1000);
  const acc = (state.hits + state.misses) ? Math.round(100 * state.hits / (state.hits + state.misses)) : 0;

  els.result.score.textContent = String(state.score);
  els.result.hits.textContent = String(state.hits);
  els.result.miss.textContent = String(state.misses);
  els.result.acc.textContent = `${acc}%`;
  els.result.combo.textContent = String(state.comboMax);
  els.result.time.textContent = `${duration}s`;

  // Highscores
  const hs = saveHighscore({
    score: state.score,
    acc,
    comboMax: state.comboMax,
    hits: state.hits,
    misses: state.misses,
    date: new Date().toISOString()
  });
  renderHighscores(hs);

  showScreen(els.screens.result);
}

function renderHighscores(list) {
  els.result.highscores.innerHTML = "";
  if (!list.length) {
    els.result.highscores.innerHTML = "<li>(Sin récords aún)</li>";
    return;
  }
  list.forEach((e, i) => {
    const li = document.createElement("li");
    li.textContent = `#${i+1} — ${e.score} pts · ${e.acc}% · combo ${e.comboMax}`;
    els.result.highscores.appendChild(li);
  });
}

function nextRound() {
  const item = sample(state.pool);
  state.current = item;
  els.game.kana.textContent = item.kana;
  els.game.answer.value = "";
  els.game.feedback.textContent = "";
  els.game.feedback.className = "feedback muted";

  // start char timer
  state.remainingCharMs = state.timePerChar * 1000;
  state.charDeadline = now() + state.remainingCharMs;
  tickChar();
}

function tickChar() {
  cancelAnimationFrame(state.rafId);
  const pct = clamp((state.charDeadline - now()) / (state.timePerChar * 1000), 0, 1);
  els.game.timerFill.style.transform = `scaleX(${pct})`;
  if (pct <= 0) {
    onTimeout();
    return;
  }
  state.rafId = requestAnimationFrame(tickChar);
}

function tickGlobal() {
  cancelAnimationFrame(state.rafGlobalId);
  const ms = clamp(state.globalDeadline - now(), 0, state.timeAttackTotal * 1000);
  els.game.timeLeft.textContent = String(Math.ceil(ms/1000));
  if (ms <= 0) { endGame(); return; }
  state.rafGlobalId = requestAnimationFrame(tickGlobal);
}

function onTimeout() { audio.timeout();
  // Wrong
  state.misses += 1;
  state.combo = 0;
  els.game.feedback.textContent = `${state.current.kana} → ${state.current.roma[0]}`;
  els.game.feedback.className = "feedback bad";
  // Life loss only in survival
  if (state.mode === "survival") {
    state.lives -= 1;
    if (state.lives <= 0) { updateHUD(); endGame(); return; }
  }
  updateHUD();
  // next
  nextRound();
}

function onCorrect() { audio.good();
  state.hits += 1;
  state.combo += 1;
  state.comboMax = Math.max(state.comboMax, state.combo);
  // points with small multiplier per 10 combo
  const mult = 1 + Math.floor(state.combo / 10);
  state.score += 1 * mult;

  els.game.feedback.textContent = "¡Bien!";
  els.game.feedback.className = "feedback good";

  updateHUD();
  nextRound();
}

function onWrong() { audio.bad();
  state.misses += 1;
  state.combo = 0;
  els.game.feedback.textContent = `Ups… ${state.current.kana} → ${state.current.roma[0]}`;
  els.game.feedback.className = "feedback bad";
  if (state.mode === "survival") {
    state.lives -= 1;
    if (state.lives <= 0) { updateHUD(); endGame(); return; }
  }
  updateHUD();
  nextRound();
}

function updateHUD() {
  els.game.score.textContent = String(state.score);
  els.game.combo.textContent = String(state.combo);
  if (state.mode === "survival") {
    els.game.lives.textContent = String(state.lives);
  }
}

// -------------- Input handling --------------
function acceptableRomanizations(item) {
  // If strict, only the first; else all provided.
  return state.permissive ? item.roma : [item.roma[0]];
}

function checkAuto() {
  const val = normalize(els.game.answer.value);
  if (!val) return;
  const list = acceptableRomanizations(state.current);
  if (list.some(r => normalize(r) === val)) {
    onCorrect();
  }
}

function onEnterConfirm() {
  const val = normalize(els.game.answer.value);
  const list = acceptableRomanizations(state.current);
  if (list.some(r => normalize(r) === val)) onCorrect();
  else onWrong();
}

// -------------- Pause on tab hide --------------
function pauseTimers() {
  if (state.paused) return;
  state.paused = true;
  state.pauseStamp = now();
  state.remainingCharMs = Math.max(0, state.charDeadline - state.pauseStamp);
  cancelAnimationFrame(state.rafId);
  if (state.mode === "time") {
    state.remainingGlobalMs = Math.max(0, state.globalDeadline - state.pauseStamp);
    cancelAnimationFrame(state.rafGlobalId);
  }
}
function resumeTimers() {
  if (!state.paused) return;
  state.paused = false;
  const t = now();
  state.charDeadline = t + state.remainingCharMs;
  tickChar();
  if (state.mode === "time") {
    state.globalDeadline = t + state.remainingGlobalMs;
    tickGlobal();
  }
}

// -------------- Wiring --------------
async function init() {
  loadSettings();

  // apply settings to UI
  // Theme
  applyTheme(loadTheme());
  els.start.theme.value = loadTheme();

  // Apply settings to UI (sound)
  els.start.soundEnabled.checked = audio.enabled;

  // Clicking start unlocks audio context on user gesture
  const unlockAudio = () => { audio.init(); document.removeEventListener('click', unlockAudio); };
  document.addEventListener('click', unlockAudio, { once: true });

  // Change handlers for theme & sound
  els.start.theme.addEventListener('change', (e) => applyTheme(e.target.value));
  els.start.soundEnabled.addEventListener('change', (e) => { audio.enabled = e.target.checked; saveSettings(); });

  els.start.mode.value = state.mode;
  els.start.difficulty.value = state.difficulty;
  els.start.permissive.checked = state.permissive;
  els.start.timePerChar.value = String(state.timePerChar);
  els.start.timeAttackTotal.value = String(state.timeAttackTotal);

  const updateTimeRow = () => {
    els.start.timeAttackRow.hidden = (els.start.mode.value !== "time");
  };
  updateTimeRow();
  els.start.mode.addEventListener('change', updateTimeRow);

  // load data
  try {
    const res = await fetch("./data/hiragana.json");
    state.kanaData = await res.json();
  } catch (e) {
    console.error("Error cargando hiragana.json", e);
    alert("No se pudo cargar data/hiragana.json");
    state.kanaData = [];
  }
  if (!state.kanaData.length) {
    throw new Error("No hay datos de hiragana");
  }

  buildPool();
  showScreen(els.screens.start);

  // start handlers
  els.start.startBtn.addEventListener("click", () => {
    state.mode = els.start.mode.value;
    state.difficulty = els.start.difficulty.value;
    state.permissive = els.start.permissive.checked;
    state.timePerChar = Number(els.start.timePerChar.value);
    state.timeAttackTotal = Number(els.start.timeAttackTotal.value);
    applyTheme(els.start.theme.value);
    audio.enabled = els.start.soundEnabled.checked;
    saveSettings();
    buildPool();
    startGame();
  });

  els.game.quitBtn.addEventListener("click", () => {
    endGame();
  });

  // input handlers
  els.game.answer.addEventListener("input", checkAuto);
  els.game.answer.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnterConfirm();
    }
  });

  // result handlers
  els.result.retry.addEventListener("click", () => {
    startGame();
  });
  els.result.home.addEventListener("click", () => {
    showScreen(els.screens.start);
  });

  // visibility pause
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseTimers();
    else resumeTimers();
  });
}

window.addEventListener("DOMContentLoaded", init);
