/**
 * Erzeugt die Rastervarianten des Tab-Symbols aus assets/img/favicon.svg.
 *
 *   node tools/favicon.mjs
 *
 * Einmal-Werkzeug wie fonts.mjs und map.mjs: die PNGs liegen danach im Repo.
 *
 *   favicon-32.png        Browser ohne SVG-Favicon (u. a. ältere Safari)
 *   apple-touch-icon.png  180 × 180, iOS-Startbildschirm. iOS ignoriert SVG
 *                         und füllt Transparenz schwarz — deshalb mit dem
 *                         Seitenhintergrund #F3F0EA und etwas Rand.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG = path.join(ROOT, 'assets', 'img');
const svg = fs.readFileSync(path.join(IMG, 'favicon.svg'), 'utf8');

const VARIANTEN = [
  { datei: 'favicon-32.png', groesse: 32, rand: 0, grund: null },
  { datei: 'apple-touch-icon.png', groesse: 180, rand: 30, grund: '#F3F0EA' },
];

const b = await chromium.launch();
for (const v of VARIANTEN) {
  const p = await b.newPage({ viewport: { width: v.groesse, height: v.groesse }, deviceScaleFactor: 1 });
  const innen = v.groesse - 2 * v.rand;
  await p.setContent(`<!doctype html><html><body style="margin:0;background:${v.grund || 'transparent'}">
    <div style="width:${v.groesse}px;height:${v.groesse}px;display:grid;place-items:center">
      <div style="width:${innen}px;height:${innen}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
    </div></body></html>`);
  await p.screenshot({ path: path.join(IMG, v.datei), omitBackground: !v.grund });
  console.log(`✓ assets/img/${v.datei}  ${v.groesse}×${v.groesse}`);
  await p.close();
}
await b.close();
