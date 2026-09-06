import { chromium } from 'playwright';
const PORT = process.env.PORT || '65311';
const W = Number(process.argv[2] || 1024);
const probe = async (browser, url) => {
  const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, deviceScaleFactor: 1 });
  await ctx.route('**/*.mp4', r => r.abort());
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  await p.evaluate(async () => { window.scrollTo(0, document.body.scrollHeight); await new Promise(r=>setTimeout(r,900)); window.scrollTo(0,0); await new Promise(r=>setTimeout(r,600)); });
  await p.waitForTimeout(2000);
  const out = await p.evaluate(() => {
    const rows = [];
    document.querySelectorAll('section, footer, main').forEach(el => {
      const r = el.getBoundingClientRect();
      rows.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        label: el.getAttribute('data-screen-label') || '',
        top: Math.round(r.top + window.scrollY),
        h: Math.round(r.height),
        w: Math.round(r.width),
        disp: getComputedStyle(el).display,
      });
    });
    return { rows, total: document.documentElement.scrollHeight, bodyW: document.body.getBoundingClientRect().width };
  });
  await ctx.close();
  return out;
};
const b = await chromium.launch();
const a = await probe(b, `http://127.0.0.1:${PORT}/_design/RUESO-Start.dc.html`);
const c = await probe(b, `http://127.0.0.1:${PORT}/index.html`);
await b.close();
console.log('width', W, '| ref total', a.total, '| new total', c.total, '| bodyW', a.bodyW, c.bodyW);
const key = r => `${r.tag}#${r.id}|${r.label}`;
const map = new Map(c.rows.map(r => [key(r), r]));
console.log('LABEL'.padEnd(34), 'REF top/h'.padEnd(18), 'NEW top/h'.padEnd(18), 'Δtop  Δh');
for (const r of a.rows) {
  const n = map.get(key(r));
  if (!n) { console.log(key(r).padEnd(34), `${r.top}/${r.h}`.padEnd(18), 'FEHLT'); continue; }
  const dt = n.top - r.top, dh = n.h - r.h;
  const flag = (dt || dh) ? '  <<<' : '';
  console.log(key(r).slice(0,33).padEnd(34), `${r.top}/${r.h}`.padEnd(18), `${n.top}/${n.h}`.padEnd(18), `${dt}  ${dh}${flag}`);
}
const extra = c.rows.filter(r => !a.rows.some(x => key(x) === key(r)));
if (extra.length) console.log('NUR IM NEUBAU:', extra.map(key).join(', '));
