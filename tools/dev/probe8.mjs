import { chromium } from 'playwright';
const PORT = process.env.PORT || '65311';
const b = await chromium.launch();
for (const [l, u] of [['REF', `http://127.0.0.1:${PORT}/_design/RUESO-Referenzen.dc.html`], ['NEU', `http://127.0.0.1:${PORT}/referenzen.html`]]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/*.mp4', r => r.abort());
  const p = await ctx.newPage();
  await p.goto(u, { waitUntil: 'load' }); await p.waitForTimeout(3000);
  console.log('\n== ' + l);
  console.log(await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(x => /^(Alle|All)$/.test(x.textContent.trim()));
    const spans = [...document.querySelectorAll('span')].filter(s => /^(Alle|Fassaden)$/.test(s.textContent.trim()));
    return {
      buttonHTML: btns[0] ? btns[0].outerHTML.slice(0, 240) : null,
      spansMitLabel: spans.map(s => ({ parent: s.parentElement.tagName, cls: s.className, txt: s.textContent.trim(), html: s.outerHTML.slice(0, 90) })),
    };
  }));
  await ctx.close();
}
await b.close();
