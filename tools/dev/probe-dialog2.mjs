/** Dev: voller Geometrie-Diff für einen einzelnen Projektdialog. */
import { chromium } from 'playwright';
import { openCtx, snap, diffSnap, BASE } from '../states.mjs';
const IDX = Number(process.argv[2] || 4);
const W = Number(process.argv[3] || 1440);
const b = await chromium.launch();
const R = await openCtx(b, `${BASE}/_design/RUESO-Referenzen.dc.html`, W, W < 900 ? 812 : 900, { touch: W < 900 });
const N = await openCtx(b, `${BASE}/referenzen.html`, W, W < 900 ? 812 : 900, { touch: W < 900 });
for (const P of [R, N]) {
  await P.page.evaluate((i) => { window.scrollTo(0, 0); document.querySelectorAll('main button')[i].click(); }, IDX);
  await P.page.waitForTimeout(1200);
}
diffSnap(`Dialog ${IDX + 1} @${W}`, await snap(R.page), await snap(N.page));
await R.ctx.close(); await N.ctx.close(); await b.close();
