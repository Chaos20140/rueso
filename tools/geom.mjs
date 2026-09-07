/**
 * Geometrie-Vergleich Original vs. Nachbau — timing-unabhängig.
 *
 *   node tools/geom.mjs [--page referenzen] [--width 375]
 *
 * Der Pixelvergleich (tools/shots.mjs) kann bei Seiten mit vielen
 * Parallax-Bildern durch ein rAF-Race in motion.js rauschen. Diese Prüfung
 * vergleicht stattdessen die Boxen selbst:
 *   - jedes Element mit eigenem Text  → Position und Größe
 *   - jedes Bild                      → Position und Größe seines RAHMENS
 *     (nicht des Bildes, dessen transform die Parallax laufend verändert)
 * Damit fällt jede echte Layoutabweichung auf, Animationsphasen aber nicht.
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

const fontCss = fs.readFileSync(path.join(ROOT, 'assets/css/fonts.css'), 'utf8')
  .replace(/url\(\.\.\/fonts\//g, `url(${BASE}/assets/fonts/`);

const COLLECT = () => {
  const round = (n) => Math.round(n * 10) / 10;
  const items = new Map();
  const add = (key, rect) => {
    const k = key.slice(0, 90);
    const v = `${round(rect.left)},${round(rect.top + window.scrollY)},${round(rect.width)},${round(rect.height)}`;
    items.set(k + ' ⟨' + (items.has(k) ? [...items.keys()].filter(x => x.startsWith(k)).length : 0) + '⟩', v);
  };

  // Das dc-Runtime verpackt jede {{ }}-Interpolation in <span class="sc-interp">.
  // Der Span ist ungestylt und damit layoutneutral, existiert im statischen
  // Build aber nicht. Für den Vergleich wird er als durchsichtig behandelt.
  const transparent = (n) => n.nodeType === 1 && n.classList && n.classList.contains('sc-interp');
  const ownText = (el) => [...el.childNodes]
    .filter(n => n.nodeType === 3 || transparent(n))
    .map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();

  document.querySelectorAll('*').forEach((el) => {
    if (transparent(el)) return;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;

    if (el.tagName === 'IMG' || el.tagName === 'VIDEO') {
      // Rahmen statt Medium: dessen transform ändert die Parallax laufend
      const host = el.parentElement || el;
      add('MEDIA ' + (el.getAttribute('src') || el.getAttribute('poster') || el.tagName),
        host.getBoundingClientRect());
      return;
    }
    const own = ownText(el);
    if (own.length < 2) return;
    add(el.tagName + ' ' + own, r);
  });
  return [...items.entries()];
};

// Dateinamen direkt aus fonts.css lesen — so laufen sie nie auseinander,
// wenn tools/fonts.mjs die Schnitte anders zusammenfasst.
const PRELOADS = [...new Set([...fontCss.matchAll(/\/assets\/fonts\/([^)]+\.woff2)/g)].map(m => m[1]))]
  .filter(f => f.includes('latin.'))
  .map(f => `<link rel="preload" href="${BASE}/assets/fonts/${f}" as="font" type="font/woff2" crossorigin>`).join('');

async function collect(browser, url, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  await ctx.route('**/*.mp4', r => r.abort());
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: fontCss }));
  await ctx.route('https://fonts.gstatic.com/**', r => r.abort());

  // Dem Original dieselben Font-Preloads unterschieben wie dem Nachbau.
  // Ohne das löst `max-width:16ch` im Original gegen die Fallback-Metrik auf
  // (484px vs. 418px, eine Zeile Unterschied) — und Chrome rechnet ch nach
  // dem Nachladen der Schrift nicht neu. Man verglicht dann dieses Race,
  // nicht das Layout. Siehe CLAUDE.md §5.
  await ctx.route('**/_design/*.dc.html', async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace('</head>', PRELOADS + '</head>');
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
  });

  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 1000));
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 800));
  });
  await p.waitForTimeout(2500);
  // Laufende Animationen auf eine feste Zeit setzen — sonst steht die
  // Partner-Laufschrift (@keyframes marquee, 48s endlos) bei beiden Seiten
  // an einer anderen Stelle und jeder Logokasten meldet eine Abweichung.
  //
  // In einer Schleife, bis nichts mehr läuft: der IntersectionObserver von
  // motion.js startet Reveal-Transitions oft erst nach dem ersten Einfrieren,
  // und die würden dann mitten in der Easingkurve gemessen.
  // Erst anhalten, dann die Zeit setzen — umgekehrt läuft die Animation noch
  // einen Frame-Bruchteil weiter.
  await p.evaluate(async () => {
    for (let i = 0; i < 30; i++) {
      const laufend = document.getAnimations().filter(a => a.playState === 'running');
      laufend.forEach(a => { try { a.pause(); a.currentTime = 60000; } catch (e) {} });
      await new Promise(r => setTimeout(r, 100));
      if (!laufend.length && !document.getAnimations().some(a => a.playState === 'running')) return;
    }
  });
  await p.waitForTimeout(150);
  const data = await p.evaluate(COLLECT);
  const height = await p.evaluate(() => document.documentElement.scrollHeight);
  await ctx.close();
  return { data: new Map(data), height };
}

const main = async () => {
  const browser = await chromium.launch();
  const widths = args.width ? [Number(args.width)] : [1440, 1024, 375];
  const pageKeys = args.page ? [args.page] : Object.keys(PAGES);
  let fails = 0;

  for (const key of pageKeys) {
    const [designFile, builtFile] = PAGES[key];
    for (const w of widths) {
      const a = await collect(browser, `${BASE}/_design/${designFile}`, w);
      const b = await collect(browser, `${BASE}/${builtFile}`, w);
      // Toleranz 1px: das Runtime verpackt jede Interpolation in einen
      // eigenen <span>, der Nachbau nicht. Über eine solche Elementgrenze
      // hinweg shapet der Browser den Text minimal anders — sichtbar wird
      // das nie, messbar bis etwa ein halbes Pixel. Alles darüber ist echt.
      const TOL = 1.0;
      const diffs = [];
      let worst = 0;
      for (const [k, v] of a.data) {
        if (!b.data.has(k)) { diffs.push(`fehlt im Nachbau: ${k}`); continue; }
        const n = b.data.get(k);
        if (n === v) continue;
        const av = v.split(',').map(Number);
        const bv = n.split(',').map(Number);
        const delta = Math.max(...av.map((x, i) => Math.abs(x - bv[i])));
        worst = Math.max(worst, delta);
        if (delta > TOL) diffs.push(`Box weicht ab um ${delta.toFixed(1)}px: ${k}\n      ref ${v}\n      neu ${n}`);
      }
      const extra = [...b.data.keys()].filter(k => !a.data.has(k));
      const hOk = a.height === b.height;
      const ok = !diffs.length && hOk;
      if (!ok) fails++;
      console.log(`${ok ? '  ok  ' : '  ABW '} ${key} @ ${w}px — ${a.data.size} Boxen, Höhe ${a.height}/${b.height}, max Δ ${worst.toFixed(1)}px`);
      diffs.slice(0, 6).forEach(d => console.log('      ' + d));
      if (diffs.length > 6) console.log(`      … und ${diffs.length - 6} weitere`);
      // Zusätzliche Boxen sind erwartbar (versteckte Menüs/Dialoge liegen im DOM)
      if (extra.length) console.log(`      (${extra.length} zusätzliche Boxen im Nachbau — versteckte Menüs/Dialoge)`);
    }
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} Kombination(en) mit Abweichung` : '\n✓ Geometrie überall identisch');
  process.exitCode = fails ? 1 : 0;
};

main();
