/**
 * DEV: Zustands-Vergleich Original vs. Nachbau.
 * Vergleicht Geometrie NACH einer Interaktion (Dropdown, Menü, FAQ, Filter,
 * Dialog, Chips, Hover, Fokus, prefers-reduced-motion).
 *
 *   node tools/dev/states.mjs <szenario>
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
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

export async function freeze(p) {
  await p.evaluate(() => { document.getAnimations().forEach(a => { try { a.currentTime = 60000; a.pause(); } catch (e) {} }); });
  await p.waitForTimeout(200);
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
