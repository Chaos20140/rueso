/** Dev: Belegbilder der Live-Seite (Desktop + Mobil, mehrere Abschnitte). */
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.argv[2] || 'https://chaos20140.github.io/rueso';
fs.mkdirSync('.shots/live', { recursive: true });
const b = await chromium.launch();

for (const [name, w, h, stops] of [
  ['desktop', 1440, 900, [0, 0.13, 0.36, 0.55]],
  ['mobil', 390, 844, [0, 0.16, 0.42]],
]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 900, hasTouch: w < 900 });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForTimeout(4000);
  await p.evaluate(async () => { window.scrollTo(0, document.body.scrollHeight); await new Promise(r => setTimeout(r, 1500)); window.scrollTo(0, 0); });
  await p.waitForTimeout(3000);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (const [i, f] of stops.entries()) {
    const y = Math.round((H - h) * f);
    await p.evaluate((yy) => window.scrollTo(0, yy + 2), y);
    await p.waitForTimeout(300);
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `.shots/live/${name}-${i}.png` });
  }
  await ctx.close();
  console.log(name + ' ok');
}
await b.close();
