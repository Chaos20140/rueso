/**
 * Lange Fließtexte in Absätze teilen — reine Darstellung, kein Wort geändert.
 *
 * Das Design legt jeden Text als einen einzigen <p> ab. Bei 200–340 Zeichen in
 * einer schmalen Spalte ergibt das eine Textwand. Geteilt wird ausschließlich
 * an Satzgrenzen, die Reihenfolge und der Wortlaut bleiben unangetastet.
 *
 * Der Split wird zur Bauzeit aus _design/content.js berechnet, nicht von Hand
 * gepflegt: ändert das Design einen Text, stimmt die Aufteilung weiterhin.
 *
 *   node tools/absaetze.mjs        → zeigt, was der Splitter tun würde
 */

/**
 * Punkte, hinter denen KEIN Satz endet. Ohne diese Liste zerlegt der Splitter
 * Abkürzungen und Systembezeichnungen — im Bestand etwa „z. B.", „u. a.",
 * „ADS 65.NI SP." oder „DIN EN 13501-2".
 */
const KEINE_SATZGRENZE = [
  'z. B', 'z.B', 'u. a', 'u.a', 'd. h', 'd.h', 'bzw', 'ca', 'ggf', 'inkl', 'evtl',
  'Nr', 'Abs', 'Art', 'St', 'Dr', 'Ing', 'vgl', 'max', 'min', 'Mio', 'Mrd',
  'i. d. R', 'u. Ä', 'o. Ä', 'etc', 'usw',
];

/** Zerlegt einen Text in Sätze. Konservativ: im Zweifel nicht trennen. */
export function saetze(text) {
  const out = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c !== '.' && c !== '!' && c !== '?') continue;
    // Es muss ein Leerzeichen und ein Großbuchstabe folgen
    const rest = text.slice(i + 1);
    if (!/^\s+[A-ZÄÖÜ„“]/.test(rest)) continue;
    // Keine bekannte Abkürzung davor
    const davor = text.slice(0, i);
    if (KEINE_SATZGRENZE.some((a) => davor.endsWith(a))) continue;
    // Kein einzelner Großbuchstabe davor (Initialen) und keine Zahl-Punkt-Zahl
    if (/(^|\s)[A-ZÄÖÜ]$/.test(davor)) continue;
    if (/\d$/.test(davor) && /^\s+[A-ZÄÖÜ]/.test(rest) === false) continue;

    const ende = i + 1 + (rest.match(/^\s+/) || [''])[0].length;
    out.push(text.slice(start, i + 1).trim());
    start = ende;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/**
 * Teilt einen Text in Absätze.
 * Erst ab drei Sätzen und einer Länge, bei der eine Wand entsteht — kurze
 * Texte bleiben ein Block, sonst zerfasert die Seite.
 */
export function absaetze(text, { minLaenge = 185, minSaetze = 3 } = {}) {
  if (text.length < minLaenge) return [text];
  const s = saetze(text);
  if (s.length < minSaetze) {
    // Auch zwei lange Sätze vertragen eine Trennung — in einer schmalen
    // Spalte sind 200 Zeichen am Stück bereits ein Block.
    return (s.length === 2 && text.length >= 195) ? [s[0], s[1]] : [text];
  }
  // Trennstelle möglichst nah an der Mitte der Zeichenzahl
  let beste = 1, bestAbstand = Infinity;
  for (let k = 1; k < s.length; k++) {
    const links = s.slice(0, k).join(' ').length;
    const abstand = Math.abs(links - text.length / 2);
    if (abstand < bestAbstand) { bestAbstand = abstand; beste = k; }
  }
  return [s.slice(0, beste).join(' '), s.slice(beste).join(' ')];
}

/* ------------------------------------------------------------------ *
 * Aufzählungen
 *
 * Vier Texte im Bestand sind keine Prosa, sondern Listen, die in einen
 * Fließtext gepresst wurden. Ein Absatzumbruch hilft dort nicht — als Liste
 * gesetzt werden sie auf einen Blick lesbar. Wortlaut und Reihenfolge bleiben,
 * nur die Kommas werden zu Listenpunkten.
 * ------------------------------------------------------------------ */
export const LISTEN = {
  // objekttueren / Typische Einsatzbereiche
  'Büro- und Verwaltungsgebäude, Schulen, Kindergärten und Universitäten, Krankenhäuser und Pflegeeinrichtungen, Wohnungsbau und Mehrfamilienhäuser, öffentliche Gebäude und Einrichtungen sowie Produktionszentren.': {
    punkte: ['Büro- und Verwaltungsgebäude', 'Schulen, Kindergärten und Universitäten', 'Krankenhäuser und Pflegeeinrichtungen', 'Wohnungsbau und Mehrfamilienhäuser', 'öffentliche Gebäude und Einrichtungen', 'Produktionszentren'],
  },
  'Office and administrative buildings, schools, kindergartens and universities, hospitals and care facilities, housing and apartment buildings, public buildings and institutions as well as production centres.': {
    punkte: ['Office and administrative buildings', 'Schools, kindergartens and universities', 'Hospitals and care facilities', 'Housing and apartment buildings', 'Public buildings and institutions', 'Production centres'],
  },
  // objekttueren / Leistungen im Detail
  'Individuelle Türlösungen aus Aluminium, Türen mit Brand- und Rauchschutzfunktion, Fluchttüren, einbruchhemmende Türsysteme, barrierefreie und komfortable Zugänge, Kombination mit Glas- und Fassadenelementen – Planung, Fertigung und Montage aus einer Hand.': {
    punkte: ['Individuelle Türlösungen aus Aluminium', 'Türen mit Brand- und Rauchschutzfunktion', 'Fluchttüren', 'einbruchhemmende Türsysteme', 'barrierefreie und komfortable Zugänge', 'Kombination mit Glas- und Fassadenelementen'],
    schluss: 'Planung, Fertigung und Montage aus einer Hand.',
  },
  'Custom aluminium door solutions, doors with fire and smoke protection function, escape doors, burglar-resistant door systems, barrier-free and convenient access, combination with glass and facade elements – planning, production and installation from a single source.': {
    punkte: ['Custom aluminium door solutions', 'Doors with fire and smoke protection function', 'Escape doors', 'Burglar-resistant door systems', 'Barrier-free and convenient access', 'Combination with glass and facade elements'],
    schluss: 'Planning, production and installation from a single source.',
  },
  // brandschutz / Feuerwiderstandsklassen verständlich erklärt
  'Die Klassen werden nach DIN 4102 (europaweit DIN EN 13501-2) geregelt und geben an, wie lange ein Bauteil dem Feuer standhält. Brandschutztüren: T30 = 30 Minuten feuerhemmend, T60 = 60 Minuten hoch feuerhemmend, T90 = 90 Minuten feuerbeständig. Brandschutzverglasungen tragen die Kennung F, also F30 = 30 Minuten und F90 = 90 Minuten Schutz.': {
    intro: 'Die Klassen werden nach DIN 4102 (europaweit DIN EN 13501-2) geregelt und geben an, wie lange ein Bauteil dem Feuer standhält.',
    punkte: ['T30 = 30 Minuten feuerhemmend', 'T60 = 60 Minuten hoch feuerhemmend', 'T90 = 90 Minuten feuerbeständig'],
    vorPunkten: 'Brandschutztüren:',
    schluss: 'Brandschutzverglasungen tragen die Kennung F, also F30 = 30 Minuten und F90 = 90 Minuten Schutz.',
  },
  'The classes are regulated by DIN 4102 (Europe-wide DIN EN 13501-2) and state how long a component withstands fire. Fire doors: T30 = 30 minutes fire-retardant, T60 = 60 minutes highly fire-retardant, T90 = 90 minutes fire-resistant. Fire-protection glazing carries the letter F, i.e. F30 = 30 minutes and F90 = 90 minutes of protection.': {
    intro: 'The classes are regulated by DIN 4102 (Europe-wide DIN EN 13501-2) and state how long a component withstands fire.',
    punkte: ['T30 = 30 minutes fire-retardant', 'T60 = 60 minutes highly fire-retardant', 'T90 = 90 minutes fire-resistant'],
    vorPunkten: 'Fire doors:',
    schluss: 'Fire-protection glazing carries the letter F, i.e. F30 = 30 minutes and F90 = 90 minutes of protection.',
  },
  // fenster / Komfortlösungen für moderne Gebäude
  'Automatisierte Öffnungssysteme, verdeckt liegende Antriebe, integrierte Lüftung oder sensorbasierte Steuerungen: intelligente Lösungen für natürliche Belüftung, kontrolliertes Raumklima und barrierefreies Öffnen.': {
    punkte: ['Automatisierte Öffnungssysteme', 'verdeckt liegende Antriebe', 'integrierte Lüftung', 'sensorbasierte Steuerungen'],
    schluss: 'Intelligente Lösungen für natürliche Belüftung, kontrolliertes Raumklima und barrierefreies Öffnen.',
  },
  'Automated opening systems, concealed drives, integrated ventilation or sensor-based controls: intelligent solutions for natural ventilation, controlled indoor climate and barrier-free opening.': {
    punkte: ['Automated opening systems', 'concealed drives', 'integrated ventilation', 'sensor-based controls'],
    schluss: 'Intelligent solutions for natural ventilation, controlled indoor climate and barrier-free opening.',
  },
};

/* --- Selbsttest: zeigt, was der Splitter mit den Bestandstexten macht --- */
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') || ' ')) {
  const { getContent, getPage } = await import('../_design/content.js');
  for (const lang of ['de', 'en']) {
    const d = getContent(lang);
    const alle = [];
    d.faq.forEach((f) => alle.push([`FAQ · ${f.q.slice(0, 30)}`, f.a]));
    d.stages.forEach((s) => alle.push([`Ablauf · ${s.title}`, s.text]));
    for (const k of ['fassaden', 'fenster', 'objekttueren', 'brandschutz', 'schiebetueren', 'schiebewaende']) {
      getPage(k, lang).features.forEach((f) => alle.push([`${k} · ${f.title}`, f.text]));
    }
    console.log(`\n${'='.repeat(70)}\n${lang.toUpperCase()}\n${'='.repeat(70)}`);
    for (const [wo, t] of alle) {
      if (LISTEN[t]) { console.log(`\n▸ ${wo}  → LISTE (${LISTEN[t].punkte.length} Punkte)`); continue; }
      const a = absaetze(t);
      if (a.length < 2) continue;
      console.log(`\n▸ ${wo}  → ${a.length} Absätze`);
      a.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));
    }
  }
}
