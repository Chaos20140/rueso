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
import { anwenden as overridesAnwenden, OVERRIDE_CSS } from './overrides.mjs';
import { impressumSeite } from './rechtsseiten.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESIGN = path.join(ROOT, '_design');
const OUT = ROOT;
const SITE = 'https://chaos20140.github.io/rueso';

/**
 * Diese Auslieferung ist eine Vorschau neben der produktiven www.rueso.de.
 * Ohne noindex konkurrierte sie mit derselben Firma, Anschrift und denselben
 * Referenzprojekten in der Suche gegen die echte Kundenseite.
 * Beim Umzug auf die eigene Domain: NOINDEX auf '' setzen, SITE anpassen,
 * neu bauen. Die restlichen SEO-Angaben (canonical, hreflang, OG, sitemap)
 * sind bereits vollständig und werden dann sofort wirksam.
 */
const NOINDEX = '<meta name="robots" content="noindex, nofollow">';

/**
 * Basispfad der Auslieferung, aus SITE abgeleitet — "/rueso/" bei GitHub
 * Pages unter einem Projektnamen, "/" auf einer eigenen Domain.
 *
 * Nur die 404-Seite braucht ihn: GitHub Pages liefert sie OHNE Redirect
 * unter der angefragten Adresse aus. Relative Pfade lösen dort gegen die
 * Fehl-URL auf — bei /rueso/en/tippfehler also gegen /rueso/en/, und die
 * Seite käme ohne Stylesheet, Schriften und Favicon an. Alle übrigen Seiten
 * liegen an bekannter Stelle und arbeiten weiter mit relativen Pfaden.
 */
const BASE_PATH = new URL(SITE).pathname.replace(/\/*$/, '') + '/';

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
function ifMode(expr, scope, cfg, ctx) {
  if (Object.prototype.hasOwnProperty.call(cfg, expr)) return cfg[expr];
  const v = resolve(expr, scope);
  // Ein unbekannter Ausdruck ist immer ein Fehler: der Zweig verschwände
  // sonst kommentarlos aus der Seite. Lieber laut scheitern.
  if (v === MISSING) ctx.warn.push(`sc-if: Ausdruck "${expr}" nicht auflösbar — Zweig entfällt!`);
  return v !== MISSING && !!v;
}

/**
 * Mobil- und Desktopvariante liegen gleichzeitig im DOM. Damit ids eindeutig
 * bleiben, bekommt die Mobilvariante das Suffix -mobil. Ankerlinks werden
 * mitgezogen; alle anderen Verweisformen auf ids melden eine Warnung, weil
 * sie sonst still ins Leere zeigen würden.
 */
function renameMobileIds(html, ctx) {
  const renamed = new Set();
  let out = html.replace(RE_ID, (mm, id) => { renamed.add(id); return ' id="' + id + '-mobil"'; });
  if (!renamed.size) return out;
  out = out.replace(RE_ANCHOR, (mm, id) => (renamed.has(id) ? 'href="#' + id + '-mobil"' : mm));
  for (const attr of ID_REF_ATTRS) {
    const re = new RegExp('\\s' + attr + '="([^"]+)"', 'g');
    let m;
    while ((m = re.exec(out))) {
      if (m[1].split(/\s+/).some((v) => renamed.has(v))) {
        ctx.warn.push('Mobilvariante: ' + attr + '="' + m[1] + '" zeigt auf eine umbenannte id — von Hand nachziehen.');
      }
    }
  }
  return out;
}
const RE_ID = /\sid="([^"]+)"/g;
const RE_ANCHOR = /href="#([^"]+)"/g;
const ID_REF_ATTRS = ['for', 'aria-controls', 'aria-labelledby', 'aria-describedby', 'list', 'form', 'headers'];

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
      const mode = ifMode(expr, scope, ctx.ifConfig, ctx);
      if (mode === true) {
        out += expand(inner, scope, ctx);
      } else if (mode && mode.css) {
        let html = expand(inner, scope, ctx);
        // Beide Layoutvarianten liegen im DOM → ids der Mobilvariante suffixen.
        if (mode.css === 'only-mobile') html = renameMobileIds(html, ctx);
        out += `<div class="${mode.css}">${html}</div>`;
      } else if (mode && mode.js) {
        out += `<div data-toggle="${mode.js}"${mode.js === 'menu' ? ' id="hauptmenue"' : ''} hidden>${expand(inner, scope, ctx)}</div>`;
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
      else ctx.warn.push(`sc-for: Liste "${listExpr}" ist kein Array — Block entfällt!`);
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
  'toggleMenu': 'data-act="menu-toggle" aria-expanded="false" aria-controls="hauptmenue"',
  'closeMenu': 'data-act="menu-close"',
  'openServices': 'data-svc-open',
  'closeServices': 'data-svc-close',
  'r.open': 'data-act="modal-open" data-key="{{ r.key }}"',
  'close': 'data-act="modal-close"',
  'stop': 'data-act="modal-stop"',
  'f.select': 'data-act="filter" data-key="{{ f.key }}" aria-pressed="{{ f.on }}"',
  't.select': 'data-act="topic" data-key="{{ t.key }}" aria-pressed="{{ t.on }}"',
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
    // Auf den Attributanfang verankert, damit data-style o. Ä. nicht getroffen wird.
    a = a.replace(/(^|\s)style="([^"]*)"/g, (mm, lead, s) =>
      `${lead}style="${s.split(';').filter(d => !/^\s*[a-zA-Z-]+\s*:\s*$/.test(d)).join(';')}"`);
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

  // Kein Design-Gegenstück: das Impressum gibt es im Entwurf nicht, der Footer
  // verlinkte dorthin nur nach außen. Der Rumpf kommt aus
  // tools/rechtsseiten.mjs, in derselben Template-Schreibweise — dadurch
  // durchläuft die Seite dieselbe Pipeline wie alle anderen.
  impressum: 'impressum.html',
};

/** Seiten ohne Design-Datei: Rumpf kommt aus einem eigenen Modul. */
const ZUSATZSEITEN = { impressum: impressumSeite };

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
    impressum: ['Impressum | RÜSO GmbH', 'Anbieterkennzeichnung der RÜSO GmbH, Berglar 36 a, 33154 Salzkotten: Vertretung, Registereintrag, Umsatzsteuer-Identifikationsnummer und Kontakt.'],
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
    impressum: ['Legal notice | RÜSO GmbH', 'Provider identification of RÜSO GmbH, Berglar 36 a, 33154 Salzkotten: representation, commercial register, VAT identification number and contact.'],
  },
};

/** Aktiv/inaktiv-Styles der Filter- und Themen-Chips (Werte aus dem Design). */
const chip = (on, borderOff) => ({
  on: String(on),
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

/**
 * Vorgeladen wird genau das, was im ersten Viewport vorkommt:
 * Figtree (eine Variable Font für alle aufrechten Schnitte 300–700) sowie
 * IBM Plex Mono 400 (Kopfzeile, Auszeichnungen) und 500 (DE/EN-Umschalter).
 * Ohne preload würde `font-display: block` diese Stellen kurz unsichtbar
 * lassen — und ch-Einheiten gegen die Fallback-Metrik auflösen.
 */
const PRELOAD = ['figtree-300-700-latin.woff2', 'ibm-plex-mono-400-latin.woff2', 'ibm-plex-mono-500-latin.woff2'];
const fontHead = (p) => [
  ...PRELOAD.map(f => `<link rel="preload" href="${p}assets/fonts/${f}" as="font" type="font/woff2" crossorigin>`),
  `<link rel="stylesheet" href="${p}assets/css/fonts.css">`,
].join('\n');

/**
 * Bilder und Videos liegen auf rueso.de bzw. CloudFront. Der Verbindungsaufbau
 * dorthin (DNS, TCP, TLS) beginnt sonst erst, wenn der Parser das erste
 * <img> erreicht — bei Inhalten über dem Falz kostet das sichtbar Zeit.
 */
const PRECONNECT = [
  '<link rel="preconnect" href="https://www.rueso.de" crossorigin>',
].join('\n');

/**
 * Ladeverhalten der Bilder — standardmäßig AUS, also exakt wie im Design.
 *
 * Beide naheliegenden Optimierungen kosten hier Bildtreue, jede auf ihre Art:
 *
 * `loading="lazy"` spart auf der Startseite rund 3 MB. Springt man aber über
 * einen Ankerlink (#referenzen, #kontakt …) mitten in die Seite, zeigt der
 * Nachbau kurz den Platzhalterhintergrund, während das Design das Bild schon
 * hat. Gemessen: 18 % Pixelabweichung bei 375 px.
 *
 * `decoding="async"` erlaubt dem Browser, ein Bild noch vor dem Dekodieren
 * darzustellen. Das vermeidet Ruckler, führt aber zur selben Abweichung,
 * wenn direkt nach dem Sprung gemessen wird.
 *
 * Beim normalen Scrollen fällt beides nicht auf. Wer Tempo über die letzte
 * Stelle hinter dem Komma stellt, setzt die Schalter auf true und lässt
 * `npm run check` mit schrittweisem Scrollen statt mit Sprüngen laufen.
 */
const LAZY_IMAGES = false;
const ASYNC_DECODE = false;

function imageLoading(html) {
  if (!LAZY_IMAGES && !ASYNC_DECODE) return html;
  let n = 0;
  return html.replace(/<img\s/g, () => {
    n++;
    // Die ersten beiden bleiben in jedem Fall eager: Logo und Hero-Bild.
    const lazy = LAZY_IMAGES && n > 2 ? 'loading="lazy" ' : '';
    const dec = ASYNC_DECODE ? 'decoding="async" ' : '';
    return `<img ${lazy}${dec}`;
  });
}

/** <style> aus einem helmet-Fragment — Attribute am Tag sind erlaubt. */
const helmetCss = (h) => [...h.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g)].map(m => m[1].trim()).join('\n');

/**
 * Fasst die drei helmet-Blöcke zusammen und wirft identische Regeln weg.
 * Arbeitet auf ganzen Regelblöcken statt auf Zeilen — zeilenweises Dedup
 * würde bei mehrzeilig formatiertem CSS die schließenden Klammern
 * verschlucken und die Datei zerstören.
 */
function dedupeCss(text) {
  const blocks = [];
  let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) { blocks.push(text.slice(start, i + 1).trim()); start = i + 1; }
  }
  const tail = text.slice(start).trim();
  if (tail) blocks.push(tail);
  const seen = new Set();
  return blocks.filter(b => {
    const key = b.replace(/\s+/g, ' ');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join('\n');
}

/**
 * Content-Security-Policy als <meta>, weil GitHub Pages keine Header setzen kann.
 * Bewusst eng: keine fremden Skripte, kein eval, keine Einbettung in Frames.
 * 'unsafe-inline' ist nur bei style-src nötig — das Design legt sein gesamtes
 * Layout in style-Attribute, das lässt sich ohne Umbau nicht vermeiden.
 * media-src listet nur noch rueso.de: die 4K-Fassungen auf CloudFront sind
 * raus (tools/overrides.mjs, Abschnitt 6), damit taucht der Host nirgends
 * mehr auf. Wer sie zurückholt, muss ihn hier UND im PRECONNECT ergänzen.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' https://www.rueso.de data:",
  "media-src 'self' https://www.rueso.de",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-src 'none'",
].join('; ');

const LAYOUT_CSS = `
/* --- Breakpoint-Umschaltung (im Design: window.innerWidth < 900) ---
   Media-Query als Grundlage: gilt sofort, ohne JavaScript, ohne Flackern.
   Chrome und Safari messen hier inklusive Scrollbalken und stimmen damit
   exakt mit window.innerWidth überein. Firefox misst ohne — dort läge ein
   ~15px breites Band, in dem CSS und das innerWidth-basierte motion.js
   auseinanderfielen. Sobald app.js gelaufen ist, gewinnt deshalb die
   JS-Messung über data-vw und alles schaltet an derselben Zahl. */
.only-mobile{display:contents}
.only-desktop{display:contents}
@media (min-width:900px){.only-mobile{display:none}}
@media (max-width:899px){.only-desktop{display:none}}
html[data-vw="d"] .only-mobile{display:none}
html[data-vw="d"] .only-desktop{display:contents}
html[data-vw="m"] .only-desktop{display:none}
html[data-vw="m"] .only-mobile{display:contents}
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
      const page = ZUSATZSEITEN[file] ? ZUSATZSEITEN[file]() : parseDc(file);

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
      const prefix = lang === 'en' ? '../' : '';
      let body = page.body.replace('<div><span>{{ count }}</span>', '<div><span data-ref-count>{{ count }}</span>');

      body = body
        .replace(/<dc-import\s+name="Nav"[^>]*><\/dc-import>/,
          () => expand(nav.body, { ...scope, topPad: scope.navTop }, ctx))
        .replace(/<dc-import\s+name="Footer"[^>]*><\/dc-import>/,
          () => expand(foot.body, scope, ctx));
      body = imageLoading(rewriteLinks(expand(body, scope, ctx)));
      // Bewusste Abweichungen vom Design (Kundenstimmen, Karte, Textstruktur,
      // Telefon/Fax, Mobilmenü) — gebündelt in tools/overrides.mjs.
      body = overridesAnwenden(body, {
        istStartseite: file === 'RUESO-Start.dc.html',
        lang, prefix, warn,
      });

      cssParts.push(helmetCss(page.helmet));

      const [title, desc] = T[lang][slug];
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
<meta name="referrer" content="strict-origin-when-cross-origin">
${NOINDEX}
<meta http-equiv="Content-Security-Policy" content="${CSP}">
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
<link rel="icon" href="${prefix}assets/img/rueso-signet.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${prefix}assets/img/rueso-signet.svg">
${PRECONNECT}
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

    cssParts.push(helmetCss(nav.helmet), helmetCss(foot.helmet), LAYOUT_CSS, OVERRIDE_CSS, ...styles.rules);
    cssPerLang[lang] = dedupeCss(cssParts.join('\n'));
  }

  if (cssPerLang.de !== cssPerLang.en) warn.push('CSS von DE und EN weicht ab — Klassennamen prüfen!');
  fs.mkdirSync(path.join(OUT, 'assets', 'css'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'assets', 'css', 'site.css'), cssPerLang.de + '\n');

  fs.mkdirSync(path.join(OUT, 'assets', 'js'), { recursive: true });
  fs.copyFileSync(path.join(DESIGN, 'motion.js'), path.join(OUT, 'assets', 'js', 'motion.js'));

  // GitHub Pages: kein Jekyll-Preprocessing
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

  writeSitemap();
  write404();

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
  // _design/ liegt im Repo (Build-Eingabe) und wird von Pages mit ausgeliefert.
  // Aus dem Index halten, sonst konkurriert es als Duplicate Content.
  // Hinweis: Unter einem Projekt-Unterpfad (…github.io/rueso/) lesen Crawler
  // robots.txt nur im Origin-Root — dort wirkt diese Datei nicht. Wirksam wird
  // sie erst auf einer eigenen Domain. Bis dahin trägt jede Seite noindex.
  fs.writeFileSync(path.join(OUT, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /_design/\nDisallow: /tools/\n\nSitemap: ${SITE}/sitemap.xml\n`);
}

/** Eigene 404-Seite — GitHub Pages liefert sonst seine englische Standardseite. */
function write404() {
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Seite nicht gefunden — RÜSO GmbH</title>
${NOINDEX}
<meta http-equiv="Content-Security-Policy" content="${CSP}">
${PRECONNECT}
${fontHead(BASE_PATH)}
<link rel="stylesheet" href="${BASE_PATH}assets/css/site.css">
<link rel="icon" href="${BASE_PATH}assets/img/rueso-signet.svg" type="image/svg+xml">
</head>
<body style="min-height:100vh; display:grid; place-items:center; padding:clamp(24px,6vw,64px)">
<main style="max-width:640px; display:grid; gap:clamp(20px,3vw,32px); text-align:left">
  <div style="display:flex; gap:10px; align-items:center; font:400 11.5px/1.6 'IBM Plex Mono',ui-monospace,monospace; letter-spacing:.14em; text-transform:uppercase; color:#6B6F76">
    <span style="width:6px; height:6px; border-radius:50%; background:oklch(0.55 0.16 30); flex:none"></span><span>Fehler 404</span>
  </div>
  <h1 style="margin:0; font:500 clamp(36px,6vw,72px)/1.02 Figtree,system-ui,sans-serif; letter-spacing:-.03em; text-wrap:balance">Diese Seite gibt es nicht.</h1>
  <p style="margin:0; font:400 17px/1.6 Figtree,system-ui,sans-serif; color:#3B3F46; text-wrap:pretty">Der Link ist womöglich veraltet oder enthält einen Tippfehler. Über die Startseite finden Sie alles zu Fassaden, Fenstern und Türen aus Aluminium.</p>
  <div style="display:flex; gap:10px; flex-wrap:wrap">
    <a href="${BASE_PATH}" style="display:inline-flex; align-items:center; gap:10px; font:500 14px/1 Figtree,system-ui,sans-serif; padding:15px 22px; border-radius:999px; background:#15171B; color:#FAF8F4">Zur Startseite<span aria-hidden="true">→</span></a>
    <a href="${BASE_PATH}kontakt.html" style="display:inline-flex; align-items:center; gap:10px; font:500 14px/1 Figtree,system-ui,sans-serif; padding:15px 22px; border-radius:999px; border:1px solid rgba(21,23,27,.16); color:#15171B">Kontakt</a>
  </div>
  <div style="font:400 11.5px/1.6 'IBM Plex Mono',ui-monospace,monospace; letter-spacing:.14em; text-transform:uppercase; color:#6B6F76">RÜSO GmbH · Berglar 36 a · 33154 Salzkotten</div>
</main>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT, '404.html'), html);
}

main();
