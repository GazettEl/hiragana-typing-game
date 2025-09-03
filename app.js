// ----- Drawer -----
const drawer   = document.getElementById('sideMenu');
const backdrop = document.getElementById('backdrop');
const toggle   = document.getElementById('menuToggle');
const closeBtn = document.getElementById('closeMenu');

function openDrawer(open) {
  drawer.classList.toggle('open', open);
  backdrop.classList.toggle('show', open);
  backdrop.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  if (open) drawer.querySelector('.modeBtn').focus();
  else toggle.focus();
}

toggle.addEventListener('click', () => openDrawer(!drawer.classList.contains('open')));
closeBtn.addEventListener('click', () => openDrawer(false));
backdrop.addEventListener('click', () => openDrawer(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape') openDrawer(false); });

// ----- Modo → configuración de campos -----
const modeLabel = document.getElementById('current-mode-label');

const MODE_LABELS = {
  clasic: 'Clásico',
  timeAttack: 'Time Attack',
  practice: 'Práctica',
  custom: 'Personalizado'
};

const MODE_CONFIG = {
  clasic:     { lives: true,  timePerChar: true,  totalTime: false, difficulty: true  },
  timeAttack: { lives: false, timePerChar: true,  totalTime: true,  difficulty: true  },
  practice:   { lives: false, timePerChar: true,  totalTime: false, difficulty: false },
  custom:     { lives: true,  timePerChar: true,  totalTime: true,  difficulty: true  }
};

const groups = {
  lives:        document.getElementById('group-lives'),
  timePerChar:  document.getElementById('group-timePerChar'),
  totalTime:    document.getElementById('group-totalTime'),
  difficulty:   document.getElementById('group-difficulty'),
  switches:     document.getElementById('group-switches')
};

function setVisible(el, show) {
  el.classList.toggle('hidden', !show);
  // si el campo está oculto, limpia errores/estado si aplica
}

function updateFormForMode(mode) {
  const cfg = MODE_CONFIG[mode];
  if (!cfg) return;
  setVisible(groups.lives,       cfg.lives);
  setVisible(groups.timePerChar, cfg.timePerChar);
  setVisible(groups.totalTime,   cfg.totalTime);
  setVisible(groups.difficulty,  cfg.difficulty);
  // switches los dejamos siempre visibles (ajusta si quieres)
  modeLabel.textContent = MODE_LABELS[mode] ?? 'Modo';
  // defaults recomendados por modo
  if (mode === 'clasic')        document.getElementById('lives').value = '3';
  if (mode === 'timeAttack')    document.getElementById('totalTime').value = 60;
  if (mode === 'practice')      document.getElementById('timePerChar').value = '7';
}

// Eventos para los botones del menú
document.querySelectorAll('.modeBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    updateFormForMode(mode);
    openDrawer(false);
  });
});

// Estado inicial
updateFormForMode('clasic');
