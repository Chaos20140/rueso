import { chromium } from 'playwright';
import { openCtx, snap, diffSnap, settle, BASE } from './zz-lib.mjs';
const b = await chromium.launch();
let bad = 0;
for (const [w, h] of [[1440, 900], [375, 812]]) {
  console.log(`\n══ Referenz-Filter, alle · referenzen @${w} ══`);
  const R = await openCtx(b, `${BASE}/_design/RUESO-Referenzen.dc.html`, w, h, { touch: w < 900 });
  const N = await openCtx(b, `${BASE}/referenzen.html`, w, h, { touch: w < 900 });
  const labels = await R.page.evaluate(() => [...document.querySelectorAll('header button')].map(x => x.textContent.trim()));
  const l2 = await N.page.evaluate(() => [...document.querySelectorAll('header button')].map(x => x.textContent.trim()));
  console.log('   ref: ' + JSON.stringify(labels) + '\n   neu: ' + JSON.stringify(l2));
  for (let i = 0; i < labels.length; i++) {
    for (const P of [R, N]) {
      await P.page.evaluate(() => window.scrollTo(0, 0));
      await P.page.evaluate((idx) => document.querySelectorAll('header button')[idx].click(), i);
      await P.page.waitForTimeout(1000);
      await settle(P.page);
    }
    // Chip-Optik zusätzlich vergleichen
    const chipStyles = (p) => p.evaluate(() => [...document.querySelectorAll('header button')].map(x => {
      const cs = getComputedStyle(x);
      return [x.textContent.trim(), cs.backgroundColor, cs.color, cs.borderTopColor].join(' / ');
    }));
    const [ca, cb] = [await chipStyles(R.page), await chipStyles(N.page)];
    if (JSON.stringify(ca) !== JSON.stringify(cb)) { bad++; console.log('  ABW  Chip-Optik\n        ref ' + JSON.stringify(ca) + '\n        neu ' + JSON.stringify(cb)); }
    if (!diffSnap(`Filter „${labels[i]}"`, await snap(R.page), await snap(N.page))) bad++;
  }
  await R.ctx.close(); await N.ctx.close();
}

console.log('\n══ Kontakt-Themen, jeder Chip · kontakt @1440 und @375 ══');
for (const [w, h] of [[1440, 900], [375, 812]]) {
  const R = await openCtx(b, `${BASE}/_design/RUESO-Kontakt.dc.html`, w, h, { touch: w < 900 });
  const N = await openCtx(b, `${BASE}/kontakt.html`, w, h, { touch: w < 900 });
  const sel = 'form button[type="button"]';
  const labels = await R.page.evaluate((s) => [...document.querySelectorAll(s)].map(x => x.textContent.trim()), sel);
  const l2 = await N.page.evaluate((s) => [...document.querySelectorAll(s)].map(x => x.textContent.trim()), sel);
  console.log(`   @${w} ref: ` + JSON.stringify(labels) + '\n        neu: ' + JSON.stringify(l2));
  for (let i = 0; i < labels.length; i++) {
    for (const P of [R, N]) {
      await P.page.evaluate(([s, idx]) => document.querySelectorAll(s)[idx].click(), [sel, i]);
      await P.page.waitForTimeout(800);
      await settle(P.page);
    }
    const chipStyles = (p) => p.evaluate((s) => [...document.querySelectorAll(s)].map(x => {
      const cs = getComputedStyle(x);
      return [x.textContent.trim(), cs.backgroundColor, cs.color, cs.borderTopColor].join(' / ');
    }), sel);
    const [ca, cb] = [await chipStyles(R.page), await chipStyles(N.page)];
    if (JSON.stringify(ca) !== JSON.stringify(cb)) { bad++; console.log(`  ABW  Chip-Optik nach „${labels[i]}"`); ca.forEach((v, j) => { if (v !== cb[j]) console.log(`        ref ${v}\n        neu ${cb[j]}`); }); }
    if (!diffSnap(`@${w} Thema „${labels[i]}"`, await snap(R.page), await snap(N.page))) bad++;
  }
  await R.ctx.close(); await N.ctx.close();
}
await b.close();
console.log(bad ? `\n✗ ${bad} Abweichung(en)` : '\n✓ Filter und Chips identisch');
