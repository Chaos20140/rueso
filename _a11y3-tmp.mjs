import { chromium } from 'playwright';
const B = 'http://127.0.0.1:51234';
const browser = await chromium.launch();
const log = (...a) => console.log(...a);
const desc = `(el => el ? el.tagName + '|' + ((el.getAttribute('aria-label')||el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,40)) : 'NONE')`;

async function mk(w, h = 900) {
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

/* --- 5. Filter, korrekt --- */
log('=== 5. Filter referenzen @1440 ===');
for (const [label, url, wait] of [['NEU', `${B}/referenzen.html`, 2500], ['REF', `${B}/_design/RUESO-Referenzen.dc.html`, 6000]]) {
  const ctx = await mk(1440);
  const p = await open(ctx, url, wait);
  const chipTexts = await p.evaluate(`[...document.querySelectorAll('button')].filter(b=>!b.querySelector('img')).map(b=>b.textContent.trim()).slice(0,12)`);
  log(label, 'Chips:', JSON.stringify(chipTexts));
  const ok = await p.evaluate(`(() => { const b=[...document.querySelectorAll('button')].find(b=>/fassade/i.test(b.textContent.trim())&&b.textContent.trim().length<12); if(!b) return false; b.focus(); return true; })()`);
  if (!ok) { log(label, 'Chip nicht gefunden'); await ctx.close(); continue; }
  await p.keyboard.press('Enter');
  await p.waitForTimeout(700);
  const st = await p.evaluate(`(() => {
    const visible = el => { let n=el; while(n&&n.nodeType===1){const c=getComputedStyle(n); if(c.display==='none'||c.visibility==='hidden')return false; n=n.parentElement;} return true; };
    const cards=[...document.querySelectorAll('button')].filter(b=>b.querySelector('img'));
    return { cardsInDom: cards.length, cardsVisible: cards.filter(visible).length,
      pressed: [...document.querySelectorAll('[aria-pressed]')].map(b=>b.textContent.trim()+':'+b.getAttribute('aria-pressed')),
      liveRegions: document.querySelectorAll('[aria-live]').length,
      active: ${desc}(document.activeElement) };
  })()`);
  log(label, JSON.stringify(st));
  await ctx.close();
}

/* --- 7. EN-Seiten: Fokusparitaet zu DE --- */
log('\n=== 7. en/ gegen de @1440 ===');
const PAGES = ['index.html','fassaden.html','fenster.html','objekttueren.html','brandschutz.html','schiebetueren.html','schiebewaende.html','referenzen.html','unternehmen.html','karriere.html','kontakt.html'];
const collect = `(() => {
  const SEL='a[href],button,input,select,textarea,[tabindex]';
  const visible = el => { let n=el; while(n&&n.nodeType===1){const c=getComputedStyle(n); if(c.display==='none'||c.visibility==='hidden')return false; n=n.parentElement;} return true; };
  const f=[...document.querySelectorAll(SEL)].filter(visible).filter(e=>!e.disabled&&e.getAttribute('tabindex')!=='-1');
  return { n:f.length, lang: document.documentElement.lang, h: [...document.querySelectorAll('h1,h2,h3,h4')].filter(visible).length,
    labelless: [...document.querySelectorAll('input,textarea,select')].filter(i=>!i.labels?.length && !i.getAttribute('aria-label') && !i.getAttribute('aria-labelledby') && i.type!=='hidden').map(i=>i.name||i.type),
    dupIds: (()=>{const s=new Set(),d=[];document.querySelectorAll('[id]').forEach(e=>{if(s.has(e.id))d.push(e.id);s.add(e.id)});return d;})(),
    imgNoAlt: [...document.querySelectorAll('img:not([alt])')].length,
    emptyLinks: [...document.querySelectorAll('a[href]')].filter(visible).filter(a=>!(a.textContent||'').trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]:not([alt=""])')).length };
})()`;
{
  const ctx = await mk(1440);
  for (const f of PAGES) {
    const de = await open(ctx, `${B}/${f}`, 2000); const dd = await de.evaluate(collect); const de_err = de._errs; await de.close();
    const en = await open(ctx, `${B}/en/${f}`, 2000); const ee = await en.evaluate(collect); const en_err = en._errs; await en.close();
    const flag = (dd.n !== ee.n || dd.h !== ee.h) ? '  <<< DIFF' : '';
    log(f.padEnd(20), 'de', JSON.stringify(dd), flag);
    if (flag || ee.labelless.length || ee.dupIds.length || ee.emptyLinks || ee.imgNoAlt || ee.lang !== 'en')
      log(''.padEnd(20), 'en', JSON.stringify(ee));
    if (de_err.length || en_err.length) log('   JSERR', de_err, en_err);
  }
  await ctx.close();
}

/* --- 8. Dialog @375 + Menue-Interaktion --- */
log('\n=== 8. Dialog @375 ===');
{
  const ctx = await mk(375, 812);
  const p = await open(ctx, `${B}/referenzen.html`, 2500);
  const r = await p.evaluate(`(() => { const c=[...document.querySelectorAll('button')].filter(b=>b.querySelector('img'))[0]; c.click(); return 1; })()`);
  await p.waitForTimeout(700);
  log('NEU offen:', await p.evaluate(`(() => ({ visDlg:[...document.querySelectorAll('[role=dialog]')].filter(d=>d.getBoundingClientRect().width>0).length, active:${desc}(document.activeElement), bodyOv:document.body.style.overflow, htmlOv:document.documentElement.style.overflow }))()`));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  log('NEU nach Esc:', await p.evaluate(`(() => ({ visDlg:[...document.querySelectorAll('[role=dialog]')].filter(d=>d.getBoundingClientRect().width>0).length, bodyOv:document.body.style.overflow, htmlOv:document.documentElement.style.overflow, scrollY:Math.round(scrollY) }))()`));
  await ctx.close();
}

/* --- 9. Kontaktformular --- */
log('\n=== 9. Kontaktformular @1440 ===');
for (const [label, url, wait] of [['NEU', `${B}/kontakt.html`, 2500], ['REF', `${B}/_design/RUESO-Kontakt.dc.html`, 6000]]) {
  const ctx = await mk(1440);
  const p = await open(ctx, url, wait);
  log(label, await p.evaluate(`(() => {
    const fs=[...document.querySelectorAll('input,textarea,select')];
    return { fields: fs.map(i=>({ n:i.name||'(kein name)', t:i.type, req:i.required, label:(i.labels&&i.labels[0]?i.labels[0].textContent.trim().slice(0,20):'') || i.getAttribute('aria-label') || '(KEIN LABEL)', ph:i.placeholder||'' })),
      forms: document.querySelectorAll('form').length,
      submits: [...document.querySelectorAll('button[type=submit],input[type=submit]')].map(b=>b.textContent.trim()) };
  })()`));
  await ctx.close();
}

await browser.close();
