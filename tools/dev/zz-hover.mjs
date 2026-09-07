import { chromium } from 'playwright';
import { PAGES, openCtx, freeze, settle, BASE } from './zz-lib.mjs';

const PROPS = ['backgroundColor','color','borderTopColor','borderBottomColor','transform','paddingLeft','opacity','boxShadow','textDecorationLine','outlineColor','outlineStyle','outlineWidth','borderTopWidth'];

const INIT = `
window.__els = function () {
  const isP = (el) => [...el.classList].some(c => /^(scp[0-9a-z]+|s[hf][0-9]+)$/.test(c));
  const seen = new Map(); const out = [];
  document.querySelectorAll('*').forEach(el => {
    if (!isP(el)) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const base = el.tagName + '|' + (el.textContent || '').replace(RegExp(String.fromCharCode(92)+'s+','g'),' ').trim().slice(0,36);
    const n = seen.get(base) || 0; seen.set(base, n + 1);
    out.push({ key: base + '|#' + n, el });
  });
  return out;
};
window.__keys = () => window.__els().map(x => x.key);
window.__find = (k) => { const h = window.__els().find(x => x.key === k); return h ? h.el : null; };
window.__center = (k) => { const el = window.__find(k); if (!el) return null;
  el.scrollIntoView({ block: 'center', inline: 'center' });
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) }; };
window.__style = (k, props) => { const el = window.__find(k); if (!el) return null;
  const cs = getComputedStyle(el); const o = {}; props.forEach(p => o[p] = cs[p]); return o; };
`;

const b = await chromium.launch();
const only = process.argv[2];
let bad = 0;
for (const [key, [dc, built]] of Object.entries(PAGES)) {
  if (only && only !== key) continue;
  const [R, N] = await Promise.all([
    openCtx(b, `${BASE}/_design/${dc}`, 1440, 900),
    openCtx(b, `${BASE}/${built}`, 1440, 900),
  ]);
  await Promise.all([R, N].map(async P => { await P.page.evaluate(INIT); await settle(P.page); }));
  const [a, c] = await Promise.all([R.page.evaluate(() => window.__keys()), N.page.evaluate(() => window.__keys())]);
  console.log(`\n══ Hover-/Fokus-Matrix · ${key} @1440 — ${a.length} ref / ${c.length} neu ══`);
  const missing = a.filter(k => !c.includes(k));
  const extra = c.filter(k => !a.includes(k));
  if (missing.length) { bad++; console.log('  ABW  fehlt im Nachbau: ' + missing.join(' | ')); }
  if (extra.length) console.log('  info zusätzlich im Nachbau: ' + extra.join(' | '));

  for (const k of a) {
    if (!c.includes(k)) continue;
    const measure = async (P) => {
      await P.page.mouse.move(3, 870);
      await P.page.evaluate((kk) => window.__center(kk), k);
      await P.page.waitForTimeout(250);
      const pos = await P.page.evaluate((kk) => window.__center(kk), k);
      const before = await P.page.evaluate(([kk, pp]) => window.__style(kk, pp), [k, PROPS]);
      await P.page.mouse.move(pos.x, pos.y);
      await P.page.waitForTimeout(600);
      await freeze(P.page);
      const after = await P.page.evaluate(([kk, pp]) => window.__style(kk, pp), [k, PROPS]);
      return { before, after };
    };
    const [x, y] = await Promise.all([measure(R), measure(N)]);
    const same = JSON.stringify(x) === JSON.stringify(y);
    if (!same) {
      bad++;
      console.log(`  ABW  ${k}`);
      for (const p of PROPS) {
        if (x.before[p] !== y.before[p]) console.log(`        Ruhe  ${p}: ref="${x.before[p]}" neu="${y.before[p]}"`);
        if (x.after[p] !== y.after[p]) console.log(`        Hover ${p}: ref="${x.after[p]}" neu="${y.after[p]}"`);
      }
    } else if (JSON.stringify(x.before) === JSON.stringify(x.after)) {
      console.log(`  info  ${k} — Hover bewirkt beidseitig nichts`);
    }
  }
  await R.ctx.close(); await N.ctx.close();
}
await b.close();
console.log(bad ? `\n✗ ${bad} Abweichung(en)` : '\n✓ Hover identisch');
