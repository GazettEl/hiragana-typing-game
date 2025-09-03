// Minimal UI router and theme handling
(function(){
  const app = document.querySelector('.app');
  const mainView = document.getElementById('mainView');
  const viewTitle = document.getElementById('viewTitle');
  const btnSidebar = document.getElementById('btnSidebar');
  const themeToggle = document.getElementById('themeToggle');
  const modeTitles = {
    classic: 'Clásico',
    timeattack: 'Time Attack',
    practice: 'Práctica',
    custom: 'Personalizado'
  };
  const templates = {
    classic: `
      <div class="container">
        <!-- Start Screen -->
        <section id="screen-start" class="screen">
          <header class="hero">
            <h1>Hiragana Rush</h1>
            <p class="tagline">aprende + compite</p>
          </header>

          <div class="card settings">
            <div class="row">
              <label for="mode">Modo</label>
              <select id="mode">
                <option value="survival">Supervivencia (3 vidas)</option>
                <option value="time">Contrarreloj</option>
              </select>
              <small class="hint">Elige entre vidas limitadas o tiempo total.</small>
            </div>

            <div class="row">
              <label for="difficulty">Dificultad</label>
              <select id="difficulty">
                <option value="easy">Fácil (gojūon básico)</option>
                <option value="medium">Medio (+ dakuten / handakuten)</option>
                <option value="hard">Difícil (+ yōon きゃ, しゃ, ちゃ...)</option>
              </select>
              <small class="hint">Añade más kana para subir el reto.</small>
            </div>

            <div class="row">
              <label for="timePerChar">Tiempo por carácter</label>
              <select id="timePerChar">
                <option value="6">6 s</option>
                <option value="8">8 s</option>
                <option value="10" selected>10 s</option>
                <option value="12">12 s</option>
              </select>
              <small class="hint">Tiempo límite para cada kana.</small>
            </div>

            <div class="row" id="timeAttackRow" hidden>
              <label for="timeAttackTotal">Tiempo total (s)</label>
              <input id="timeAttackTotal" type="number" min="10" max="300" step="10" value="60" />
              <small class="hint">Disponible en Contrarreloj.</small>
            </div>

            <div class="row inline">
              <label class="switch">
                <input type="checkbox" id="permissive" checked />
                <span class="slider"></span>
              </label>
              <span>Permisivo (shi/si, chi/ti...)</span>
            </div>
            <div class="row inline">
              <label class="switch">
                <input type="checkbox" id="soundEnabled" checked />
                <span class="slider"></span>
              </label>
              <span>Sonidos</span>
            </div>
            <div class="row inline">
              <label class="switch">
                <input type="checkbox" id="showQueue" />
                <span class="slider"></span>
              </label>
              <span>Mostrar cola</span>
            </div>
          </div>

          <button id="btn-start" class="primary start-fixed">Comenzar</button>
        </section>

        <!-- Game Screen -->
        <section id="screen-game" class="screen hidden">
          <header class="hud">
            <div class="stat"><span class="label">Puntos</span><span id="score">0</span></div>
            <div class="stat"><span class="label">Combo</span><span id="combo">0</span></div>
            <div class="stat"><span class="label" id="livesLabel">Vidas</span><span id="lives">3</span></div>
            <div class="stat" id="timeBox" hidden><span class="label">Tiempo</span><span id="timeLeft">60</span>s</div>
          </header>

          <div class="timer">
            <div id="timerFill"></div>
          </div>

          <div id="nextQueue" class="queue" hidden></div>

          <div class="play">
            <div id="kana" class="kana">あ</div>
            <p id="inputHint" class="sr-only">Escribe la romanización y presiona Enter para validar.</p>
            <input id="answer" class="answer" type="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" inputmode="latin" placeholder="romanización..." aria-describedby="inputHint" />
            <div id="toast" class="toast" role="status" aria-live="polite"></div>
          </div>

          <footer class="controls">
            <button id="btn-quit" class="ghost">Salir</button>
          </footer>

          <div id="pauseOverlay" class="overlay hidden" role="dialog" aria-modal="true">
            <div class="modal">
              <p>Pausa</p>
              <small>Presiona Esc para continuar</small>
            </div>
          </div>
        </section>

        <!-- Result Screen -->
        <section id="screen-result" class="screen hidden">
          <h2>Resultado</h2>
          <div class="card results">
            <div><span class="label">Puntos</span><span id="rScore">0</span></div>
            <div><span class="label">Aciertos</span><span id="rHits">0</span></div>
            <div><span class="label">Fallos</span><span id="rMiss">0</span></div>
            <div><span class="label">Precisión</span><span id="rAcc">0%</span></div>
            <div><span class="label">Combo máximo</span><span id="rCombo">0</span></div>
            <div><span class="label">Tiempo jugado</span><span id="rTime">0s</span></div>
          </div>

          <h3>Top 5 (local)</h3>
          <ol id="highscores" class="hiscore"></ol>

          <div class="actions">
            <button id="btn-retry" class="primary">Reintentar</button>
            <button id="btn-home" class="ghost">Inicio</button>
          </div>
        </section>
      </div>
      <div id="onboard" class="overlay hidden" role="dialog" aria-modal="true">
        <div class="modal">
          <div id="onboardStep1" class="onboard-step">
            <p>Escribe la romanización usando letras latinas. Ej: し → shi</p>
            <button id="onboardNext" class="primary">Siguiente</button>
          </div>
          <div id="onboardStep2" class="onboard-step hidden">
            <p>Cada carácter tiene un límite de tiempo. En Supervivencia tienes 3 vidas.</p>
            <label class="row inline"><input type="checkbox" id="onboardSkip" /> No volver a mostrar</label>
            <button id="onboardDone" class="primary">Listo</button>
          </div>
        </div>
      </div>
    `,
    timeattack: `<div class="placeholder"><p>Modo Time Attack próximamente.</p></div>`,
    practice: `<div class="placeholder"><p>Modo Práctica próximamente.</p></div>`,
    custom: `<form id="customForm" class="card settings">
      <fieldset>
        <legend>Conjuntos</legend>
        <label><input type="checkbox" value="a" /> a,i,u,e,o</label>
        <label><input type="checkbox" value="k" /> k-</label>
        <label><input type="checkbox" value="s" /> s-</label>
        <label><input type="checkbox" value="t" /> t-</label>
        <label><input type="checkbox" value="n" /> n-</label>
        <label><input type="checkbox" value="h" /> h-</label>
        <label><input type="checkbox" value="m" /> m-</label>
        <label><input type="checkbox" value="y" /> y-</label>
        <label><input type="checkbox" value="r" /> r-</label>
        <label><input type="checkbox" value="w" /> w-</label>
        <label><input type="checkbox" value="nn" /> ん</label>
      </fieldset>
      <div class="row">
        <label for="customTime">Tiempo por carácter</label>
        <input id="customTime" type="range" min="2" max="12" value="10" />
      </div>
      <div class="row inline">
        <label class="switch">
          <input type="checkbox" id="customPermissive" />
          <span class="slider"></span>
        </label>
        <span>Permisivo</span>
      </div>
      <button id="saveCustom" class="primary">Guardar configuración</button>
    </form>`
  };

  const views = {};

  function applyTheme(pref){
    if(pref === 'light'){
      document.documentElement.setAttribute('data-theme','light');
      themeToggle.checked = false;
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeToggle.checked = true;
    }
    try { localStorage.setItem('theme', pref); } catch {}
  }

  function setAria(mode){
    document.querySelectorAll('.menu-item').forEach(btn => {
      if(btn.dataset.mode === mode) btn.setAttribute('aria-current','page');
      else btn.removeAttribute('aria-current');
    });
  }

  function renderView(mode){
    if(!views[mode]){
      const wrap = document.createElement('div');
      wrap.dataset.view = mode;
      wrap.innerHTML = templates[mode] || '';
      wrap.hidden = true;
      views[mode] = wrap;
      mainView.appendChild(wrap);
      if(mode === 'classic' && window.game && typeof window.game.init === 'function'){
        window.game.init();
      }
    }
    Object.values(views).forEach(v => v.hidden = true);
    views[mode].hidden = false;
    viewTitle.textContent = modeTitles[mode] || '';
    mainView.focus();
    setAria(mode);
    if(window.game && typeof window.game.setGameMode === 'function'){
      window.game.setGameMode(mode);
    }
  }

  function getModeFromHash(){
    const m = location.hash.match(/#\/mode\/(classic|timeattack|practice|custom)/);
    return m ? m[1] : null;
  }

  function handleRoute(){
    const mode = getModeFromHash() || localStorage.getItem('mode') || 'classic';
    renderView(mode);
    try { localStorage.setItem('mode', mode); } catch {}
  }

  function bindSidebar(){
    document.querySelector('.menu').addEventListener('click', e => {
      const btn = e.target.closest('.menu-item');
      if(btn){
        location.hash = `#/mode/${btn.dataset.mode}`;
      }
    });
  }

  function toggleSidebar(){
    const open = app.classList.toggle('sidebar-open');
    btnSidebar.setAttribute('aria-expanded', open);
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindSidebar();
    btnSidebar.addEventListener('click', toggleSidebar);
    themeToggle.addEventListener('change', () => applyTheme(themeToggle.checked ? 'dark' : 'light'));
    applyTheme(localStorage.getItem('theme') || 'dark');
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  });
})();
