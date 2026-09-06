# RÜSO GmbH — Website

Statische Website für die RÜSO GmbH (konstruktiver Metallbau, Salzkotten),
generiert aus einem Claude-Design-Projekt.

**Live:** https://chaos20140.github.io/rueso/

- 11 Seiten, zweisprachig (DE / EN)
- reines HTML/CSS/JS, kein Framework, kein Build-Server nötig
- Scroll-Motion: Sticky-Hero, Parallax, Wort-Reveal, horizontales Pinning
- Schriften selbst gehostet (kein Google-Fonts-Request beim Besucher)

## Entwicklung

```bash
npm install
npm run build     # _design/*.dc.html  →  fertige Seiten
npm run serve     # lokaler Server
```

`_design/` enthält die unveränderten Quelldateien aus dem Design-Projekt und
ist die Wahrheitsquelle. Änderungen gehören dorthin (bzw. ins Design-Tool),
danach `npm run build`.

## Qualitätssicherung

```bash
node tools/shots.mjs --page start --only 1440   # Pixelvergleich gegen das Original
node tools/interact.mjs                          # Verhaltensvergleich
```

Aktueller Stand: alle Seiten bei 1440 px und 375 px mit identischer Seitenhöhe
und 0 % Pixelabweichung gegenüber dem Design.
