/** Dev: voller Geometrie-Diff für einen einzelnen Referenz-Filter. */
import { chromium } from 'playwright';
import { openCtx, snap, diffSnap, BASE } from '../states.mjs';
const LABEL = process.argv[2] || 'Brandschutz';
const W = Number(process.argv[3] || 375);
const b = await chromium.launch();
const R = await openCtx(b, `${BASE}/_design/RUESO-Referenzen.dc.html`, W, W < 900 ? 812 : 900, { touch: W < 900 });
const N = await openCtx(b, `${BASE}/referenzen.html`, W, W < 900 ? 812 : 900, { touch: W < 900 });
for (const P of [R, N]) {
  await P.page.evaluate((l) => {
    [...document.querySelectorAll('header button')].find(x => x.textContent.trim() === l).click();
  }, LABEL);
  await P.page.waitForTimeout(1200);
}
diffSnap(`Filter "${LABEL}" @${W}`, await snap(R.page), await snap(N.page));
await R.ctx.close(); await N.ctx.close(); await b.close();
