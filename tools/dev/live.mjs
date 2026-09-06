/** Dev: prüft die live deployte Seite (Assets, Links, JS-Fehler, Layout). */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'https://chaos20140.github.io/rueso';
const b = await chromium.launch();
const results = [];
for (const [label, url, vp] of [
  ['Start 1440', BASE + '/', { width: 1440, height: 900 }],
  ['Start 375', BASE + '/', { width: 375, height: 812 }],
  ['Referenzen', BASE + '/referenzen.html', { width: 1440, height: 900 }],
  ['Kontakt', BASE + '/kontakt.html', { width: 1440, height: 900 }],
  ['EN Start', BASE + '/en/', { width: 1440, height: 900 }],
]) {
  const ctx = await b.newContext({ viewport: vp });
  const p = await ctx.newPage();
  const bad = [];
  p.on('pageerror', e => bad.push('JS: ' + e.message));
  p.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  p.on('requestfailed', r => bad.push(`FAIL ${r.url()} (${r.failure()?.errorText})`));
  await p.goto(url, { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(3000);
  await p.evaluate(async () => { window.scrollTo(0, document.body.scrollHeight); await new Promise(r => setTimeout(r, 1200)); window.scrollTo(0, 0); });
  await p.waitForTimeout(2000);
  const info = await p.evaluate(() => ({
    title: document.title.slice(0, 50),
    height: document.documentElement.scrollHeight,
    fontOk: document.fonts.check('47px Figtree'),
    h1: (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
    imgsBroken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length,
    imgsTotal: document.images.length,
    hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  results.push({ label, ...info, problems: [...new Set(bad)] });
  await ctx.close();
}
await b.close();
for (const r of results) {
  console.log(`\n── ${r.label}`);
  console.log(`   ${r.title}`);
  console.log(`   Höhe ${r.height}px · h1 "${r.h1}" · Figtree=${r.fontOk} · Bilder ${r.imgsTotal - r.imgsBroken}/${r.imgsTotal} · h-Scroll=${r.hScroll}`);
  if (r.problems.length) console.log('   PROBLEME:\n     ' + r.problems.slice(0, 8).join('\n     '));
  else console.log('   keine Netzwerk- oder JS-Fehler');
}
