# Hiragana Rush — Typing Trainer

Juego web para practicar Hiragana. 100% estático (HTML/CSS/JS), compatible con GitHub Pages.

## Estructura
```
index.html
styles.css
main.js
data/hiragana.json
```

## Cómo correr local
Opción 1 (Python 3):
```bash
python -m http.server 8000
# visita http://localhost:8000
```

## Publicar en GitHub Pages
1. Sube estos archivos a tu repo (rama `main`).
2. En **Settings → Pages**, elige **Source: Deploy from a branch**, Branch: `main`, Folder: `/root` (o `/docs` si los pones ahí).
3. Espera a que GitHub genere la página y visita la URL.

## Mecánicas
- Modo **Supervivencia** (3 vidas) y **Contrarreloj** (60s).
- **Tiempo por carácter** configurable (6/8/10/12s).
- **Permisivo** (acepta equivalencias como `shi/si`, `chi/ti`, `tsu/tu`, etc.).
- Dificultad **Fácil/Medio/Difícil**: controlan el pool (gojūon básico → +dakuten → +yōon).
- Puntaje con multiplicador por combo (1 extra cada 10 aciertos seguidos).
- Récords locales con `localStorage` (Top 5 por modo/dificultad/tiempo).

## Notas
- Usa **rutas relativas** (`./data/hiragana.json`), por lo que funciona también cuando tu sitio está en `/usuario/repositorio/`.
- Si abres el `index.html` directamente con doble click (file://), el `fetch` de `hiragana.json` puede fallar. Sirve los archivos con un server local o súbelos a GitHub Pages.


## PWA (offline)
- Incluye `manifest.webmanifest` e `icons`.
- `service-worker.js` cachea los archivos para jugar offline (cache-first para assets).
- Al actualizar, cambia `CACHE_NAME` en `service-worker.js` para forzar la recarga del caché.

## Sonidos y tema
- Sonidos (WebAudio) con toggle en la pantalla inicial.
- Tema: **Auto/Oscuro/Claro**; se guarda en `localStorage` y usa `prefers-color-scheme` en modo Auto.
