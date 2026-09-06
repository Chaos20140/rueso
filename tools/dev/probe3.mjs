/** Dev: untersucht die instabile h2-Umbruchhöhe in #leistungen. */
import { chromium } from 'playwright';
const PORT = process.env.PORT || '65311';
const W = 1024;

const run = async (browser, url, label) => {
  const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, deviceScaleFactor: 1 });
  await ctx.route('**/*.mp4', r => r.abort());
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded' });

  const snap = (tag) => p.evaluate((t) => {
    const h2 = document.querySelector('#leistungen h2');
    if (!h2) return { t, missing: true };
    const r = h2.getBoundingClientRect();
    return {
      t,
      h: Math.round(r.height * 10) / 10,
      w: Math.round(r.width * 10) / 10,
      mw: getComputedStyle(h2).maxWidth,
      figtree: document.fonts.check('47px Figtree'),
      status: document.fonts.status,
    };
  }, tag);

  const rows = [snap('domcontentloaded')];
  await p.waitForTimeout(300); rows.push(await snap('+0.3s'));
  await p.evaluate(() => document.fonts.ready); rows.push(await snap('fonts.ready'));
  await p.waitForTimeout(3000); rows.push(await snap('+3s'));
  await p.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 800));
    window.scrollTo(0, 0);
  });
  await p.waitForTimeout(1500); rows.push(await snap('nach scroll'));

  console.log(`\n== ${label}`);
  for (const r of await Promise.all(rows)) {
    console.log(`   ${String(r.t).padEnd(16)} h=${r.h} w=${r.w} mw=${r.mw} figtreeGeladen=${r.figtree} fonts=${r.status}`);
  }
  await ctx.close();
};

const b = await chromium.launch();
await run(b, `http://127.0.0.1:${PORT}/_design/RUESO-Start.dc.html`, 'ORIGINAL');
await run(b, `http://127.0.0.1:${PORT}/index.html`, 'NEUBAU');
await b.close();
