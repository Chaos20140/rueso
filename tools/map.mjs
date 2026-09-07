/**
 * Erzeugt einmalig eine statische Karte des Firmensitzes als lokales Bild.
 *
 *   node tools/map.mjs
 *
 * Warum selbst erzeugt statt eingebettet?
 *   - Ein Google-Maps-iframe lädt beim Besucher Google-Skripte und setzt
 *     Cookies — beim deutschen Firmenauftritt ein DSGVO-Thema, und die CSP
 *     der Seite verbietet Frames ohnehin (`frame-src 'none'`).
 *   - Eine Kartenbibliothek mit Live-Kacheln bedeutet Fremdanfragen bei jedem
 *     Seitenaufruf. Für eine Adresse, die sich nicht ändert, unnötig.
 *   - Ein fertiges Bild aus dem eigenen Verzeichnis lädt sofort, funktioniert
 *     offline und verrät nichts über den Besucher.
 *
 * Die Kacheln kommen einmalig von OpenStreetMap. Die Namensnennung
 * („© OpenStreetMap-Mitwirkende") wird ins Bild gezeichnet — sie ist bei der
 * ODbL Pflicht und darf nicht wegfallen.
 *
 * Das Zusammensetzen läuft im Browser-Canvas (Playwright ist ohnehin da),
 * damit keine weitere Abhängigkeit nötig ist.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'img', 'karte-salzkotten.png');

// RÜSO GmbH, Berglar 36a, 33154 Salzkotten
const LAT = 51.6754329;
const LON = 8.5863755;
const ZOOM = 17;   // enger gefasst: bei 16 waren Straßennamen im 467-px-Kasten kaum lesbar
const BREITE = 1400;
const HOEHE = 700;          // 2:1, passend zum aspect-ratio:16/8 des Kastens

const TILE = 256;
const n = 2 ** ZOOM;
const xMitte = ((LON + 180) / 360) * n;
const latRad = (LAT * Math.PI) / 180;
const yMitte = ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n;

// Kachelbereich bestimmen, der die Ausgabefläche sicher abdeckt
const x0 = Math.floor(xMitte - BREITE / 2 / TILE);
const x1 = Math.floor(xMitte + BREITE / 2 / TILE);
const y0 = Math.floor(yMitte - HOEHE / 2 / TILE);
const y1 = Math.floor(yMitte + HOEHE / 2 / TILE);

const kacheln = [];
for (let x = x0; x <= x1; x++) {
  for (let y = y0; y <= y1; y++) {
    kacheln.push({ x, y, url: `https://tile.openstreetmap.org/${ZOOM}/${x}/${y}.png` });
  }
}

const main = async () => {
  console.log(`${kacheln.length} Kacheln, Zoom ${ZOOM} → ${BREITE}×${HOEHE}px`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    // OSM verlangt einen aussagekräftigen User-Agent, damit der Abruf
    // zuordenbar ist. Einmaliger Abruf für ein statisches Bild.
    userAgent: 'RUESO-Website-Buildtool/1.0 (einmalige statische Karte; kontakt: info@rueso.de)',
  });
  const page = await ctx.newPage();
  await page.goto('about:blank');

  const dataUrl = await page.evaluate(async ({ kacheln, x0, y0, xMitte, yMitte, BREITE, HOEHE, TILE }) => {
    const cv = document.createElement('canvas');
    cv.width = BREITE; cv.height = HOEHE;
    const g = cv.getContext('2d');
    g.fillStyle = '#E2DCD0';
    g.fillRect(0, 0, BREITE, HOEHE);

    // Linke obere Ecke der Ausgabefläche in Kachel-Pixeln
    const links = xMitte * TILE - BREITE / 2;
    const oben = yMitte * TILE - HOEHE / 2;

    const laden = (url) => new Promise((res) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = url;
    });

    // Beim Zeichnen entsättigen und warm einfärben: die bunten OSM-Flächen
    // (Gewerbegebiete magenta, Wiesen grün) würden sonst mit dem ruhigen
    // Sandton der Seite kollidieren und vom Standort-Marker ablenken.
    g.filter = 'grayscale(1) sepia(0.38) saturate(0.7) brightness(0.99) contrast(1.14)';
    for (const k of kacheln) {
      const img = await laden(k.url);
      if (!img) continue;
      g.drawImage(img, Math.round(k.x * TILE - links), Math.round(k.y * TILE - oben));
    }
    g.filter = 'none';

    // Eine Spur des Seitentons darüber, damit die Karte im Kasten sitzt
    // statt herauszustechen.
    g.fillStyle = 'rgba(232,227,217,.10)';
    g.fillRect(0, 0, BREITE, HOEHE);

    // Namensnennung — Pflicht bei OpenStreetMap
    const text = '© OpenStreetMap-Mitwirkende';
    g.font = '500 18px system-ui, sans-serif';
    const b = g.measureText(text).width;
    g.fillStyle = 'rgba(250,248,244,.82)';
    g.fillRect(BREITE - b - 26, HOEHE - 34, b + 20, 26);
    g.fillStyle = '#3B3F46';
    g.fillText(text, BREITE - b - 16, HOEHE - 15);

    return cv.toDataURL('image/png');
  }, { kacheln, x0, y0, xMitte, yMitte, BREITE, HOEHE, TILE });

  await browser.close();

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(OUT, buf);
  console.log(`✓ ${path.relative(ROOT, OUT)}  ${(buf.length / 1024).toFixed(0)} kB`);
};

main();
