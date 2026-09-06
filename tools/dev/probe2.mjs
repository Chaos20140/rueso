/** Dev-Hilfsskript: vergleicht Geometrie einzelner Elemente Original vs. Neubau. */
import { chromium } from 'playwright';
const PORT = process.env.PORT || '65311';
const W = Number(process.argv[2] || 1024);
const SEL = process.argv[3] || '#leistungen [data-preview-row]';

const probe = async (browser, url) => {
  const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, deviceScaleFactor: 1 });
  await ctx.route('**/*.mp4', r => r.abort());
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  await p.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 900));
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 600));
  });
  await p.waitForTimeout(2000);
  const out = await p.evaluate((sel) => {
    const rows = [];
    document.querySelectorAll(sel).forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      rows.push({
        i, tag: el.tagName.toLowerCase(),
        h: Math.round(r.height * 10) / 10, w: Math.round(r.width * 10) / 10,
        fs: cs.fontSize, mw: cs.maxWidth, ff: cs.fontFamily.split(',')[0],
        wrap: cs.textWrap || cs.textWrapStyle || '',
        txt: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 44),
      });
    });
    return rows;
  }, SEL);
  await ctx.close();
  return out;
};

const b = await chromium.launch();
const a = await probe(b, `http://127.0.0.1:${PORT}/_design/RUESO-Start.dc.html`);
const c = await probe(b, `http://127.0.0.1:${PORT}/index.html`);
await b.close();

for (let i = 0; i < Math.max(a.length, c.length); i++) {
  const x = a[i], y = c[i];
  const same = x && y && x.h === y.h && x.w === y.w;
  console.log(`[${i}] ${x ? x.tag : '?'} "${x ? x.txt : ''}"${same ? '' : '   <<< ABWEICHUNG'}`);
  console.log(`    ref ${x ? `${x.w}x${x.h} fs=${x.fs} mw=${x.mw} ff=${x.ff} wrap=${x.wrap}` : '—'}`);
  console.log(`    new ${y ? `${y.w}x${y.h} fs=${y.fs} mw=${y.mw} ff=${y.ff} wrap=${y.wrap}` : '—'}`);
}
