import { chromium } from 'playwright';
import { PAGES, openCtx, BASE } from './zz-lib.mjs';

const INIT = () => {
  const RE = /^(scp[0-9a-z]+|s[hf][0-9]+)$/;
  const WS = /\s+/g;
  const norm = (t) => (t || '').replace(WS, ' ').trim();
  const rules = {};
  for (const sh of document.styleSheets) {
    let list;
    try { list = sh.cssRules; } catch (e) { continue; }
    for (const r of list) {
      if (!r.selectorText) continue;
      const m = r.selectorText.match(/^\.([A-Za-z0-9_-]+):([a-z-]+)$/);
      if (!m || !RE.test(m[1])) continue;
      const d = {};
      for (let i = 0; i < r.style.length; i++) {
        const p = r.style[i];
        d[p] = r.style.getPropertyValue(p).trim() + (r.style.getPropertyPriority(p) ? ' !important' : '');
      }
      (rules[m[1]] = rules[m[1]] || {})[m[2]] = d;
    }
  }
  const seen = new Map();
  const out = [];
  document.querySelectorAll('*').forEach((el) => {
    const cls = [...el.classList].filter((c) => RE.test(c));
    if (!cls.length) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const base = el.tagName + '|' + norm(el.textContent).slice(0, 36);
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    const merged = {};
    cls.forEach((c) => {
      const g = rules[c] || {};
      for (const ps of Object.keys(g)) merged[ps] = Object.assign(merged[ps] || {}, g[ps]);
    });
    const ser = Object.keys(merged).sort()
      .map((ps) => ps + '{' + Object.keys(merged[ps]).sort().map((k) => k + ':' + merged[ps][k]).join(';') + '}')
      .join(' ');
    out.push({
      key: base + '|#' + n,
      ser,
      visible: !!(r.width && r.height),
      inline: norm(el.getAttribute('style') || ''),
    });
  });
  return out;
};

const b = await chromium.launch();
let bad = 0;
for (const [key, [dc, built]] of Object.entries(PAGES)) {
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const [R, N] = await Promise.all([
      openCtx(b, `${BASE}/_design/${dc}`, w, h, { touch: w < 900 }),
      openCtx(b, `${BASE}/${built}`, w, h, { touch: w < 900 }),
    ]);
    const [a, c] = await Promise.all([R.page.evaluate(INIT), N.page.evaluate(INIT)]);
    const A = new Map(a.map((x) => [x.key, x]));
    const C = new Map(c.map((x) => [x.key, x]));
    const probs = [];
    for (const [k, v] of A) {
      const o = C.get(k);
      if (!o) { probs.push('fehlt im Nachbau: ' + k + '  (' + v.ser + ')'); continue; }
      if (o.ser !== v.ser) probs.push('Pseudo-Regel weicht ab: ' + k + '\n          ref ' + v.ser + '\n          neu ' + o.ser);
      if (o.inline !== v.inline) probs.push('Inline-Style weicht ab: ' + k + '\n          ref ' + v.inline + '\n          neu ' + o.inline);
      if (o.visible !== v.visible) probs.push('Sichtbarkeit weicht ab: ' + k + ' ref=' + v.visible + ' neu=' + o.visible);
    }
    const extra = [...C.keys()].filter((k) => !A.has(k));
    console.log((probs.length ? '  ABW ' : '  ok  ') + ' ' + key + ' @' + w + ' — ' + a.length + '/' + c.length + ' Elemente mit Hover-/Fokus-Regel');
    probs.slice(0, 12).forEach((p) => console.log('        ' + p));
    if (probs.length > 12) console.log('        ... und ' + (probs.length - 12) + ' weitere');
    if (extra.length) console.log('        (nur im Nachbau: ' + extra.join(' | ') + ')');
    bad += probs.length;
    await R.ctx.close();
    await N.ctx.close();
  }
}
await b.close();
console.log(bad ? '\n' + bad + ' Abweichung(en)' : '\nHover-/Fokus-Regeln ueberall identisch');
