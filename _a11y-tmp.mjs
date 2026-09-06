import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:51234';
const PAGES = {
  start: ['RUESO-Start.dc.html', 'index.html'],
  fassaden: ['RUESO-Fassaden.dc.html', 'fassaden.html'],
  fenster: ['RUESO-Fenster.dc.html', 'fenster.html'],
  objekttueren: ['RUESO-Objekttueren.dc.html', 'objekttueren.html'],
  brandschutz: ['RUESO-Brandschutz.dc.html', 'brandschutz.html'],
  schiebetueren: ['RUESO-Schiebetueren.dc.html', 'schiebetueren.html'],
  schiebewaende: ['RUESO-Schiebewaende.dc.html', 'schiebewaende.html'],
  referenzen: ['RUESO-Referenzen.dc.html', 'referenzen.html'],
  unternehmen: ['RUESO-Unternehmen.dc.html', 'unternehmen.html'],
  karriere: ['RUESO-Karriere.dc.html', 'karriere.html'],
  kontakt: ['RUESO-Kontakt.dc.html', 'kontakt.html'],
};

const COLLECT = `(() => {
  const SEL = 'a[href],button,input,select,textarea,summary,[tabindex],[contenteditable=""],[contenteditable="true"],iframe,video[controls],audio[controls]';
  const vis = el => {
    let n = el;
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.contentVisibility === 'hidden') return false;
      n = n.parentElement;
    }
    return true;
  };
  const focusables = [...document.querySelectorAll(SEL)]
    .filter(el => !el.disabled && el.getAttribute('tabindex') !== '-1' && !el.closest('[inert]'))
    .filter(vis);
  const name = el => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('alt') || '').replace(/\s+/g,' ').trim().slice(0,45);
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis)
    .map(h => h.tagName + ':' + (h.textContent||'').replace(/\s+/g,' ').trim().slice(0,45));
  const landmarks = [...document.querySelectorAll('main,nav,header,footer,aside,form,section[aria-label],[role]')].filter(vis)
    .map(e => e.tagName.toLowerCase() + (e.getAttribute('role')?'['+e.getAttribute('role')+']':'') + (e.getAttribute('aria-label')?'{'+e.getAttribute('aria-label')+'}':''));
  return {
    focus: focusables.map(el => el.tagName + '|' + name(el)),
    nFocus: focusables.length,
    headings, landmarks,
    h1: headings.filter(h=>h.startsWith('H1:')).length,
    imgsNoAlt: [...document.querySelectorAll('img:not([alt])')].length,
    ariaHiddenFocusable: focusables.filter(el => el.closest('[aria-hidden="true"]')).map(el => el.tagName+'|'+name(el)),
    dupIds: (()=>{const s=new Set(),d=[];document.querySelectorAll('[id]').forEach(e=>{if(s.has(e.id))d.push(e.id);s.add(e.id)});return d;})(),
  };
})()`;

const browser = await chromium.launch();
const out = {};
for (const [key, [design, built]] of Object.entries(PAGES)) {
  for (const w of [1440, 375]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.route('**/*.mp4', r => r.abort());
    const rows = {};
    for (const [label, url] of [['ref', `${BASE}/_design/${design}`], ['new', `${BASE}/${built}`]]) {
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(String(e).slice(0,120)));
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 45000 });
        await page.waitForTimeout(label === 'ref' ? 6000 : 2500);
        rows[label] = await page.evaluate(COLLECT);
        rows[label].errs = errs;
      } catch (e) { rows[label] = { error: String(e).slice(0,160) }; }
      await page.close();
    }
    out[`${key}@${w}`] = rows;
    await ctx.close();
  }
}
await browser.close();
console.log(JSON.stringify(out));
