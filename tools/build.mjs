/**
 * RÜSO — Build: kompiliert die Claude-Design-Templates (_design/*.dc.html)
 * zu einer statischen Website (HTML/CSS/JS), zweisprachig DE + EN.
 *
 * Grundsatz: STRING-Transformation, kein DOM-Reparse.
 * Dadurch bleibt jedes style-Attribut, jedes Leerzeichen und jede Textstelle
 * byte-identisch zum Design. Übersetzt werden ausschließlich die dc-Direktiven
 * (sc-if / sc-for / {{ }} / dc-import) und die React-Attribute.
 *
 *   node tools/build.mjs
 *
 * Vollständige Mechanik: siehe CLAUDE.md → "Build-Pipeline".
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESIGN = path.join(ROOT, '_design');
const OUT = ROOT;
const SITE = 'https://chaos20140.github.io/rueso';

const read = (f) => fs.readFileSync(path.join(DESIGN, f), 'utf8');

/* ================================================================== *
 * 1. Template-Extraktion
 * ================================================================== */

/** Holt <helmet>-Inhalt und den <x-dc>-Rumpf aus einer .dc.html-Datei. */
function parseDc(file) {
  const src = read(file);
  const open = /<x-dc(?:\s[^>]*)?>/.exec(src);
  const close = src.lastIndexOf('</x-dc>');
  if (!open || close < 0) throw new Error(`${file}: kein <x-dc>-Block`);
  let body = src.slice(open.index + open[0].length, close);
  let helmet = '';
  const hm = /<helmet>([\s\S]*?)<\/helmet>/.exec(body);
  if (hm) { helmet = hm[1]; body = body.replace(hm[0], ''); }
  return { helmet, body };
}

/* ================================================================== *
 * 2. Ausdrucks-Auflösung
 * ================================================================== */

const MISSING = Symbol('missing');

function resolve(expr, scope) {
  const e = expr.trim();
  if (e === 'true') return true;
  if (e === 'false') return false;
  let cur = scope;
  for (const part of e.split('.')) {
    if (cur == null || !(part in cur)) return MISSING;
    cur = cur[part];
  }
  return cur;
}

const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escHtml(s).replace(/"/g, '&quot;');

function interpolate(str, scope, attrMode = false) {
  return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (m, expr) => {
    const v = resolve(expr, scope);
    if (v === MISSING || v == null) return '';
    return attrMode ? escAttr(v) : escHtml(v);
  });
}

/* ================================================================== *
 * 3. sc-if / sc-for — Blockexpansion mit korrekter Verschachtelung
 * ================================================================== */

function matchClose(src, tag, from) {
  const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'g');
  re.lastIndex = from;
  let depth = 1, m;
  while ((m = re.exec(src))) {
    if (m[0][1] === '/') { if (--depth === 0) return { start: m.index, end: re.lastIndex }; }
    else depth++;
  }
  throw new Error(`Kein schließendes </${tag}>`);
}

const attrOf = (tag, name) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
};

/**
 * Auflösungsmodi für sc-if:
 *   true / false          → Zweig statisch behalten bzw. verwerfen
 *   {css:'only-mobile'}   → beide Zweige ins HTML, Umschaltung per Media-Query
 *   {js:'menu'}           → Zweig ins HTML, initial versteckt, JS schaltet
 *   {each,as,key}         → Zweig je Listeneintrag, versteckt (Referenz-Dialoge)
 */
function ifMode(expr, scope, cfg) {
  if (Object.prototype.hasOwnProperty.call(cfg, expr)) return cfg[expr];
  const v = resolve(expr, scope);
  return v !== MISSING && !!v;
}

function expand(src, scope, ctx) {
  let out = '';
  let i = 0;
  const re = /<sc-(if|for)\b/g;
  for (;;) {
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m) { out += transformChunk(src.slice(i), scope, ctx); break; }
    out += transformChunk(src.slice(i, m.index), scope, ctx);

    const tagEnd = src.indexOf('>', m.index) + 1;
    const tag = src.slice(m.index, tagEnd);
    const kind = m[1];
    const close = matchClose(src, `sc-${kind}`, tagEnd);
    const inner = src.slice(tagEnd, close.start);

    if (kind === 'if') {
      const expr = (attrOf(tag, 'value') || '').replace(/\{\{\s*|\s*\}\}/g, '').trim();
      const mode = ifMode(expr, scope, ctx.ifConfig);
      if (mode === true) {
        out += expand(inner, scope, ctx);
      } else if (mode && mode.css) {
        let html = expand(inner, scope, ctx);
        // Beide Layoutvarianten liegen im DOM → ids der Mobilvariante suffixen.
        if (mode.css === 'only-mobile') html = html.replace(/\sid="([^"]+)"/g, ' id="$1-mobil"');
        out += `<div class="${mode.css}">${html}</div>`;
      } else if (mode && mode.js) {
        out += `<div data-toggle="${mode.js}" hidden>${expand(inner, scope, ctx)}</div>`;
      } else if (mode && mode.each) {
        const list = resolve(mode.each, scope);
        for (const item of (list || [])) {
          out += `<div data-modal="${escAttr(item[mode.key])}" hidden>`
            + expand(inner, { ...scope, [mode.as]: item }, ctx) + '</div>';
        }
      }
      // mode === false → Zweig entfällt
    } else {
      const listExpr = (attrOf(tag, 'list') || '').replace(/\{\{\s*|\s*\}\}/g, '').trim();
      const as = attrOf(tag, 'as') || 'item';
      const list = resolve(listExpr, scope);
      if (Array.isArray(list)) list.forEach((item) => { out += expand(inner, { ...scope, [as]: item }, ctx); });
    }
    i = close.end;
  }
  return out;
}

/* ================================================================== *
 * 4. Attribut-Transformation (React-Syntax → HTML)
 * ================================================================== */

/**
 * onXxx="{{ ausdruck }}" → deklaratives data-Attribut, das assets/js/app.js
 * verdrahtet. {{ }} im Ersatztext wird anschließend normal interpoliert.
 */
const HANDLERS = {
  'f.toggle': 'data-act="faq"',
  'preventSubmit': 'data-act="prevent-submit"',
  'setDe': 'data-act="lang" data-lang="de"',
  'setEn': 'data-act="lang" data-lang="en"',
  'toggleMenu': 'data-act="menu-toggle"',
  'closeMenu': 'data-act="menu-close"',
  'openServices': 'data-svc-open',
  'closeServices': 'data-svc-close',
  'r.open': 'data-act="modal-open" data-key="{{ r.key }}"',
  'close': 'data-act="modal-close"',
  'stop': 'data-act="modal-stop"',
  'f.select': 'data-act="filter" data-key="{{ f.key }}"',
  't.select': 'data-act="topic" data-key="{{ t.key }}"',
};

const BOOL_ATTRS = { autoplay: 'autoplay', muted: 'muted', loop: 'loop', playsinline: 'playsinline', required: 'required' };

function transformChunk(chunk, scope, ctx) {
  let out = chunk.replace(/<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|[^">])*)>/g, (full, name, attrs) => {
    let a = attrs;

    a = a.replace(/\s+hint-[a-z-]+="[^"]*"/g, '');   // Editor-Metadaten
    a = a.replace(/\s+ref="\{\{[^"]*\}\}"/g, '');    // React-ref

    a = a.replace(/\s+on([A-Z][a-zA-Z]*)="\{\{\s*([^}]+?)\s*\}\}"/g, (mm, ev, expr) => {
      const repl = HANDLERS[expr];
      if (!repl) { ctx.warn.push(`Unbekannter Handler: on${ev}="${expr}"`); return ''; }
      return ' ' + repl;
    });

    a = a.replace(/\s+([a-zA-Z]+)="\{\{\s*(true|false)\s*\}\}"/g, (mm, attr, val) => {
      const html = BOOL_ATTRS[attr.toLowerCase()];
      if (!html) return mm;
      return val === 'true' ? ' ' + html : '';
    });

    const cls = [];
    a = a.replace(/\s+style-(hover|focus|active)="([^"]*)"/g, (mm, kind, decls) => {
      cls.push(ctx.styleClass(kind, decls));
      return '';
    });

    // FAQ-Index, damit app.js die Reihenfolge kennt
    if (a.includes('data-act="faq"') && scope.f && typeof scope.f.i === 'number') {
      a = a.replace('data-act="faq"', `data-act="faq" data-faq-i="${scope.f.i}"`);
    }
    // Referenz-Karten tragen ihre Tags für den Filter
    if (a.includes('data-act="modal-open"') && scope.r && Array.isArray(scope.r.tags)) {
      a = a.replace('data-act="modal-open"', `data-act="modal-open" data-tags="${scope.r.tags.join(' ')}"`);
    }

    if (cls.length) {
      if (/\sclass="/.test(a)) a = a.replace(/\sclass="([^"]*)"/, (mm, c) => ` class="${c} ${cls.join(' ')}"`);
      else a = ` class="${cls.join(' ')}"` + a;
    }

    a = interpolate(a, scope, true);
    // Leere Deklarationen aufräumen, die durch undefined-Werte entstehen
    // (z. B. `padding-top:{{ heroTop }}` auf Seiten ohne heroTop).
    a = a.replace(/style="([^"]*)"/, (mm, s) =>
      `style="${s.split(';').filter(d => !/^\s*[a-z-]+\s*:\s*$/.test(d)).join(';')}"`);
    return `<${name}${a}>`;
  });
  return interpolate(out, scope, false);
}

/* ================================================================== *
 * 5. CSS-Sammler für style-hover / style-focus
 * ================================================================== */

function createStyleCollector() {
  const map = new Map();
  const rules = [];
  return {
    rules,
    styleClass(kind, decls) {
      const key = kind + '|' + decls;
      if (map.has(key)) return map.get(key);
      const cls = `s${kind[0]}${map.size + 1}`;
      map.set(key, cls);
      // Inline-Styles schlagen Klassenregeln — daher !important, exakt so wie
      // das dc-Runtime den style-Wert im Hover-State komplett ersetzt.
      const body = decls.split(';').map(d => d.trim()).filter(Boolean)
        .map(d => (/!important$/.test(d) ? d : d + '!important')).join(';');
      const pseudo = kind === 'hover' ? ':hover' : kind === 'focus' ? ':focus' : ':active';
      rules.push(`.${cls}${pseudo}{${body}}`);
      return cls;
    },
  };
}

/* ================================================================== *
 * 6. Seitenregister
 * ================================================================== */

/** Design-Datei → Ausgabedatei. Steuert auch das Umschreiben der Links. */
const OUTPUT = {
  'RUESO-Start.dc.html': 'index.html',
  'RUESO-Fassaden.dc.html': 'fassaden.html',
  'RUESO-Fenster.dc.html': 'fenster.html',
  'RUESO-Objekttueren.dc.html': 'objekttueren.html',
  'RUESO-Brandschutz.dc.html': 'brandschutz.html',
  'RUESO-Schiebetueren.dc.html': 'schiebetueren.html',
  'RUESO-Schiebewaende.dc.html': 'schiebewaende.html',
  'RUESO-Referenzen.dc.html': 'referenzen.html',
  'RUESO-Unternehmen.dc.html': 'unternehmen.html',
  'RUESO-Karriere.dc.html': 'karriere.html',
  'RUESO-Kontakt.dc.html': 'kontakt.html',
  // RUESO-Mobile.dc.html ist eine Präsentations-Canvas des Design-Tools
  // (die Seiten im iPhone-Rahmen) und keine Website-Seite → nicht gebaut.
};

const T = {
  de: {
    start: ['RÜSO GmbH — Fassaden, Fenster und Türen aus Aluminium | Salzkotten', 'Konstruktiver Metallbau seit 1950: Pfosten-Riegel-Fassaden, Fenster, Objekt- und Automatiktüren, Brand- und Rauchschutz aus Aluminium und Glas – konstruiert, produziert und montiert in Salzkotten.'],
    fassaden: ['Fassaden aus Aluminium — Pfosten-Riegel-Systeme | RÜSO GmbH', 'Pfosten-Riegel-Fassaden aus Aluminium: Planung, eigene Fertigung in Salzkotten und Montage. Energieeffizient, wetterfest und gestalterisch frei.'],
    fenster: ['Aluminiumfenster — GEG-konform und einbruchhemmend | RÜSO GmbH', 'Aluminiumfenster für Wohnungsbau, Verwaltung und öffentliche Gebäude: exzellente Uw-Werte, RC2/RC3-Einbruchschutz, schmale Ansichtsbreiten.'],
    objekttueren: ['Objekt- und Automatiktüren aus Aluminium | RÜSO GmbH', 'Robuste Aluminiumtüren für stark frequentierte Gebäude: barrierefreie Zugänge, automatische Antriebe, Brand- und Rauchschutz auf Wunsch.'],
    brandschutz: ['Brand- und Rauchschutz — T30, T90, F30, F90 | RÜSO GmbH', 'Geprüfte Brandschutztüren und -verglasungen aus Aluminium: T30 und T90, F30 und F90, kombinierbar mit Schall- und Einbruchschutz.'],
    schiebetueren: ['Schiebetüren aus Aluminium und Glas | RÜSO GmbH', 'Großzügige Glasfronten mit barrierefreien Übergängen: maßgefertigte Aluminium-Schiebetüren aus eigener Produktion in Salzkotten.'],
    schiebewaende: ['Schiebewände aus Glas — flexible Raumtrennung | RÜSO GmbH', 'Ganzglas-Schiebewände für Büro, Ladenbau und Hotellerie: maximale Transparenz, optionaler Schallschutz, integrierbare Türlösungen.'],
    referenzen: ['Referenzen — realisierte Projekte | RÜSO GmbH', 'Fassaden, Fenster, Türen und Brandschutz für Kliniken, Schulen, Logistik und Gewerbe – eine Auswahl realisierter Projekte in ganz Deutschland.'],
    unternehmen: ['Unternehmen — RÜSO seit 1950 | RÜSO GmbH', 'Aus Rüther und Söhne wurde RÜSO: konstruktiver Metallbau seit 1950, seit 2021 Teil der PLONKA Gruppe, Werk und Verwaltung in Salzkotten.'],
    karriere: ['Karriere — offene Stellen | RÜSO GmbH', 'Monteure und Metallbauer (m/w/d) für Fenster- und Fassadenkonstruktion: unbefristet, Vollzeit, keine Schichtarbeit, Standort Salzkotten.'],
    kontakt: ['Kontakt — Projekt anfragen | RÜSO GmbH', 'RÜSO GmbH, Berglar 36 a, 33154 Salzkotten. Anfrage stellen – Antwort in der Regel innerhalb von 24 Stunden.'],
  },
  en: {
    start: ['RÜSO GmbH — Aluminium facades, windows and doors | Salzkotten', 'Structural metal construction since 1950: curtain-wall facades, windows, entrance and automatic doors, fire and smoke protection in aluminium and glass – engineered, produced and installed in Salzkotten.'],
    fassaden: ['Aluminium facades — curtain-wall systems | RÜSO GmbH', 'Aluminium curtain-wall facades: planning, in-house production in Salzkotten and installation. Energy-efficient, weatherproof and free in design.'],
    fenster: ['Aluminium windows — energy-efficient and secure | RÜSO GmbH', 'Aluminium windows for housing, offices and public buildings: excellent Uw values, RC2/RC3 burglary protection, slim face widths.'],
    objekttueren: ['Entrance and automatic doors in aluminium | RÜSO GmbH', 'Robust aluminium doors for high-traffic buildings: barrier-free access, automatic drives, optional fire and smoke protection.'],
    brandschutz: ['Fire and smoke protection — T30, T90, F30, F90 | RÜSO GmbH', 'Tested aluminium fire doors and glazing: T30 and T90, F30 and F90, combinable with acoustic insulation and burglar resistance.'],
    schiebetueren: ['Aluminium sliding doors | RÜSO GmbH', 'Generous glass fronts with barrier-free transitions: made-to-measure aluminium sliding doors from our own plant in Salzkotten.'],
    schiebewaende: ['Glass sliding walls — flexible room division | RÜSO GmbH', 'All-glass sliding walls for offices, shopfitting and hospitality: maximum transparency, optional acoustic insulation, integrated door solutions.'],
    referenzen: ['Projects — selected references | RÜSO GmbH', 'Facades, windows, doors and fire protection for hospitals, schools, logistics and commerce – a selection of projects realised across Germany.'],
    unternehmen: ['Company — RÜSO since 1950 | RÜSO GmbH', 'From Rüther und Söhne to RÜSO: structural metal construction since 1950, part of the PLONKA Group since 2021, plant and offices in Salzkotten.'],
    karriere: ['Careers — open positions | RÜSO GmbH', 'Installers and metal workers (m/f/d) for window and facade construction: permanent, full-time, no shift work, Salzkotten site.'],
    kontakt: ['Contact — request a project | RÜSO GmbH', 'RÜSO GmbH, Berglar 36 a, 33154 Salzkotten. Send an inquiry – we usually reply within 24 hours.'],
  },
};

/** Aktiv/inaktiv-Styles der Filter- und Themen-Chips (Werte aus dem Design). */
const chip = (on, borderOff) => ({
  bg: on ? '#15171B' : 'transparent',
  color: on ? '#FAF8F4' : '#15171B',
  border: on ? '#15171B' : borderOff,
});

/** Baut den renderVals-Scope je Seite — 1:1 aus den dc-Skripten übernommen. */
const SCOPES = {
  'RUESO-Start.dc.html': (d) => ({
    services: d.services, stages: d.stages, refsHome: d.refsHome,
    milestones: d.milestones, partnersLoop: d.partners.concat(d.partners),
    faq: d.faq.map((f, i) => ({ ...f, i, open: i === 0, rows: i === 0 ? '1fr' : '0fr', sign: i === 0 ? '–' : '+' })),
    heroTop: 'clamp(84px,12vh,132px)',
  }),
  'RUESO-Unternehmen.dc.html': (d) => ({
    milestones: d.milestones, partnersLoop: d.partners.concat(d.partners),
    heroTop: 'clamp(84px,12vh,132px)',
  }),
  'RUESO-Karriere.dc.html': (d) => ({
    jobs: d.jobs.map(j => ({ ...j, metaList: j.meta.map(m => ({ label: m })) })),
    jobCount: String(d.jobs.length).padStart(2, '0'),
    heroTop: 'clamp(84px,12vh,132px)',
  }),
  'RUESO-Referenzen.dc.html': (d, lang) => {
    const de = lang !== 'en';
    const dash = de ? 'Keine Angabe' : 'Not specified';
    return {
      // Startzustand: Filter "all" → alle Projekte sichtbar
      count: String(d.refs.length).padStart(2, '0'),
      filters: d.filters.map(x => ({ ...x, ...chip(x.key === 'all', 'rgba(21,23,27,.16)') })),
      visible: d.refs,
      refs: d.refs.map(r => ({
        ...r,
        clientText: r.client || dash,
        systemsText: r.systems || dash,
        photoText: r.photo || 'RÜSO GmbH',
      })),
    };
  },
  'RUESO-Kontakt.dc.html': (d, lang) => {
    const T2 = lang !== 'en'
      ? [['fassade', 'Fassade'], ['fenster', 'Fenster'], ['tueren', 'Türen'], ['brandschutz', 'Brandschutz'], ['schiebe', 'Schiebeanlagen'], ['sonst', 'Sonstiges']]
      : [['fassade', 'Facade'], ['fenster', 'Windows'], ['tueren', 'Doors'], ['brandschutz', 'Fire protection'], ['schiebe', 'Sliding systems'], ['sonst', 'Other']];
    return { topics: T2.map(([key, label]) => ({ key, label, ...chip(key === 'fassade', 'rgba(21,23,27,.18)') })) };
  },
};

/** Leistungsseiten: identischer Aufbau, nur anderer Datenschlüssel. */
const SERVICE_PAGES = {
  'RUESO-Fassaden.dc.html': ['fassaden', 'fassade'],
  'RUESO-Fenster.dc.html': ['fenster', 'fenster'],
  'RUESO-Objekttueren.dc.html': ['objekttueren', 'tueren'],
  'RUESO-Brandschutz.dc.html': ['brandschutz', 'brandschutz'],
  'RUESO-Schiebetueren.dc.html': ['schiebetueren', 'schiebe'],
  'RUESO-Schiebewaende.dc.html': ['schiebewaende', 'schiebe'],
};

/* ================================================================== *
 * 7. Assembly
 * ================================================================== */

function rewriteLinks(html) {
  return html.replace(/href="(RUESO-[^".]+\.dc\.html)(#[^"]*)?"/g, (m, file, hash) => {
    const target = OUTPUT[file];
    if (!target) return m;
    if (target === 'index.html') return `href="${hash ? './' + hash : './'}"`;
    return `href="${target}${hash || ''}"`;
  });
}

const PRELOAD = ['figtree-500-latin.woff2', 'figtree-400-latin.woff2', 'ibm-plex-mono-400-latin.woff2'];
const fontHead = (p) => [
  ...PRELOAD.map(f => `<link rel="preload" href="${p}assets/fonts/${f}" as="font" type="font/woff2" crossorigin>`),
  `<link rel="stylesheet" href="${p}assets/css/fonts.css">`,
].join('\n');

const helmetCss = (h) => [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1].trim()).join('\n');

const LAYOUT_CSS = `
/* --- Breakpoint-Umschaltung (im Design: window.innerWidth < 900) --- */
.only-mobile{display:contents}
.only-desktop{display:contents}
@media (min-width:900px){.only-mobile{display:none}}
@media (max-width:899px){.only-desktop{display:none}}
/* --- per JS geschaltete Bereiche (Menü, Dropdown, Projektdialog) --- */
[data-toggle],[data-modal]{display:contents}
/* !important, weil die Referenzkarten ein Inline-display:grid tragen und das
   sonst gegen das hidden-Attribut gewinnt. */
[data-toggle][hidden],[data-modal][hidden],[data-act="modal-open"][hidden]{display:none!important}
`;

async function main() {
  const content = await import(pathToFileURL(path.join(DESIGN, 'content.js')).href);
  const warn = [];
  const nav = parseDc('Nav.dc.html');
  const foot = parseDc('Footer.dc.html');
  const cssPerLang = {};
  let pages = 0;

  for (const lang of ['de', 'en']) {
    const data = content.getContent(lang);
    const de = lang !== 'en';
    const styles = createStyleCollector();
    const cssParts = [];

    for (const [file, outName] of Object.entries(OUTPUT)) {
      const slug = outName.replace('.html', '').replace('index', 'start');
      const page = parseDc(file);

      let extra = SCOPES[file] ? SCOPES[file](data, lang) : {};
      if (SERVICE_PAGES[file]) {
        const [key, tag] = SERVICE_PAGES[file];
        const p = content.getPage(key, lang);
        extra = {
          features: p.features, advantages: p.advantages,
          related: data.refs.filter(r => r.tags.includes(tag)).slice(0, 6),
          heroTop: 'clamp(84px,12vh,132px)',
        };
      }

      const scope = { lang, isDe: de, isEn: !de, navTop: '16px', ...extra };
      const ctx = {
        warn,
        styleClass: (k, d2) => styles.styleClass(k, d2),
        ifConfig: {
          isDe: de, isEn: !de,
          isMobileLayout: { css: 'only-mobile' }, isDesktopLayout: { css: 'only-desktop' },
          isMobile: { css: 'only-mobile' }, isDesktop: { css: 'only-desktop' },
          menuOpen: { js: 'menu' }, servicesOpen: { js: 'services' },
          showTestimonials: true,
          // Projektdialog: einmal je Referenz, versteckt; app.js blendet ein.
          hasOpen: { each: 'refs', as: 'open', key: 'key' },
        },
      };

      // Zähler der sichtbaren Projekte braucht einen Hook für app.js.
      let body = page.body.replace('<div><span>{{ count }}</span>', '<div><span data-ref-count>{{ count }}</span>');

      body = body
        .replace(/<dc-import\s+name="Nav"[^>]*><\/dc-import>/,
          () => expand(nav.body, { ...scope, topPad: scope.navTop }, ctx))
        .replace(/<dc-import\s+name="Footer"[^>]*><\/dc-import>/,
          () => expand(foot.body, scope, ctx));
      body = rewriteLinks(expand(body, scope, ctx));

      cssParts.push(helmetCss(page.helmet));

      const [title, desc] = T[lang][slug];
      const prefix = lang === 'en' ? '../' : '';
      const canonical = `${SITE}/${lang === 'en' ? 'en/' : ''}${outName === 'index.html' ? '' : outName}`;
      const alt = (l) => `${SITE}/${l === 'en' ? 'en/' : ''}${outName === 'index.html' ? '' : outName}`;

      const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(title)}</title>
<meta name="description" content="${escAttr(desc)}">
<meta name="theme-color" content="#15171B">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="de" href="${alt('de')}">
<link rel="alternate" hreflang="en" href="${alt('en')}">
<link rel="alternate" hreflang="x-default" href="${alt('de')}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${de ? 'de_DE' : 'en_GB'}">
<meta property="og:title" content="${escAttr(title)}">
<meta property="og:description" content="${escAttr(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="https://www.rueso.de/wp-content/uploads/2025/08/rueso_firmengebaeude_salzkotten.webp">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="https://www.rueso.de/wp-content/uploads/2025/08/rueso_logo_signet.svg" type="image/svg+xml">
${fontHead(prefix)}
<link rel="stylesheet" href="${prefix}assets/css/site.css">
</head>
<body data-lang="${lang}" data-page="${slug}">
${body}
<script type="module" src="${prefix}assets/js/app.js"></script>
</body>
</html>
`;
      const dir = lang === 'en' ? path.join(OUT, 'en') : OUT;
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, outName), html);
      pages++;
    }

    cssParts.push(helmetCss(nav.helmet), helmetCss(foot.helmet), LAYOUT_CSS, ...styles.rules);
    // Doppelte Regeln aus den drei helmet-Blöcken zusammenfassen
    const seen = new Set();
    cssPerLang[lang] = cssParts.join('\n').split('\n')
      .filter(l => { const t = l.trim(); if (!t) return false; if (t.startsWith('/*') || t.startsWith('@') || t.startsWith('.')) return true; if (seen.has(t)) return false; seen.add(t); return true; })
      .join('\n');
  }

  if (cssPerLang.de !== cssPerLang.en) warn.push('CSS von DE und EN weicht ab — Klassennamen prüfen!');
  fs.mkdirSync(path.join(OUT, 'assets', 'css'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'assets', 'css', 'site.css'), cssPerLang.de + '\n');

  fs.mkdirSync(path.join(OUT, 'assets', 'js'), { recursive: true });
  fs.copyFileSync(path.join(DESIGN, 'motion.js'), path.join(OUT, 'assets', 'js', 'motion.js'));

  // GitHub Pages: kein Jekyll-Preprocessing
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

  writeSitemap();

  console.log(`✓ ${pages} Seiten (DE + EN)`);
  console.log(`✓ assets/css/site.css  ${(cssPerLang.de.length / 1024).toFixed(1)} kB`);
  if (warn.length) { console.log('\n⚠  ' + [...new Set(warn)].join('\n⚠  ')); process.exitCode = 1; }
  else console.log('✓ keine Warnungen');
}

function writeSitemap() {
  const urls = [];
  for (const out of Object.values(OUTPUT)) {
    for (const l of ['de', 'en']) {
      urls.push(`${SITE}/${l === 'en' ? 'en/' : ''}${out === 'index.html' ? '' : out}`);
    }
  }
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n');
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
}

main();
