/** Dev: Reveal-Zustand der Referenzkarten vor und nach dem Filtern. */
import { chromium } from 'playwright';
import { openCtx, BASE } from '../states.mjs';

const state = (p) => p.evaluate(() => [...document.querySelectorAll('main button')].map((b, i) => ({
  i,
  hidden: b.hidden,
  top: Math.round(b.getBoundingClientRect().top + window.scrollY),
  transform: b.style.transform || getComputedStyle(b).transform,
  opacity: b.style.opacity || getComputedStyle(b).opacity,
  name: (b.textContent || '').trim().slice(0, 26),
})).filter(x => !x.hidden).slice(0, 3));

const b = await chromium.launch();
for (const [label, url] of [['REF', `${BASE}/_design/RUESO-Referenzen.dc.html`], ['NEU', `${BASE}/referenzen.html`]]) {
  const { ctx, page } = await openCtx(b, url, 375, 812, { touch: true });
  console.log(`\n══ ${label}`);
  console.log('  vor dem Filtern:', JSON.stringify(await state(page)));
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    [...document.querySelectorAll('header button')].find(x => /^(Türen|Doors)$/.test(x.textContent.trim())).click();
  });
  await page.waitForTimeout(1200);
  console.log('  nach Filter "Türen":', JSON.stringify(await state(page)));
  await page.waitForTimeout(2500);
  console.log('  +2,5 s später:', JSON.stringify(await state(page)));
  await ctx.close();
}
await b.close();
