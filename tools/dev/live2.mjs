import { chromium } from 'playwright';
const BASE = process.argv[2] || 'https://chaos20140.github.io/rueso';
const b = await chromium.launch();

for (const [label, w] of [['1440', 1440], ['375', 375]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForTimeout(4000);
  await p.evaluate(async () => { window.scrollTo(0, document.body.scrollHeight); await new Promise(r => setTimeout(r, 1500)); window.scrollTo(0, 0); });
  await p.waitForTimeout(2500);
  console.log(`\n══ ${label}px`);
  console.log('kaputte Bilder:', await p.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc || i.src)));
  console.log('Video:', await p.evaluate(() => {
    const v = document.querySelector('video');
    if (!v) return null;
    return { readyState: v.readyState, paused: v.paused, currentTime: +v.currentTime.toFixed(2), w: v.videoWidth, h: v.videoHeight, currentSrc: (v.currentSrc || '').slice(-46), error: v.error && v.error.code };
  }));
  console.log('Overflow:', await p.evaluate(() => {
    const de = document.documentElement;
    const out = { scrollW: de.scrollWidth, clientW: de.clientWidth, bodyOverflowX: getComputedStyle(document.body).overflowX };
    // Welche Elemente ragen über den Viewport hinaus?
    const wide = [];
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > de.clientWidth + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed') {
        wide.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 20), id: el.id, right: Math.round(r.right), w: Math.round(r.width) });
      }
    });
    out.wide = wide.slice(0, 12);
    out.wideCount = wide.length;
    return out;
  }));
  // Kann man wirklich horizontal scrollen?
  console.log('scrollbar horizontal?', await p.evaluate(async () => {
    window.scrollTo(400, 0);
    await new Promise(r => setTimeout(r, 300));
    const x = window.scrollX;
    window.scrollTo(0, 0);
    return x;
  }));
  await ctx.close();
}
await b.close();
