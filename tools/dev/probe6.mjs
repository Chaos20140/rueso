/** Dev: horizontaler Überlauf und echtes Touch-Wischen, Original vs. Nachbau. */
import { chromium, devices } from 'playwright';
const PORT = process.env.PORT || '65311';
const b = await chromium.launch();
for (const [label, url] of [['ORIGINAL', `http://127.0.0.1:${PORT}/_design/RUESO-Start.dc.html`], ['NEUBAU', `http://127.0.0.1:${PORT}/index.html`]]) {
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await ctx.route('**/*.mp4', r => r.abort());
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(3500);
  const before = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, ovx: getComputedStyle(document.body).overflowX }));
  // echtes Wischen nach links
  await p.touchscreen.tap(180, 400);
  await p.evaluate(async () => {
    const el = document.elementFromPoint(180, 400);
    const t = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 400 });
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(300)], bubbles: true, cancelable: true }));
    for (let x = 300; x > 100; x -= 20) {
      el.dispatchEvent(new TouchEvent('touchmove', { touches: [t(x)], bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 16));
    }
    el.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 600));
  });
  const afterSwipe = await p.evaluate(() => window.scrollX);
  const programmatic = await p.evaluate(async () => { window.scrollTo(400, 0); await new Promise(r => setTimeout(r, 200)); const x = window.scrollX; window.scrollTo(0, 0); return x; });
  console.log(`${label.padEnd(9)} scrollW=${before.sw} clientW=${before.cw} body.overflowX=${before.ovx} | nach Wischen scrollX=${afterSwipe} | programmatisch=${programmatic}`);
  await ctx.close();
}
await b.close();
