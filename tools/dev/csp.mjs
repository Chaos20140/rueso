/** Dev: prüft, ob die Meta-CSP etwas blockiert. */
import { chromium } from 'playwright';
const PORT = process.env.PORT || '65311';
const b = await chromium.launch();
for (const p0 of ['index.html', 'referenzen.html', 'kontakt.html', 'karriere.html', 'en/index.html']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const viol = [];
  p.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) viol.push(m.text().slice(0, 160)); });
  p.on('pageerror', e => viol.push('JS: ' + e.message));
  await p.goto(`http://127.0.0.1:${PORT}/${p0}`, { waitUntil: 'load' });
  await p.waitForTimeout(3000);
  await p.evaluate(async () => { window.scrollTo(0, document.body.scrollHeight); await new Promise(r => setTimeout(r, 1200)); window.scrollTo(0, 0); });
  await p.waitForTimeout(2000);
  const st = await p.evaluate(() => ({
    imgs: document.images.length,
    broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).length,
    video: (() => { const v = document.querySelector('video'); return v ? { rs: v.readyState, src: (v.currentSrc || '').slice(-28) } : 'keins'; })(),
    css: getComputedStyle(document.body).backgroundColor,
    font: document.fonts.check('47px Figtree'),
    motion: !!document.querySelector('[data-reveal]')?.style.transition,
  }));
  console.log(`${p0.padEnd(18)} imgs=${st.imgs} kaputt=${st.broken} font=${st.font} bg=${st.css} motion=${st.motion} video=${JSON.stringify(st.video)}`);
  console.log(viol.length ? '   CSP/JS: ' + [...new Set(viol)].slice(0, 4).join(' | ') : '   keine Verstöße');
  await ctx.close();
}
await b.close();
