# RÜSO GmbH — Website

Statische Website für die RÜSO GmbH (konstruktiver Metallbau, Salzkotten),
kompiliert aus einem Claude-Design-Projekt.

**Live:** <https://chaos20140.github.io/rueso/>

- 11 Seiten, zweisprachig (DE / EN) — 22 HTML-Dateien plus eigene 404-Seite
- reines HTML/CSS/JS, kein Framework, kein Build-Server im Betrieb
- Scroll-Motion aus dem Design: Sticky-Hero, Parallax, Wort-Reveal,
  horizontales Pinning, Cursor-Vorschau
- Schriften selbst gehostet — kein Google-Request beim Besucher
- Content-Security-Policy, `noindex` (Vorschau neben der produktiven
  www.rueso.de), sitemap.xml, hreflang DE/EN

## Entwicklung

```bash
npm install
npm run build     # _design/*.dc.html  →  fertige Seiten
npm run serve     # lokaler Server
```

`_design/` enthält die **unveränderten** Quelldateien aus dem Design-Projekt
und ist die Wahrheitsquelle. Änderungen gehören dorthin (bzw. ins Design-Tool),
danach `npm run build`. Der Build meldet unbekannte Ausdrücke, neue Seiten und
unbekannte Event-Handler als Warnung mit Exit-Code ≠ 0.

## Qualitätssicherung

```bash
npm run check     # build + lint + geom + states + interact + a11y
```

Einzeln:

| Befehl | Prüft |
|---|---|
| `node tools/lint.mjs` | ids, Tag-Balance, Metadaten, alt, Labels, tote Links, Assets |
| `node tools/geom.mjs` | Box-Geometrie gegen das Original, 11 Seiten × 3 Breiten |
| `node tools/states.mjs` | Zustände nach Interaktion (Menü, FAQ, Filter, Dialoge, Chips) |
| `node tools/shots.mjs` | Pixelvergleich an 12 Scroll-Positionen |
| `node tools/interact.mjs` | Verhalten Original vs. Nachbau |
| `node tools/a11y.mjs` | Fokusführung, ARIA, Kontrast |
| `node tools/breakpoint.mjs` | Layoutumschaltung rund um 900 px |

**Stand:** 33 Seite/Breite-Kombinationen geometrisch identisch (max Δ 0,7 px),
Startseite bei 1440 px mit 0 % Pixelabweichung, alle geprüften
Interaktionszustände identisch.

Details zur Mechanik und zu den Fallstricken: `CLAUDE.md`.
