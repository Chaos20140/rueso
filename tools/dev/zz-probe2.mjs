import { chromium } from 'playwright';
import { openCtx, BASE } from '../states.mjs';
const b = await chromium.launch();
const R = await openCtx(b, `${BASE}/_design/RUESO-Referenzen.dc.html`, 375, 812, { touch: true });
const N = await openCtx(b, `${BASE}/referenzen.html`, 375, 812, { touch: true });
const st = (p) => p.evaluate(() => [...document.querySelectorAll('main button')].slice(0,5).map((el,i)=>{
  const cs = getComputedStyle(el);
  return { i, op: cs.opacity, tr: cs.transform, top: Math.round(el.getBoundingClientRect().top + scrollY) };
}));
for (const [n,P] of [['ref',R],['neu',N]]) {
  await P.page.evaluate(()=>window.scrollTo(0,0)); await P.page.waitForTimeout(400);
  console.log(n,'vor    ', JSON.stringify(await st(P.page)));
  await P.page.evaluate(()=>document.querySelectorAll('main button')[0].click());
  await P.page.waitForTimeout(1400);
  console.log(n,'dlg auf', JSON.stringify(await st(P.page)));
  await P.page.keyboard.press('Escape'); await P.page.waitForTimeout(1400);
  console.log(n,'dlg zu ', JSON.stringify(await st(P.page)));
}
await b.close();
