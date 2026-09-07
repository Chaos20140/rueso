/** Dev: Reveal-Zustand der Referenzkarten beim Öffnen eines Projektdialogs. */
import { chromium } from 'playwright';
import { openCtx, BASE } from '../states.mjs';

const IDX = Number(process.argv[2] || 4);      // 0-basiert → Dialog 5
const W = Number(process.argv[3] || 1440);

const cards = (p) => p.evaluate(() => [...document.querySelectorAll('main button')].map((b, i) => ({
  i,
  top: Math.round(b.getBoundingClientRect().top + window.scrollY),
  op: b.style.opacity || '',
  tf: (b.style.transform || '').replace('translate3d(0px, ', '').replace('px, 0px)', ''),
})));

const b = await chromium.launch();
for (const [label, url] of [['REF', `${BASE}/_design/RUESO-Referenzen.dc.html`], ['NEU', `${BASE}/referenzen.html`]]) {
  const { ctx, page } = await openCtx(b, url, W, W < 900 ? 812 : 900, { touch: W < 900 });
  const before = await cards(page);
  await page.evaluate((i) => { window.scrollTo(0, 0); document.querySelectorAll('main button')[i].click(); }, IDX);
  await page.waitForTimeout(1200);
  const after = await cards(page);
  console.log(`\n══ ${label} @${W}px, Dialog ${IDX + 1}`);
  console.log('  vorher : ' + before.map(c => `${c.i}:${c.op || '1'}${c.tf ? '/' + c.tf : ''}`).join(' '));
  console.log('  nachher: ' + after.map(c => `${c.i}:${c.op || '1'}${c.tf ? '/' + c.tf : ''}`).join(' '));
  const moved = after.filter((c, i) => c.top !== before[i].top);
  if (moved.length) console.log('  verschoben: ' + JSON.stringify(moved));
  await ctx.close();
}
await b.close();
