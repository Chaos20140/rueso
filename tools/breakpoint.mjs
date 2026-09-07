/**
 * Prüft die Layoutumschaltung rund um 900 px.
 *
 *   node tools/breakpoint.mjs [--port 65311]
 *
 * Das Design schaltet in JavaScript (`window.innerWidth < 900`), der Nachbau
 * per Media-Query. Beide Größen können sich um die Scrollbalkenbreite
 * unterscheiden — genau dort entstünde ein Band, in dem das Original Desktop
 * und der Nachbau Mobil zeigt. Dieses Skript fährt das Band ab und vergleicht,
 * welche Variante jeweils sichtbar ist.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean)
  .map(s => s.trim().split(/\s+/)).map(([k, v]) => [k, v ?? true]));
const PORT = args.port || process.env.PORT || '65311';
const BASE = `http://127.0.0.1:${PORT}`;

const WIDTHS = [860, 880, 895, 898, 899, 900, 901, 905, 910, 915, 920, 940, 1000];

const fontCss = fs.readFileSync(path.join(ROOT, 'assets/css/fonts.css'), 'utf8')
  .replace(/url\(\.\.\/fonts\//g, `url(${BASE}/assets/fonts/`);

/**
 * Ermittelt, welche Variante wirklich sichtbar ist — unabhängig davon, ob sie
 * per JS gar nicht gerendert oder per CSS ausgeblendet wurde.
 */
const state = () => {
  const vis = (el) => !!el && el.getBoundingClientRect().height > 0;
  // Ablauf-Sektion: Desktop hat data-stage, Mobil nicht
  const stage = [...document.querySelectorAll('section[id^="ablauf"]')];
  const desktopAblauf = stage.find(s => s.hasAttribute('data-stage'));
  const mobileAblauf = stage.find(s => !s.hasAttribute('data-stage'));
  // Nav: Desktop hat die Linkleiste, Mobil den Burger
  const burger = document.querySelector('nav button[aria-label="Menü"]');
  const navLinks = [...document.querySelectorAll('nav a')].filter(a => /^(Karriere|Careers)$/.test(a.textContent.trim()));
  // Referenzen-Pinning: motion.js deaktiviert es unter 900
  const track = document.querySelector('[data-pin-track]');
  return {
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    ablauf: vis(desktopAblauf) ? 'desktop' : vis(mobileAblauf) ? 'mobil' : 'keins',
    nav: navLinks.some(vis) ? 'desktop' : vis(burger) ? 'mobil' : 'keins',
    pinning: track ? getComputedStyle(track).position : 'n/a',
  };
};

async function run(browser, url, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
  await ctx.route('**/*.mp4', r => r.abort());
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: fontCss }));
  await ctx.route('https://fonts.gstatic.com/**', r => r.abort());
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const out = await p.evaluate(state);
  await ctx.close();
  return out;
}

const main = async () => {
  const browser = await chromium.launch();
  let fails = 0;
  console.log('Breite  | innerW/clientW      | Ablauf            | Navigation        | Pinning');
  console.log('--------|---------------------|-------------------|-------------------|------------------');
  for (const w of WIDTHS) {
    const a = await run(browser, `${BASE}/_design/RUESO-Start.dc.html`, w);
    const b = await run(browser, `${BASE}/index.html`, w);
    const ok = a.ablauf === b.ablauf && a.nav === b.nav && a.pinning === b.pinning;
    if (!ok) fails++;
    console.log(
      `${String(w).padEnd(7)} | ${(a.innerWidth + '/' + a.clientWidth).padEnd(9)} ${(b.innerWidth + '/' + b.clientWidth).padEnd(9)} `
      + `| ${(a.ablauf + ' / ' + b.ablauf).padEnd(17)} | ${(a.nav + ' / ' + b.nav).padEnd(17)} | ${a.pinning} / ${b.pinning}  ${ok ? '' : '  <<< ABWEICHUNG'}`);
  }
  await browser.close();
  console.log(fails ? `\n✗ ${fails} Breite(n) mit Abweichung` : '\n✓ Umschaltung überall identisch (ref / neu)');
  process.exitCode = fails ? 1 : 0;
};

main();
