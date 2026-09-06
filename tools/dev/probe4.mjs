import { chromium } from 'playwright';
const PORT = process.env.PORT || '65311';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1024, height: 900 } });
await p.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(1500);
console.log(await p.evaluate(() => {
  const mk = (ff) => {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;visibility:hidden;font:500 47.104px ${ff};width:16ch`;
    document.body.appendChild(d);
    const w = d.getBoundingClientRect().width; d.remove(); return Math.round(w * 100) / 100;
  };
  return {
    figtree: mk("Figtree"),
    systemui: mk("system-ui"),
    sans: mk("sans-serif"),
    stack: mk("Figtree,system-ui,sans-serif"),
    h2mw: getComputedStyle(document.querySelector('#leistungen h2')).maxWidth,
    fontsLoaded: document.fonts.status,
  };
}));
await b.close();
