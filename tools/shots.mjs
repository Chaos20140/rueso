/**
 * Vergleichs-Harness: schießt Original (Claude-Design) und Nachbau bei
 * identischen Scroll-Positionen und Viewports und diffed die Pixel.
 *
 *   node tools/shots.mjs [--port 65311] [--only 1440]
 *
 * Deterministik-Maßnahmen (beide Seiten identisch behandelt):
 *   - Hero-Video wird geblockt → beide zeigen das Poster
 *   - alle Web-Animations auf eine feste currentTime gesetzt
 *   - fester Wartepuffer für Fonts + Remote-Bilder
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).join(' ').split('--').filter(Boolean)
    .map(s => s.trim().split(/\s+/)).map(([k, v]) => [k, v ?? true]));

const PORT = args.port || process.env.PORT || '65311';
const BASE = `http://127.0.0.1:${PORT}`;
const OUTDIR = path.join(ROOT, '.shots');

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 768 },
  { name: '375', width: 375, height: 812 },
];

// Scroll-Positionen als Anteil der Gesamthöhe
const STOPS = [0, 0.08, 0.16, 0.26, 0.36, 0.46, 0.56, 0.66, 0.76, 0.86, 0.94, 1];

/** Design-Datei → gebaute Seite. */
const PAGES = {
  start: ['RUESO-Start.dc.html', 'index.html'],
  fassaden: ['RUESO-Fassaden.dc.html', 'fassaden.html'],
  fenster: ['RUESO-Fenster.dc.html', 'fenster.html'],
  objekttueren: ['RUESO-Objekttueren.dc.html', 'objekttueren.html'],
  brandschutz: ['RUESO-Brandschutz.dc.html', 'brandschutz.html'],
  schiebetueren: ['RUESO-Schiebetueren.dc.html', 'schiebetueren.html'],
  schiebewaende: ['RUESO-Schiebewaende.dc.html', 'schiebewaende.html'],
  referenzen: ['RUESO-Referenzen.dc.html', 'referenzen.html'],
  unternehmen: ['RUESO-Unternehmen.dc.html', 'unternehmen.html'],
  karriere: ['RUESO-Karriere.dc.html', 'karriere.html'],
  kontakt: ['RUESO-Kontakt.dc.html', 'kontakt.html'],
};

const PAGE = args.page || 'start';
const [DESIGN_FILE, BUILT_FILE] = PAGES[PAGE] || PAGES.start;
const TARGETS = {
  ref: `${BASE}/_design/${DESIGN_FILE}`,
  new: `${BASE}/${BUILT_FILE}`,
};

async function capture(browser, label, url, vp) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
    isMobile: false,
  });
  // Video blocken → deterministisches Poster auf beiden Seiten
  await ctx.route('**/*.mp4', r => r.abort());

  // Beide Seiten auf dieselben lokal gehosteten Schriften zwingen.
  // Grund: das Original lädt Figtree von Google nach; solange das läuft,
  // löst `max-width:16ch` gegen die Fallback-Metrik auf (418px statt 484px)
  // und die Überschriften springen um eine Zeile. Ohne diese Angleichung
  // vergleicht man das Race, nicht das Layout.
  const fontCss = fs.readFileSync(path.join(ROOT, 'assets', 'css', 'fonts.css'), 'utf8')
    .replace(/url\(\.\.\/fonts\//g, `url(${BASE}/assets/fonts/`);
  await ctx.route('https://fonts.googleapis.com/**', r =>
    r.fulfill({ status: 200, contentType: 'text/css', body: fontCss }));
  await ctx.route('https://fonts.gstatic.com/**', r => r.abort());

  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);
  // Lazy-Bilder + Motion-Scan anstoßen
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 900));
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 600));
  });
  await page.waitForTimeout(2500);

  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const shots = [];
  for (const [i, f] of STOPS.entries()) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round((height - vp.height) * f));
    await page.waitForTimeout(700);
    // motion.js aktualisiert Parallax in einem rAF, das ein Scroll-Event
    // anstößt. Läuft dieses rAF zufällig VOR dem Sprung, bleibt der alte
    // transform-Wert stehen und es folgt kein weiteres Event mehr. Zwei echte
    // Scroll-Schritte auf die Endposition erzwingen einen finalen Tick dort —
    // sonst vergleicht man Timing-Zufall statt Layout.
    const y = Math.round((height - vp.height) * f);
    await page.evaluate((yy) => window.scrollTo(0, yy + 2), y);
    await page.waitForTimeout(250);
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(450);
    // alle Animationen auf feste Zeit → identische Frames
    await page.evaluate(() => {
      document.getAnimations().forEach(a => { try { a.currentTime = 60000; a.pause(); } catch (e) {} });
    });
    await page.waitForTimeout(150);
    const file = path.join(OUTDIR, PAGE, `${vp.name}`, `${label}-${String(i).padStart(2, '0')}.png`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file });
    shots.push(file);
  }
  await ctx.close();
  return { height, shots, errors };
}

/* --- Pixel-Diff ohne externe Abhängigkeit (PNG via Playwright-Vergleich) --- */
async function diff(browser, a, b) {
  const page = await browser.newPage();
  const toB64 = (f) => fs.readFileSync(f).toString('base64');
  const res = await page.evaluate(async ([A, B]) => {
    const load = (b64) => new Promise((res2, rej) => {
      const img = new Image();
      img.onload = () => res2(img); img.onerror = rej;
      img.src = 'data:image/png;base64,' + b64;
    });
    const [ia, ib] = await Promise.all([load(A), load(B)]);
    if (ia.width !== ib.width || ia.height !== ib.height) {
      return { size: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}`, pct: 100 };
    }
    const c = (img) => {
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      cv.getContext('2d').drawImage(img, 0, 0);
      return cv.getContext('2d').getImageData(0, 0, img.width, img.height).data;
    };
    const da = c(ia), db = c(ib);
    let bad = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
      if (d > 24) bad++;                      // Toleranz gegen Font-Antialiasing
    }
    return { pct: +(100 * bad / (da.length / 4)).toFixed(2) };
  }, [toB64(a), toB64(b)]);
  await page.close();
  return res;
}

const main = async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const browser = await chromium.launch();
  const report = [];

  for (const vp of VIEWPORTS) {
    if (args.only && args.only !== vp.name) continue;
    const ref = await capture(browser, 'ref', TARGETS.ref, vp);
    const neu = await capture(browser, 'new', TARGETS.new, vp);
    const rows = [];
    for (let i = 0; i < ref.shots.length; i++) {
      rows.push({ stop: STOPS[i], ...(await diff(browser, ref.shots[i], neu.shots[i])) });
    }
    report.push({ vp: vp.name, refHeight: ref.height, newHeight: neu.height, rows, errors: neu.errors, refErrors: ref.errors });
  }

  await browser.close();
  fs.writeFileSync(path.join(OUTDIR, PAGE + '-report.json'), JSON.stringify(report, null, 2));

  for (const r of report) {
    const dh = r.newHeight - r.refHeight;
    console.log(`\n── ${PAGE} @ ${r.vp}px  Höhe ref=${r.refHeight} neu=${r.newHeight} (Δ ${dh > 0 ? '+' : ''}${dh}px)`);
    console.log('   ' + r.rows.map(x => `${(x.stop * 100).toFixed(0)}%:${x.size ? x.size : x.pct + '%'}`).join('  '));
    const worst = Math.max(...r.rows.map(x => x.pct));
    console.log(`   max Abweichung: ${worst}%`);
    if (r.errors.length) console.log('   JS-Fehler (neu): ' + [...new Set(r.errors)].slice(0, 5).join(' | '));
    if (r.refErrors.length) console.log('   JS-Fehler (ref): ' + [...new Set(r.refErrors)].slice(0, 3).join(' | '));
  }
};

main();
