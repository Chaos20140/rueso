import { chromium } from 'playwright';
import { openCtx, snap, diffSnap, settle, BASE } from './zz-lib.mjs';

const b = await chromium.launch();
let bad = 0;
for (const [w, h] of [[1440, 900], [375, 812]]) {
  console.log(`\n══ Projektdialoge, alle 12 · referenzen @${w} ══`);
  const R = await openCtx(b, `${BASE}/_design/RUESO-Referenzen.dc.html`, w, h, { touch: w < 900 });
  const N = await openCtx(b, `${BASE}/referenzen.html`, w, h, { touch: w < 900 });
  const n = await R.page.evaluate(() => document.querySelectorAll('main button').length);
  const n2 = await N.page.evaluate(() => document.querySelectorAll('main button').length);
  console.log(`   Karten ref=${n} neu=${n2}`);
  for (let i = 0; i < n; i++) {
    for (const P of [R, N]) {
      // wie ein Besucher: Karte in den Blick scrollen, dann klicken
      await P.page.evaluate((idx) => {
        const el = document.querySelectorAll('main button')[idx];
        el.scrollIntoView({ block: 'center' });
      }, i);
      await P.page.waitForTimeout(700);
      await settle(P.page);
      await P.page.evaluate((idx) => document.querySelectorAll('main button')[idx].click(), i);
      await P.page.waitForTimeout(1100);
      await settle(P.page);
      await P.page.evaluate(() => window.scrollTo(0, 0));
      await P.page.waitForTimeout(300);
    }
    const titel = await R.page.evaluate(() => { const x = document.querySelector('[role="dialog"] h2'); return x ? x.textContent.trim() : '?'; });
    const t2 = await N.page.evaluate(() => { const x = [...document.querySelectorAll('[role="dialog"]')].find(d => d.getBoundingClientRect().height > 0); const y = x && x.querySelector('h2'); return y ? y.textContent.trim() : '?'; });
    if (titel !== t2) { bad++; console.log(`  ABW  Dialog ${i + 1}: ref-Titel "${titel}" ≠ neu-Titel "${t2}"`); }
    if (!diffSnap(`Dialog ${i + 1}/${n} „${titel}"`, await snap(R.page), await snap(N.page))) bad++;
    for (const P of [R, N]) { await P.page.keyboard.press('Escape'); await P.page.waitForTimeout(800); }
  }
  await R.ctx.close(); await N.ctx.close();
}
await b.close();
console.log(bad ? `\n✗ ${bad} Abweichung(en)` : '\n✓ alle Dialoge identisch');
