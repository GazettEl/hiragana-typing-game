// Classic mode view: builds DOM and exposes a small UI API

export function mountClassicView(rootEl) {
  const container = document.createElement('div');
  container.className = 'classic';

  container.innerHTML = `
    <div class="classic__header">
      <div class="title">Clásico <span class="small">(10 s/char)</span></div>
      <div class="spacer"></div>
      <div class="scoreboard">
        <span>Puntaje: <strong id="cl-score">0</strong></span>
        <span>Combo: <strong id="cl-combo">0</strong></span>
      </div>
      <div id="cl-badge" class="chip" hidden>Filtros cambiados</div>
      <button type="button" id="cl-restart" class="secondary-button" hidden>Reiniciar</button>
    </div>

    <div class="classic__body">
      <div class="panel-left">
        <div id="cl-kana" class="kana-giant" aria-live="polite">—</div>
      </div>
      <div class="panel-right">
        <div id="cl-timer"></div>
      </div>
    </div>

    <form class="classic__input" id="cl-form" autocomplete="off">
      <input id="cl-answer" type="text" inputmode="latin" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="romaji" />
      <button type="submit" class="primary-button">Enviar</button>
      <button type="button" id="cl-skip" class="secondary-button">Saltar</button>
    </form>

    <div id="cl-feedback" class="classic__feedback" role="status" aria-live="polite"></div>
  `;

  rootEl.innerHTML = '';
  rootEl.appendChild(container);

  const refs = {
    container,
    kana: container.querySelector('#cl-kana'),
    timerMount: container.querySelector('#cl-timer'),
    form: container.querySelector('#cl-form'),
    input: container.querySelector('#cl-answer'),
    send: container.querySelector('#cl-form button[type="submit"]'),
    restart: container.querySelector('#cl-restart'),
    skip: container.querySelector('#cl-skip'),
    feedback: container.querySelector('#cl-feedback'),
    scScore: container.querySelector('#cl-score'),
    scCombo: container.querySelector('#cl-combo'),
    badge: container.querySelector('#cl-badge'),
  };

  const view = {
    el: refs,
    onSubmit: null,
    onRestart: null,
    onSkip: null,

    renderItem(kana) {
      refs.kana.textContent = kana || '—';
      this.showFeedback(null);
    },

    clearInput() { refs.input.value = ''; },
    focusInput() { setTimeout(() => refs.input?.focus(), 0); },
    getInputValue() { return refs.input.value; },
    setInputEnabled(enabled) { refs.input.disabled = !enabled; if (refs.send) refs.send.disabled = !enabled; },

    showFeedback(type, expected) {
      const el = refs.feedback;
      el.className = 'classic__feedback';
      if (!type) { el.textContent = ''; return; }
      if (type === 'correct') {
        el.classList.add('is-correct');
        el.textContent = '✔ Correcto';
      } else if (type === 'wrong') {
        el.classList.add('is-wrong');
        el.textContent = expected ? `✘ Correcta: ${expected}` : '✘ Incorrecto';
      }
    },

    updateScoreboard(state) {
      refs.scScore.textContent = String(state.score);
      refs.scCombo.textContent = String(state.combo);
      const gScore = document.getElementById('status-score');
      const gCombo = document.getElementById('status-combo');
      const gMode = document.getElementById('status-mode');
      if (gScore) gScore.textContent = String(state.score);
      if (gCombo) gCombo.textContent = String(state.combo);
      if (gMode) gMode.textContent = 'Clásico';
    },

    flagFiltersChanged(show) {
      if (!refs.badge) return;
      refs.badge.hidden = !show;
    },

    showEndSummary(state, reason) {
      this.setInputEnabled(false);
      this.showFeedback(null);
      refs.kana.textContent = 'Fin';
      const msg = document.createElement('div');
      msg.className = 'classic__summary';
      msg.textContent = `Sesión terminada (${reason}). Puntaje ${state.score}, aciertos ${state.correct}/${state.total}.`;
      refs.container.appendChild(msg);
    },

    clearSummary() { refs.container.querySelectorAll('.classic__summary').forEach((el) => el.remove()); },
    unmount() { rootEl.innerHTML = ''; },
    getTimerMountEl() { return refs.timerMount; }
  };

  // Wiring
  refs.form.addEventListener('submit', (e) => { e.preventDefault(); view.onSubmit && view.onSubmit(); });
  refs.restart.addEventListener('click', () => view.onRestart && view.onRestart());
  refs.skip.addEventListener('click', () => view.onSkip && view.onSkip());
  refs.input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { refs.input.value = ''; }
  });

  return view;
}

export default mountClassicView;
