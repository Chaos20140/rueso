/**
 * Kontaktseite: Bauprojekte-Diashow und erweitertes Anfrageformular.
 *
 * Kundenwunsch (14.09.2026, Skizze auf Screenshots):
 *   1. Statt des Standbilds vom Firmengebäude unter dem Formular eine
 *      hochwertig animierte Diashow der Bauprojekte — ausdrücklich „keine
 *      normale Diashow".
 *   2. Anfrageformular: Überschrift „Projekt anfragen", Umschalter
 *      Privat / Gewerblich (gewerblich → Firmenname), Vorname und Nachname
 *      getrennt, und Dateien anhängen.
 *
 * Beides greift wie alle Abweichungen NACH der Kompilierung (siehe
 * overrides.mjs). Die Bedienung steckt in assets/js/kontakt.js, das app.js nur
 * lädt, wenn die Seite die Bauteile enthält.
 *
 * WICHTIG — das Formular sendet weiterhin nichts (im Design ein
 * preventDefault). Ausgewählte Dateien werden geprüft und aufgelistet, aber
 * nirgendwohin übertragen. Die Prüfung im Browser ist reine Bedienhilfe; ein
 * künftiges Backend muss Typ, Größe und Anzahl selbst erneut prüfen.
 */

const escHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escHtml(s).replace(/"/g, '&quot;');

/* ================================================================== *
 * Bauprojekte-Diashow
 * ================================================================== */

const T_BAU = {
  de: {
    label: 'Bauprojekte · Auswahl',
    rolle: 'Diashow',
    folienRolle: 'Folie',
    region: 'Bauprojekte der RÜSO GmbH',
    vor: 'Nächstes Projekt',
    zurueck: 'Vorheriges Projekt',
    pause: 'Diashow anhalten',
    play: 'Diashow fortsetzen',
    alle: 'Alle Referenzen',
    folie: (i, n, name) => `Projekt ${i} von ${n}: ${name}`,
    zu: (i, name) => `Zu Projekt ${i}: ${name}`,
  },
  en: {
    label: 'Construction projects · Selection',
    rolle: 'slideshow',
    folienRolle: 'slide',
    region: 'Construction projects by RÜSO GmbH',
    vor: 'Next project',
    zurueck: 'Previous project',
    pause: 'Pause slideshow',
    play: 'Resume slideshow',
    alle: 'All references',
    folie: (i, n, name) => `Project ${i} of ${n}: ${name}`,
    zu: (i, name) => `Go to project ${i}: ${name}`,
  },
};

/**
 * Ersetzt den Abschnitt „Standort Bild" der Kontaktseite.
 *
 * Aufbau: alle Projekte liegen übereinander. Die aktive Folie wird per
 * `clip-path` von der Seite her aufgezogen, ihr Bild zoomt dabei langsam aus
 * (Ken Burns), die vorige schiebt sich abgedunkelt weg, Ort und Name laufen
 * zeilenweise aus einer Maske ein. Der Takt hängt an der CSS-Animation des
 * Fortschrittsbalkens — Anhalten heißt dort nur `animation-play-state`, es
 * gibt keinen zweiten Timer, der auseinanderlaufen könnte.
 *
 * Ohne JavaScript steht die erste Folie vollständig da; die Steuerung bleibt
 * dann unsichtbar statt tot.
 */
export function bauprojekte(body, { lang, inhalt, warn }) {
  const marke = body.indexOf('data-screen-label="Standort Bild"');
  if (marke < 0) return body;
  const start = body.lastIndexOf('<section', marke);
  const ende = body.indexOf('</section>', marke) + '</section>'.length;
  const refs = (inhalt && inhalt.refs) || [];
  if (refs.length < 3) {
    warn.push(`Bauprojekte: nur ${refs.length} Referenzen gefunden`);
    return body;
  }
  const t = T_BAU[lang === 'en' ? 'en' : 'de'];
  const labels = Object.fromEntries((inhalt.filters || []).map((f) => [f.key, f.label]));
  const tags = (r) => (Array.isArray(r.tagLabels) ? r.tagLabels.join(' · ')
    : r.tagLabels || (r.tags || []).map((k) => labels[k]).filter(Boolean).join(' · '));
  const n = refs.length;
  const nn = String(n).padStart(2, '0');

  const folien = refs.map((r, i) => `
      <figure class="bp-folie" data-bp-folie${i === 0 ? ' data-aktiv' : ' aria-hidden="true"'} role="group" aria-roledescription="${t.folienRolle}" aria-label="${escAttr(t.folie(i + 1, n, r.name))}">
        <img src="${escAttr(r.img)}" alt="${escAttr(r.name)}"${i === 0 ? '' : ' loading="lazy" decoding="async"'}>
        <figcaption class="bp-text">
          <span class="bp-zeile"><span class="bp-ort">${escHtml([r.place, tags(r)].filter(Boolean).join(' · '))}</span></span>
          <span class="bp-zeile"><span class="bp-name">${escHtml(r.name)}</span></span>
        </figcaption>
      </figure>`).join('');

  const segmente = refs.map((r, i) => `<button type="button" class="bp-segment" data-bp-zu="${i}" aria-label="${escAttr(t.zu(i + 1, r.name))}"${i === 0 ? ' aria-current="true"' : ''}><span><i></i></span></button>`).join('');

  const neu = `<section class="bp" data-bp data-richtung="vor" data-screen-label="Standort Bild" aria-roledescription="${t.rolle}" aria-label="${escAttr(t.region)}">
    <div class="bp-buehne">${folien}
    </div>
    <div class="bp-kopf">
      <span class="bp-label"><span class="bp-punkt" aria-hidden="true"></span>${escHtml(t.label)}</span>
      <span class="bp-zaehler" aria-hidden="true"><span data-bp-nr>01</span> / ${nn}</span>
    </div>
    <div class="bp-fuss">
      <div class="bp-steuerung">
        <button type="button" class="bp-knopf" data-bp-zurueck aria-label="${escAttr(t.zurueck)}"><span aria-hidden="true">←</span></button>
        <button type="button" class="bp-knopf bp-pause" data-bp-pause data-spielt aria-label="${escAttr(t.pause)}" data-pause="${escAttr(t.pause)}" data-play="${escAttr(t.play)}"><span class="bp-pause-symbol" aria-hidden="true"></span></button>
        <button type="button" class="bp-knopf" data-bp-vor aria-label="${escAttr(t.vor)}"><span aria-hidden="true">→</span></button>
      </div>
      <div class="bp-segmente">${segmente}</div>
      <a class="bp-link" href="referenzen.html">${escHtml(t.alle)}<span aria-hidden="true">→</span></a>
    </div>
    <p class="nur-vorlesen" aria-live="polite" data-bp-ansage></p>
  </section>`;

  return body.slice(0, start) + neu + body.slice(ende);
}

/* ================================================================== *
 * Anfrageformular
 * ================================================================== */

const ENDUNGEN = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'dwg', 'dxf', 'zip'];
const MAX_DATEI = 10 * 1024 * 1024;
const MAX_GESAMT = 25 * 1024 * 1024;
const MAX_ANZAHL = 5;

const T_FORM = {
  de: {
    titel: 'Projekt anfragen',
    unter: 'Beschreiben Sie kurz Ihr Vorhaben – Pläne oder Fotos können Sie direkt anhängen.',
    als: 'Anfrage als',
    privat: 'Privat',
    gewerblich: 'Gewerblich',
    firma: 'Firmenname *',
    vorname: 'Vorname',
    nachname: 'Nachname',
    dateien: 'Dateien',
    optional: 'optional',
    hochladen: 'Dateien hochladen',
    ziehen: 'oder hierher ziehen',
    hinweis: 'Pläne, Fotos, Leistungsverzeichnisse · PDF, JPG, PNG, WEBP, HEIC, DWG, DXF, ZIP · bis 10 MB je Datei, höchstens 5',
    fehler: {
      typ: '„{name}“ hat kein erlaubtes Format.',
      gross: '„{name}“ ist größer als 10 MB.',
      gesamt: 'Zusammen dürfen die Dateien höchstens 25 MB groß sein.',
      anzahl: 'Höchstens 5 Dateien.',
      entfernen: '{name} entfernen',
    },
  },
  en: {
    titel: 'Request a project',
    unter: 'Briefly describe your project – you can attach plans or photos directly.',
    als: 'Inquiry as',
    privat: 'Private',
    gewerblich: 'Business',
    firma: 'Company name *',
    vorname: 'First name',
    nachname: 'Last name',
    dateien: 'Files',
    optional: 'optional',
    hochladen: 'Upload files',
    ziehen: 'or drag them here',
    hinweis: 'Plans, photos, bills of quantities · PDF, JPG, PNG, WEBP, HEIC, DWG, DXF, ZIP · up to 10 MB each, max. 5',
    fehler: {
      typ: '“{name}” is not an accepted format.',
      gross: '“{name}” is larger than 10 MB.',
      gesamt: 'Files may not exceed 25 MB in total.',
      anzahl: 'Max. 5 files.',
      entfernen: 'Remove {name}',
    },
  },
};

const FORM_ANKER = '<form data-reveal data-act="prevent-submit" style="';
const FELD_RASTER = '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(220px,100%),1fr)); gap:18px">';

/**
 * Baut den Kopf des Formulars um und hängt das Dateifeld hinter die
 * Nachricht. Stil und Fokusklasse der Eingabefelder werden aus dem
 * gerenderten Firma-Feld des Designs gelesen, damit die neuen Felder exakt
 * gleich aussehen und sich gleich verhalten.
 */
export function anfrageformular(body, { lang, warn }) {
  const formStart = body.indexOf(FORM_ANKER);
  if (formStart < 0) return body;
  const formEnde = body.indexOf('</form>', formStart);
  let f = body.slice(formStart, formEnde);
  // Erkennungszeichen des Kontaktformulars sind die Themen-Chips; andere
  // Formulare (etwa auf der Karriereseite) bleiben unberührt.
  if (!f.includes('data-act="topic"')) return body;
  const t = T_FORM[lang === 'en' ? 'en' : 'de'];

  const firma = f.match(/<label style="([^"]*)">[^<]*<input class="(sf\d+)" type="text" name="firma" style="([^"]*)"><\/label>/);
  const raster = f.indexOf(FELD_RASTER);
  const kopfLabel = f.lastIndexOf('<div style="', raster - 1);
  const rasterEnde = f.indexOf('</div>', raster) + '</div>'.length;
  const textarea = f.match(/<label style="[^"]*">[^<]*<textarea[\s\S]*?<\/label>/);
  if (!firma || raster < 0 || kopfLabel < 0 || !textarea) {
    warn.push('Anfrageformular: Aufbau nicht erkannt');
    return body;
  }
  const [, labelStil, fokus, inputStil] = firma;
  const labels = f.slice(raster, rasterEnde).match(/<label [\s\S]*?<\/label>/g) || [];
  const email = labels.find((l) => /name="email"/.test(l));
  const tel = labels.find((l) => /name="tel"/.test(l));
  if (!email || !tel) {
    warn.push('Anfrageformular: E-Mail- oder Telefonfeld fehlt');
    return body;
  }
  const feld = (text, name, typ, auto, extra = '') =>
    `<label style="${labelStil}">${escHtml(text)}<input class="${fokus}" type="${typ}" name="${name}" autocomplete="${auto}"${extra} style="${inputStil}"></label>`;

  const kopf = `<div class="anfrage-kopf">
        <h2 class="anfrage-titel">${escHtml(t.titel)}</h2>
        <p class="anfrage-unter">${escHtml(t.unter)}</p>
      </div>
      <fieldset class="anfrage-art">
        <legend class="anfrage-legende">${escHtml(t.als)}</legend>
        <div class="anfrage-schalter">
          <label class="anfrage-option"><input type="radio" name="kundentyp" value="privat" checked><span>${escHtml(t.privat)}</span></label>
          <label class="anfrage-option"><input type="radio" name="kundentyp" value="gewerblich"><span>${escHtml(t.gewerblich)}</span></label>
        </div>
        <div class="anfrage-firma" data-anfrage-firma>
          <div class="anfrage-firma-innen">${feld(t.firma, 'firma', 'text', 'organization', ' data-anfrage-firmenfeld')}</div>
        </div>
      </fieldset>
      ${FELD_RASTER}
        ${feld(t.vorname, 'vorname', 'text', 'given-name')}
        ${feld(t.nachname, 'name', 'text', 'family-name')}
        ${email.replace('<input ', '<input autocomplete="email" ')}
        ${tel.replace('<input ', '<input autocomplete="tel" ')}
      </div>`;

  const texte = {
    ...t.fehler,
    endungen: ENDUNGEN,
    maxDatei: MAX_DATEI,
    maxGesamt: MAX_GESAMT,
    maxAnzahl: MAX_ANZAHL,
  };
  const dateifeld = `
      <div class="datei-feld" data-datei-feld data-texte="${escAttr(JSON.stringify(texte))}">
        <span class="anfrage-legende">${escHtml(t.dateien)} <span class="datei-optional">· ${escHtml(t.optional)}</span></span>
        <label class="datei-zone" data-datei-zone>
          <input class="datei-input" type="file" name="dateien" multiple accept="${ENDUNGEN.map((e) => '.' + e).join(',')}" data-datei-input aria-describedby="anfrage-dateien-hinweis">
          <span class="datei-plus" aria-hidden="true">+</span>
          <span class="datei-text"><strong>${escHtml(t.hochladen)}</strong> ${escHtml(t.ziehen)}</span>
          <span class="datei-hinweis" id="anfrage-dateien-hinweis">${escHtml(t.hinweis)}</span>
        </label>
        <ul class="datei-liste" data-datei-liste></ul>
        <p class="datei-fehler" data-datei-fehler role="alert" hidden></p>
      </div>`;

  f = f.slice(0, kopfLabel) + kopf + f.slice(rasterEnde);
  f = f.replace(textarea[0], () => textarea[0] + dateifeld);
  // Für ein künftiges Backend: Dateien gehen nur mit multipart mit.
  f = f.replace(FORM_ANKER, () => '<form data-reveal data-act="prevent-submit" method="post" enctype="multipart/form-data" style="');
  return body.slice(0, formStart) + f + body.slice(formEnde);
}

/* ================================================================== *
 * CSS
 * ================================================================== */

export const KONTAKT_CSS = `
/* --- Kontakt: Bauprojekte-Diashow --- */
.bp{position:relative;height:clamp(440px,74vh,760px);overflow:hidden;border-radius:22px;background:#15171B;color:#FAF8F4;isolation:isolate;touch-action:pan-y}
.bp-buehne{position:absolute;inset:0}
/* Ruhelage: von der Seite her zugezogen, aus der die Folie kommen wird */
.bp-folie{position:absolute;inset:0;margin:0;z-index:0;overflow:hidden;clip-path:inset(0 0 0 100%)}
.bp[data-richtung="zurueck"] .bp-folie{clip-path:inset(0 100% 0 0)}
.bp .bp-folie[data-vorher]{z-index:1;clip-path:inset(0)}
.bp .bp-folie[data-aktiv]{z-index:2;clip-path:inset(0);transition:clip-path 1.15s cubic-bezier(.77,0,.18,1)}
.bp-folie::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(21,23,27,.5) 0%,rgba(21,23,27,0) 22%,rgba(21,23,27,.06) 40%,rgba(21,23,27,.5) 66%,rgba(21,23,27,.86) 100%);pointer-events:none}
.bp-folie img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.14);transition:transform 1.15s cubic-bezier(.77,0,.18,1),filter 1.15s ease;will-change:transform}
/* Ken Burns: die aktive Folie zoomt über die ganze Standzeit langsam aus */
.bp-folie[data-aktiv] img{transform:scale(1);transition:transform 8s cubic-bezier(.2,.6,.2,1)}
.bp-folie[data-vorher] img{transform:scale(1.05) translateX(-5%);filter:brightness(.4)}
.bp[data-richtung="zurueck"] .bp-folie[data-vorher] img{transform:scale(1.05) translateX(5%)}
/* --bp-fuss misst kontakt.js per ResizeObserver: die Steuerleiste bricht je
   nach Breite und Sprache in eine, zwei oder drei Zeilen um — ein fester
   Abstand ließ die Knöpfe auf dem Telefon über dem Projektnamen liegen. */
.bp-text{position:absolute;z-index:3;left:clamp(20px,3vw,44px);right:clamp(20px,3vw,44px);bottom:calc(clamp(18px,2.4vw,30px) + var(--bp-fuss,64px) + clamp(22px,2.6vw,34px));display:grid;gap:12px;pointer-events:none;text-shadow:0 1px 20px rgba(21,23,27,.35)}
.bp-zeile{display:block;overflow:hidden;padding-bottom:.08em}
.bp-zeile>span{display:block;transform:translateY(112%);transition:transform .9s cubic-bezier(.22,.61,.36,1)}
.bp-folie[data-aktiv] .bp-zeile>span{transform:none;transition-delay:.5s}
.bp-folie[data-aktiv] .bp-zeile+.bp-zeile>span{transition-delay:.62s}
.bp-ort{font:400 11.5px/1.5 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:rgba(250,248,244,.82)}
.bp-name{font:500 clamp(30px,4.6vw,72px)/1.02 Figtree,system-ui,sans-serif;letter-spacing:-.032em;text-wrap:balance;max-width:17ch}
.bp-kopf,.bp-fuss{position:absolute;z-index:4;left:clamp(20px,3vw,44px);right:clamp(20px,3vw,44px);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap}
.bp-kopf{top:clamp(18px,2.4vw,30px);gap:10px 24px;font:400 11.5px/1.5 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:rgba(250,248,244,.88)}
.bp-label{display:flex;align-items:center;gap:10px}
.bp-punkt{width:6px;height:6px;border-radius:50%;background:oklch(0.68 0.19 30)}
.bp-fuss{bottom:clamp(18px,2.4vw,30px);gap:14px 22px}
.bp-steuerung{display:flex;gap:8px}
.bp-knopf{box-sizing:border-box;width:46px;height:46px;flex:none;padding:0;border-radius:50%;border:1px solid rgba(250,248,244,.38);background:rgba(21,23,27,.28);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#FAF8F4;cursor:pointer;display:grid;place-items:center;font:400 18px/1 Figtree,system-ui,sans-serif;transition:background .3s ease,color .3s ease,border-color .3s ease}
.bp-knopf:hover{background:#FAF8F4;color:#15171B;border-color:#FAF8F4}
.bp-knopf:focus-visible,.bp-segment:focus-visible,.bp-link:focus-visible{outline:2px solid oklch(0.68 0.19 30);outline-offset:3px}
/* Pausezeichen aus zwei Balken, im angehaltenen Zustand ein Dreieck */
.bp-pause-symbol{position:relative;width:12px;height:14px}
.bp-pause[data-spielt] .bp-pause-symbol{border-left:4px solid currentColor;border-right:4px solid currentColor;box-sizing:border-box}
.bp-pause:not([data-spielt]) .bp-pause-symbol{width:0;height:0;border-style:solid;border-width:7px 0 7px 12px;border-color:transparent transparent transparent currentColor;margin-left:3px}
.bp-segmente{flex:1 1 220px;min-width:0;display:flex;gap:6px}
.bp-segment{flex:1 1 0;min-width:0;height:24px;padding:0;border:0;background:none;cursor:pointer;display:grid;align-items:center}
.bp-segment>span{position:relative;display:block;height:2px;border-radius:2px;overflow:hidden;background:rgba(250,248,244,.3);transition:height .3s ease}
.bp-segment:hover>span{height:4px}
.bp-segment i{position:absolute;inset:0;background:#FAF8F4;transform:scaleX(0);transform-origin:left}
.bp-segment[data-fertig] i{transform:scaleX(1)}
.bp-segment[aria-current="true"] i{animation:bp-lauf 6.5s linear forwards}
.bp[data-pausiert] .bp-segment[aria-current="true"] i{animation-play-state:paused}
@keyframes bp-lauf{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.bp-link{display:inline-flex;align-items:center;gap:8px;padding:13px 18px;border-radius:999px;background:#FAF8F4;color:#15171B;font:500 14px/1 Figtree,system-ui,sans-serif;white-space:nowrap;transition:background .3s ease}
.bp-link:hover{background:oklch(0.68 0.19 30);color:#15171B}
/* Ohne JavaScript keine tote Steuerung zeigen */
.bp:not([data-bereit]) .bp-steuerung,.bp:not([data-bereit]) .bp-segmente{visibility:hidden}
@media (max-width:640px){
  .bp-segmente{order:3;flex-basis:100%}
  .bp-link{padding:12px 15px;font-size:13.5px}
  .bp-zaehler{display:none}
}
@media (prefers-reduced-motion:reduce){
  .bp .bp-folie[data-aktiv],.bp-folie img,.bp .bp-folie[data-aktiv] img,.bp-zeile>span{transition:none!important}
  .bp-folie[data-aktiv] img,.bp-folie[data-vorher] img{transform:none}
}

/* --- Kontakt: Anfrageformular --- */
.anfrage-kopf{display:grid;gap:8px}
.anfrage-titel{margin:0;font:500 clamp(26px,2.4vw,34px)/1.08 Figtree,system-ui,sans-serif;letter-spacing:-.025em;color:#15171B}
.anfrage-unter{margin:0;font:400 14.5px/1.5 Figtree,system-ui,sans-serif;color:#5C6068;max-width:48ch}
.anfrage-legende{display:block;padding:0;margin:0 0 10px;font:400 11px/1.6 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#6B6F76}
.anfrage-art{min-width:0;margin:0;padding:0;border:0;display:grid}
.anfrage-schalter{position:relative;display:grid;grid-template-columns:1fr 1fr;width:min(100%,360px);padding:4px;box-sizing:border-box;border-radius:999px;background:rgba(21,23,27,.07)}
.anfrage-schalter::before{content:"";position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);border-radius:999px;background:#15171B;transition:transform .45s cubic-bezier(.22,.61,.36,1)}
.anfrage-schalter:has(input[value="gewerblich"]:checked)::before{transform:translateX(100%)}
.anfrage-option{position:relative;z-index:1;display:grid;place-items:center;padding:12px 16px;border-radius:999px;cursor:pointer;font:500 14px/1 Figtree,system-ui,sans-serif;color:#15171B;transition:color .35s ease}
.anfrage-option:has(input:checked){color:#FAF8F4}
.anfrage-option input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}
.anfrage-option:has(input:focus-visible){outline:2px solid oklch(0.55 0.16 30);outline-offset:2px}
.anfrage-firma{display:grid;grid-template-rows:1fr;opacity:1;transition:grid-template-rows .5s cubic-bezier(.22,.61,.36,1),opacity .35s ease}
.anfrage-firma-innen{min-height:0;overflow:hidden}
/* Abstand zum Umschalter als Polster am Feld INNERHALB des weggeschnittenen
   Bereichs — so klappt er mit zu. (Ein negativer Rand am Rasterelement geht
   nicht: gestreckt macht er das Element genau um den Rand höher.) */
.anfrage-firma-innen>label{padding-top:22px}
form:has(input[name="kundentyp"][value="privat"]:checked) .anfrage-firma{grid-template-rows:0fr;opacity:0}
/* Linke Spalte (Adresse, Karte) bleibt beim längeren Formular im Blick */
@media (min-width:900px){div:has(+ form[enctype="multipart/form-data"]){position:sticky;top:112px;align-self:start}}
.datei-feld{display:grid}
.datei-optional{text-transform:none;letter-spacing:.04em}
.datei-zone{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"plus text" "plus hinweis";align-items:center;gap:3px 16px;padding:18px 20px;border:1px dashed rgba(21,23,27,.3);border-radius:16px;background:rgba(250,248,244,.45);cursor:pointer;transition:border-color .3s ease,background .3s ease}
.datei-zone:hover,.datei-zone[data-ziehen]{border-color:#15171B;background:rgba(250,248,244,.85)}
.datei-zone:has(.datei-input:focus-visible){outline:2px solid oklch(0.55 0.16 30);outline-offset:3px}
.datei-input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}
.datei-plus{grid-area:plus;box-sizing:border-box;width:44px;height:44px;border-radius:50%;background:#15171B;color:#FAF8F4;display:grid;place-items:center;font:300 24px/1 Figtree,system-ui,sans-serif;transition:transform .45s cubic-bezier(.22,.61,.36,1)}
.datei-zone:hover .datei-plus,.datei-zone[data-ziehen] .datei-plus{transform:rotate(90deg)}
.datei-text{grid-area:text;font:400 15px/1.4 Figtree,system-ui,sans-serif;color:#5C6068}
.datei-text strong{font-weight:500;color:#15171B}
.datei-hinweis{grid-area:hinweis;font:400 12.5px/1.45 Figtree,system-ui,sans-serif;color:#5C6068}
.datei-liste{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}
.datei-liste:empty{display:none}
.datei-liste li{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:12px;padding:8px 8px 8px 16px;border-radius:12px;background:rgba(250,248,244,.75);font:400 14px/1.3 Figtree,system-ui,sans-serif;color:#15171B;animation:datei-rein .4s cubic-bezier(.22,.61,.36,1)}
.datei-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.datei-groesse{font:400 11px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.06em;color:#5C6068}
.datei-weg{box-sizing:border-box;width:32px;height:32px;padding:0;border-radius:50%;border:1px solid rgba(21,23,27,.18);background:transparent;color:#15171B;cursor:pointer;display:grid;place-items:center;font:400 17px/1 Figtree,system-ui,sans-serif;transition:background .3s ease,color .3s ease}
.datei-weg:hover{background:#15171B;color:#FAF8F4}
.datei-fehler{margin:10px 0 0;font:400 13.5px/1.45 Figtree,system-ui,sans-serif;color:#A3321C}
@keyframes datei-rein{from{opacity:0;transform:translateY(6px)}}
@media (prefers-reduced-motion:reduce){.anfrage-firma,.anfrage-schalter::before,.datei-liste li{transition:none;animation:none}}
`;
