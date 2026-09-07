import { chromium } from 'playwright';
const B = 'http://127.0.0.1:51234';
const browser = await chromium.launch();
const log = (...a) => console.log(...a);

const desc = `(el => el ? el.tagName + '|' + ((el.getAttribute('aria-label')||el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,40)) : 'NONE')`;

async function mk(w, h = 800) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.route('**/*.mp4', r => r.abort());
  return ctx;
}
async function open(ctx, url, wait = 2500) {
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  await p.goto(url, { waitUntil: 'load', timeout: 45000 });
  await p.waitForTimeout(wait);
  p._errs = errs;
  return p;
}

/* ---------- 1. Mobilmenue: Scrollposition + html-overflow ---------- */
log('\n=== 1. Mobilmenue @375 ===');
for (const [label, url, wait] of [['NEU', `${B}/index.html`, 2500], ['REF', `${B}/_design/RUESO-Start.dc.html`, 6000]]) {
  const ctx = await mk(375, 812);
  const p = await open(ctx, url, wait);
  await p.evaluate(() => window.scrollTo(0, 2000));
  await p.waitForTimeout(400);
  const before = await p.evaluate(() => ({ y: Math.round(window.scrollY), html: getComputedStyle(document.documentElement).overflowY, body: getComputedStyle(document.body).overflowY }));
  const burger = await p.$('button[aria-label="Menü"], button[aria-label="Menu"]');
  await burger.click();
  await p.waitForTimeout(700);
  const during = await p.evaluate(() => ({ y: Math.round(window.scrollY), html: getComputedStyle(document.documentElement).overflowY, bodyTop: Math.round(document.body.getBoundingClientRect().top), active: document.activeElement.tagName }));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(600);
  const after = await p.evaluate(() => ({ y: Math.round(window.scrollY), html: getComputedStyle(document.documentElement).overflowY, menuStillOpen: !!document.querySelector('[data-toggle="menu"]:not([hidden])') }));
  log(label, 'vor', JSON.stringify(before), '\n     auf', JSON.stringify(during), '\n     zu ', JSON.stringify(after), p._errs.length ? ('ERR ' + p._errs) : '');
  await ctx.close();
}

/* ---------- 2. Mobilmenue: Tab-Reihenfolge waehrend offen ---------- */
log('\n=== 2. Fokus im offenen Mobilmenue @375 ===');
for (const [label, url, wait] of [['NEU', `${B}/index.html`, 2500], ['REF', `${B}/_design/RUESO-Start.dc.html`, 6000]]) {
  const ctx = await mk(375, 812);
  const p = await open(ctx, url, wait);
  const burger = await p.$('button[aria-label="Menü"], button[aria-label="Menu"]');
  await burger.click(); await p.waitForTimeout(600);
  const seq = [];
  for (let i = 0; i < 9; i++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(`${desc}(document.activeElement)`)); }
  log(label, JSON.stringify(seq));
  await ctx.close();
}

/* ---------- 3. Leistungen-Dropdown per Tastatur @1440 ---------- */
log('\n=== 3. Leistungen-Dropdown Tastatur @1440 ===');
for (const [label, url, wait] of [['NEU', `${B}/index.html`, 2500], ['REF', `${B}/_design/RUESO-Start.dc.html`, 6000]]) {
  const ctx = await mk(1440, 900);
  const p = await open(ctx, url, wait);
  const seq = [];
  for (let i = 0; i < 12; i++) { await p.keyboard.press('Tab'); await p.waitForTimeout(80); seq.push(await p.evaluate(`${desc}(document.activeElement)`)); }
  log(label, JSON.stringify(seq));
  await ctx.close();
}

/* ---------- 4. Projektdialog @1440 ---------- */
log('\n=== 4. Projektdialog referenzen @1440 ===');
for (const [label, url, wait] of [['NEU', `${B}/referenzen.html`, 2500], ['REF', `${B}/_design/RUESO-Referenzen.dc.html`, 6000]]) {
  const ctx = await mk(1440, 900);
  const p = await open(ctx, url, wait);
  const cards = await p.$$('button');
  let target = null;
  for (const b of cards) { if (await b.$('img')) { target = b; break; } }
  if (!target) { log(label, 'keine Karte gefunden'); await ctx.close(); continue; }
  await target.click(); await p.waitForTimeout(800);
  const st = await p.evaluate(`(() => {
    const dlgs = [...document.querySelectorAll('[role=dialog]')];
    const dlg = dlgs.find(d => d.getBoundingClientRect().width > 0);
    const inDlg = el => dlg && dlg.contains(el);
    const SEL='a[href],button,input,select,textarea,[tabindex]';
    const visible = el => { let n=el; while(n&&n.nodeType===1){const c=getComputedStyle(n); if(c.display==='none'||c.visibility==='hidden')return false; n=n.parentElement;} return true; };
    const all=[...document.querySelectorAll(SEL)].filter(visible).filter(e=>!e.disabled&&e.getAttribute('tabindex')!=='-1');
    return { dialogsInDom: dlgs.length, dialogsVisible: dlgs.filter(d=>d.getBoundingClientRect().width>0).length,
      active: ${desc}(document.activeElement), activeInDialog: inDlg(document.activeElement),
      focusablesTotal: all.length, focusablesOutsideDialog: all.filter(e=>!inDlg(e)).length,
      bodyOverflow: document.body.style.overflow,
      dialogLabel: dlg ? (dlg.getAttribute('aria-label')||dlg.getAttribute('aria-labelledby')||'(keins)') : 'kein-dialog' };
  })()`);
  log(label, JSON.stringify(st));
  const seq = [];
  for (let i = 0; i < 6; i++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(`${desc}(document.activeElement)`)); }
  log('   Tab:', JSON.stringify(seq));
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  log('   nach Esc aktiv:', await p.evaluate(`${desc}(document.activeElement)`), '| bodyOverflow=' + JSON.stringify(await p.evaluate('document.body.style.overflow')));
  await ctx.close();
}

/* ---------- 5. Filter-Chips ---------- */
log('\n=== 5. Filter referenzen @1440 ===');
for (const [label, url, wait] of [['NEU', `${B}/referenzen.html`, 2500], ['REF', `${B}/_design/RUESO-Referenzen.dc.html`, 6000]]) {
  const ctx = await mk(1440, 900);
  const p = await open(ctx, url, wait);
  const chips = await p.$$('button');
  let fassade = null;
  for (const c of chips) { const t = (await c.textContent()).trim(); if (/^Fassade$/i.test(t)) { fassade = c; break; } }
  if (!fassade) { log(label, 'kein Fassade-Chip'); await ctx.close(); continue; }
  await fassade.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
  const st = await p.evaluate(`(() => {
    const visible = el => { let n=el; while(n&&n.nodeType===1){const c=getComputedStyle(n); if(c.display==='none'||c.visibility==='hidden')return false; n=n.parentElement;} return true; };
    const cards=[...document.querySelectorAll('button')].filter(b=>b.querySelector('img'));
    return { cardsInDom: cards.length, cardsVisible: cards.filter(visible).length,
      count: (document.body.innerText.match(/\\b\\d\\d\\b/)||[''])[0],
      pressed: [...document.querySelectorAll('[aria-pressed]')].map(b=>b.textContent.trim()+':'+b.getAttribute('aria-pressed')),
      liveRegions: document.querySelectorAll('[aria-live]').length,
      active: ${desc}(document.activeElement) };
  })()`);
  log(label, JSON.stringify(st));
  await ctx.close();
}

/* ---------- 6. FAQ ---------- */
log('\n=== 6. FAQ index @1440 ===');
for (const [label, url, wait] of [['NEU', `${B}/index.html`, 2500], ['REF', `${B}/_design/RUESO-Start.dc.html`, 6000]]) {
  const ctx = await mk(1440, 900);
  const p = await open(ctx, url, wait);
  const st = await p.evaluate(`(() => {
    const btns=[...document.querySelectorAll('button[aria-expanded]')];
    return btns.map(b => ({ t: b.textContent.replace(/\\s+/g,' ').trim().slice(0,26), exp: b.getAttribute('aria-expanded'),
      ctrl: b.getAttribute('aria-controls')||'(keins)',
      panelH: b.nextElementSibling ? Math.round(b.nextElementSibling.getBoundingClientRect().height) : -1,
      panelDisplayNone: b.nextElementSibling ? (getComputedStyle(b.nextElementSibling).display==='none') : null,
      panelText: b.nextElementSibling ? b.nextElementSibling.innerText.trim().length : -1 }));
  })()`);
  log(label, JSON.stringify(st));
  await ctx.close();
}

await browser.close();
