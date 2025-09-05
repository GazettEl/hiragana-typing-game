JP Practice — Hiragana Typing (UI Refresh)

Overview
- The main area has been restructured for clarity and accessibility without changing the game logic.
- New components: mode tabs (segmented control), active filter chips, right-side filters drawer, and a bottom ActionBar with a single primary CTA.

Key Mount Points
- main app: `main#app-main` contains, in order: mode tabs (`#mode-tabs`), active filters chips (`#active-filters`) and warnings (`#pool-warning`), the content views (`#view-home` and `#view-game`), and the bottom ActionBar.
- game content: `#game-root` is unchanged; modes mount here as before.
- primary CTA: `#primary-cta` is the unified game control button. For compatibility, JS resolves `#startBtn` OR `#primary-cta` (alias added in `js/main.js`).
- status chips: `#status-score` and `#status-combo` now live inside ActionBar chips (`#score-chip`, `#combo-chip`). The legacy `#status-mode` is kept as an sr-only element for compatibility and not shown in the UI.

Mode Selector
- Replaced the old mode cards grid with accessible tabs at the top (`#mode-tabs` + `#modeGrid`).
- Tabs use `role="tab"` and set `aria-selected`. Existing code also tolerates `aria-pressed` for legacy buttons.
- Selecting a mode sets `settings.game.mode` and keeps state in `localStorage`.

Filters Drawer
- Button: `#open-filters` (alongside the tabs) opens the right drawer `#filters-drawer`.
- Drawer is a `role="dialog"` with `aria-modal="true"` and focus trap. Close via `#close-filters`, overlay click (`#filters-overlay`) or `Esc`.
- The full `#settings-form` moved into the drawer. IDs remain unchanged so existing bindings keep working. The sidebar now shows a small note instead.

ActionBar
- Fixed to the bottom of the main area. Center: `#primary-cta` (labels change as the FSM moves: Empezar → Pausar/Reanudar → Terminar → Reiniciar). Right: score/combo chips.
- Minimum width ≈280px on desktop and full-width on mobile.

A11y
- Tabs: `role="tablist"`, tabs `role="tab"`, `aria-selected`, `aria-controls` (points to `#view-game`).
- Drawer: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="filters-title"`; focus trap; `Esc` closes.
- Primary CTA has `aria-live="polite"` to announce label changes.
- Feedback regions are preserved (`aria-live="polite"`).

Notes for Extending
- Add a new mode tab by appending a button inside `#modeGrid` with `data-mode="your-mode"`. The existing click delegation in `js/main.js` will save it to state. Wire the actual mode under `js/modes/` as today.
- Add new filters inside `#settings-form` in the drawer. Keep unique IDs and hook into `bindSettingsUI()` in `js/main.js` if needed.

Dev Comments
- // TODO comments were added in `js/main.js` near the alias for `#primary-cta` and the new drawer bindings so the team can quickly spot the changes.


UI Map (Post-removal)
- Main layout: `#mode-tabs` → `#pool-warning` → content views (`#view-home` | `#view-game` mounting into `#game-root`) → bottom ActionBar.
- Settings drawer: open via top-right gear `#open-filters`; `#filters-drawer` with focus trap (`Esc` closes), overlay, and persistence in localStorage.
- Status display: only chips on the ActionBar right (`#status-score`, `#status-combo`). No statusbar in the main; no active filter chips in the main.
- Announcements: `#app-live` inside `main#app-main` announces start/pause/resume/stop.
