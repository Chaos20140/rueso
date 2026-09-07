/**
 * Bewusste Abweichungen vom Design — an einer Stelle gebündelt.
 *
 * Das Design in `_design/` bleibt unangetastet und die Wahrheitsquelle. Alles
 * hier greift NACH der Kompilierung in den fertigen HTML-Rumpf und ist damit
 * jederzeit abschaltbar und nachvollziehbar.
 *
 * Jede Ersetzung, die ihr Ziel nicht findet, erzeugt eine Warnung. Ohne das
 * würden nach einem Design-Update stillschweigend wieder Platzhalter oder
 * unstrukturierte Textwände stehen bleiben.
 *
 * Siehe CLAUDE.md §7 für die Liste der Abweichungen und ihre Begründung.
 */
import { GOOGLE, ZITATE } from './testimonials.mjs';
import { absaetze, LISTEN } from './absaetze.mjs';

const escHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Gegenstück zu escHtml — build.mjs maskiert genau diese drei Zeichen. */
const unescHtml = (s) => String(s)
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Ersetzt das erste Vorkommen und warnt, wenn es keins gibt. */
function ersetze(body, alt, neu, warn, was) {
  if (!body.includes(alt)) {
    warn.push(`${was}: Vorlage nicht gefunden — "${alt.slice(0, 50)}…"`);
    return body;
  }
  return body.replace(alt, neu);
}

/* ================================================================== *
 * 1. Telefon und Fax ausschreiben
 * ================================================================== */

/**
 * Das Design kürzt auf „T" und „F". Beim Überfliegen einer Kontaktspalte ist
 * ein einzelnes „F" vor einer Nummer nicht als Fax erkennbar — und für
 * Screenreader ist es gar nichts. Ausgeschrieben kostet es zwei Wörter.
 */
function telefonFax(body) {
  return body
    .replace(/(>|\s)T (?=0\d)/g, '$1Telefon ')
    .replace(/(>|\s)F (?=0\d)/g, '$1Fax ');
}

/* ================================================================== *
 * 2. Echte Karte statt gestreiftem Platzhalter
 * ================================================================== */

const KARTE_ALT = 'background:repeating-linear-gradient(135deg, #DDD7CB 0 1px, transparent 1px 14px), #E2DCD0';

/**
 * Im Design ist die „Karte" ein Dekor: diagonale Streifen mit einem Punkt in
 * der Mitte. Sie kann gar nicht laden, weil es nichts zu laden gibt.
 *
 * Ersetzt durch ein selbst erzeugtes, lokal liegendes Kartenbild
 * (tools/map.mjs). Kein Google-iframe: der lädt beim Besucher fremde Skripte,
 * setzt Cookies und wäre von der CSP der Seite ohnehin blockiert.
 * Der Verlauf unten sorgt dafür, dass die Bildunterschrift lesbar bleibt.
 */
function karte(body, prefix, warn) {
  const neu = 'background:linear-gradient(0deg, rgba(232,227,217,.95) 0%, rgba(232,227,217,.55) 14%, rgba(232,227,217,0) 30%), '
    + `url(${prefix}assets/img/karte-salzkotten.png) center/cover no-repeat, #E2DCD0`;
  return ersetze(body, KARTE_ALT, neu, warn, 'Karte');
}

/* ================================================================== *
 * 3. Lange Texte strukturieren
 * ================================================================== */

/**
 * Baut aus einem Listeneintrag das Ersatz-Markup. Der `<p>`-Stil des Designs
 * wird übernommen, damit Schrift, Farbe und Maximalbreite gleich bleiben.
 */
function listeHtml(stil, eintrag) {
  const teile = [];
  if (eintrag.intro) teile.push(`<p style="${stil}">${escHtml(eintrag.intro)}</p>`);
  if (eintrag.vorPunkten) {
    teile.push(`<p style="${stil}; font-weight:500">${escHtml(eintrag.vorPunkten)}</p>`);
  }
  const li = eintrag.punkte.map((p) => `<li>${escHtml(p)}</li>`).join('');
  teile.push(`<ul class="aufzaehlung" style="${stil}; padding:0 0 0 20px; display:grid; gap:7px">${li}</ul>`);
  if (eintrag.schluss) teile.push(`<p style="${stil}">${escHtml(eintrag.schluss)}</p>`);
  return teile.join('');
}

/**
 * Ersetzt zu lange `<p>`-Blöcke durch mehrere Absätze bzw. durch eine Liste.
 * Der Wortlaut bleibt unverändert; getrennt wird nur an Satzgrenzen.
 *
 * Greift auf jeden reinen Textabsatz der fertigen Seite — auch auf die, die
 * direkt im Template stehen statt in `content.js`. Genau dort standen die
 * längsten Blöcke (der Einstieg auf brandschutz.html hatte 440 Zeichen am
 * Stück).
 */
function textstruktur(body) {
  return body.replace(/<p ([^>]*)>([^<]{140,})<\/p>/g, (treffer, attrs, inhalt) => {
    const stil = attrs.match(/style="([^"]*)"/);
    if (!stil) return treffer;
    const rest = attrs.replace(stil[0], '').replace(/\s+/g, ' ').trim();

    // Wohin die übrigen Attribute wandern, hängt davon ab, was sie tun:
    //   `data-words` — motion.js ersetzt den Textknoten durch Wort-Spans und
    //     blendet sie beim Scrollen nacheinander ein. Das muss an jedem
    //     Absatz einzeln hängen; an der Hülle würde motion.js die Absätze
    //     zu einem einzigen Textknoten einschmelzen.
    //   `data-reveal` — der Block soll sich wie im Design als EINER
    //     einblenden, also an die Hülle.
    const proAbsatz = /\bdata-words\b/.test(rest);
    const attrP = proAbsatz && rest ? ' ' + rest : '';
    const attrH = proAbsatz ? '' : rest;

    const roh = unescHtml(inhalt);
    const liste = LISTEN[roh];
    if (liste) return huelle(listeHtml(stil[1], liste), attrH, stil[1]);
    const teile = absaetze(roh);
    if (teile.length < 2) return treffer;
    const innen = teile.map((t) => `<p${attrP} style="${stil[1]}">${escHtml(t)}</p>`).join('');
    return huelle(innen, attrH, stil[1]);
  });
}

/**
 * Die Absätze stecken in EINER Hülle, nicht als Geschwister im Elternraster.
 * Zwei Gründe:
 *   - Typografie: der Abstand innerhalb eines Textblocks soll enger sein als
 *     der Abstand des Blocks zu seiner Überschrift (die Elternraster stehen
 *     auf gap:12px und mehr).
 *   - Prüfbarkeit: das Design hat an dieser Stelle genau ein Rasterelement.
 *     Bleibt es auch im Nachbau eines, kann der Geometrievergleich den Block
 *     beidseitig ausblenden und der Rest der Seite bleibt vergleichbar
 *     (tools/vergleich.mjs).
 *
 * `align-content:start` ist nicht kosmetisch: die Spalten einer Reihe sind
 * gleich hoch, die Hülle wird also mitgestreckt — ohne die Angabe zöge das
 * Raster die Absätze auseinander (aus 11 px wurden 70).
 *
 * Der Abstand ist relativ (`.62em`), nicht absolut: dieselbe Hülle sitzt unter
 * 15,5-px-Fließtext wie unter einer 48-px-Schauzeile. Damit `em` dort richtig
 * auflöst, bekommt die Hülle dieselbe `font`-Angabe wie ihre Absätze.
 */
const huelle = (innen, rest = '', stil = '') => {
  const font = stil.match(/(?:^|;)\s*(font:[^;]+)/);
  const basis = font ? `${font[1].trim()}; gap:.62em` : 'gap:11px';
  return `<div data-struktur${rest ? ' ' + rest : ''} style="display:grid; ${basis}; align-content:start">${innen}</div>`;
};

/* ================================================================== *
 * 4. Kundenstimmen — echte Google-Rezensionen
 * ================================================================== */

const T_ZITATE = {
  de: {
    label: 'Kundenstimmen',
    h2: 'Was Kundinnen und Kunden sagen.',
    sterneLabel: (s) => `${s} von 5 Sternen`,
    anzahl: (n) => `${n} Bewertungen auf Google`,
    link: 'Alle Bewertungen ansehen',
    linkLabel: 'Alle Google-Bewertungen der RÜSO GmbH ansehen (öffnet in neuem Tab)',
    karussell: 'Kundenstimmen, seitlich scrollbar',
    vor: 'Vorherige Stimme',
    next: 'Nächste Stimme',
    zu: (i) => `Zu Stimme ${i}`,
    quelle: 'Quelle: öffentliche Google-Rezensionen · Stand',
    sterneWort: (n) => `${n} Sterne`,
  },
  en: {
    label: 'Client voices',
    h2: 'What customers say.',
    sterneLabel: (s) => `${s} out of 5 stars`,
    anzahl: (n) => `${n} reviews on Google`,
    link: 'See all reviews',
    linkLabel: 'See all Google reviews for RÜSO GmbH (opens in a new tab)',
    karussell: 'Customer reviews, scrollable sideways',
    vor: 'Previous review',
    next: 'Next review',
    zu: (i) => `Go to review ${i}`,
    quelle: 'Source: public Google reviews · as of',
    sterneWort: (n) => `${n} stars`,
  },
};

const MONO = "font:400 11.5px/1.6 'IBM Plex Mono',ui-monospace,monospace; letter-spacing:.14em; text-transform:uppercase";
const HELL = 'rgba(250,248,244,.55)';
const AKZENT = 'oklch(0.68 0.19 30)';

/** „Norbert Hübner" → „NH". Ersatz für ein Profilbild, das es nicht gibt. */
const monogramm = (name) => name.trim().split(/\s+/).slice(0, 2)
  .map((w) => w[0]).join('').toUpperCase();

/** „07.09.2026" aus „2026-09-07" — für die Quellenangabe. */
const datum = (iso, lang) => {
  const [j, m, t] = iso.split('-');
  return lang === 'en' ? `${j}-${m}-${t}` : `${t}.${m}.${j}`;
};

/**
 * Kundenstimmen komplett neu gesetzt.
 *
 * Das Design sah zwei gleich große Kästen nebeneinander vor, gefüllt mit
 * Platzhaltern von je drei Zeilen. Mit den echten Rezensionen („Alles super!")
 * standen darin vier Wörter in einem 260 px hohen Rahmen — der Abschnitt wirkte
 * leer und beliebig. Deshalb hier bewusst anders:
 *
 *   1. Die Gesamtwertung wird zum Blickfang. 4,6 bei 9 Bewertungen ist das
 *      stärkste Argument des Abschnitts und war vorher eine graue Fußzeile.
 *   2. Eine Stimme pro Bild statt zwei nebeneinander — dadurch kann der Text
 *      groß gesetzt werden und die Karte trägt sich auch mit vier Wörtern.
 *   3. Wischbar (scroll-snap), dazu Pfeile und Punkte für Maus und Tastatur.
 *      Der Wunsch „durchscrollen können" kam direkt vom Kunden.
 *
 * Der äußere <section>-Rahmen des Designs (Farbe, Radius, Innenabstand) und
 * die Label-Spalte links bleiben unverändert — der Abschnitt sitzt weiter im
 * Rhythmus der Seite.
 *
 * Bewusst KEIN `data-reveal` an den Karten: Karte 2 liegt horizontal außerhalb
 * des Sichtfelds, der IntersectionObserver von motion.js würde sie deshalb nie
 * einblenden und sie bliebe dauerhaft unsichtbar.
 */
function zitate(body, lang, warn) {
  const en = lang === 'en';
  const t = T_ZITATE[en ? 'en' : 'de'];
  const start = body.indexOf('<section id="stimmen"');
  if (start < 0) { warn.push('Kundenstimmen: Abschnitt nicht gefunden'); return body; }
  const offen = body.indexOf('>', start) + 1;
  const ende = body.indexOf('</section>', offen);
  if (ende < 0) { warn.push('Kundenstimmen: Abschnittsende nicht gefunden'); return body; }
  const attrs = body.slice(start + '<section'.length, offen - 1);

  const schnitt = en ? GOOGLE.schnitt.replace(',', '.') : GOOGLE.schnitt;
  // Sternreihe: eine gedimmte Grundreihe, darüber dieselbe Reihe in Akzentfarbe
  // auf den Bruchteil beschnitten. So stimmt die Optik mit der echten Zahl
  // überein, statt fünf volle Sterne für eine 4,6 zu zeigen.
  const fuellung = (parseFloat(GOOGLE.schnitt.replace(',', '.')) / 5 * 100).toFixed(1);

  // Anführungszeichen nach Sprache der SEITE (sie gehören dem Satz, nicht der
  // zitierten Person); das Zitat selbst bleibt wörtlich und wird auf der
  // englischen Fassung als deutschsprachig ausgezeichnet.
  const [auf, zu] = en ? ['“', '”'] : ['„', '“'];
  const zitatLang = en ? ' lang="de"' : '';

  const karten = ZITATE.map((z) => `
            <blockquote class="stimmen-karte">
              <p class="stimmen-text"${zitatLang}>${auf}${escHtml(z.text)}${zu}</p>
              <footer class="stimmen-fuss">
                <span class="stimmen-monogramm" aria-hidden="true">${escHtml(monogramm(z.autor))}</span>
                <span>
                  <span class="stimmen-name">${escHtml(z.autor)}</span>
                  <span class="stimmen-mono"><span aria-hidden="true">${'★'.repeat(z.sterne)}</span><span class="nur-vorlesen">${t.sterneWort(z.sterne)}</span> · ${escHtml(en ? z.alter.en : z.alter.de)}</span>
                </span>
              </footer>
            </blockquote>`).join('');

  const punkte = ZITATE.map((_z, i) => `<button type="button" class="stimmen-punkt" data-act="zitat-zu" data-index="${i}" aria-label="${t.zu(i + 1)}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('');

  const neu = `<section${attrs} data-content-override>
    <div style="max-width:1400px; margin:0 auto; display:flex; flex-wrap:wrap; gap:clamp(24px,4vw,64px)">
      <div style="flex:0 0 220px; display:flex; gap:10px; align-items:flex-start; padding-top:12px; ${MONO}; color:${HELL}"><span style="width:6px; height:6px; border-radius:50%; background:${AKZENT}; flex:none; margin-top:6px"></span><span>${t.label}</span></div>
      <div style="flex:1 1 560px; min-width:0; display:grid; gap:clamp(28px,3.4vw,48px)">
        <h2 data-reveal style="margin:0; font:500 clamp(36px,4.6vw,72px)/1.02 Figtree,system-ui,sans-serif; letter-spacing:-.03em; text-wrap:balance; max-width:18ch">${t.h2}</h2>

        <div class="stimmen-wertung" data-reveal>
          <span class="stimmen-note">${schnitt}<small>/ 5</small></span>
          <span class="stimmen-wertung-text">
            <span class="stimmen-sterne" role="img" aria-label="${t.sterneLabel(schnitt)}">★★★★★<i aria-hidden="true" style="width:${fuellung}%">★★★★★</i></span>
            <span class="stimmen-mono">${t.anzahl(GOOGLE.anzahl)}</span>
          </span>
          <a class="stimmen-link" href="${GOOGLE.url}" target="_blank" rel="noopener noreferrer" aria-label="${t.linkLabel}">${t.link}<span aria-hidden="true">↗</span></a>
        </div>

        <div class="stimmen-slider" data-reveal>
          <div class="stimmen-spur" data-zitat-spur tabindex="0" role="group" aria-label="${t.karussell}">${karten}
          </div>
          <div class="stimmen-nav">
            <button type="button" class="stimmen-knopf" data-act="zitat-prev" aria-label="${t.vor}"><span aria-hidden="true">←</span></button>
            <button type="button" class="stimmen-knopf" data-act="zitat-next" aria-label="${t.next}"><span aria-hidden="true">→</span></button>
            <span class="stimmen-punkte">${punkte}</span>
            <span class="stimmen-mono stimmen-zaehler"><span data-zitat-nr>01</span> / ${String(ZITATE.length).padStart(2, '0')}</span>
          </div>
        </div>

        <p class="stimmen-mono" style="margin:0">${t.quelle} ${datum(GOOGLE.stand, lang)}</p>
      </div>
    </div>
  </section>`;

  return body.slice(0, start) + neu + body.slice(ende + '</section>'.length);
}

/* ================================================================== *
 * 5. Mobilmenü: „Leistungen" aufklappbar
 * ================================================================== */

const MENUE_RE = /<a href="\.\/#leistungen" data-act="menu-close" style="([^"]*)">([^<]*)<\/a>\s*<div style="display:grid; grid-template-columns:repeat\(2, minmax\(0,1fr\)\); gap:8px 16px;([^"]*)">([\s\S]*?)<\/div>/;

/**
 * Im Design stehen die sechs Leistungen im Mobilmenü immer offen und
 * schieben die übrigen Menüpunkte aus dem Bild. Als Akkordeon bleibt das
 * Menü auf einen Blick erfassbar.
 *
 * Aufbau und Animation sind vom FAQ der Startseite übernommen
 * (`grid-template-rows` 0fr→1fr, „+"/„–"), damit die Bedienung sich überall
 * gleich anfühlt.
 */
function leistungenAkkordeon(body, warn) {
  if (!MENUE_RE.test(body)) {
    warn.push('Mobilmenü: Leistungen-Block nicht gefunden');
    return body;
  }
  return body.replace(MENUE_RE, (_t, stil, label, innenStil, innen) => `<button type="button" data-act="menu-services" aria-expanded="false" aria-controls="menue-leistungen" style="${stil}; display:flex; align-items:center; justify-content:space-between; gap:16px; width:100%; padding:0; border:0; background:transparent; cursor:pointer; text-align:left">${label}<span data-menu-zeichen aria-hidden="true" style="flex:none; box-sizing:border-box; width:40px; height:40px; border-radius:50%; border:1px solid rgba(21,23,27,.16); display:grid; place-items:center; font:400 20px/1 'IBM Plex Mono',ui-monospace,monospace">+</span></button><div id="menue-leistungen" inert style="display:grid; grid-template-rows:0fr; transition:grid-template-rows .45s cubic-bezier(.22,.61,.36,1)"><div style="overflow:hidden; min-height:0"><div style="display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px 16px;${innenStil}; padding-top:4px">${innen}</div></div></div>`);
}

/* ================================================================== *
 * Einstieg
 * ================================================================== */

export function anwenden(body, { istStartseite, lang, prefix, warn }) {
  body = telefonFax(body);
  body = textstruktur(body);
  body = leistungenAkkordeon(body, warn);
  if (istStartseite) {
    body = karte(body, prefix, warn);
    body = zitate(body, lang, warn);
  }
  return body;
}

/** CSS, das die Overrides brauchen. Wird an site.css angehängt. */
export const OVERRIDE_CSS = `
/* --- Aufzählungen aus ehemaligen Fließtext-Listen --- */
.aufzaehlung{list-style:disc}
.aufzaehlung li::marker{color:oklch(0.55 0.16 30)}
/* --- Mobilmenü: Leistungen-Akkordeon --- */
[data-act="menu-services"] [data-menu-zeichen]{transition:background .3s ease,color .3s ease}
[data-act="menu-services"][aria-expanded="true"] [data-menu-zeichen]{background:#15171B;color:#FAF8F4;border-color:#15171B}

/* --- Kundenstimmen: Wertungsband + Slider --- */
/* Nur für Assistenztechnik: sichtbar ist die Sternreihe daneben. */
.nur-vorlesen{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.stimmen-mono{font:400 11.5px/1.6 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:rgba(250,248,244,.55)}

.stimmen-wertung{box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;gap:clamp(16px,2vw,28px);padding:clamp(20px,2.2vw,26px) clamp(22px,2.4vw,30px);border-radius:18px;background:rgba(250,248,244,.05);border:1px solid rgba(250,248,244,.12)}
.stimmen-note{display:flex;align-items:baseline;gap:7px;font:500 clamp(42px,4.6vw,60px)/1 Figtree,system-ui,sans-serif;letter-spacing:-.045em;color:#FAF8F4}
.stimmen-note small{font:400 13px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.04em;color:rgba(250,248,244,.45)}
.stimmen-wertung-text{display:grid;gap:9px}
/* Sternreihe: gedimmte Grundreihe, darüber die auf den Bruchteil
   beschnittene Reihe in Akzentfarbe (Breite steht inline). */
.stimmen-sterne{position:relative;display:inline-block;width:max-content;font-size:18px;line-height:1;letter-spacing:.16em;white-space:nowrap;color:rgba(250,248,244,.2)}
.stimmen-sterne i{position:absolute;inset:0;overflow:hidden;font-style:normal;color:oklch(0.72 0.16 30)}
.stimmen-link{box-sizing:border-box;margin-left:auto;display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:999px;border:1px solid rgba(250,248,244,.28);color:#FAF8F4;text-decoration:none;font:500 14px/1 Figtree,system-ui,sans-serif;transition:background .3s ease,color .3s ease,border-color .3s ease}
.stimmen-link:hover{background:#FAF8F4;color:#15171B;border-color:#FAF8F4}

.stimmen-slider{display:grid;gap:clamp(16px,2vw,24px)}
/* scroll-snap statt Transform-Karussell: wischen, Trackpad und Tastatur
   funktionieren damit ohne eigene Logik, die Pfeile scrollen nur. */
.stimmen-spur{display:grid;grid-auto-flow:column;grid-auto-columns:100%;gap:clamp(14px,1.6vw,24px);overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scrollbar-width:none;border-radius:18px}
.stimmen-spur::-webkit-scrollbar{display:none}
.stimmen-spur:focus-visible{outline:2px solid oklch(0.72 0.16 30);outline-offset:5px}
.stimmen-karte{box-sizing:border-box;scroll-snap-align:start;position:relative;overflow:hidden;margin:0;padding:clamp(28px,3vw,44px);border-radius:18px;border:1px solid rgba(250,248,244,.14);background:linear-gradient(155deg,rgba(250,248,244,.09),rgba(250,248,244,.02));display:grid;gap:clamp(20px,2.2vw,28px);align-content:space-between;min-height:clamp(190px,17vw,250px)}
/* Großes Anführungszeichen als Textur, nicht als Inhalt. */
.stimmen-karte::before{content:"”";position:absolute;top:-.03em;right:.07em;font:700 clamp(110px,12vw,170px)/1 Figtree,system-ui,sans-serif;color:rgba(250,248,244,.08);pointer-events:none}
.stimmen-text{position:relative;margin:0;font:400 clamp(21px,2.2vw,32px)/1.32 Figtree,system-ui,sans-serif;letter-spacing:-.018em;color:rgba(250,248,244,.96);text-wrap:pretty}
.stimmen-fuss{position:relative;display:flex;align-items:center;gap:14px}
.stimmen-monogramm{flex:none;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:oklch(0.68 0.19 30);color:#15171B;font:500 15px/1 Figtree,system-ui,sans-serif;letter-spacing:.02em}
.stimmen-name{display:block;margin-bottom:3px;font:500 16px/1.3 Figtree,system-ui,sans-serif;letter-spacing:-.01em;color:#FAF8F4}
.stimmen-fuss .stimmen-mono{display:block;color:rgba(250,248,244,.5)}

.stimmen-nav{display:flex;align-items:center;gap:12px}
.stimmen-knopf{box-sizing:border-box;width:46px;height:46px;flex:none;padding:0;border-radius:50%;border:1px solid rgba(250,248,244,.28);background:transparent;color:#FAF8F4;cursor:pointer;display:grid;place-items:center;font:400 18px/1 Figtree,system-ui,sans-serif;transition:background .3s ease,color .3s ease,border-color .3s ease}
.stimmen-knopf:hover{background:#FAF8F4;color:#15171B;border-color:#FAF8F4}
.stimmen-punkte{display:flex;align-items:center;gap:8px;margin-left:6px}
.stimmen-punkt{width:9px;height:9px;padding:0;border:0;border-radius:50%;background:rgba(250,248,244,.26);cursor:pointer;transition:background .3s ease,transform .3s ease}
.stimmen-punkt[aria-current="true"]{background:oklch(0.72 0.16 30);transform:scale(1.4)}
.stimmen-zaehler{margin-left:auto}
@media (max-width:620px){
  /* Auf dem Telefon nimmt der Text die volle Breite ein — das große
     Anführungszeichen läge dann hinter der ersten Zeile. */
  .stimmen-karte::before{display:none}
  .stimmen-link{margin-left:0}
}
@media (max-width:520px){.stimmen-zaehler{display:none}}
`;

/**
 * Welche Originaltexte durch die Umstrukturierung ersetzt wurden — gelesen aus
 * den fertig gebauten Seiten, nicht aus einer zweiten Liste.
 *
 * Die Vergleichsskripte blenden im DESIGN genau diese `<p>` aus und im Nachbau
 * die zugehörigen `[data-struktur]`-Hüllen. Beidseitig fällt damit exakt ein
 * Rasterelement weg — der Rest der Seite bleibt Pixel für Pixel vergleichbar,
 * obwohl der Block selbst bewusst anders aussieht. Siehe tools/vergleich.mjs.
 *
 * Warum aus dem Ergebnis statt aus der Quelle: die Texte stehen teils in
 * `content.js`, teils direkt in den Templates. Eine gepflegte Liste würde
 * beim nächsten Design-Update lautlos veralten; die Hüllen im Ergebnis nicht.
 * Bei geteilten Absätzen ergibt das Zusammenfügen wieder exakt den
 * Ausgangstext (getrennt wird nur an Leerzeichen), bei Aufzählungen steht das
 * Original als Schlüssel in `LISTEN`.
 */
export function strukturTexte(htmlDateien) {
  const raus = new Set(Object.keys(LISTEN));
  for (const html of htmlDateien) {
    for (const h of html.matchAll(/<div data-struktur[^>]*>([\s\S]*?)<\/div>/g)) {
      if (h[1].includes('<ul')) continue;   // Aufzählung — Original steht in LISTEN
      const teile = [...h[1].matchAll(/<p [^>]*>([^<]*)<\/p>/g)].map((m) => unescHtml(m[1]));
      if (teile.length > 1) raus.add(teile.join(' '));
    }
  }
  return [...raus];
}
