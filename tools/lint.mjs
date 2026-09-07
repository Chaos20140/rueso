/**
 * Statische Prüfung aller gebauten Seiten:
 * doppelte ids, Tag-Balance, Pflicht-Metadaten, Alt-Texte, Formularlabels,
 * Ziele interner Links, Asset-Referenzen.
 *
 *   node tools/lint.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const note = (file, msg) => problems.push(`${file}: ${msg}`);

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

const files = [
  ...fs.readdirSync(ROOT).filter(f => f.endsWith('.html')),
  ...fs.readdirSync(path.join(ROOT, 'en')).filter(f => f.endsWith('.html')).map(f => 'en/' + f),
];

for (const rel of files) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');

  /* --- doppelte ids --- */
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dupes.length) note(rel, `doppelte id: ${[...new Set(dupes)].join(', ')}`);

  /* --- Tag-Balance --- */
  const stack = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|[^">])*)>/g;
  let m;
  while ((m = tagRe.exec(html))) {
    const [, slash, tag, attrs] = m;
    const name = tag.toLowerCase();
    if (VOID.has(name)) continue;
    if (attrs.trimEnd().endsWith('/')) continue;
    if (slash) {
      const last = stack.pop();
      if (last !== name) { note(rel, `Tag-Balance: </${name}> schließt <${last}>`); break; }
    } else stack.push(name);
  }
  if (stack.length) note(rel, `nicht geschlossen: ${stack.slice(-4).join(' > ')}`);

  /* --- Pflicht-Metadaten ---
     Die 404-Seite ist kein indexierbares Dokument: canonical, hreflang und
     Open Graph wären dort falsch, nicht fehlend. */
  const isErrorPage = rel === '404.html';
  for (const [label, re, indexedOnly] of [
    ['<title>', /<title>[^<]{20,}<\/title>/, false],
    ['meta description', /<meta name="description" content="[^"]{60,}"/, true],
    ['canonical', /<link rel="canonical"/, true],
    ['hreflang de', /hreflang="de"/, true],
    ['hreflang en', /hreflang="en"/, true],
    ['og:title', /property="og:title"/, true],
    ['lang-Attribut', /<html lang="(de|en)">/, false],
    ['viewport', /name="viewport"/, false],
    ['CSP', /http-equiv="Content-Security-Policy"/, false],
  ]) {
    if (indexedOnly && isErrorPage) continue;
    if (!re.test(html)) note(rel, `fehlt: ${label}`);
  }

  /* --- genau ein h1 --- */
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) note(rel, `${h1} <h1> (erwartet: 1)`);

  /* --- alt-Attribute --- */
  const imgs = [...html.matchAll(/<img((?:"[^"]*"|[^">])*)>/g)].map(x => x[1]);
  const noAlt = imgs.filter(a => !/\salt="/.test(a));
  if (noAlt.length) note(rel, `${noAlt.length} <img> ohne alt`);

  /* --- Formularfelder brauchen ein Label --- */
  const fields = [...html.matchAll(/<(input|textarea|select)((?:"[^"]*"|[^">])*)>/g)];
  const unlabeled = fields.filter(([full, , attrs]) => {
    if (/type="(hidden|submit|button)"/.test(attrs)) return false;
    const i = html.indexOf(full);
    // Feld liegt im Design innerhalb seines <label> — prüfen, ob davor ein
    // offenes <label> ohne schließendes </label> steht.
    const before = html.slice(Math.max(0, i - 2000), i);
    const lastOpen = before.lastIndexOf('<label');
    const lastClose = before.lastIndexOf('</label>');
    return !(lastOpen > lastClose);
  });
  if (unlabeled.length) note(rel, `${unlabeled.length} Formularfeld(er) ohne umschließendes <label>`);

  /* --- interne Links müssen existieren --- */
  const dir = path.dirname(path.join(ROOT, rel));
  for (const [, href] of html.matchAll(/href="([^"#][^"]*?)"/g)) {
    if (/^(https?:|mailto:|tel:|data:)/.test(href)) continue;
    const target = href.split('#')[0];
    if (!target) continue;
    const abs = path.resolve(dir, target.endsWith('/') ? target + 'index.html' : target);
    if (!fs.existsSync(abs)) note(rel, `Link ins Leere: ${href}`);
  }

  /* --- Assets --- */
  for (const [, src] of html.matchAll(/(?:src|href)="((?:\.\.\/)?assets\/[^"]+)"/g)) {
    if (!fs.existsSync(path.resolve(dir, src))) note(rel, `Asset fehlt: ${src}`);
  }

  /* --- Reste des Templates --- */
  for (const bad of ['{{', 'sc-if', 'sc-for', 'dc-import', 'hint-', 'style-hover', '.dc.html', 'undefined']) {
    if (html.includes(bad)) note(rel, `Template-Rest im Output: "${bad}"`);
  }
}

/* --- CSS-Klassen aus dem HTML müssen in site.css existieren --- */
const css = fs.readFileSync(path.join(ROOT, 'assets', 'css', 'site.css'), 'utf8');
const used = new Set();
for (const rel of files) {
  for (const [, list] of fs.readFileSync(path.join(ROOT, rel), 'utf8').matchAll(/\sclass="([^"]+)"/g)) {
    list.split(/\s+/).filter(Boolean).forEach(c => used.add(c));
  }
}
for (const c of used) if (!css.includes('.' + c)) problems.push(`site.css: Klasse .${c} wird verwendet, ist aber nicht definiert`);

console.log(`${files.length} Seiten geprüft, ${used.size} CSS-Klassen.`);
if (problems.length) {
  console.log('\n' + problems.map(p => '✗ ' + p).join('\n'));
  process.exitCode = 1;
} else {
  console.log('✓ keine Beanstandungen');
}
