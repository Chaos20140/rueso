/**
 * Gemeinsame Grundlage der Vergleichsskripte (geom, shots, states).
 *
 * Zwei Abschnitte der Seite weichen bewusst vom Design ab (CLAUDE.md §7):
 *
 *   1. Kundenstimmen — statt zweier Platzhalterkästen ein Slider mit den
 *      echten Google-Rezensionen. Andere Höhe, anderer Aufbau.
 *   2. „T"/„F" vor den Rufnummern sind zu „Telefon"/„Fax" ausgeschrieben.
 *      Gleicher Inhalt, rund 40 px breitere Box.
 *   3. Lange Fließtexte — in Absätze bzw. Aufzählungen geteilt. Wortlaut und
 *      Reihenfolge sind unverändert, die Höhe des Blocks ändert sich aber.
 *   4. Karte — im Design ein Streifenmuster, im Nachbau ein echtes
 *      Kartenbild. Gleiche Box, anderer Inhalt.
 *
 * Alle drei sind gewollt und lassen sich nicht gegen das Design prüfen. Ohne
 * Gegenmaßnahme würde aber auch alles DARUNTER als verschoben gemeldet — und
 * damit wäre der Vergleich für den gesamten Rest der Seite wertlos.
 *
 * Zwei Verfahren, je nach Art der Abweichung:
 *
 *   - Ganze Blöcke (1 und 3) werden auf BEIDEN Seiten ausgeblendet: im Nachbau
 *     über die Marker `#stimmen` und `[data-struktur]`, im Design über den
 *     Wortlaut der betroffenen Absätze. Weil der Nachbau jeden strukturierten
 *     Text in genau EINE Hülle legt, fällt links wie rechts exakt ein
 *     Rasterelement weg.
 *   - Reine Wortänderungen (2) werden für die Dauer der Prüfung
 *     zurückgesetzt. Das ist genauer als Ausblenden: die Schaltfläche bleibt
 *     im Vergleich, nur die Beschriftung entspricht wieder dem Design.
 *
 * Seitenhöhe und alle Positionen stimmen danach wieder überein, und jede echte
 * Abweichung fällt weiterhin auf.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strukturTexte } from './overrides.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Alle gebauten Seiten — Wurzel und `en/`. */
const seiten = () => [ROOT, path.join(ROOT, 'en')]
  .filter((d) => fs.existsSync(d))
  .flatMap((d) => fs.readdirSync(d)
    .filter((f) => f.endsWith('.html') && f !== '404.html')
    .map((f) => fs.readFileSync(path.join(d, f), 'utf8')));

const TEXTE = strukturTexte(seiten());

/**
 * Muss aufgerufen werden, NACHDEM die Seite gerendert ist (das Design baut
 * sich per React auf), aber BEVOR gescrollt oder gemessen wird — sonst
 * berechnen sich Scrollpositionen und Reveal-Zustände auf der falschen Höhe.
 */
export async function abweichungenAusblenden(p) {
  await p.addStyleTag({ content: '#stimmen,[data-struktur]{display:none!important}' }).catch(() => {});
  // Auf den Aufbau warten: vor dem React-Render gibt es die Absätze noch nicht.
  await p.waitForFunction(() => document.querySelectorAll('p').length > 3, null, { timeout: 15000 })
    .catch(() => {});
  await p.evaluate((texte) => {
    const menge = new Set(texte);
    document.querySelectorAll('p').forEach((el) => {
      if (menge.has(el.textContent.replace(/\s+/g, ' ').trim())) {
        el.style.setProperty('display', 'none', 'important');
      }
    });
  }, TEXTE).catch(() => {});

  // Telefon/Fax: hier wird nicht ausgeblendet, sondern für die Dauer der
  // Prüfung die Beschriftung des Designs wiederhergestellt („Telefon 05258…"
  // → „T 05258…"). Ausblenden wäre hier falsch: die Schaltfläche ist
  // ausgeschrieben rund 40 px breiter und bricht dadurch auf schmalen Screens
  // in eine eigene Zeile — eine echte Layoutfolge, die man mit einem
  // unsichtbaren Element nicht wegbekommt. Mit dem kurzen Wort ist der
  // Zustand wieder identisch, und die Schaltfläche bleibt vollständig
  // geprüft statt aus dem Vergleich zu fallen.
  await p.evaluate(() => {
    document.querySelectorAll('a,span,li,p').forEach((el) => {
      for (const n of el.childNodes) {
        if (n.nodeType !== 3) continue;
        const m = n.textContent.match(/^(Telefon|Fax) (?=0\d)/);
        if (m) n.textContent = m[1][0] + ' ' + n.textContent.slice(m[0].length);
      }
    });
  }).catch(() => {});

  // Karte: im Design ein Streifenmuster, im Nachbau ein echtes Kartenbild.
  // Gleiche Box (aspect-ratio), nur anderer Inhalt — deshalb `visibility`
  // statt `display`: die Maße bleiben im Vergleich, nur die Pixel fallen raus.
  // Beide Fassungen werden über ihr Hintergrundbild erkannt, damit die
  // Erkennung nicht an einer Klasse oder Reihenfolge hängt.
  await p.evaluate(() => {
    document.querySelectorAll('*').forEach((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg.includes('karte-salzkotten') || bg.includes('repeating-linear-gradient')) {
        el.style.setProperty('visibility', 'hidden', 'important');
      }
    });
  }).catch(() => {});
}

/**
 * Zusatz für den Zustandsvergleich bei geöffnetem Mobilmenü.
 *
 * Dort ist „Leistungen" im Nachbau ein Akkordeon statt eines immer offenen
 * Blocks (CLAUDE.md §7). Anders als die übrigen Abweichungen entsteht der
 * Block erst durch Bedienung — im Design gibt es ihn vor dem Klick auf den
 * Burger gar nicht. Deshalb kann `abweichungenAusblenden()` ihn nicht
 * mitnehmen; diese Funktion läuft direkt nach dem Öffnen des Menüs.
 *
 * Ausgeblendet wird auf beiden Seiten dieselbe Einheit: der Menüpunkt samt
 * seiner Unterliste. Erkannt wird er an der Schriftgröße — die Menüpunkte des
 * Overlays sind ~34–56 px groß, der gleichnamige Auslöser der Desktop-
 * Navigation dagegen 14 px. Damit fällt links wie rechts genau ein
 * Rasterelement weg, und der Rest des Menüs bleibt vergleichbar.
 */
export async function menueAbweichungAusblenden(p) {
  await p.evaluate(() => {
    const el = [...document.querySelectorAll('a,button')].find((e) =>
      /^(Leistungen|Services)$/.test(e.textContent.replace(/[^\p{L}]/gu, ''))
      && parseFloat(getComputedStyle(e).fontSize) > 30);
    if (!el) return;
    // Im Design ist der Punkt ein <a> mit der Unterliste als Geschwister,
    // im Nachbau ein <button> mit dem Akkordeon-Panel als Geschwister.
    for (const n of [el, el.nextElementSibling]) {
      if (n) n.style.setProperty('display', 'none', 'important');
    }
  }).catch(() => {});
}
