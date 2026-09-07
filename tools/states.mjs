/**
 * Zustands-Vergleich Original vs. Nachbau.
 *
 * Vergleicht die Geometrie NACH einer Interaktion — der Bereich, den
 * tools/shots.mjs und tools/geom.mjs nicht abdecken: beide sehen nur den
 * Ausgangszustand jeder Seite.
 *
 *   node tools/states.mjs [nav|menu|faq|filter|dialoge|chips|motion|alle]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || '65311';
const BASE = `http://127.0.0.1:${PORT}`;
const fontCss = fs.readFileSync(path.join(ROOT, 'assets/css/fonts.css'), 'utf8')
  .replace(/url\(\.\.\/fonts\//g, `url(${BASE}/assets/fonts/`);
const PRELOADS = [...new Set([...fontCss.matchAll(/\/assets\/fonts\/([^)]+\.woff2)/g)].map(m => m[1]))]
  .filter(f => f.includes('latin.'))
  .map(f => `<link rel="preload" href="${BASE}/assets/fonts/${f}" as="font" type="font/woff2" crossorigin>`).join('');

export const PAGES = {
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

export const COLLECT = () => {
  const round = (n) => Math.round(n * 10) / 10;
  const items = new Map();
  const add = (key, rect) => {
    const k = key.slice(0, 90);
    let i = 0; while (items.has(k + ' ⟨' + i + '⟩')) i++;
    items.set(k + ' ⟨' + i + '⟩',
      `${round(rect.left)},${round(rect.top + window.scrollY)},${round(rect.width)},${round(rect.height)}`);
  };
  const transparent = (n) => n.nodeType === 1 && n.classList && n.classList.contains('sc-interp');
  const ownText = (el) => [...el.childNodes]
    .filter(n => n.nodeType === 3 || transparent(n))
    .map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
  document.querySelectorAll('*').forEach((el) => {
    if (transparent(el)) return;
    // Kundenstimmen: echte Google-Rezensionen statt Platzhalter — bewusste
    // Inhaltsabweichung, Maße identisch. Siehe CLAUDE.md §7.
    if (el.closest('#stimmen')) return;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;
    if (el.tagName === 'IMG' || el.tagName === 'VIDEO') {
      const host = el.parentElement || el;
      add('MEDIA ' + (el.getAttribute('src') || el.getAttribute('poster') || el.tagName), host.getBoundingClientRect());
      return;
    }
    const own = ownText(el);
    if (own.length < 2) return;
    add(el.tagName + ' ' + own, r);
  });
  return [...items.entries()];
};

export async function openCtx(browser, url, width, height, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    hasTouch: !!opts.touch,
    reducedMotion: opts.reducedMotion || 'no-preference',
  });
  await ctx.route('**/*.mp4', r => r.abort());
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: fontCss }));
  await ctx.route('https://fonts.gstatic.com/**', r => r.abort());
  await ctx.route('**/_design/*.dc.html', async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace('</head>', PRELOADS + '</head>');
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url, { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 1000));
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 800));
  });
  await p.waitForTimeout(2500);
  return { ctx, page: p, errs };
}

/**
 * Alle Animationen auf eine feste Zeit stellen.
 * Erst anhalten, dann die Zeit setzen — umgekehrt läuft die Animation noch
 * einen Bruchteil eines Frames weiter und die Partner-Laufschrift steht bei
 * beiden Seiten ein bis zwei Pixel versetzt.
 */
export async function freeze(p) {
  // In einer Schleife, bis nichts mehr läuft: der IntersectionObserver von
  // motion.js startet Reveal-Transitions oft erst nach dem ersten Einfrieren.
  await p.evaluate(async () => {
    for (let i = 0; i < 30; i++) {
      const laufend = document.getAnimations().filter(a => a.playState === 'running');
      laufend.forEach(a => { try { a.pause(); a.currentTime = 60000; } catch (e) {} });
      await new Promise(r => setTimeout(r, 100));
      if (!laufend.length && !document.getAnimations().some(a => a.playState === 'running')) return;
    }
  });
  await p.waitForTimeout(100);
}

export async function snap(p) {
  await freeze(p);
  const data = new Map(await p.evaluate(COLLECT));
  const height = await p.evaluate(() => document.documentElement.scrollHeight);
  return { data, height };
}

export function diffSnap(label, a, b, tol = 1.0) {
  const diffs = [];
  let worst = 0;
  for (const [k, v] of a.data) {
    if (!b.data.has(k)) { diffs.push(`FEHLT im Nachbau: ${k}   ref-box ${v}`); continue; }
    const n = b.data.get(k);
    if (n === v) continue;
    const av = v.split(',').map(Number), bv = n.split(',').map(Number);
    const d = Math.max(...av.map((x, i) => Math.abs(x - bv[i])));
    worst = Math.max(worst, d);
    if (d > tol) diffs.push(`Δ ${d.toFixed(1)}px: ${k}\n        ref ${v}\n        neu ${n}`);
  }
  const extra = [...b.data.keys()].filter(k => !a.data.has(k));
  const hOk = a.height === b.height;
  const ok = !diffs.length && hOk;
  console.log(`${ok ? '  ok  ' : '  ABW '} ${label} — ${a.data.size}/${b.data.size} Boxen, Höhe ${a.height}/${b.height}, max Δ ${worst.toFixed(1)}px`);
  diffs.slice(0, 10).forEach(d => console.log('        ' + d));
  if (diffs.length > 10) console.log(`        … und ${diffs.length - 10} weitere`);
  if (extra.length) console.log(`        (${extra.length} zusätzliche Boxen im Nachbau: ${extra.slice(0, 3).join(' | ')})`);
  return ok;
}
export { BASE };

/* ================================================================== *
 * Runner — vergleicht Zustände, die nach einer Interaktion entstehen
 *
 *   node tools/states.mjs [nav|menu|faq|filter|dialoge|chips|motion|alle]
 *
 * Der Pixelvergleich (tools/shots.mjs) und der Geometrievergleich
 * (tools/geom.mjs) sehen nur den Ausgangszustand jeder Seite. Hier werden
 * die Zustände geprüft, die erst durch Bedienung entstehen.
 * ================================================================== */

const SZENARIEN = {
  async nav(b) {
    console.log('\n══ Nav-Dropdown geöffnet · Startseite @1440 ══');
    const R = await openCtx(b, `${BASE}/_design/RUESO-Start.dc.html`, 1440, 900);
    const N = await openCtx(b, `${BASE}/index.html`, 1440, 900);
    for (const P of [R, N]) {
      await P.page.locator('nav a[href*="leistungen"]').first().hover();
      await P.page.waitForTimeout(800);
    }
    const ok = diffSnap('Dropdown offen', await snap(R.page), await snap(N.page));
    await R.ctx.close(); await N.ctx.close();
    return ok;
  },

  async menu(b) {
    console.log('\n══ Mobilmenü geöffnet · Startseite @375 ══');
    const R = await openCtx(b, `${BASE}/_design/RUESO-Start.dc.html`, 375, 812, { touch: true });
    const N = await openCtx(b, `${BASE}/index.html`, 375, 812, { touch: true });
    for (const P of [R, N]) {
      await P.page.locator('nav button[aria-label="Menü"]').click();
      await P.page.waitForTimeout(900);
    }
    const ok = diffSnap('Mobilmenü offen', await snap(R.page), await snap(N.page));
    await R.ctx.close(); await N.ctx.close();
    return ok;
  },

  async faq(b) {
    let all = true;
    for (const [w, h] of [[1440, 900], [375, 812]]) {
      console.log(`\n══ FAQ, jeder Eintrag einzeln · Startseite @${w} ══`);
      const R = await openCtx(b, `${BASE}/_design/RUESO-Start.dc.html`, w, h, { touch: w < 900 });
      const N = await openCtx(b, `${BASE}/index.html`, w, h, { touch: w < 900 });
      const click = (P, i) => P.page.evaluate((idx) => document.querySelectorAll('#faq button[aria-expanded]')[idx].click(), i);
      const n = await R.page.locator('#faq button[aria-expanded]').count();
      for (let i = 0; i < n; i++) {
        for (const P of [R, N]) { await click(P, i); await P.page.waitForTimeout(1100); }
        all = diffSnap(`FAQ #${i + 1} offen`, await snap(R.page), await snap(N.page)) && all;
        for (const P of [R, N]) { await click(P, i); await P.page.waitForTimeout(900); }
      }
      await R.ctx.close(); await N.ctx.close();
    }
    return all;
  },

  async filter(b) {
    let all = true;
    for (const [w, h] of [[1440, 900], [375, 812]]) {
      console.log(`\n══ Referenz-Filter, jeder einzeln · Referenzen @${w} ══`);
      const R = await openCtx(b, `${BASE}/_design/RUESO-Referenzen.dc.html`, w, h, { touch: w < 900 });
      const N = await openCtx(b, `${BASE}/referenzen.html`, w, h, { touch: w < 900 });
      const labels = await R.page.evaluate(() => [...document.querySelectorAll('header button')].map(x => x.textContent.trim()));
      for (let i = 0; i < labels.length; i++) {
        for (const P of [R, N]) {
          await P.page.evaluate((idx) => document.querySelectorAll('header button')[idx].click(), i);
          await P.page.waitForTimeout(900);
        }
        all = diffSnap(`Filter „${labels[i]}"`, await snap(R.page), await snap(N.page)) && all;
      }
      await R.ctx.close(); await N.ctx.close();
    }
    return all;
  },

  async dialoge(b) {
    let all = true;
    for (const [w, h] of [[1440, 900], [375, 812]]) {
      console.log(`\n══ Projektdialoge, alle · Referenzen @${w} ══`);
      const R = await openCtx(b, `${BASE}/_design/RUESO-Referenzen.dc.html`, w, h, { touch: w < 900 });
      const N = await openCtx(b, `${BASE}/referenzen.html`, w, h, { touch: w < 900 });
      const n = await R.page.evaluate(() => document.querySelectorAll('main button').length);
      for (let i = 0; i < n; i++) {
        for (const P of [R, N]) {
          await P.page.evaluate((idx) => { window.scrollTo(0, 0); document.querySelectorAll('main button')[idx].click(); }, i);
          await P.page.waitForTimeout(1000);
        }
        const titel = await R.page.evaluate(() => document.querySelector('[role="dialog"] h2')?.textContent.trim() || '?');
        all = diffSnap(`Dialog ${i + 1}/${n} „${titel}"`, await snap(R.page), await snap(N.page)) && all;
        for (const P of [R, N]) { await P.page.keyboard.press('Escape'); await P.page.waitForTimeout(700); }
      }
      await R.ctx.close(); await N.ctx.close();
    }
    return all;
  },

  async chips(b) {
    console.log('\n══ Kontakt-Themen, jeder Chip · Kontakt @1440 ══');
    const R = await openCtx(b, `${BASE}/_design/RUESO-Kontakt.dc.html`, 1440, 900);
    const N = await openCtx(b, `${BASE}/kontakt.html`, 1440, 900);
    const sel = 'form button[type="button"]';
    const labels = await R.page.evaluate((s) => [...document.querySelectorAll(s)].map(x => x.textContent.trim()), sel);
    let all = true;
    for (let i = 0; i < labels.length; i++) {
      for (const P of [R, N]) {
        await P.page.evaluate(([s, idx]) => document.querySelectorAll(s)[idx].click(), [sel, i]);
        await P.page.waitForTimeout(700);
      }
      all = diffSnap(`Thema „${labels[i]}"`, await snap(R.page), await snap(N.page)) && all;
    }
    await R.ctx.close(); await N.ctx.close();
    return all;
  },

  async motion(b) {
    console.log('\n══ prefers-reduced-motion · Startseite @1440 ══');
    const R = await openCtx(b, `${BASE}/_design/RUESO-Start.dc.html`, 1440, 900, { reducedMotion: 'reduce' });
    const N = await openCtx(b, `${BASE}/index.html`, 1440, 900, { reducedMotion: 'reduce' });
    const ok = diffSnap('reduced-motion', await snap(R.page), await snap(N.page));
    await R.ctx.close(); await N.ctx.close();
    return ok;
  },
};

// Nur ausführen, wenn direkt aufgerufen — die Helfer sind auch importierbar.
if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || '')) {
  const wunsch = (process.argv[2] || 'alle').toLowerCase();
  const namen = wunsch === 'alle' ? Object.keys(SZENARIEN) : [wunsch];
  const b = await chromium.launch();
  let alle = true;
  for (const n of namen) {
    if (!SZENARIEN[n]) { console.log(`unbekanntes Szenario: ${n}`); continue; }
    alle = (await SZENARIEN[n](b)) && alle;
  }
  await b.close();
  console.log(alle ? '\n✓ alle Zustände identisch' : '\n✗ Abweichungen — siehe oben');
  process.exitCode = alle ? 0 : 1;
}
