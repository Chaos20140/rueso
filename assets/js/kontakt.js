/**
 * Kontaktseite: Bauprojekte-Diashow, Umschalter Privat/Gewerblich, Dateifeld.
 *
 * Kundenwunsch (14.09.2026), im Design nicht vorgesehen — Markup und CSS in
 * tools/kontakt-umbau.mjs. app.js lädt diese Datei nur, wenn die Seite die
 * Bauteile enthält.
 */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ------------------------------------------------------------------ *
 * Diashow
 *
 * Takt = CSS-Animation des aktiven Fortschrittsbalkens (6,5 s). Endet sie,
 * geht es weiter; angehalten wird über animation-play-state. Dadurch gibt es
 * genau eine Uhr, und Anhalten/Fortsetzen verliert keine Restzeit.
 *
 * Angehalten wird aus mehreren Gründen gleichzeitig (Nutzer, Zeiger darüber,
 * Tastaturfokus darin, außer Sicht, Tab verborgen) — erst wenn keiner mehr
 * gilt, läuft sie weiter. Bei prefers-reduced-motion startet sie angehalten.
 * ------------------------------------------------------------------ */
const bp = $('[data-bp]');
if (bp) {
  const folien = $$('[data-bp-folie]', bp);
  const segmente = $$('[data-bp-zu]', bp);
  const nr = $('[data-bp-nr]', bp);
  const pauseKnopf = $('[data-bp-pause]', bp);
  const ansage = $('[data-bp-ansage]', bp);
  const BLENDE = 1150;
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gruende = new Set(ruhig ? ['nutzer'] : []);
  let aktuell = 0;
  let auftrag = 0;
  let aufraeumen = 0;

  const anhalten = (grund, an) => {
    if (an) gruende.add(grund); else gruende.delete(grund);
    bp.toggleAttribute('data-pausiert', gruende.size > 0);
    const nutzer = gruende.has('nutzer');
    pauseKnopf.toggleAttribute('data-spielt', !nutzer);
    pauseKnopf.setAttribute('aria-label', nutzer ? pauseKnopf.dataset.play : pauseKnopf.dataset.pause);
  };

  // Bild vollständig laden und dekodieren, bevor die Blende losläuft — sonst
  // zieht sie über ein halb geladenes Bild. Nach 2,5 s geht es trotzdem weiter.
  const bereit = (folie) => {
    const img = folie && folie.querySelector('img');
    if (!img) return Promise.resolve();
    img.loading = 'eager';
    const geladen = img.complete ? Promise.resolve() : new Promise((r) => {
      img.addEventListener('load', r, { once: true });
      img.addEventListener('error', r, { once: true });
    });
    return Promise.race([
      geladen.then(() => (img.decode ? img.decode().catch(() => {}) : undefined)),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  };

  const zu = async (ziel, { nutzer = false } = {}) => {
    const n = folien.length;
    const neuIndex = ((ziel % n) + n) % n;
    if (neuIndex === aktuell) return;
    const meiner = ++auftrag;
    await bereit(folien[neuIndex]);
    if (meiner !== auftrag) return;           // inzwischen neuer Auftrag

    const alt = folien[aktuell];
    const neu = folien[neuIndex];
    clearTimeout(aufraeumen);
    folien.forEach((f) => f.removeAttribute('data-vorher'));
    // Kürzerer Weg bestimmt die Richtung (Pfeil zurück, Sprung über Segmente)
    bp.dataset.richtung = (neuIndex - aktuell + n) % n <= n / 2 ? 'vor' : 'zurueck';
    void neu.offsetWidth;                    // Startlage der Richtung übernehmen
    alt.removeAttribute('data-aktiv');
    alt.setAttribute('data-vorher', '');
    alt.setAttribute('aria-hidden', 'true');
    neu.setAttribute('data-aktiv', '');
    neu.removeAttribute('aria-hidden');
    aufraeumen = setTimeout(() => alt.removeAttribute('data-vorher'), BLENDE + 60);

    segmente.forEach((s, i) => {
      if (i === neuIndex) s.setAttribute('aria-current', 'true'); else s.removeAttribute('aria-current');
      s.toggleAttribute('data-fertig', i < neuIndex);
    });
    nr.textContent = String(neuIndex + 1).padStart(2, '0');
    // Nur bei eigener Bedienung vorlesen — beim Selbstlauf wäre es Lärm
    if (nutzer && ansage) ansage.textContent = neu.getAttribute('aria-label');
    aktuell = neuIndex;
    bereit(folien[(neuIndex + 1) % n]);      // nächstes Bild schon vorladen
  };

  bp.addEventListener('animationend', (e) => {
    if (e.animationName === 'bp-lauf' && e.target.closest('.bp-segment[aria-current="true"]')) zu(aktuell + 1);
  });
  $('[data-bp-vor]', bp).addEventListener('click', () => zu(aktuell + 1, { nutzer: true }));
  $('[data-bp-zurueck]', bp).addEventListener('click', () => zu(aktuell - 1, { nutzer: true }));
  segmente.forEach((s, i) => s.addEventListener('click', () => zu(i, { nutzer: true })));
  pauseKnopf.addEventListener('click', () => anhalten('nutzer', !gruende.has('nutzer')));

  bp.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    zu(aktuell + (e.key === 'ArrowRight' ? 1 : -1), { nutzer: true });
  });
  bp.addEventListener('mouseenter', () => anhalten('zeiger', true));
  bp.addEventListener('mouseleave', () => anhalten('zeiger', false));
  // Nur Tastaturfokus hält an — nach einem Mausklick auf „weiter" soll die
  // Schau nicht stehen bleiben, bloß weil der Knopf noch den Fokus hat.
  bp.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) anhalten('fokus', true); });
  bp.addEventListener('focusout', (e) => { if (!bp.contains(e.relatedTarget)) anhalten('fokus', false); });
  new IntersectionObserver(([e]) => anhalten('sicht', e.intersectionRatio < 0.35), { threshold: [0, 0.35, 0.7] }).observe(bp);
  document.addEventListener('visibilitychange', () => anhalten('tab', document.hidden));

  // Wischen (touch-action:pan-y lässt senkrechtes Scrollen beim Browser)
  let startX = null;
  let startY = 0;
  bp.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, a')) return;
    startX = e.clientX; startY = e.clientY;
  });
  bp.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    startX = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) zu(aktuell + (dx < 0 ? 1 : -1), { nutzer: true });
  });
  bp.addEventListener('pointercancel', () => { startX = null; });

  const fuss = $('.bp-fuss', bp);
  if (fuss && 'ResizeObserver' in window) {
    new ResizeObserver(() => bp.style.setProperty('--bp-fuss', `${fuss.offsetHeight}px`)).observe(fuss);
  }

  anhalten('start', false);
  bp.setAttribute('data-bereit', '');
  bereit(folien[1]);
}

/* ------------------------------------------------------------------ *
 * Anfrage als Privat / Gewerblich
 *
 * Die Optik (Firmenfeld auf- und zuklappen) hängt per :has() direkt am
 * Radiobutton und funktioniert auch ohne JavaScript. Hier kommt nur hinzu,
 * was CSS nicht kann: das Firmenfeld ist bei „Gewerblich" Pflicht und bei
 * „Privat" inert — ein verstecktes Pflichtfeld würde das Absenden blockieren.
 * ------------------------------------------------------------------ */
const anfrage = $('form [name="kundentyp"]') ? $('form [name="kundentyp"]').form : null;
if (anfrage) {
  const firma = $('[data-anfrage-firma]', anfrage);
  const feld = $('[data-anfrage-firmenfeld]', anfrage);
  const art = () => {
    const gewerblich = anfrage.querySelector('[name="kundentyp"]:checked')?.value === 'gewerblich';
    feld.required = gewerblich;
    firma.toggleAttribute('inert', !gewerblich);
  };
  anfrage.addEventListener('change', (e) => { if (e.target.name === 'kundentyp') art(); });
  art();
}

/* ------------------------------------------------------------------ *
 * Dateifeld
 *
 * Mehrfach auswählen oder hineinziehen, einzeln wieder entfernen. Die Auswahl
 * wird über DataTransfer im Eingabefeld selbst gehalten, damit ein späteres
 * Backend sie mit dem Formular ganz normal bekommt.
 *
 * Die Prüfung (Endung, 10 MB je Datei, 25 MB gesamt, höchstens 5) ist reine
 * Bedienhilfe und ersetzt keine Prüfung auf dem Server. Dateinamen landen nur
 * über textContent im DOM.
 * ------------------------------------------------------------------ */
const dateiFeld = $('[data-datei-feld]');
if (dateiFeld) {
  const input = $('[data-datei-input]', dateiFeld);
  const zone = $('[data-datei-zone]', dateiFeld);
  const liste = $('[data-datei-liste]', dateiFeld);
  const fehler = $('[data-datei-fehler]', dateiFeld);
  const T = JSON.parse(dateiFeld.dataset.texte);
  const sprache = document.documentElement.lang || 'de';
  let ablage = [];
  const kannHalten = (() => { try { return !!new DataTransfer(); } catch (e) { return false; } })();

  const zahl = (x, stellen) => x.toLocaleString(sprache, { minimumFractionDigits: stellen, maximumFractionDigits: stellen });
  // Unter 1 MB in KB — sonst stünde bei kleinen Fotos „0,0 MB"
  const groesse = (b) => (b < 1048576 ? `${zahl(Math.max(1, Math.round(b / 1024)), 0)} KB` : `${zahl(b / 1048576, 1)} MB`);
  const melden = (meldungen) => {
    fehler.textContent = meldungen.join(' ');
    fehler.hidden = meldungen.length === 0;
  };
  const uebernehmen = () => {
    if (!kannHalten) return;
    const dt = new DataTransfer();
    ablage.forEach((f) => dt.items.add(f));
    input.files = dt.files;
  };
  const zeichnen = () => {
    liste.replaceChildren(...ablage.map((datei, i) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'datei-name';
      name.textContent = datei.name;
      name.title = datei.name;
      const groesseEl = document.createElement('span');
      groesseEl.className = 'datei-groesse';
      groesseEl.textContent = groesse(datei.size);
      const weg = document.createElement('button');
      weg.type = 'button';
      weg.className = 'datei-weg';
      weg.textContent = '×';
      weg.setAttribute('aria-label', T.entfernen.replace('{name}', datei.name));
      weg.addEventListener('click', () => {
        ablage.splice(i, 1);
        uebernehmen();
        zeichnen();
        melden([]);
        input.focus({ preventScroll: true });
      });
      li.append(name, groesseEl, weg);
      return li;
    }));
  };

  input.addEventListener('change', () => {
    const meldungen = [];
    const ergebnis = kannHalten ? [...ablage] : [];
    for (const datei of input.files) {
      if (ergebnis.some((x) => x.name === datei.name && x.size === datei.size)) continue;
      const endung = datei.name.includes('.') ? datei.name.split('.').pop().toLowerCase() : '';
      if (!T.endungen.includes(endung)) { meldungen.push(T.typ.replace('{name}', datei.name)); continue; }
      if (datei.size > T.maxDatei) { meldungen.push(T.gross.replace('{name}', datei.name)); continue; }
      if (ergebnis.length >= T.maxAnzahl) { meldungen.push(T.anzahl); break; }
      if (ergebnis.reduce((s, x) => s + x.size, 0) + datei.size > T.maxGesamt) { meldungen.push(T.gesamt); break; }
      ergebnis.push(datei);
    }
    if (kannHalten) {
      ablage = ergebnis;
      uebernehmen();
    } else if (meldungen.length) {
      // Ohne DataTransfer lässt sich die Auswahl nicht teilweise behalten
      input.value = '';
      ablage = [];
    } else {
      ablage = ergebnis;
    }
    zeichnen();
    melden([...new Set(meldungen)]);
  });

  ['dragenter', 'dragover'].forEach((typ) => zone.addEventListener(typ, () => zone.setAttribute('data-ziehen', '')));
  ['dragleave', 'drop'].forEach((typ) => zone.addEventListener(typ, () => zone.removeAttribute('data-ziehen')));
}
