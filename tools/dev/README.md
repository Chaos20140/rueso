# tools/dev — Diagnose-Werkzeuge

Kein Teil der Auslieferung. Kleine Skripte, um einer gemeldeten Abweichung
auf den Grund zu gehen, wenn `tools/geom.mjs` oder `tools/shots.mjs`
etwas anzeigen.

| Skript | Zweck |
|---|---|
| `probe2.mjs` | Geometrie einzelner Elemente Original vs. Nachbau, per CSS-Selektor. `node tools/dev/probe2.mjs <breite> "<selektor>"` |
| `diffimg.mjs` | Diff-Bild für ein Screenshot-Paar aus `.shots/`, mit Bounding-Box der abweichenden Pixel. `node tools/dev/diffimg.mjs <seite>/<breite> <index>` |
| `crop.mjs` | Ausschnitt aus einem Screenshot vergrößern, um sich Pixel anzusehen. `node tools/dev/crop.mjs <datei> <x> <y> <w> <h> <faktor>` |
| `csp.mjs` | Prüft, ob die Meta-CSP etwas blockiert (Bilder, Schriften, Video, Motion). |
| `live.mjs` | Prüft das Live-Deployment: Assets, Höhe, Schriften, JS- und Netzwerkfehler. |
| `preview.mjs` | Belegbilder der Live-Seite (Desktop + Mobil, mehrere Abschnitte). |

Typischer Ablauf bei einer gemeldeten Abweichung:
1. `tools/geom.mjs --page <seite>` — ist es überhaupt das Layout?
2. Wenn ja: `probe2.mjs` auf den betroffenen Selektor.
3. Wenn nein (Geometrie identisch, Pixel unterschiedlich):
   `diffimg.mjs` + `crop.mjs` — meist Animationsphase oder Textshaping.
