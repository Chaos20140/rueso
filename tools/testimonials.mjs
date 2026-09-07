/**
 * Echte Google-Rezensionen für den Abschnitt „Kundenstimmen".
 *
 * Erhoben am 07.09.2026 aus dem Google-Business-Eintrag der Rüso GmbH
 * (Berglar 36a, 33154 Salzkotten):
 *   https://www.google.com/maps/place/R%C3%BCso+GmbH
 *
 * Gesamtbild: 4,6 von 5 bei 9 Bewertungen. Alle neun einzeln ausgelesen:
 *
 *   ★★★★★  Norbert Hübner, vor 5 Jahren
 *           „Sehr gute Beratung....sehr guter Zugang des personals"
 *   ★★★★★  Gerhard Suhr, vor 4 Jahren
 *           „Alles super!"
 *   ★       Matthias Dreps, vor 3 Jahren
 *           „Ist ganz gut!"           ← EIN Stern, trotz des Wortlauts
 *   ★★★★★  Daniel, nikita, Burak (je vor 2 Monaten) — ohne Text
 *   ★★★★★  Mihai Mititelu (vor 2 Jahren) — ohne Text
 *   ★★★★★  Bljerim Jasari (vor 5 Jahren) — ohne Text
 *   ★★★★★  Birgit Ulsahs (vor 7 Jahren) — ohne Text
 *
 * Macht 8 × 5 Sterne und 1 × 1 Stern. Die Rechnung stützt die Auszählung:
 * 4,6 bei 9 Bewertungen heißt Summe 41 (4,55–4,64 × 9), und 41 aus neun Werten
 * von 1 bis 5 mit mindestens einer Eins geht nur als 8×5 + 1×1 auf.
 *
 * Die 1-Stern-Bewertung ist bewusst NICHT als Zitat auf der Seite: Der Text
 * klingt positiv, die Wertung ist aber die einzige Eins des Eintrags. Wer nur
 * den Wortlaut liest, setzt sie versehentlich als Lob ein.
 *
 * Zitate stehen WÖRTLICH da, samt der vier Punkte und der Kleinschreibung im
 * Original. Ein Zitat zu glätten hieße, jemandem Worte in den Mund zu legen.
 * Wenn RÜSO das sauberer haben möchte, ist der richtige Weg, die Person um
 * eine neue Formulierung zu bitten — nicht, die alte zu korrigieren.
 *
 * ── Suche nach weiteren Rezensionen, 07.09.2026 ─────────────────────────────
 * Abgesucht wurden 11880, golocal, cylex, Das Örtliche, Gelbe Seiten, Yelp,
 * werkenntdenbesten, bewertet.de, meinestadt, fensterbau.org, ProvenExpert,
 * Trustpilot, MyHammer, Houzz, kununu, Indeed, Glassdoor, Facebook, Instagram,
 * LinkedIn, Xing und die Lokalpresse. Ergebnis:
 *
 *   - Google ist die EINZIGE Quelle mit Rezensionstexten. Kein weiteres Portal
 *     hat auch nur eine Bewertung mit Text.
 *   - Facebook: „Noch kein Rating (0 Bewertungen)" — gesichertes Negativergebnis.
 *   - Trustpilot und ProvenExpert: kein Profil vorhanden.
 *   - Die Alteinträge zum früheren Standort Bad Wünnenberg (golocal, Gelbe
 *     Seiten) sind gelöscht (HTTP 410). fensterbau.org spiegelt einen VERALTETEN
 *     Google-Wert (4,2 bei 5) — nicht übernehmen.
 *   - Arbeitgeberportale wären ohnehin Mitarbeitendenstimmen, keine Kundenstimmen.
 *
 * Eine zitierfähige Fremdstimme gibt es außerhalb von Google, sie gehört aber
 * NICHT in diesen Abschnitt: Ulrich Berger (Bürgermeister) und Peter Finke
 * (Wirtschaftsförderer) der Stadt Salzkotten, Pressemitteilung vom 17.02.2026,
 * „Es ist schön zu sehen, dass hier trotz der allgemein schwierigen
 * wirtschaftlichen Situation in die Zukunft investiert wird". Das lobt die
 * Investition in den Standort, nicht die Arbeit von RÜSO — als „Kundenstimme"
 * wäre es falsch etikettiert. Quelle:
 * https://www.salzkotten.de/de/aktuelles/news-und-pressemeldungen/Tueren-und-Fensterhersteller-RUeSO-bezieht-neue-Raeumlichkeiten-in-Salzkotten.php
 *
 * Beim nächsten Aktualisieren: Sterne je Rezension prüfen, nicht nur den Text,
 * und `verteilung` mitziehen — sie wird auf der Seite ausgewiesen.
 */

export const GOOGLE = {
  url: 'https://www.google.com/maps/place/R%C3%BCso+GmbH/@51.6754329,8.5863755,17z',
  schnitt: '4,6',
  anzahl: 9,
  stand: '2026-09-07',
  /** Sternverteilung, absteigend. Summe muss `anzahl` ergeben — build prüft das. */
  verteilung: [
    { sterne: 5, anzahl: 8 },
    { sterne: 4, anzahl: 0 },
    { sterne: 3, anzahl: 0 },
    { sterne: 2, anzahl: 0 },
    { sterne: 1, anzahl: 1 },
  ],
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
