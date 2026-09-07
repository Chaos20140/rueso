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

/** Nur die 5-Sterne-Rezensionen mit Text — je eine Folie im Slider. */
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
