import { chromium } from 'playwright';
import { PAGES, openCtx, snap, diffSnap, BASE } from './states.mjs';

const b = await chromium.launch();

/* ---------- 1. Nav-Dropdown offen (Desktop 1440) ---------- */
async function navOpen(page) {
  const trig = page.locator('nav a[href*="leistungen"]').first();
  await trig.hover();
  await page.waitForTimeout(800);
}
console.log('\n══ Nav-Dropdown geöffnet · start @1440 ══');
{
  const R = await openCtx(b, `${BASE}/_design/RUESO-Start.dc.html`, 1440, 900);
  const N = await openCtx(b, `${BASE}/index.html`, 1440, 900);
  await navOpen(R.page); await navOpen(N.page);
  diffSnap('Dropdown offen', await snap(R.page), await snap(N.page));
  await R.ctx.close(); await N.ctx.close();
}

/* ---------- 2. Mobilmenü offen (375) ---------- */
console.log('\n══ Mobilmenü geöffnet · start @375 ══');
{
  const R = await openCtx(b, `${BASE}/_design/RUESO-Start.dc.html`, 375, 812, { touch: true });
  const N = await openCtx(b, `${BASE}/index.html`, 375, 812, { touch: true });
  for (const P of [R, N]) {
    await P.page.locator('nav button[aria-label="Menü"]').click();
    await P.page.waitForTimeout(900);
  }
  diffSnap('Mobilmenü offen', await snap(R.page), await snap(N.page));
  await R.ctx.close(); await N.ctx.close();
}

/* ---------- 3. Jeder FAQ-Eintrag (1440 + 375) ---------- */
for (const [w, h] of [[1440, 900], [375, 812]]) {
  console.log(`\n══ FAQ-Einträge einzeln · start @${w} ══`);
  const R = await openCtx(b, `${BASE}/_design/RUESO-Start.dc.html`, w, h, { touch: w < 900 });
  const N = await openCtx(b, `${BASE}/index.html`, w, h, { touch: w < 900 });
  const n = await R.page.locator('#faq button[aria-expanded]').count();
  const n2 = await N.page.locator('#faq button[aria-expanded]').count();
  console.log(`   FAQ-Einträge ref=${n} neu=${n2}`);
  for (let i = 0; i < Math.min(n, n2); i++) {
    for (const P of [R, N]) {
      await P.page.evaluate((idx) => {
        document.querySelectorAll('#faq button[aria-expanded]')[idx].click();
      }, i);
      await P.page.waitForTimeout(1100);
    }
    diffSnap(`FAQ #${i + 1} offen`, await snap(R.page), await snap(N.page));
    // wieder schließen
    for (const P of [R, N]) {
      await P.page.evaluate((idx) => {
        document.querySelectorAll('#faq button[aria-expanded]')[idx].click();
      }, i);
      await P.page.waitForTimeout(900);
    }
  }
  await R.ctx.close(); await N.ctx.close();
}

await b.close();
