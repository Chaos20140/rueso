/**
 * Impressum als eigene Seite der Vorschau.
 *
 * Bisher zeigte der Footer nur einen Link auf https://www.rueso.de/impressum/.
 * Für eine Seite, die unter eigener Adresse erreichbar ist, ist das zu wenig:
 * das Impressum muss von jeder Seite aus in maximal zwei Klicks erreichbar
 * sein — und zwar auf dieser Seite, nicht auf einer fremden.
 *
 * WICHTIG: Der Rechtstext ist NICHT selbst formuliert. Er wird wortgetreu vom
 * Impressum der RÜSO GmbH übernommen (siehe QUELLE). Ein Impressum zu
 * „schreiben" hieße, Angaben zu erfinden, für die die Firma haftet. Was hier
 * steht, muss RÜSO vor dem Livegang trotzdem einmal gegenlesen — Registerdaten
 * und Vertretungsverhältnisse ändern sich.
 *
 * Aufbau: dieselbe Template-Sprache wie die Design-Seiten (`dc-import`,
 * `sc-if`), damit build.mjs die Seite durch dieselbe Pipeline schickt —
 * Navigation, Footer, Overrides, Kopfdaten und CSS entstehen dadurch ohne
 * Sonderweg. Siehe CLAUDE.md §7.
 */

const escHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const QUELLE = 'https://www.rueso.de/impressum/';

/**
 * Die Angaben aus dem Impressum der RÜSO GmbH.
 * Jeder Eintrag: { label: {de, en}, zeilen: [...] } — `zeilen` sind Rohtexte,
 * `html` ist erlaubt, wo ein Link nötig ist (dann wird nicht maskiert).
 */
export const IMPRESSUM = {
  stand: '2026-09-07',
  bloecke: [
    {
      label: { de: 'Anbieter', en: 'Provider' },
      de: ['RÜSO GmbH', 'Berglar 36a', '33154 Salzkotten'],
      en: ['RÜSO GmbH', 'Berglar 36a', '33154 Salzkotten, Germany'],
    },
    {
      label: { de: 'Vertreten durch', en: 'Represented by' },
      de: ['Dipl.-Wi.-Ing. Thorsten Fojtzik', 'Dipl.-Ing (FH) Michael Rüther'],
      en: ['Dipl.-Wi.-Ing. Thorsten Fojtzik', 'Dipl.-Ing (FH) Michael Rüther'],
    },
    {
      label: { de: 'Registereintrag', en: 'Commercial register' },
      de: ['Registergericht: Amtsgericht Paderborn', 'Handelsregister: HRB9051'],
      en: ['Register court: Amtsgericht Paderborn', 'Commercial register: HRB9051'],
    },
    {
      label: { de: 'Kontakt', en: 'Contact' },
      de: [
        { html: 'Telefon: <a href="tel:+495258938360" style="color:#15171B; text-decoration:underline; text-underline-offset:3px">05258 93836-0</a>' },
        'Telefax: 05258 93836-199',
        { html: 'E-Mail: <a href="mailto:info@rueso.de" style="color:#15171B; text-decoration:underline; text-underline-offset:3px">info@rueso.de</a>' },
      ],
      en: [
        { html: 'Phone: <a href="tel:+495258938360" style="color:#15171B; text-decoration:underline; text-underline-offset:3px">+49 5258 93836-0</a>' },
        'Fax: +49 5258 93836-199',
        { html: 'Email: <a href="mailto:info@rueso.de" style="color:#15171B; text-decoration:underline; text-underline-offset:3px">info@rueso.de</a>' },
      ],
    },
    {
      label: { de: 'Umsatzsteuer-ID', en: 'VAT identification number' },
      de: ['Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:', 'DE263890793'],
      en: ['VAT identification number pursuant to § 27 a of the German VAT Act:', 'DE263890793'],
    },
    {
      label: { de: 'Redaktionell verantwortlich', en: 'Responsible for content' },
      de: ['Dipl.-Ing (FH) Michael Rüther'],
      en: ['Dipl.-Ing (FH) Michael Rüther'],
    },
    {
      label: { de: 'Streitbeilegung', en: 'Dispute resolution' },
      de: ['Verbraucherstreitbeilegung/Universalschlichtungsstelle: Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.'],
      en: ['We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.'],
    },
    {
      label: { de: 'Bildnachweise', en: 'Image credits' },
      de: [
        'Patrick Johannsen Fotografie (Klimaerlebniswelt Oerlinghausen)',
        'Architekten Naujack Rind Hof GmbH (Schule für Pflege und Gesundheit)',
        'apisitboat69 @ envato (Fire)',
        'ShotHappens @ envato (Hand of Elegant Woman Opening Glass Door of Office Building)',
        'Schüco @ Schüco (div. Produktfotos und Videos)',
        'grandwarszawski @ Magnific.com (Modern european residential apartment buildings quarter New apartment building outdoor)',
      ],
      en: [
        'Patrick Johannsen Fotografie (Klimaerlebniswelt Oerlinghausen)',
        'Architekten Naujack Rind Hof GmbH (Schule für Pflege und Gesundheit)',
        'apisitboat69 @ envato (Fire)',
        'ShotHappens @ envato (Hand of Elegant Woman Opening Glass Door of Office Building)',
        'Schüco @ Schüco (product photography and videos)',
        'grandwarszawski @ Magnific.com (Modern european residential apartment buildings quarter New apartment building outdoor)',
      ],
    },
    {
      label: { de: 'Zu dieser Fassung', en: 'About this version' },
      prosa: true,
      de: [
        'Diese Seite ist eine Entwurfsfassung des Webauftritts der RÜSO GmbH und nicht der offizielle Auftritt des Unternehmens.',
        { html: 'Die Angaben oben sind wortgetreu dem Impressum unter <a href="https://www.rueso.de/impressum/" target="_blank" rel="noopener noreferrer" style="color:#15171B; text-decoration:underline; text-underline-offset:3px">www.rueso.de/impressum</a> entnommen (Stand 07.09.2026). Maßgeblich ist die dortige Fassung.' },
        { html: 'Für die Verarbeitung personenbezogener Daten gilt die <a href="https://www.rueso.de/datenschutzerklaerung/" target="_blank" rel="noopener noreferrer" style="color:#15171B; text-decoration:underline; text-underline-offset:3px">Datenschutzerklärung der RÜSO GmbH</a>.' },
      ],
      en: [
        'This page is a draft version of the RÜSO GmbH website and not the company’s official web presence.',
        { html: 'The details above are taken verbatim from the legal notice at <a href="https://www.rueso.de/impressum/" target="_blank" rel="noopener noreferrer" style="color:#15171B; text-decoration:underline; text-underline-offset:3px">www.rueso.de/impressum</a> (as of 7 September 2026). The German original is authoritative.' },
        { html: 'The <a href="https://www.rueso.de/datenschutzerklaerung/" target="_blank" rel="noopener noreferrer" style="color:#15171B; text-decoration:underline; text-underline-offset:3px">privacy policy of RÜSO GmbH</a> applies to the processing of personal data.' },
      ],
    },
  ],
};

/**
 * Ein Abschnitt: Mono-Label links, Inhalt rechts — Rhythmus der übrigen Seiten.
 *
 * `prosa` steuert nur den Zeilenabstand: Anschrift, Rufnummern und
 * Bildnachweise sind Zeilen EINES Blocks und stehen eng beieinander, ganze
 * Sätze bekommen echten Absatzabstand.
 *
 * `overflow-wrap:anywhere` an der Labelspalte ist nötig, weil Wörter wie
 * „Verbraucherstreitbeilegung" breiter sind als die 220-px-Spalte und sie
 * sonst aufschieben — dann stünde die Inhaltsspalte dieses Abschnitts weiter
 * rechts als bei allen anderen.
 */
function block(eintrag, de) {
  const label = de ? eintrag.label.de : eintrag.label.en;
  const zeilen = (de ? eintrag.de : eintrag.en) || [];
  // "Verbraucherstreitbeilegung/Universalschlichtungsstelle" ist auf dem
  // Telefon breiter als der Bildschirm. Zwei Angaben sind dafür nötig:
  // overflow-wrap erlaubt den Umbruch mitten im Wort, und min-width:0 hebt die
  // automatische Mindestbreite auf — die Absätze sind Rasterelemente, und die
  // schrumpfen sonst nicht unter ihr längstes Wort (401 px statt 350 px).
  const stil = 'min-width:0; margin:0; font:400 16px/1.6 Figtree,system-ui,sans-serif; color:#3B3F46; max-width:62ch; text-wrap:pretty; overflow-wrap:break-word';
  const inhalt = zeilen
    .map((z) => `<p style="${stil}">${typeof z === 'string' ? escHtml(z) : z.html}</p>`)
    .join('\n        ');

  // min-width:0 ist Pflicht: <main> ist ein Raster, und ein Rasterelement
  // kann ohne diese Angabe nicht unter seine Mindestbreite schrumpfen. Die
  // ergibt sich hier aus dem längsten unteilbaren Wort
  // ("Verbraucherstreitbeilegung/Universalschlichtungsstelle", 401 px) —
  // der Abschnitt stand dadurch auf dem Telefon 31 px über dem Bildschirmrand.
  return `<section style="min-width:0; display:flex; flex-wrap:wrap; gap:clamp(16px,3vw,48px); padding-bottom:clamp(28px,3vw,40px); border-bottom:1px solid rgba(21,23,27,.12)">
      <div style="flex:0 0 220px; min-width:0; overflow-wrap:anywhere; display:flex; gap:10px; align-items:flex-start; padding-top:5px; font:400 11.5px/1.6 'IBM Plex Mono',ui-monospace,monospace; letter-spacing:.14em; text-transform:uppercase; color:#6B6F76"><span style="width:6px; height:6px; border-radius:50%; background:oklch(0.55 0.16 30); flex:none; margin-top:6px"></span><span>${escHtml(label)}</span></div>
      <div style="flex:1 1 480px; min-width:0; display:grid; gap:${eintrag.prosa ? '14px' : '3px'}">
        ${inhalt}
      </div>
    </section>`;
}

/**
 * Baut die Seite in dc-Template-Schreibweise. `sc-if` löst build.mjs je
 * Sprachbuild auf, `dc-import` setzt Navigation und Footer ein.
 */
export function impressumSeite() {
  const de = IMPRESSUM.bloecke.map((b) => block(b, true)).join('\n\n    ');
  const en = IMPRESSUM.bloecke.map((b) => block(b, false)).join('\n\n    ');

  const body = `<div id="top" style="position:relative; min-height:100vh">
<dc-import name="Nav" lang="{{ lang }}" top="{{ navTop }}"></dc-import>

<header data-screen-label="Impressum Kopf" style="max-width:1400px; margin:0 auto; padding:clamp(140px,18vh,200px) clamp(20px,4vw,64px) clamp(40px,4.5vw,64px); display:grid; gap:clamp(24px,3vw,40px)">
  <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px 32px; font:400 11.5px/1.5 'IBM Plex Mono',ui-monospace,monospace; letter-spacing:.14em; text-transform:uppercase; color:#6B6F76; animation:fIn 1s ease .2s both">
    <div style="display:flex; align-items:center; gap:10px"><span style="width:6px; height:6px; border-radius:50%; background:oklch(0.55 0.16 30)"></span><sc-if value="{{ isDe }}">Rechtliches</sc-if><sc-if value="{{ isEn }}">Legal notice</sc-if></div>
    <div>Berglar 36 a · 33154 Salzkotten</div>
  </div>
  <h1 style="margin:0; font:500 clamp(48px,7.4vw,124px)/0.92 Figtree,system-ui,sans-serif; letter-spacing:-.04em; text-wrap:balance"><sc-if value="{{ isDe }}">Impressum</sc-if><sc-if value="{{ isEn }}">Legal notice</sc-if></h1>
</header>

<main data-screen-label="Impressum" style="max-width:1400px; margin:0 auto; padding:0 clamp(20px,4vw,64px) clamp(104px,12vw,180px); display:grid; gap:clamp(28px,3vw,40px)">
    <sc-if value="{{ isDe }}">${de}</sc-if><sc-if value="{{ isEn }}">${en}</sc-if>
</main>

<dc-import name="Footer" lang="{{ lang }}"></dc-import>
</div>`;

  return { helmet: '', body };
}
