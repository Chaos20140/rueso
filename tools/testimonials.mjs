/**
 * Echte Google-Rezensionen für den Abschnitt „Kundenstimmen".
 *
 * Erhoben am 07.09.2026 aus dem Google-Business-Eintrag der Rüso GmbH
 * (Berglar 36a, 33154 Salzkotten):
 *   https://www.google.com/maps/place/R%C3%BCso+GmbH
 *
 * Gesamtbild zu diesem Zeitpunkt: 4,6 von 5 bei 9 Bewertungen.
 * Von den 9 haben nur DREI einen Text, der Rest sind reine Sternebewertungen:
 *
 *   ★★★★★  Norbert Hübner, vor 5 Jahren
 *           „Sehr gute Beratung....sehr guter Zugang des personals"
 *   ★★★★★  Gerhard Suhr, vor 4 Jahren
 *           „Alles super!"
 *   ★       Matthias Dreps, vor 3 Jahren
 *           „Ist ganz gut!"           ← EIN Stern, trotz des Wortlauts
 *
 * Die dritte ist bewusst NICHT auf der Seite: Der Text klingt positiv, die
 * Bewertung ist aber die einzige 1-Stern-Wertung des Eintrags. Wer nur den
 * Wortlaut liest, setzt sie versehentlich als Lob ein.
 *
 * Zitate stehen WÖRTLICH da, samt der vier Punkte und der Kleinschreibung im
 * Original. Ein Zitat zu glätten hieße, jemandem Worte in den Mund zu legen.
 * Wenn RÜSO das sauberer haben möchte, ist der richtige Weg, die Person um
 * eine neue Formulierung zu bitten — nicht, die alte zu korrigieren.
 *
 * Beim nächsten Aktualisieren: Sterne je Rezension prüfen, nicht nur den Text.
 */

export const GOOGLE = {
  url: 'https://www.google.com/maps/place/R%C3%BCso+GmbH/@51.6754329,8.5863755,17z',
  schnitt: '4,6',
  anzahl: 9,
  stand: '2026-09-07',
};

/** Nur die 5-Sterne-Rezensionen mit Text, in der Reihenfolge der beiden Slots. */
export const ZITATE = [
  {
    text: 'Sehr gute Beratung....sehr guter Zugang des personals',
    autor: 'Norbert Hübner',
    sterne: 5,
    alter: { de: 'vor 5 Jahren', en: '5 years ago' },
  },
  {
    text: 'Alles super!',
    autor: 'Gerhard Suhr',
    sterne: 5,
    alter: { de: 'vor 4 Jahren', en: '4 years ago' },
  },
];

/**
 * Ersetzungen für den gebauten HTML-Rumpf, je Sprache.
 * Reine Textersetzung an exakten Stellen — Markup und Styles des Designs
 * bleiben unangetastet, damit der Abschnitt millimetergenau gleich aussieht.
 * Die Blockquotes haben `min-height:260px`; die kürzeren echten Zitate ändern
 * die Höhe deshalb nicht, und die Seite darunter verschiebt sich nicht.
 */
/**
 * Rezensionstext ist Fremdinhalt und landet direkt im HTML — deshalb
 * maskieren, auch wenn die heutigen drei Zitate harmlos sind. Sonst käme
 * beim nächsten Nachziehen ein `<` oder `&` ungefiltert in die Seite.
 */
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function ersetzungen(lang) {
  const de = lang !== 'en';
  const [z1, z2] = ZITATE.map(z => ({ ...z, text: esc(z.text), autor: esc(z.autor) }));
  const quelle = (z) => de
    ? `${z.autor} · ${z.sterne} Sterne auf Google · ${z.alter.de}`
    : `${z.autor} · ${z.sterne} stars on Google · ${z.alter.en}`;

  return de ? [
    ['Was Bauherren und Architekten sagen.', 'Was Kundinnen und Kunden sagen.'],
    ['„Platzhalter – hier steht eine echte Kundenstimme mit zwei bis drei Zeilen Länge. Wird nach Freigabe eingesetzt.“', `„${z1.text}“`],
    ['„Platzhalter – zweite Kundenstimme, idealerweise von einem Architekturbüro oder öffentlichen Auftraggeber.“', `„${z2.text}“`],
    ['Name · Funktion · Unternehmen', quelle(z1)],
    ['Name · Funktion · Unternehmen', quelle(z2)],
    ['Platzhalter — echte Zitate werden nachgeliefert',
      `${GOOGLE.schnitt} von 5 Sternen · ${GOOGLE.anzahl} Bewertungen auf Google`],
  ] : [
    ['What clients and architects say.', 'What customers say.'],
    ['“Placeholder – a real client quote of two to three lines goes here. To be inserted after approval.”', `„${z1.text}“`],
    ['“Placeholder – second client quote, ideally from an architecture firm or public client.”', `„${z2.text}“`],
    ['Name · Role · Company', quelle(z1)],
    ['Name · Role · Company', quelle(z2)],
    ['Placeholder — real quotes to follow',
      `${GOOGLE.schnitt.replace(',', '.')} out of 5 · ${GOOGLE.anzahl} Google reviews`],
  ];
}
