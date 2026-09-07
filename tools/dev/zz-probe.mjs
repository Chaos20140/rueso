import { chromium } from 'playwright';
import { openCtx, BASE } from '../states.mjs';

const b = await chromium.launch();
const R = await openCtx(b, `${BASE}/_design/RUESO-Referenzen.dc.html`, 375, 812, { touch: true });
const N = await openCtx(b, `${BASE}/referenzen.html`, 375, 812, { touch: true });

const state = (p, tag) => p.evaluate((t) => {
  const card = document.querySelectorAll('main button')[0];
  const r = card.getBoundingClientRect();
  const dlg = [...document.querySelectorAll('[role="dialog"]')].find(x => x.getBoundingClientRect().height > 0);
  const art = dlg ? dlg.querySelector('article') : null;
  return {
    t,
    scrollY: window.scrollY,
    docScrollTop: document.documentElement.scrollTop,
    bodyScrollTop: document.body.scrollTop,
    cardTop: Math.round(r.top * 10) / 10,
    cardAbs: Math.round((r.top + window.scrollY) * 10) / 10,
    bodyOverflow: document.body.style.overflow,
    htmlOverflow: getComputedStyle(document.documentElement).overflowY,
    artScrollTop: art ? art.scrollTop : null,
    artH: art ? Math.round(art.getBoundingClientRect().height) : null,
    active: document.activeElement ? document.activeElement.tagName + '/' + (document.activeElement.getAttribute('aria-label') || '') : null,
    docH: document.documentElement.scrollHeight,
  };
}, tag);

for (const [name, P] of [['ref', R], ['neu', N]]) {
  await P.page.evaluate(() => window.scrollTo(0, 0));
  await P.page.waitForTimeout(400);
  console.log(name, JSON.stringify(await state(P.page, 'vor')));
  await P.page.evaluate(() => document.querySelectorAll('main button')[0].click());
  await P.page.waitForTimeout(1200);
  console.log(name, JSON.stringify(await state(P.page, 'offen')));
}
await b.close();
