// JP Practice â€” Entry point (SPA wiring)
// - Settings store + pool computation
// - Start/Restart button (no autostart)
// - Filters chips + warning
// - Classic Mode mount/unmount

import { HIRAGANA } from './hiragana.js';
import { GameEngine } from './engine/game_engine.js';
import { ClassicMode } from './modes/classic_mode.js';

(function () {
  const root = document.documentElement;
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menu-toggle');
  const scrim = document.getElementById('scrim');
  const themeCheckbox = document.getElementById('theme-toggle');
  const settingsForm = document.getElementById('settings-form');
  const statusLive = document.getElementById('settings-status');
  const appLive = document.getElementById('app-live');
  // Central UI state (lightweight)
  const AppState = { selectedMode: null, ui: { activeTabId: 'view-home' }, optionsByMode: {} };
  window.__appState = AppState;

  // Mode label helper (UI only)
  const MODE_KEY = 'jp.mode';
  const MODE_LABELS = {
    classic: 'Clásico',
    survival: 'Supervivencia',
    timeattack: 'Contrarreloj',
    timetrial: 'Contrarreloj',
    choice: 'Selección múltiple',
    multi: 'Selección múltiple',
    reverse: 'Inverso',
    youon: 'Yōon & dakuten',
    dictation: 'Dictado',
  };
  function modeLabel(mode) { return MODE_LABELS[mode] || (mode ? String(mode) : ''); }
  function dispatchInternalEvent(type, detail) { try { document.dispatchEvent(new CustomEvent(type, { detail })); } catch {} }
  // Expose for UI modules that may not import main
  try { window.MODE_LABELS = MODE_LABELS; window.modeLabel = modeLabel; } catch {}

  // Update Options UI on mode change (minimal refresh)
  function refreshOptionsForMode(mode) {
    // Example: reflect mode in drawer title and disable/enable fields if needed
    const title = document.getElementById('filters-title'); if (title) title.textContent = `Configurar práctica — ${modeLabel(mode)}`;
    // Keep classic time-per-char disabled for now; placeholder for future modes
    const charTime = document.getElementById('cfg-char-time'); if (charTime) charTime.disabled = true;
  }
  document.addEventListener('mode:changed', (e) => { try { refreshOptionsForMode(e.detail?.mode); } catch {} }, { passive: true });
  // TODO: Alias para el nuevo CTA unificado (#primary-cta). Mantiene compatibilidad con #startBtn.
  const startBtn = document.getElementById('startBtn') || document.getElementById('primary-cta');
  // TODO: Drawer de filtros (nuevo)
  const filtersDrawer = document.getElementById('filters-drawer');
  const filtersOverlay = document.getElementById('filters-overlay');
  const openFiltersBtn = document.getElementById('open-filters');
  const closeFiltersBtn = document.getElementById('close-filters');
  const filtersBar = null; // active-filters UI removed
  const poolWarning = document.getElementById('pool-warning');
  // Game control finite-state machine
  const GameState = { IDLE: 'idle', RUNNING: 'running', PAUSED: 'paused' };
  let gameState = GameState.IDLE;
  // Legacy secondary CTA handle (kept hidden)
  let startCTA;

  // -------- Views router (Home/Game) --------
  const View = { HOME: 'home', GAME: 'game' };
  let currentView = View.HOME;
  function showView(v) {
    currentView = v;
    const home = document.getElementById('view-home');
    const game = document.getElementById('view-game');
    if (home && game) {
      home.hidden = (v !== View.HOME);
      game.hidden = (v !== View.GAME);
    }
    try {
      if (v === View.HOME) { window.__classicMode?.stop?.(); gameState = GameState.IDLE; }
    } catch {}
    try { refreshStartButtonState(settings); } catch {}
  }

  // -------- Settings handling --------
  const SETTINGS_KEY = 'settings';
  const DEFAULT_SETTINGS = {
    durationMin: 3,
    timePerCharSec: 10,
    sets: { gojuon: true, dakuten: false, handakuten: false, youon: false, small: false, sokuon: true, n: true },
    hepburnStrict: false,
    vibration: false,
    sound: false,
    a11y: { fontScale: 100, highContrast: false },
    advanced: { enabled: false, mode: 'whitelist', selectedKana: [], weights: {}, presets: [] },
  };

  let booting = true;

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return structuredClone(DEFAULT_SETTINGS);
      const parsed = JSON.parse(raw);
      const merged = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        sets: { ...DEFAULT_SETTINGS.sets, ...(parsed?.sets || {}) },
        a11y: { ...DEFAULT_SETTINGS.a11y, ...(parsed?.a11y || {}) },
        advanced: { ...DEFAULT_SETTINGS.advanced, ...(parsed?.advanced || {}), weights: { ...(parsed?.advanced?.weights || {}) }, presets: Array.isArray(parsed?.advanced?.presets) ? parsed.advanced.presets : [] },
      };
      merged.timePerCharSec = 10; // constant for classic
      return merged;
    } catch {
      return structuredClone(DEFAULT_SETTINGS);
    }
  }

  const settingsListeners = new Set();
  function saveSettings(s) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
      if (!booting && statusLive) statusLive.textContent = 'ConfiguraciÃ³n guardada';
      settingsListeners.forEach((cb) => { try { cb(s); } catch (e) { console.error(e); } });
    } catch {}
  }

  function activeSetsList(s) { return Object.entries(s.sets).filter(([,v]) => !!v).map(([k]) => k); }
  function getCurrentPoolRaw(s) {
    const setList = new Set(activeSetsList(s));
    let pool = HIRAGANA.filter((e) => setList.has(e.set));
    if (s.advanced?.enabled) {
      const sel = new Set(s.advanced.selectedKana || []);
      if (s.advanced.mode === 'whitelist') pool = pool.filter((e) => sel.has(e.kana)); else pool = pool.filter((e) => !sel.has(e.kana));
    }
    return pool;
  }
  function computeCurrentPool(s, dataset = HIRAGANA) {
    const setList = new Set(Object.entries(s.sets || {}).filter(([,v]) => !!v).map(([k]) => k));
    let items = (dataset || []).filter((e) => setList.has(e.set));
    if (s.advanced?.enabled) {
      const sel = new Set(s.advanced.selectedKana || []);
      if (s.advanced.mode === 'whitelist') items = items.filter((e) => sel.has(e.kana)); else items = items.filter((e) => !sel.has(e.kana));
    }
    const chips = [];
    if (s.sets?.gojuon) chips.push('GojÅ«on');
    if (s.sets?.dakuten) chips.push('Dakuten');
    if (s.sets?.handakuten) chips.push('Handakuten');
    if (s.sets?.youon) chips.push('YÅon');
    if (s.sets?.small || s.sets?.sokuon || s.sets?.n) chips.push('Especiales');
    if (s.hepburnStrict) chips.push('Hepburn estricto');
    chips.push(`DuraciÃ³n: ${Math.max(1, Math.min(10, Number(s.durationMin||3)))}m`);
    if (s.advanced?.enabled) chips.push(`Avanzada: ${s.advanced.mode} (${s.advanced.selectedKana?.length || 0})`);
    return { items, size: items.length, chips };
  }

  function refreshFiltersChips(s) { /* no-op: chips removed from main */ }

  // Primary CTA state handler
  function refreshGameControlButton(s) {
    const pool = getCurrentPoolRaw(s);
    const invalidWhitelist = s.advanced?.enabled && s.advanced.mode === 'whitelist' && (s.advanced.selectedKana?.length || 0) === 0;
    const invalidBlacklist = s.advanced?.enabled && s.advanced.mode === 'blacklist' && pool.length === 0;
    const inGame = (typeof currentView === 'string') ? (currentView === View.GAME) : true;
    const hasMode = !!(s.game?.mode);
    const ok = inGame && hasMode && !invalidWhitelist && !invalidBlacklist && pool.length > 0;
    if (!startBtn) return;
    if (!ok) {
      let label = 'Comenzar';
      let title = '';
      if (!inGame || !hasMode) {
        label = 'Selecciona un modo';
        title = 'Elige un modo para comenzar';
        poolWarning?.classList.remove('is-visible');
      } else {
        title = 'Ajusta tus sets para comenzar';
        poolWarning && (poolWarning.textContent = 'Ajusta tus sets para comenzar');
        poolWarning?.classList.add('is-visible');
      }
      startBtn.textContent = label;
      startBtn.setAttribute('disabled','');
      startBtn.setAttribute('aria-disabled','true');
      startBtn.setAttribute('aria-pressed','false');
      startBtn.dataset.state = GameState.IDLE;
      if (title) startBtn.title = title; else startBtn.removeAttribute('title');
      const rootEl = document.getElementById('game-root'); if (rootEl && !inGame) rootEl.innerHTML = '';
    } else {
      poolWarning && (poolWarning.textContent = '');
      poolWarning?.classList.remove('is-visible');
      startBtn.removeAttribute('disabled');
      startBtn.setAttribute('aria-disabled','false');
      startBtn.removeAttribute('title');
      if (gameState === GameState.RUNNING) {
        startBtn.textContent = 'Pausar';
        startBtn.setAttribute('aria-pressed','true');
        startBtn.dataset.state = GameState.RUNNING;
      } else if (gameState === GameState.PAUSED) {
        startBtn.textContent = 'Reanudar';
        startBtn.setAttribute('aria-pressed','false');
        startBtn.dataset.state = GameState.PAUSED;
      } else {
        const m = s?.game?.mode;
        startBtn.textContent = m ? `Empezar — ${modeLabel(m)}` : 'Comenzar';
        startBtn.setAttribute('aria-pressed','false');
        startBtn.dataset.state = GameState.IDLE;
      }
    }
  }function refreshStartButtonState(s) { return refreshGameControlButton(s); }

  function bindSettingsUI(s) {
    if (!settingsForm) return;
    // Duration slider
    const duration = document.getElementById('cfg-duration');
    const durationOut = document.getElementById('cfg-duration-value');
    if (duration) {
      duration.value = String(s.durationMin);
      if (durationOut) durationOut.value = String(s.durationMin);
      duration.addEventListener('input', () => { if (durationOut) durationOut.value = duration.value; });
      duration.addEventListener('change', () => { s.durationMin = Math.max(1, Math.min(10, Number(duration.value))); saveSettings(s); refreshFiltersChips(s); refreshStartButtonState(s); });
    }
    // Sets checkboxes
    settingsForm.querySelectorAll('input[type="checkbox"][data-set]').forEach((el) => {
      const input = el; const key = input.getAttribute('data-set'); if (!key) return;
      input.checked = !!s.sets[key];
      input.addEventListener('change', () => { s.sets[key] = input.checked; saveSettings(s); refreshFiltersChips(s); refreshStartButtonState(s); });
    });
    // Toggles
    const hepburn = document.getElementById('cfg-hepburn');
    const vibration = document.getElementById('cfg-vibration');
    hepburn && (hepburn.checked = !!s.hepburnStrict, hepburn.addEventListener('change', () => { s.hepburnStrict = hepburn.checked; saveSettings(s); refreshFiltersChips(s); }));
    vibration && (vibration.checked = !!s.vibration, vibration.addEventListener('change', () => { s.vibration = vibration.checked; saveSettings(s); }));

    // A11y controls
    const contrast = document.getElementById('cfg-contrast');
    const fontScale = document.getElementById('cfg-font-scale');
    const fontScaleOut = document.getElementById('cfg-font-scale-value');
    if (contrast) { contrast.checked = !!(s.a11y?.highContrast); contrast.addEventListener('change', () => { s.a11y = s.a11y || {}; s.a11y.highContrast = !!contrast.checked; applyA11y(s); saveSettings(s); }); }
    if (fontScale) { fontScale.value = String(s.a11y?.fontScale || 100); if (fontScaleOut) fontScaleOut.value = `${fontScale.value}%`; fontScale.addEventListener('input', () => { if (fontScaleOut) fontScaleOut.value = `${fontScale.value}%`; }); fontScale.addEventListener('change', () => { s.a11y = s.a11y || {}; s.a11y.fontScale = Math.max(90, Math.min(120, Number(fontScale.value))); applyA11y(s); saveSettings(s); }); }

    // Advanced toggles
    const advEnabled = document.getElementById('cfg-adv-enabled');
    const modeWhitelist = document.getElementById('cfg-adv-mode-whitelist');
    const modeBlacklist = document.getElementById('cfg-adv-mode-blacklist');
    if (advEnabled) { advEnabled.checked = !!s.advanced.enabled; advEnabled.addEventListener('change', () => { s.advanced.enabled = advEnabled.checked; saveSettings(s); refreshFiltersChips(s); refreshStartButtonState(s); }); }
    ;[modeWhitelist, modeBlacklist].forEach((el) => el && el.addEventListener('change', () => { s.advanced.mode = modeWhitelist?.checked ? 'whitelist' : 'blacklist'; saveSettings(s); refreshFiltersChips(s); refreshStartButtonState(s); }));

    // Minimal advanced list rendering for selection
    const advList = document.getElementById('adv-kana-list');
    const selectedCount = document.getElementById('adv-selected-count');
    if (advList) {
      advList.innerHTML = '';
      const frag = document.createDocumentFragment();
      HIRAGANA.forEach((entry) => {
        const wrap = document.createElement('label');
        wrap.className = 'kana-item';
        wrap.dataset.kana = entry.kana;
        wrap.dataset.set = entry.set;
        // Add romaji to dataset for search and row/col selection
        wrap.dataset.romaji = entry.romaji_canon || '';
        const chk = document.createElement('input'); chk.type = 'checkbox'; chk.className = 'kana-check'; chk.checked = s.advanced.selectedKana.includes(entry.kana);
        const spanK = document.createElement('span'); spanK.className = 'kana'; spanK.textContent = entry.kana;
        const spanR = document.createElement('span'); spanR.className = 'romaji'; spanR.textContent = entry.romaji_canon;
        const textWrap = document.createElement('div'); textWrap.append(spanK, document.createTextNode(' '), spanR);
        chk.addEventListener('change', () => {
          const k = entry.kana; const arr = s.advanced.selectedKana; const i = arr.indexOf(k);
          if (chk.checked && i === -1) arr.push(k); if (!chk.checked && i !== -1) arr.splice(i, 1);
          if (selectedCount) selectedCount.textContent = String(arr.length);
          saveSettings(s); refreshFiltersChips(s); refreshStartButtonState(s);
        });
        wrap.append(chk, textWrap); frag.appendChild(wrap);
      });
      advList.appendChild(frag);
      if (selectedCount) selectedCount.textContent = String(s.advanced.selectedKana.length);

      // Helpers for advanced quick controls
      function updateSelectedCount() { if (selectedCount) selectedCount.textContent = String(s.advanced.selectedKana.length); }
      function listAllLabels() { return Array.from(advList.querySelectorAll('.kana-item')); }
      function applySelectionTo(labels, action) {
        const set = new Set(s.advanced.selectedKana);
        labels.forEach((el) => {
          const kana = el.dataset.kana;
          const input = el.querySelector('input[type="checkbox"]');
          if (!kana) return;
          if (action === 'select') { set.add(kana); if (input) input.checked = true; }
          else if (action === 'unselect') { set.delete(kana); if (input) input.checked = false; }
          else if (action === 'toggle') { if (set.has(kana)) { set.delete(kana); if (input) input.checked = false; } else { set.add(kana); if (input) input.checked = true; } }
        });
        s.advanced.selectedKana = Array.from(set);
        updateSelectedCount();
        saveSettings(s); refreshFiltersChips(s); refreshStartButtonState(s);
      }
      function getRowFromRomaji(r) {
        if (!r) return null; const t = r.toLowerCase();
        if (t.startsWith('shi')) return 's';
        if (t.startsWith('chi') || t.startsWith('tsu')) return 't';
        if (t.startsWith('fu')) return 'h';
        const c = t[0]; if ('aiueo'.includes(c)) return null; return c;
      }
      function getColFromRomaji(r) {
        if (!r) return null; const t = r.toLowerCase();
        // last vowel occurrence
        const m = t.match(/.*([aiueo])(?!.*[aiueo])/);
        return m ? m[1] : null;
      }

      // Wire quick-controls (delegation)
      const advRoot = document.getElementById('advanced');
      const quick = advRoot?.querySelector('.quick-controls');
      if (quick && !quick.__wired) {
        quick.addEventListener('click', (ev) => {
          const btn = ev.target instanceof Element ? ev.target.closest('button') : null;
          if (!btn || !quick.contains(btn)) return;
          ev.preventDefault();
          const action = btn.dataset.action;
          const group = btn.dataset.group;
          const row = btn.dataset.row;
          const col = btn.dataset.col;
          const labels = listAllLabels();

          if (action === 'select-all') {
            applySelectionTo(labels, 'select');
            return;
          }
          if (action === 'clear-all') {
            applySelectionTo(labels, 'unselect');
            return;
          }
          if (action === 'invert') {
            applySelectionTo(labels, 'toggle');
            return;
          }

          if (group) {
            let matchSets = [];
            if (group === 'specials') matchSets = ['small','sokuon','n'];
            else matchSets = [group];
            const subset = labels.filter((el) => matchSets.includes(el.dataset.set));
            applySelectionTo(subset, 'select');
            return;
          }

          if (row) {
            const subset = labels.filter((el) => el.dataset.set === 'gojuon' && getRowFromRomaji(el.dataset.romaji) === row);
            applySelectionTo(subset, 'select');
            return;
          }

          if (col) {
            const subset = labels.filter((el) => el.dataset.set === 'gojuon' && getColFromRomaji(el.dataset.romaji) === col);
            applySelectionTo(subset, 'select');
            return;
          }
        });
        quick.__wired = true;
      }

      // Wire search filter
      const advSearch = document.getElementById('cfg-adv-search');
      if (advSearch && !advSearch.__wired) {
        advSearch.addEventListener('input', () => {
          const q = (advSearch.value || '').trim().toLowerCase();
          const all = listAllLabels();
          all.forEach((el) => {
            const kana = (el.dataset.kana || '').toLowerCase();
            const rom = (el.dataset.romaji || '').toLowerCase();
            const hit = !q || kana.includes(q) || rom.includes(q);
            el.hidden = q ? !hit : false;
          });
        });
        advSearch.__wired = true;
      }
    }
  }

  // Theme toggle (minimal)
  const THEME_KEY = 'theme';
  const preferred = localStorage.getItem(THEME_KEY);
  if (preferred === 'dark') { root.setAttribute('data-theme','dark'); themeCheckbox && (themeCheckbox.checked = true); }
  themeCheckbox?.addEventListener('change', () => { const dark = themeCheckbox.checked; if (dark) { root.setAttribute('data-theme','dark'); localStorage.setItem(THEME_KEY,'dark'); } else { root.removeAttribute('data-theme'); localStorage.setItem(THEME_KEY,'light'); } });

  function applyA11y(s) {
    try { root.style.fontSize = `${Math.max(90, Math.min(120, Number(s?.a11y?.fontScale || 100)))}%`; } catch {}
    try { if (s?.a11y?.highContrast) { root.setAttribute('data-contrast','high'); } else { root.removeAttribute('data-contrast'); } } catch {}
  }

  // Drawer (mobile)
  function openDrawer(){ sidebar.classList.add('is-open'); scrim?.classList.add('is-visible'); scrim?.removeAttribute('hidden'); menuBtn?.setAttribute('aria-expanded','true'); }
  function closeDrawer(){ sidebar.classList.remove('is-open'); scrim?.classList.remove('is-visible'); scrim?.setAttribute('hidden',''); menuBtn?.setAttribute('aria-expanded','false'); }
  menuBtn?.addEventListener('click', () => { const isOpen = sidebar.classList.contains('is-open'); if (isOpen) closeDrawer(); else openDrawer(); });
  scrim?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  // Filters Drawer (right) with focus trap
  function getFocusable(el){ return el ? Array.from(el.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')) : []; }
  let __filtersPausedGame = false;
  function openFilters(){
    if (!filtersDrawer) return;
    filtersDrawer.setAttribute('aria-hidden','false');
    filtersOverlay?.removeAttribute('hidden');
    openFiltersBtn?.setAttribute('aria-expanded','true');
    try { document.body.style.overflow = 'hidden'; } catch {}
    // Snapshot + optional auto-pause
    try { filtersDrawer.__snapshot = JSON.stringify(settings); } catch {}
    if (gameState === GameState.RUNNING) { __filtersPausedGame = true; try { gamePause(); } catch {} } else { __filtersPausedGame = false; }
    const focusables = getFocusable(filtersDrawer); const first = focusables[0] || filtersDrawer; const last = focusables[focusables.length-1] || filtersDrawer;
    filtersDrawer.__trap = { first, last, prev: document.activeElement };
    setTimeout(() => { try { first.focus(); } catch {} }, 0);
  }
  function closeFilters(){
    if (!filtersDrawer) return;
    filtersDrawer.setAttribute('aria-hidden','true');
    filtersOverlay?.setAttribute('hidden','');
    openFiltersBtn?.setAttribute('aria-expanded','false');
    try { document.body.style.overflow = ''; } catch {}
    if (__filtersPausedGame) { try { gameResume(); } catch {} }
    __filtersPausedGame = false;
    const prev = filtersDrawer.__trap?.prev; if (prev && typeof prev.focus === 'function') { try { prev.focus(); } catch {} }
    filtersDrawer.__trap = null;
  }
  openFiltersBtn?.addEventListener('click', openFilters);
  closeFiltersBtn?.addEventListener('click', closeFilters);
  filtersOverlay?.addEventListener('click', closeFilters);
  filtersDrawer?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeFilters(); return; }
    if (e.key === 'Tab') {
      const trap = filtersDrawer.__trap; if (!trap) return;
      if (e.shiftKey && document.activeElement === trap.first) { e.preventDefault(); trap.last.focus(); }
      else if (!e.shiftKey && document.activeElement === trap.last) { e.preventDefault(); trap.first.focus(); }
    }
  });

  // Global ESC closes filters drawer first (and stops propagation), if open
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && filtersDrawer && filtersDrawer.getAttribute('aria-hidden') === 'false') {
      e.preventDefault(); e.stopImmediatePropagation(); closeFilters();
    }
  }, true);

  // Initialize settings + UI
  const settings = loadSettings();
  // Restore selected mode from dedicated key if present (keeps compatibility with settings.game.mode)
  try {
    const savedMode = localStorage.getItem(MODE_KEY) || settings?.game?.mode || null;
    if (savedMode) {
      settings.game = settings.game || {};
      settings.game.mode = savedMode;
      AppState.selectedMode = savedMode;
    }
  } catch {}
  saveSettings(settings);
  bindSettingsUI(settings);
  refreshFiltersChips(settings);
  refreshGameControlButton(settings);
  applyA11y(settings);
  // Start at Home view (no auto-start)
  showView(View.HOME);

  // Settings store for engine
  const settingsStore = { getSettings: () => settings, onChange: (cb) => settingsListeners.add(cb), offChange: (cb) => settingsListeners.delete(cb) };
  window.__settingsStore = settingsStore;

  // Engine + Classic mode (no autostart)
  const engine = new GameEngine({ dataset: HIRAGANA, settingsStore, noRepeatWindow: 2 });
  window.__engine = engine;
  engine.on('poolUpdate', () => { try { refreshFiltersChips(settings); refreshGameControlButton(settings); } catch (e) { console.error(e); } });
  engine.on('end', () => { try { gameState = GameState.IDLE; refreshGameControlButton(settings); } catch (e) { console.error(e); } });

  // Disable not-implemented modes
  document.querySelectorAll('.menu-link:not(#mode-classic)')
    .forEach((a) => { a.setAttribute('aria-disabled','true'); a.classList.add('menu-link--disabled'); a.addEventListener('click', (e) => e.preventDefault()); });

  // Mode grid delegation (Home)
  const modeGrid = document.getElementById('modeGrid');
  if (modeGrid && !modeGrid.__wired) {
    modeGrid.__wired = true;
    // Helper to set selection consistently, update UI and persist
    function setSelectedMode(mode) {
      if (!mode) return;
      AppState.selectedMode = mode;
      settings.game = settings.game || {};
      settings.game.mode = mode;
      try { localStorage.setItem(MODE_KEY, mode); } catch {}
      // Visual + ARIA state on visible cards
      try {
        modeGrid.querySelectorAll('.mode-card').forEach((x) => {
          const on = x?.dataset?.mode === mode;
          x.classList.toggle('is-selected', !!on);
          x.classList.toggle('is-active', !!on);
          if (x.hasAttribute('aria-pressed')) x.setAttribute('aria-pressed', on ? 'true' : 'false');
          if (x.getAttribute('role') === 'tab') x.setAttribute('aria-selected', on ? 'true' : 'false');
        });
      } catch {}
      // Status mode label (action bar)
      try { const gMode = document.getElementById('status-mode'); if (gMode) gMode.textContent = modeLabel(mode); } catch {}
      saveSettings(settings);
      refreshGameControlButton(settings);
      dispatchInternalEvent('mode:changed', { mode });
    }
    // reflect saved
    try {
      const savedMode = (settings.game && settings.game.mode) ? settings.game.mode : null;
      if (savedMode) setSelectedMode(savedMode);
    } catch {}
    modeGrid.addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('.mode-card, .select-mode, .tab-btn') : null;
      if (!btn || !modeGrid.contains(btn)) return;
      const mode = (btn.dataset && btn.dataset.mode) ? btn.dataset.mode : btn.closest('.mode-card')?.dataset?.mode;
      if (mode) setSelectedMode(mode);
      // Tab active panel sync
      const panelId = btn.getAttribute('aria-controls') || btn.getAttribute('data-tab') || 'view-game';
      AppState.ui.activeTabId = panelId;
      dispatchInternalEvent('tab:changed', { tabId: panelId });
      showView(View.GAME);
      startBtn?.focus();
    });
    // Keyboard accessibility (Enter/Space) for non-button hosts
    modeGrid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target instanceof Element ? e.target.closest('.mode-card, .tab-btn') : null;
      if (!el) return;
      e.preventDefault();
      el.dispatchEvent(new Event('click', { bubbles: true }));
    });
  }

  // Active filters chips: removal + open drawer
  try {
    filtersBar?.addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('.chip') : null;
      if (!btn || !filtersBar.contains(btn)) return;
      e.preventDefault();
      const type = btn.dataset.type; const key = btn.dataset.key;
      if (type === 'set' && key) { settings.sets[key] = false; }
      else if (type === 'group' && key === 'specials') { settings.sets.small = false; settings.sets.sokuon = false; settings.sets.n = false; }
      else if (type === 'toggle' && key === 'hepburn') { settings.hepburnStrict = false; }
      else if (type === 'toggle' && key === 'advanced') { settings.advanced.enabled = false; }
      else if (type === 'open') { openFilters(); return; }
      saveSettings(settings);
      refreshFiltersChips(settings);
      refreshGameControlButton(settings);
      openFilters();
    });
  } catch {}

  // Drawer action buttons
  try {
    const applyBtn = document.getElementById('drawer-apply');
    const cancelBtn = document.getElementById('drawer-cancel');
    const resetBtn = document.getElementById('drawer-reset');
    applyBtn?.addEventListener('click', () => closeFilters());
    cancelBtn?.addEventListener('click', () => { try { const snap = filtersDrawer?.__snapshot; if (snap) localStorage.setItem(SETTINGS_KEY, snap); } catch (e) { console.error(e); } location.reload(); });
    resetBtn?.addEventListener('click', () => { if (!confirm('Â¿Restablecer configuraciÃ³n por defecto?')) return; try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS)); } catch (e) { console.error(e); } location.reload(); });
  } catch {}

  // Sticky start CTA (mobile)
  startCTA = (() => {
    const el = document.createElement('button');
    el.id = 'start-cta';
    el.className = 'start-cta is-hidden';
    el.type = 'button';
    el.textContent = 'Comenzar â–¶';
    el.setAttribute('aria-label','Comenzar partida');
    el.addEventListener('click', () => startBtn?.click());
    document.body.appendChild(el);
    return el;
  })();

  // Mount UI without starting
  function ensureClassicMounted() {
    const rootEl = document.getElementById('game-root'); if (!rootEl) return;
    if (!window.__classicMode) {
      try { window.__classicMode?.dispose?.(); } catch {}
      rootEl.innerHTML = '';
      window.__classicMode = new ClassicMode({ rootEl, engine, settingsStore });
      const gMode = document.getElementById('status-mode'); if (gMode) gMode.textContent = 'BÃ¡sico';
    }
  }

  // Menu wiring
  // Sidebar “Básico” → set mode + go to Game + refresh CTA
  document.getElementById('mode-classic')?.addEventListener('click', (e) => {
    e.preventDefault();
    settings.game = settings.game || {};
    settings.game.mode = 'classic';
    saveSettings(settings);
    ensureClassicMounted();
    showView(View.GAME);
    refreshGameControlButton(settings);
  });

  // Start button wiring (debounced)
  let lastStartTs = 0;
  function goStartOrRestart() {
    const now = Date.now(); if (now - lastStartTs < 300) return; lastStartTs = now;
    const disabled = startBtn?.hasAttribute('disabled') || startBtn?.getAttribute('aria-disabled') === 'true';
    if (disabled) return;
    ensureClassicMounted();
    const mode = window.__classicMode;
    if (!mode?.isStarted?.()) {
      mode.start();
      
      if (appLive) appLive.textContent = 'Partida iniciada. Escribe la romanización.';
      try { navigator.vibrate?.(20); } catch {}
      // Focus & scroll into view
      setTimeout(() => { try { mode.view?.focusInput?.(); document.getElementById('game-root')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {} }, 0);
    } else {
      // Confirm restart if progress
      let score = 0; try { score = Number(mode.engine?.getState?.().score || 0); } catch {}
      if (score > 0 && !confirm('Vas a perder el progreso actual. Â¿Reiniciar?')) return;
      try { mode.dispose(); } catch {}
      window.__classicMode = null;
      ensureClassicMounted();
      window.__classicMode?.start?.();
      
      if (appLive) appLive.textContent = 'Partida reiniciada.';
      setTimeout(() => { try { window.__classicMode?.view?.focusInput?.(); document.getElementById('game-root')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {} }, 0);
    }
  }
  startBtn?.addEventListener('click', (e) => {
    if (window.DEBUG === true) console.debug('[StartBtn] click');
    goStartOrRestart();
  });
  // Ensure Enter/Space on the focused button also starts
  startBtn?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (window.DEBUG === true) console.debug('[StartBtn] keydown', e.key);
      e.preventDefault(); // avoid duplicate native click on Space
      goStartOrRestart();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const inputFocused = active && (active.id === 'cl-answer' || (active instanceof HTMLInputElement && active.type === 'text'));
    if (inputFocused) return;
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (gameState === GameState.IDLE) return gameStart();
      if (gameState === GameState.RUNNING) return gamePause();
      if (gameState === GameState.PAUSED) return gameResume();
    }
    if (e.key?.toLowerCase() === 'r') {
      if (gameState === GameState.RUNNING || gameState === GameState.PAUSED) {
        e.preventDefault();
        return gameReset();
      }
    }
  });

  // Unified game control wrappers and overrides
  function gameStart() {
    ensureClassicMounted();
    const mode = window.__classicMode; if (!mode) return;
    mode.start();
    gameState = GameState.RUNNING;
    refreshGameControlButton(settings);
    if (appLive) appLive.textContent = 'Juego en pausa';
      if (appLive) appLive.textContent = 'Partida iniciada. Escribe la romanización.';
    try { navigator.vibrate?.(20); } catch {}
    setTimeout(() => { try { mode.view?.focusInput?.(); document.getElementById('game-root')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {} }, 0);
  }

  function gamePause() {
    const mode = window.__classicMode; if (!mode) return;
    mode.pause?.();
    gameState = GameState.PAUSED;
    refreshGameControlButton(settings);
    if (appLive) appLive.textContent = 'Reanudado';
  }

  function gameResume() {
    const mode = window.__classicMode; if (!mode) return;
    mode.resume?.();
    gameState = GameState.RUNNING;
    refreshGameControlButton(settings);
    if (appLive) appLive.textContent = 'Sesión terminada';
    setTimeout(() => { try { mode.view?.focusInput?.(); } catch {} }, 0);
  }

  function gameStop() {
    const mode = window.__classicMode; if (mode) mode.stop?.();
    gameState = GameState.IDLE;
    refreshGameControlButton(settings);
    if (appLive) appLive.textContent = 'Reiniciada';
  }

  function gameReset() {
    const mode = window.__classicMode; if (!mode) return;
    mode.restart?.();
    gameState = GameState.RUNNING;
    refreshGameControlButton(settings);
    setTimeout(() => { try { mode.view?.focusInput?.(); } catch {} }, 0);
  }

  function handlePrimaryAction() {
    const disabled = startBtn?.hasAttribute('disabled') || startBtn?.getAttribute('aria-disabled') === 'true';
    if (disabled) return;
    if (gameState === GameState.IDLE) return gameStart();
    if (gameState === GameState.RUNNING) return gamePause();
    if (gameState === GameState.PAUSED) return gameResume();
  }

  // Override old handler to reuse existing listeners
  try { /* eslint-disable no-func-assign */ goStartOrRestart = handlePrimaryAction; /* eslint-enable */ } catch {}

  // Add Shift+click and long-press (>=600ms) to Stop
  let __longPressTimer = 0;
  let __longPressTriggered = false;
  startBtn?.addEventListener('pointerdown', () => {
    clearTimeout(__longPressTimer); __longPressTriggered = false;
    __longPressTimer = setTimeout(() => { __longPressTriggered = true; gameStop(); }, 600);
  }, true);
  ['pointerup','pointerleave','pointercancel'].forEach((evt) => startBtn?.addEventListener(evt, () => { clearTimeout(__longPressTimer); }, true));
  startBtn?.addEventListener('click', (e) => {
    if (e.shiftKey || __longPressTriggered) { e.preventDefault(); e.stopImmediatePropagation(); __longPressTriggered = false; gameStop(); }
  }, true);

  // Global keys: Esc stops; R resets if a game exists
  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const inputFocused = active && (active.id === 'cl-answer' || (active instanceof HTMLInputElement && active.type === 'text'));
    if (inputFocused) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); gameStop(); }
    else if (e.key?.toLowerCase() === 'r' && (gameState === GameState.RUNNING || gameState === GameState.PAUSED)) { e.preventDefault(); e.stopImmediatePropagation(); gameReset(); }
  }, true);

  // First load: do not autostart. Only compute UI state.
  try { refreshFiltersChips(settings); refreshGameControlButton(settings); } catch {}

  // Debug helpers
  window.__dbg = { engine, settingsStore, ensureClassicMounted, refreshGameControlButton, getPool: () => getCurrentPoolRaw(settings) };
})();

