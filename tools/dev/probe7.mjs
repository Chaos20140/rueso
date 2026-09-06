/** Dev: vergleicht die von motion.js gesetzten Parallax-Transforms. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = process.env.PORT || '65311';
const BASE = `http://127.0.0.1:${PORT}`;
const W = Number(process.argv[2] || 375);
const SCROLL = Number(process.argv[3] || 0.08);

const fontCss = fs.readFileSync(path.join(ROOT, 'assets/css/fonts.css'), 'utf8')
  .replace(/url\(\.\.\/fonts\//g, `url(${BASE}/assets/fonts/`);

const probe = async (b, url) => {
  const ctx = await b.newContext({ viewport: { width: W, height: 812 }, deviceScaleFactor: 1 });
  await ctx.route('**/*.mp4', r => r.abort());
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: fontCss }));
  await ctx.route('https://fonts.gstatic.com/**', r => r.abort());
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  await p.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 900));
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 600));
  });
  await p.waitForTimeout(2500);
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  await p.evaluate((y) => window.scrollTo(0, y), Math.round((h - 812) * SCROLL));
  await p.waitForTimeout(700);
  const out = await p.evaluate(() => ({
    scrollY: window.scrollY,
    total: document.documentElement.scrollHeight,
    px: [...document.querySelectorAll('[data-parallax]')].slice(0, 4).map(el => ({
      f: el.dataset.parallax,
      t: el.style.transform,
      parentTop: Math.round(el.parentElement.getBoundingClientRect().top * 100) / 100,
      parentH: Math.round(el.parentElement.getBoundingClientRect().height * 100) / 100,
    })),
    count: document.querySelectorAll('[data-parallax]').length,
  }));
  await ctx.close();
  return out;
};

const b = await chromium.launch();
const a = await probe(b, `${BASE}/_design/RUESO-Referenzen.dc.html`);
const c = await probe(b, `${BASE}/referenzen.html`);
await b.close();

console.log('ref  scrollY=%d total=%d parallax-Elemente=%d', a.scrollY, a.total, a.count);
console.log('neu  scrollY=%d total=%d parallax-Elemente=%d', c.scrollY, c.total, c.count);
for (let i = 0; i < Math.max(a.px.length, c.px.length); i++) {
  console.log(`[${i}] ref f=${a.px[i]?.f} parentTop=${a.px[i]?.parentTop} h=${a.px[i]?.parentH}  ${a.px[i]?.t}`);
  console.log(`    neu f=${c.px[i]?.f} parentTop=${c.px[i]?.parentTop} h=${c.px[i]?.parentH}  ${c.px[i]?.t}`);
}
