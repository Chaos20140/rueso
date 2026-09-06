import { chromium } from 'playwright';
const PORT = process.env.PORT || '65311';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`http://127.0.0.1:${PORT}/referenzen.html`, { waitUntil: 'load' });
await p.waitForTimeout(2500);
console.log('errors:', errs.filter(e => !/ERR_/.test(e)));
console.log(await p.evaluate(() => ({
  chips: document.querySelectorAll('[data-act="filter"]').length,
  chipKeys: [...document.querySelectorAll('[data-act="filter"]')].map(c => c.dataset.key),
  cards: document.querySelectorAll('[data-act="modal-open"]').length,
  cardTags: [...document.querySelectorAll('[data-act="modal-open"]')].slice(0, 3).map(c => c.dataset.tags),
  refCount: document.querySelector('[data-ref-count]')?.textContent,
  cssRule: [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(r => r.cssText); } catch (e) { return []; } }).filter(t => /modal-open|data-toggle|data-modal/.test(t)),
})));
// Klick auf "Fassaden"
await p.locator('[data-act="filter"][data-key="fassade"]').click();
await p.waitForTimeout(800);
console.log('nach Klick:', await p.evaluate(() => ({
  refCount: document.querySelector('[data-ref-count]')?.textContent,
  hiddenAttr: [...document.querySelectorAll('[data-act="modal-open"]')].map(c => c.hidden).filter(Boolean).length,
  zeroHeight: [...document.querySelectorAll('[data-act="modal-open"]')].filter(c => c.getBoundingClientRect().height === 0).length,
  pressed: [...document.querySelectorAll('[data-act="filter"]')].map(c => c.getAttribute('aria-pressed')),
  firstHiddenDisplay: (() => { const c = [...document.querySelectorAll('[data-act="modal-open"]')].find(x => x.hidden); return c ? getComputedStyle(c).display : null; })(),
})));
await b.close();
