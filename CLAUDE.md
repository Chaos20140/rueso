# CLAUDE.md — RÜSO GmbH Website

Arbeitsnotizen für Claude. Nicht für den Kunden gedacht.

Ziel: **1:1-Umsetzung** des Claude-Design-Projekts als deploybare statische
Website. „1:1" ist hier messbar definiert, nicht als Gefühl:

- gleiche Seitenhöhe und 0 % Pixelabweichung an 12 Scrollpositionen
- gleiche Box-Geometrie für jedes Text- und Medienelement, Toleranz 1 px
- gleiches Verhalten bei jeder Interaktion, gegen das Original geklickt

**Stand:** 11 Seiten × 2 Sprachen = 22 Seiten + 404. 33 Seite/Breite-Kombinationen
geometrisch identisch (max Δ 0,0 px), alle Zustände identisch, Pixelvergleich
der Startseite 0 % an 12 Scrollpositionen bei 1440/1024/375 px (Ausnahme: die
bekannten 0,01 % am „L" von PLONKA, §6). Live auf
<https://chaos20140.github.io/rueso/>.

Die bewusst geänderten Blöcke (Kundenstimmen, Karte, Absätze, Telefon/Fax,
Mobilmenü) sind dabei nicht ausgeklammert im Sinne von „ignoriert" — sie
werden auf **beiden** Seiten gleich behandelt, damit alles andere weiter
lückenlos geprüft wird. Wie das geht, steht in §6 unter „Wie die bewussten
Abweichungen aus dem Vergleich fallen".

---

## 1. Woher der Code kommt

Quelle: Claude-Design-Projekt `f069dcea-80ec-4f5b-bbf9-71690af4dbcc`
(„Redesign mit Awards-Ästhetik").

`_design/` ist eine **byte-identische Kopie** der Design-Dateien und die
Wahrheitsquelle. Nie von Hand ändern — bei Design-Updates neu ziehen:

Der Zugriff braucht einmalig `/design-login` in einer **interaktiven**
Claude-Code-Session (in einer Desktop-/Headless-Session lässt sich der
OAuth-Flow nicht starten). Danach gilt die Autorisierung auf dem Rechner
dauerhaft, auch für nicht-interaktive Sessions. Dann per `DesignSync`
(`method: get_file`) je Datei nach `_design/` schreiben.

**Falle:** Es gibt zwei Wege, an die Dateien zu kommen, und sie liefern
Unterschiedliches:
- `DesignSync` (api.anthropic.com) → **sauberer Quelltext** ✅
- `OmeletteService/GetFile` über claude.ai im Browser → dieselbe Datei **plus
  20 254 Bytes Preview-Instrumentierung** (`<style data-omelette-injected>` +
  ein großer `<script data-omelette-injected>` direkt nach dem viewport-Meta).
  Falls der Weg nötig ist: Block per Regex
  `/<style data-omelette-injected>[\s\S]*?<\/script>\n\n/` entfernen — die
  Dateigröße muss danach exakt der von `list_files` gemeldeten entsprechen.

`_design/RUESO-Mobile.dc.html` ist **keine Website-Seite**, sondern eine
Präsentations-Canvas des Design-Tools (die Seiten in iPhone-Rahmen). Wird
bewusst nicht gebaut.

`_design/support.js` ist das dc-Runtime (React 18 von unpkg, Babel). Wird für
die gebaute Seite **nicht** verwendet — nur damit das Original lokal als
Referenz läuft.

---

## 2. Das dc-Template-Format

Die `.dc.html`-Dateien sind React-Komponenten in Template-Schreibweise:

| Konstrukt | Bedeutung |
|---|---|
| `<x-dc>…</x-dc>` | Template-Rumpf |
| `<helmet>…</helmet>` | wandert in den `<head>` |
| `<script type="text/x-dc" data-dc-script>` | `class Component extends DCLogic` mit `renderVals()` |
| `{{ ausdruck }}` | Interpolation aus `renderVals()` |
| `<sc-if value="{{ x }}">` | Bedingung |
| `<sc-for list="{{ xs }}" as="s">` | Schleife |
| `<dc-import name="Nav" …>` | Komponenteneinbindung (nur `Nav` und `Footer`) |
| `style-hover="…"` / `style-focus="…"` | React ersetzt im Hover-State den kompletten `style`-Wert |
| `hint-placeholder-*`, `hint-size` | reine Editor-Metadaten, verwerfen |
| `onClick="{{ f }}"`, `ref="{{ r }}"` | React-Props |

**Wichtig für Vergleiche:** Das dc-Runtime rendert **jede** `{{ }}`-Interpolation
als `<span class="sc-interp">…</span>`. Die Klasse hat in `support.js` keine
eigene Regel (nur `.sc-interp.sc-missing` / `.sc-unresolved` für Ladezustände),
ist also ein ungestylter Inline-Span und layoutneutral — im Flex-/Grid-Kontext
verhält er sich wie der anonyme Textknoten des statischen Builds. Der Build
erzeugt diese Spans nicht. `tools/geom.mjs` behandelt sie deshalb als
durchsichtig; sonst meldet jeder Vergleich hunderte Scheinabweichungen.

Datenquelle für alle Seiten: `_design/content.js`
(`getContent(lang)` → services/stages/refs/milestones/faq/jobs/filters/partners,
`getPage(key, lang)` → features/advantages der Leistungsseiten).

---

## 3. Build-Pipeline (`tools/build.mjs`)

**Kernentscheidung: String-Transformation, kein DOM-Reparse.**
Ein HTML-Parser würde Attributnamen kleinschreiben, Whitespace normalisieren
und void-Tags umschreiben. Da jedes Layout hier in einem Inline-`style` steckt,
wäre jede Normalisierung ein Risiko. Der Compiler arbeitet deshalb direkt auf
dem Quelltext und fasst nur an, was er übersetzen muss.

Ablauf je Sprache (`de`, `en`) und Seite:

1. `parseDc()` — `<helmet>` und `<x-dc>`-Rumpf trennen
2. `<dc-import name="Nav|Footer">` durch das expandierte Komponenten-Template ersetzen
3. `expand()` — rekursiv `sc-if` / `sc-for` auflösen (`matchClose()` zählt
   Verschachtelungstiefe, weil sich `sc-if` und `sc-for` gegenseitig enthalten)
4. `transformChunk()` — pro Tag: `hint-*` und `ref` entfernen, `on*` → `data-act`,
   Boolean-Props → HTML-Boolean-Attribute, `style-hover/-focus` → CSS-Klasse,
   dann `{{ }}` interpolieren
5. `rewriteLinks()` — `RUESO-*.dc.html` → gebaute Dateinamen
6. `<head>` zusammensetzen (Titel/Description/OG/hreflang je Seite+Sprache)

Ausgabe: `index.html` + 10 Unterseiten, `en/` gespiegelt, `assets/css/site.css`,
`sitemap.xml`, `robots.txt`, `.nojekyll`.

### Wie React-State ersetzt wird

`renderVals()` liefert im Original bei jedem Render neue Werte. Statisch geht
das nur mit drei Strategien — `ifConfig` in `build.mjs` legt je Variable fest,
welche greift:

| Variable | Strategie | Umsetzung |
|---|---|---|
| `isDe` / `isEn` | **statisch** | pro Sprachbuild aufgelöst, der andere Zweig entfällt |
| `isMobileLayout` / `isDesktopLayout`, `isMobile` / `isDesktop` | **CSS** | *beide* Zweige ins HTML, `<div class="only-mobile\|only-desktop">` mit `display:contents`, Umschaltung per Media-Query bei 900 px |
| `menuOpen`, `servicesOpen` | **JS** | `<div data-toggle="…" hidden>`, `app.js` schaltet |
| `hasOpen` (Projektdialog) | **JS, je Eintrag** | ein `<div data-modal="<key>" hidden>` pro Referenz |
| `showTestimonials` | **statisch true** | Design-Default |

`display:contents` auf den Wrappern ist wichtig: die Hüll-`div`s dürfen keine
eigene Box erzeugen, sonst bricht das Flex-/Grid-Layout der Eltern (z. B. in
`<nav style="display:flex; justify-content:space-between">`).

Weil Mobil- und Desktopvariante **gleichzeitig** im DOM liegen, bekommen alle
`id`s im `only-mobile`-Zweig automatisch das Suffix `-mobil`
(`#ablauf` bleibt Desktop, `#ablauf-mobil` ist die Mobilvariante). Es verlinkt
nichts auf `#ablauf` — geprüft.

### `style-hover` → CSS

React tauscht im Hover-State den **ganzen** `style`-Wert. Eine Klassenregel
verliert aber gegen ein Inline-`style`. Deshalb bekommt jede Deklaration in der
generierten Regel ein `!important`:

```css
.sh1:hover{background:rgba(21,23,27,.06)!important;color:#15171B!important}
```

Gleiche `style-hover`-Strings teilen sich eine Klasse (`sh1`, `sf1`, …).
Die Nummerierung hängt an der Reihenfolge des Auftretens — DE- und EN-Build
müssen dasselbe CSS erzeugen; der Build vergleicht das und warnt sonst.

### Event-Handler

`HANDLERS` in `build.mjs` bildet `onXxx="{{ ausdruck }}"` auf `data-`Attribute
ab. Der Ersatztext darf selbst `{{ }}` enthalten (wird danach interpoliert):

```js
'r.open': 'data-act="modal-open" data-key="{{ r.key }}"'
```

**Falle:** `onMouseEnter` und `onMouseLeave` sitzen am selben Element. Wenn
beide auf `data-act="…"` abbilden, entsteht ein doppeltes Attribut und das
zweite wird verworfen. Deshalb `data-svc-open` / `data-svc-close` als
getrennte Attributnamen.

---

## 4. Laufzeit (`assets/js/app.js`)

- `motion.js` ist **unverändert** aus dem Design übernommen — nicht anfassen.
  Es liest `data-reveal`, `data-parallax`, `data-words`, `data-pin-h`,
  `data-stage`, `data-hero`, `data-preview` und hat den 900-px-Breakpoint
  für das horizontale Pinning fest eingebaut.
- FAQ, Mobilmenü, Leistungen-Dropdown, Referenz-Filter, Projektdialog,
  Kontakt-Themen — je ein kleiner Block, alle über `data-act` delegiert.
- **Chip-Gruppen** (Filter, Themen) lesen Aktiv-/Inaktiv-Optik beim Start
  aus dem DOM statt sie zu duplizieren. Dadurch kann das JS nie von den
  Build-Werten abweichen.
- Sprachumschaltung: Original re-rendert an Ort und Stelle, hier wird auf
  `en/<datei>` bzw. `../<datei>` navigiert (nötig für statische Seiten und
  besser für SEO). `localStorage['rueso_lang']` wird wie im Original gesetzt.
- Zwei Blöcke haben **kein** Gegenstück im Design (Abschnitt 7):
  - **Kundenstimmen-Slider** — bedient nur `scrollLeft` der Spur, kein eigener
    Zustand. Wischen, Trackpad und Tastatur funktionieren dadurch ohne Zutun,
    und ohne JS bleibt der Abschnitt vollständig bedienbar.
  - **Leistungen-Akkordeon im Mobilmenü** — `grid-template-rows` 0fr↔1fr wie
    beim FAQ, dazu `inert` im zugeklappten Zustand. `setMenu(false)` setzt es
    zurück, damit das Menü beim nächsten Öffnen wieder aufgeräumt ist.

---

## 5. Schriften — der wichtigste Fallstrick

Mehrere Überschriften begrenzen sich mit `max-width:16ch` / `22ch` / `18ch`.
Die Einheit `ch` ist die Vorschubbreite der Ziffer „0" der **aktuell
verfügbaren** Schrift:

| Schrift | `16ch` bei 47,1 px |
|---|---|
| Figtree (korrekt) | **484,6 px** → Überschrift 2 Zeilen |
| system-ui (Fallback) | 418,4 px → Überschrift 3 Zeilen |

Solange Figtree lädt, rechnet der Browser mit der Fallback-Metrik — und Chrome
rechnet `ch` **nicht neu**, wenn die Webfont danach eintrifft. Ergebnis im
Original: die Seitenhöhe schwankt zwischen Ladevorgängen um ~48 px pro
betroffener Überschrift. Das ist ein latenter Bug **im Design**, nicht im Nachbau.

**Lösung hier:** Schriften selbst gehostet (`tools/fonts.mjs` lädt sie einmalig
von Google und erzeugt `assets/css/fonts.css`), `font-display: block`, und die
drei Schnitte des ersten Viewports per `<link rel="preload">`. Damit steht die
Schrift vor dem ersten Layout und `ch` löst immer gegen Figtree auf.
Nebeneffekte: DSGVO (kein Google-Request des Besuchers) und ein Roundtrip weniger.

**Konsequenz für Vergleichstests:** `tools/shots.mjs` leitet auch die
Original-Seite per `ctx.route()` auf dieselben lokalen Fonts um. Ohne das
vergleicht man das Race, nicht das Layout.

---

## 6. Verifikation

```bash
npm run serve                                    # statischer Server
node tools/lint.mjs                              # statische Prüfung aller Seiten
node tools/geom.mjs                              # Geometrie-Diff (alle Seiten × 3 Breiten)
node tools/shots.mjs --page start --only 1440    # Pixel-Diff gegen das Original
node tools/interact.mjs                          # Verhaltensvergleich
node tools/a11y.mjs                              # Fokus, ARIA, Kontrast
node tools/breakpoint.mjs                        # Umschaltung rund um 900px
node tools/states.mjs                            # Zustände NACH Interaktionen
node tools/dev/csp.mjs                           # blockiert die CSP etwas?
```

Sieben Ebenen, absichtlich unterschiedlich:

- **`lint.mjs`** — rein statisch: doppelte ids, Tag-Balance, Metadaten,
  `alt`-Attribute, Formularlabels, tote Links, fehlende Assets, Template-Reste,
  verwendete-aber-undefinierte CSS-Klassen.
- **`geom.mjs`** — **die belastbarste Prüfung.** Vergleicht Boxen statt Pixel:
  jedes Element mit eigenem Text und jeden Medienrahmen. Timing-unabhängig,
  deckt auch 1024 px ab. Bilder werden über ihren **Rahmen** verglichen, nicht
  über sich selbst — ihr `transform` ändert sich durch die Parallax laufend.
- **`shots.mjs`** — Pixelvergleich an 12 Scroll-Positionen. Deterministik:
  `.mp4` blocken (beide zeigen das Poster), Web-Animations auf
  `currentTime = 60000` und pausiert, gleiche lokale Fonts, Zwei-Schritt-Scroll
  (siehe unten). Toleranz 24 (Summe der RGB-Deltas) gegen Antialiasing.
- **`interact.mjs`** — Verhalten: klickt beide Seiten durch und vergleicht.
- **`a11y.mjs`** — prüft die Ergänzungen, die im Original kein Gegenstück
  haben: Fokusrückgabe, Fokusfalle, `aria-expanded`/`aria-pressed`,
  Scroll-Sperre am richtigen Element, und ob versteckte Zweige wirklich aus
  dem Fokusfluss sind. Hier hängen auch die Funktionsprüfungen der eigenen
  Bauteile (Kundenstimmen-Slider, Leistungen-Akkordeon) — `interact.mjs` kann
  sie nicht prüfen, weil es dafür kein Original gibt. Kontrastwerte kommen aus
  dem Design und werden nur gemeldet, nie geändert.
- **`breakpoint.mjs`** — fährt 860–1000 px ab und vergleicht, welche
  Layoutvariante Original und Nachbau jeweils zeigen.
- **`states.mjs`** — die Lücke, die alle anderen lassen: `shots` und `geom`
  sehen nur den **Ausgangszustand**. Hier werden die Zustände verglichen, die
  erst durch Bedienung entstehen — offenes Nav-Dropdown, offenes Mobilmenü,
  jeder einzelne FAQ-Eintrag, jeder Referenz-Filter, alle zwölf
  Projektdialoge, jeder Kontakt-Chip, `prefers-reduced-motion`. Aufruf:
  `node tools/states.mjs [nav|menu|faq|filter|dialoge|chips|motion|alle]`.

### Wie die bewussten Abweichungen aus dem Vergleich fallen

`geom`, `shots` und `states` rufen alle `abweichungenAusblenden()` aus
**`tools/vergleich.mjs`** auf — direkt nach dem Rendern, **vor** dem ersten
Scrollen und Messen. Ohne das wäre nicht nur der geänderte Block abweichend,
sondern alles darunter mitverschoben; der Vergleich wäre für den Rest der
Seite wertlos.

Zwei Verfahren, je nach Art der Abweichung:

| Abweichung | Verfahren |
|---|---|
| Kundenstimmen, umstrukturierte Texte | beidseitig `display:none` — im Nachbau über `#stimmen` / `[data-struktur]`, im Design über den Wortlaut der betroffenen Absätze |
| Karte | beidseitig `visibility:hidden` (gleiche Box, nur anderer Inhalt), erkannt am Hintergrundbild |
| Telefon/Fax | im Nachbau für die Dauer der Prüfung auf die Design-Beschriftung zurückgesetzt |
| Footer-Logo | `[data-zusatz]` — im Nachbau ausgeblendet; im Design gibt es kein Gegenstück, dort ist nichts zu tun |
| Leistungen-Akkordeon im Mobilmenü | `menueAbweichungAusblenden()` — läuft erst **nach** dem Öffnen des Menüs, weil es den Block im Design vorher gar nicht gibt |

`strukturTexte()` liest die betroffenen Originaltexte **aus den gebauten
Seiten**, nicht aus einer gepflegten Liste: die Absätze einer Hülle wieder
zusammengefügt ergeben exakt den Ausgangstext (getrennt wird nur an
Leerzeichen), und bei Aufzählungen steht das Original als Schlüssel in
`LISTEN`. Eine zweite Liste würde beim nächsten Design-Update lautlos
veralten — und dann meldete der Vergleich plötzlich die halbe Seite als
verschoben, ohne dass sich etwas geändert hätte.

**Wichtig:** Die Vergleichsskripte lesen die Seiten beim Start. Wer während
eines laufenden Vergleichs neu baut, bekommt Geisterabweichungen (genau so
entstand hier einmal ein „kontakt @ 375px, Δ 212 px").

Der Trick beim Ausblenden ist, dass der Nachbau jeden umstrukturierten Text in
**genau eine** Hülle (`<div data-struktur>`) legt. Links wie rechts fällt damit
exakt ein Rasterelement weg — Zeilenhöhen, Abstände und Seitenhöhe stimmen
wieder überein. Wären es Geschwister im Elternraster, fehlten im Nachbau zwei
Elemente und zwei `gap`s mehr.

Beim Zurücksetzen (Telefon/Fax) bleibt die Schaltfläche im Vergleich; ein
unsichtbares Element hätte hier auch nichts genützt, weil das längere Wort auf
schmalen Screens einen echten Zeilenumbruch auslöst.

**Bilder: keine `loading`/`decoding`-Attribute.** Beide kosten hier messbare
Treue, deshalb stehen sie in `build.mjs` als Schalter auf `false`:
`decoding="async"` erlaubt dem Browser, ein Bild vor dem Dekodieren
darzustellen, `loading="lazy"` lädt es erst in Viewport-Nähe. Nach einem
Sprung per Ankerlink zeigt der Nachbau dann kurz den Platzhalter, das Design
schon das Bild — gemessen 18 % Abweichung bei 375 px. Wer die ~3 MB sparen
will: `LAZY_IMAGES` / `ASYNC_DECODE` auf `true`, und die Prüfung muss dann
schrittweise scrollen statt springen.

**Fallstrick Parallax-Rauschen:** `motion.js` aktualisiert die Parallax in einem
rAF, das ein Scroll-Event anstößt. Springt man per `scrollTo` auf eine Position
und lief das rAF zufällig davor, bleibt der alte `transform` stehen — es folgt
kein weiteres Scroll-Event mehr. Auf Seiten mit vielen Parallax-Bildern
(referenzen.html: 12 Stück) erzeugte das bis zu 5,6 % Pixelabweichung **ohne
jeden Layoutunterschied**. `shots.mjs` scrollt deshalb in zwei Schritten
(`y+2`, dann `y`). Wenn ein Pixelvergleich auf einer bilderreichen Seite Werte
im einstelligen Prozentbereich meldet: erst `geom.mjs` laufen lassen. Ist die
Geometrie identisch, ist es dieses Rauschen.

`tools/dev/` enthält Diagnose-Skripte (Geometrie-Diff, Diff-Bild, Crop),
nicht Teil der Auslieferung.

**Stand (siehe `.shots/*-report.json`):** alle 11 Seiten, 1440 px und 375 px,
identische Seitenhöhe, 0 % Abweichung.

Einzige Ausnahme, reproduzierbar auf **jeder** Seite: bei 375 px am letzten
Scrollstopp 0,01 % = **23 Pixel am „L" von PLONKA** in der Footer-Zeile
(Bounding-Box x 261–266, y 722–729). Kein Layoutunterschied — die Zeile

```html
<span>© 2026 RÜSO GmbH · <sc-if …>Teil der PLONKA Gruppe</sc-if>…</span>
```

wird von React als **zwei** Textknoten gerendert, vom Build als **einer**.
Der Browser shapet einen zusammenhängenden Textlauf minimal anders als zwei
aneinandergrenzende. Der Nachbau ist hier eher korrekter; sichtbar ist nichts.
Wenn eine künftige Prüfung 0,01 % bei 375 px meldet: das ist es, nicht neu prüfen.

`tools/interact.mjs`: alle Prüfungen bestanden (FAQ, Dropdown, Mobilmenü,
Hover + Cursor-Vorschau, Referenz-Filter, Projektdialog, Kontakt-Chips,
Sprachumschaltung, keine toten Links, keine JS-Fehler).

---

## 7. Bewusste Abweichungen vom Design

Alles Sichtbare ist identisch. Diese Punkte sind absichtlich anders:

1. **Schriften selbst gehostet** statt von Google — siehe Abschnitt 5.
2. **Sprachwechsel navigiert** (`/` ↔ `/en/`) statt in-place-Rerender.
3. **Escape schließt das Mobilmenü.** Das Design hat dafür keinen Handler; ein
   Vollbild-Overlay ohne Tastatur-Ausweg ist ein A11y-Mangel. Escape auf dem
   Projektdialog gibt es auch im Design.
4. **Tastaturbedienung fürs Leistungen-Dropdown** (`focusin`/`focusout`
   zusätzlich zu `mouseenter`/`mouseleave`).
5. **`aria-pressed`** auf Filter- und Themen-Chips, **`aria-expanded`** am
   Burger-Button. Unsichtbar, rein assistiv.
6. **`id`-Suffix `-mobil`** in der Mobilvariante — nötig, weil beide Layouts
   gleichzeitig im DOM liegen.
7. **Kopfdaten ergänzt**: Titel, Description, OG, hreflang, canonical,
   sitemap.xml, robots.txt. Das Design hat davon nichts.
8. **Content-Security-Policy als `<meta>`** (GitHub Pages kann keine Header
   setzen), plus `referrer`-Meta. `style-src` braucht `'unsafe-inline'` — das
   Design legt sein gesamtes Layout in `style`-Attribute, das ist ohne Umbau
   nicht vermeidbar. `media-src` listet beide Video-Hosts. Nach jeder Änderung
   an externen Quellen: `node tools/dev/csp.mjs` laufen lassen, sonst blockiert
   die Policy still Bilder oder Video.
   **Grenze:** `frame-ancestors` (Clickjacking) wirkt nur als HTTP-Header,
   im `<meta>` ignorieren Browser die Direktive. Auf GitHub Pages ist das also
   nicht durchsetzbar; auf eigener Domain gehören `frame-ancestors 'none'`
   und `X-Frame-Options: DENY` in die Serverkonfiguration.
   `script-src 'self'` steht bewusst ohne `'unsafe-inline'` — die Seite kommt
   ohne ein einziges Inline-`<script>` aus, das soll so bleiben.
9. **`robots.txt` sperrt `/_design/` und `/tools/`.** Beides liegt im Repo und
   wird von Pages mit ausgeliefert. **Achtung:** Unter einem Projekt-Unterpfad
   (`…github.io/rueso/`) lesen Crawler robots.txt nur im Origin-Root — dort
   wirkt die Datei nicht. Wirksam wird sie erst auf einer eigenen Domain.
10. **`noindex, nofollow` auf jeder Seite.** Diese Auslieferung ist eine
    Vorschau neben der produktiven `www.rueso.de` — mit derselben Firma,
    Anschrift und denselben Referenzprojekten. Ohne `noindex` konkurrierte sie
    in der Suche gegen die echte Kundenseite. Beim Umzug auf die eigene Domain:
    `NOINDEX` in `tools/build.mjs` auf `''`, `SITE` anpassen, neu bauen —
    canonical, hreflang, OG und sitemap sind bereits vollständig.
11. **Eigene `404.html`** statt der englischen GitHub-Standardseite.
12. **Favicon lokal** (`assets/img/rueso-signet.svg`) statt von rueso.de,
    plus `apple-touch-icon`. Ein Icon vom Fremdhost bedeutet einen weiteren
    Verbindungsaufbau und fällt aus, sobald dort etwas umzieht.
13. **`preconnect` auf rueso.de, `dns-prefetch` auf CloudFront.** Alle Bilder
    und Videos liegen dort; ohne die Hinweise beginnt der Verbindungsaufbau
    erst, wenn der Parser das erste `<img>` erreicht.
14. **Fokusführung:** Dialog und Mobilmenü halten den Fokus, solange sie offen
    sind, und geben ihn beim Schließen an den Auslöser zurück — immer mit
    `focus({ preventScroll: true })`. Ohne `preventScroll` würde der
    Rücksprung die Seite bewegen und dabei Reveal-Animationen auslösen, die im
    Design nicht passieren (das kostete mich einen halben Prüflauf).
15. **`resetReveal()` beim Filterwechsel** — siehe Abschnitt 8a.
16. **Kundenstimmen: echte Google-Rezensionen als Slider** — siehe unten.
17. **Echte Karte statt Streifenmuster** (`assets/img/karte-salzkotten.png`,
    erzeugt von `tools/map.mjs`). Im Design ist die „Karte" ein Dekor aus
    diagonalen Linien — sie kann nicht laden, weil es nichts zu laden gibt.
    Kein Google-iframe: der lädt beim Besucher fremde Skripte, setzt Cookies
    und wäre von der eigenen CSP (`frame-src 'none'`) ohnehin blockiert.
18. **Lange Fließtexte in Absätze und Aufzählungen geteilt**
    (`tools/absaetze.mjs`). Kein Wort geändert, getrennt wird nur an
    Satzgrenzen; acht Texte, die Listen in Prosaform waren, stehen jetzt als
    Liste. Kundenwunsch. Betroffen ist **jeder** reine Textabsatz ab ~185
    Zeichen, auch die, die direkt im Template stehen statt in `content.js` —
    dort standen die längsten Blöcke (brandschutz.html: 440 Zeichen am Stück).
    Siehe die Hinweise zu `data-words` unten.
19. **„T"/„F" vor den Rufnummern ausgeschrieben** zu „Telefon"/„Fax".
    Kundenwunsch; ein einzelnes „F" vor einer Nummer erkennt niemand als Fax.
20. **Mobilmenü: „Leistungen" ist ein Akkordeon** und startet zugeklappt. Im
    Design stehen die sechs Punkte immer offen und schieben die übrigen
    Menüpunkte aus dem Bild. Kundenwunsch. Zugeklappt trägt der Block `inert`
    — sonst bliebe er per Tab erreichbar, obwohl er weggeschnitten ist.

21. **Hero-Videos: die 4K-Fassungen sind raus.** Jedes Video hatte zwei
    Quellen; die erste lag mit 71–167 MB auf CloudFront, die zweite mit
    3–11 MB auf rueso.de. Details und Messwerte in `tools/overrides.mjs`,
    Abschnitt 6. Seitdem taucht CloudFront weder in der CSP noch im
    `dns-prefetch` auf.
22. **Logo und Firmenname im Footer.** Dasselbe Lockup wie in der Kopfzeile,
    in der Negativfassung des Signets
    (`assets/img/rueso-signet-hell.svg` — erzeugt aus dem Original, einzige
    Änderung: der dunkelblaue Schriftzug wird hell). Trägt `data-zusatz`.
23. **Impressum als eigene Seite** (`impressum.html`, `en/impressum.html`)
    statt eines Links nach rueso.de — siehe unten.

24. **Telefonlink korrigiert.** Sichtbar steht überall „05258 9 38 36-0", der
    Link dahinter lautete im Design `tel:+4952589383600` — eine Ziffer zu
    viel. Richtig ist `tel:+495258938360`. Unsichtbar, layoutneutral, aber wer
    auf dem Telefon darauf drückt, wählt sonst falsch. Auf rueso.de gibt es
    gar keine `tel:`-Links, der Fehler stammt also aus dem Entwurf.

Alle Abweichungen am fertigen HTML stehen an einer Stelle:
`tools/overrides.mjs`, angewendet **nach** der Kompilierung. `_design/` bleibt
unangetastet, und jede Ersetzung, die ihr Ziel nicht findet, erzeugt eine
Build-Warnung — sonst stünden nach einem Design-Update stillschweigend wieder
Platzhalter da.

### Absätze — wohin die Attribute wandern

Jeder geteilte Text steckt in **einer** Hülle `<div data-struktur>`. Wo die
Attribute des ursprünglichen `<p>` landen, hängt davon ab, was sie tun:

| Attribut | Ziel | Warum |
|---|---|---|
| `data-reveal` | an die **Hülle** | Der Block soll sich wie im Design als einer einblenden, nicht Absatz für Absatz. |
| `data-words` | an **jeden Absatz** | `motion.js` ersetzt den Textknoten durch Wort-Spans. An der Hülle würde es die Absätze zu einem einzigen Textknoten einschmelzen — die Absatztrennung wäre nach dem ersten Frame wieder weg. |

Der Abstand der Hülle ist `.62em`, und die Hülle bekommt dieselbe
`font`-Angabe wie ihre Absätze — dieselbe Hülle sitzt unter 15,5-px-Fließtext
wie unter einer 48-px-Schauzeile.

### Kundenstimmen — der neu gebaute Abschnitt

Der Abschnitt `#stimmen` der Startseite ist der einzige, der inhaltlich **und**
im Aufbau vom Design abweicht. Das Design sah zwei gleich große Kästen mit je
drei Zeilen Platzhaltertext vor. Die echten Rezensionen sind vier bzw. neun
Wörter lang — in 260 px hohen Rahmen wirkte das leer. Jetzt:

- die Gesamtwertung als Blickfang (4,6 bei 9 Bewertungen ist das stärkste
  Argument des Abschnitts und war vorher eine graue Fußzeile),
- eine Stimme pro Bild statt zweier nebeneinander, dadurch große Type,
- wischbar über `scroll-snap`, dazu Pfeile, Punkte und Pfeiltasten.

Daten und Herkunft: `tools/testimonials.mjs`. Markup und CSS: `zitate()` und
`OVERRIDE_CSS` in `tools/overrides.mjs`. Bedienung: Block „Kundenstimmen-Slider"
in `assets/js/app.js` — kein Transform-Karussell, der Zustand steht
ausschließlich im `scrollLeft` der Spur.

**Kein `data-reveal` an den Karten.** Karte 2 liegt horizontal außerhalb des
Sichtfelds; der IntersectionObserver von `motion.js` würde sie nie einblenden
und sie bliebe dauerhaft unsichtbar.

**Falle beim Aktualisieren:** Google zeigt bei diesem Eintrag drei Rezensionen
mit Text. Eine davon lautet „Ist ganz gut!" und liest sich positiv — es ist
aber die **einzige 1-Stern-Bewertung**. Beim Nachziehen deshalb immer die
Sterne je Rezension prüfen, nicht den Wortlaut.

### Impressum — abgeschrieben, nicht geschrieben

`tools/rechtsseiten.mjs` hält die Angaben, `build.mjs` baut daraus eine
vollwertige Seite: `ZUSATZSEITEN` liefert statt `parseDc()` einen Rumpf in
derselben Template-Schreibweise, alles danach (Navigation, Footer, Overrides,
Kopfdaten, CSS, sitemap) läuft ohne Sonderweg.

**Der Rechtstext ist wortgetreu von <https://www.rueso.de/impressum/>
übernommen, Stand 07.09.2026.** Ein Impressum zu formulieren hieße, Angaben zu
erfinden, für die die Firma haftet. Übernommen wurden auch die Eigenheiten des
Originals („HRB9051" ohne Leerzeichen, „Dipl.-Ing (FH)" ohne Punkt,
„Berglar 36a" statt „Berglar 36 a" wie im übrigen Seitentext).

Zwei bewusste Auslassungen gegenüber dem Original:

- **Der Agenturhinweis** („Design & Realisierung der Website: etcetc Marken &
  Marketing, Geseke") fehlt. Er beschreibt die Urheberschaft an rueso.de, nicht
  an diesem Entwurf — hier stehen gelassen wäre er schlicht falsch.
- **Ein leerer Bildnachweis-Eintrag** (` @  ()`) des Originals ist nicht
  mitgenommen.

Dafür ergänzt: ein Abschnitt „Zu dieser Fassung", der offenlegt, dass dies eine
Entwurfsfassung ist und die Fassung auf rueso.de maßgeblich bleibt.

**Die Datenschutzerklärung bleibt ein externer Link.** Ein Datenschutztext ist
keine Nachbauleistung, sondern eine Aussage über die tatsächliche Verarbeitung;
die muss vom Unternehmen kommen. Zu beachten: dieser Entwurf verarbeitet anders
als rueso.de (eigene Schriften statt Google Fonts, eigenes Kartenbild statt
Karten-Einbettung) — beim Livegang gehört das in den Datenschutztext.

### Kontrast — gemeldet, nicht geändert

Zwei Design-Farben verfehlen WCAG AA. Sie bleiben unverändert (Projektziel ist
1:1), `tools/a11y.mjs` weist sie bei jedem Lauf aus:

| Farbe | Verwendung | Ist | Soll | erfüllt ab |
|---|---|---|---|---|
| `#6B6F76` auf `#F3F0EA` | Mono-Labels, Meta-Zeilen | 4,44:1 | 4,5:1 | `#6A6E75` |
| `#9A9EA5` auf `#F3F0EA` | Formular-Platzhalter | 2,36:1 | 4,5:1 | `#6A6D72` |

Das erste ist ein Haaresbreite-Fall (eine Nuance dunkler genügt), das zweite
betrifft nur Platzhaltertexte in den Formularen. Beides ist eine
Design-Entscheidung des Kunden, keine Umsetzungsfrage.

---

## 8. Offene Punkte / bekannte Grenzen

- **Zwei verschiedene Faxnummern beim Kunden — ungeklärt.** Auf
  www.rueso.de/kontakt und im dortigen Footer steht `05258 9 98 36-199`, im
  Impressum derselben Seite `05258 93836-199`. Die Durchwahl gehört zur
  Rufnummernbasis 93836 (so auch die Telefonnummer 93836-0), die Kontaktseite
  hat also vermutlich einen Zahlendreher (3 → 9). **Nicht eigenmächtig
  korrigiert:** eine Rufnummer zu ändern, ohne sie zu prüfen, ist schlimmer
  als eine widersprüchliche Angabe zu melden. Die Seite zeigt derzeit beide
  Fassungen — die Design-Seiten die der Kontaktseite, das Impressum die des
  Impressums. Muss RÜSO klären, danach an einer Stelle vereinheitlichen.
- **Kontaktformular sendet nicht.** Im Design ist `onSubmit` ein
  `preventDefault` — hier genauso. Für den Livebetrieb braucht es ein Backend
  (Formspree, Cloudflare Worker o. ä.) plus DSGVO-Hinweis.
- **Bilder und Videos liegen weiter auf `www.rueso.de`.** Bei einem Umzug
  müssen sie mitgenommen werden; `content.js` hat alle URLs an einer Stelle
  (`const U`).
- **Nur zwei Kundenstimmen mit Text.** Mehr gibt der Google-Eintrag nicht her
  (9 Bewertungen, davon 3 mit Text, eine davon 1 Stern). Der Slider ist auf
  beliebig viele ausgelegt — sobald RÜSO neue Bewertungen hat, reicht ein
  Eintrag in `tools/testimonials.mjs`, Zähler, Punkte und Umlauf ziehen mit.
- **Öffnungszeiten sind Platzhalter** („Mo–Fr · Zeiten folgen"). Am 07.09.2026
  gezielt gesucht: rueso.de (Start, Kontakt, Impressum, Unternehmen, Karriere),
  meinestadt, 11880, Cylex, Golocal, Das Örtliche, Gelbe Seiten, fensterbau.org
  — **nirgends** eine Zeitangabe zum Standort Salzkotten. Die Alteinträge zum
  früheren Standort Bad Wünnenberg sind gelöscht (HTTP 410). Es kursiert ein
  „Mo–Do 08:00–17:00, Fr 08:00–13:00" in Suchergebnissen; das ließ sich an
  keiner Quelle belegen, betrifft den alten Standort und könnte zur ebenfalls
  dort ansässigen „Rüther GmbH & Co. KG" gehören — **nicht übernehmen.** Die
  Zeiten müssen vom Kunden kommen.
- **Das Impressum liegt jetzt lokal** (§7), muss aber von RÜSO gegengelesen
  werden: Registerdaten und Vertretungsverhältnisse ändern sich, und die
  Fassung hier ist eine Abschrift vom 07.09.2026.
- **Die Datenschutzerklärung verlinkt weiter nach `www.rueso.de`.** Sie
  beschreibt die Verarbeitung dort, nicht die hier (eigene Schriften, eigenes
  Kartenbild, keine Google-Einbettungen). Beim Livegang muss der Text
  angepasst werden — schreiben kann ihn nur das Unternehmen.
- `_design/upscale-jobs.md` enthält Higgsfield-Downloadlinks für die
  4K-Videos; die sind zeitlich begrenzt.
- **Hero-Video: 83 MB.** Erste `<source>` ist die CloudFront-4K-Fassung
  (`d8j0ntlcm91z4…`, 83 611 935 Bytes), zweite der `rueso.de`-Fallback
  (7 781 218 Bytes). Beide URLs antworten mit 200. Chrome nimmt in der
  Praxis den Fallback — im Livetest lief `currentSrc` = rueso.de, readyState 4,
  Video spielt. Für den Produktivbetrieb: die 4K-Fassung ist für Mobilfunk zu
  schwer, entweder entfernen oder per `media`-Attribut auf Breitbild
  beschränken. Gilt für alle Seiten mit Video-Hero.
- `<img data-preview-img>` (Cursor-Vorschau im Leistungen-Bereich) hat bis zum
  ersten Hover **kein `src`**. Auf Touch-Geräten bekommt es nie eins, weil
  `motion.js` bei `(hover: none)` früh aussteigt. Unsichtbar (`opacity:0`,
  `position:fixed`) und exakt wie im Design — Prüfskripte melden es als
  „1 kaputtes Bild", das ist ein Fehlalarm.
- Horizontaler Überlauf bei 375 px: `scrollWidth` 388 vs. 375. Kommt vom
  Hero-Medium (`inset:-2%`) und den Parallax-Bildern, wird von
  `body{overflow-x:hidden}` geklippt. Weder Wischen noch `scrollTo` bewegen die
  Seite — im Original **exakt dieselben Werte**. Nicht „reparieren":
  `html{overflow-x:hidden}` würde die Body-Overflow-Propagation aufheben und
  den Sticky-Hero brechen.

---

## 8a. Fallstricke, die schon einmal zugeschlagen haben

Alles hier wurde tatsächlich gefunden und behoben — nicht theoretisch.

| Symptom | Ursache | Lehre |
|---|---|---|
| Referenz-Filter blendete nichts aus | `[hidden]{display:none}` verliert gegen das Inline-`display:grid` der Karten | Gegen Inline-Styles hilft nur `!important` |
| Überschriftenhöhe sprang um 48 px zwischen Läufen | `max-width:16ch` löste gegen die Fallback-Schrift auf | Schriften selbst hosten + preload (§5) |
| Pixelvergleich meldete 5,6 % auf `referenzen.html` | Parallax-`transform` veraltet, weil das rAF vor dem `scrollTo` lief | `shots.mjs` scrollt in zwei Schritten; im Zweifel `geom.mjs` |
| Geometrieprüfung meldete hunderte Abweichungen | dc-Runtime verpackt jede Interpolation in `<span class="sc-interp">` | Als durchsichtig behandeln |
| Karriere/Unternehmen wichen ab, Startseite nicht | Font-Preloads im Prüfskript zeigten auf gelöschte Dateinamen | `geom.mjs` liest die Namen jetzt aus `fonts.css` |
| Doppeltes `data-act`-Attribut am Nav-Dropdown | `onMouseEnter` und `onMouseLeave` am selben Element, beide auf `data-act` abgebildet | Getrennte Attributnamen (`data-svc-open`/`-close`) |
| 18 % Abweichung nach dem Bilder-Tuning | `decoding="async"` zeigt das Bild vor dem Dekodieren | Beide Bildattribute aus (§6) |
| CSS verlor Regeln beim Zusammenfassen | Dedup arbeitete zeilenweise und verschluckte schließende Klammern | `dedupeCss()` arbeitet auf ganzen Regelblöcken |
| Chip-Gruppen lasen die Aktiv-Optik vom falschen Element | `aria-pressed` wurde erst von app.js gesetzt, die Abfrage lief also ins Leere | Der Build setzt `aria-pressed`, das JS liest es |
| Nach dem Filtern blieb die oberste Referenzkarte **leer** | Reveal-Zustand klebt am DOM-Knoten; das Design erzeugt die Karten neu, der Nachbau blendet sie nur um | `resetReveal()` in app.js — siehe unten |
| Filterzustände wichen erst ab dem dritten Klick ab | mein Fokus-Rücksprung nach dem Dialog scrollte die Karte ins Bild und löste dadurch Reveals aus | `focus({ preventScroll: true })` |
| Partner-Laufschrift 1–2 px versetzt | die Prüfskripte setzten `currentTime` **vor** `pause()`; die Animation lief noch einen Frame-Bruchteil weiter | erst `pause()`, dann `currentTime` |
| Pixelvergleich meldete plötzlich 33–47 %, Höhe des **Originals** um 68 px anders | `shots.mjs` schob dem Original keine Font-Preloads unter (nur `geom.mjs` tat das). Unter Last griff dadurch wieder dessen ch-Race | Preload-Injektion in allen drei Vergleichsskripten |
| Zitatkarte 304 px hoch statt der gesetzten 216 px | die Seite setzt **kein** globales `box-sizing:border-box`; `min-height` zählte nur den Inhalt, das Polster kam obendrauf (216 + 2×43,2 + 2×1) | bei eigenen Bauteilen `box-sizing:border-box` mitgeben, nicht voraussetzen |
| Zwei Absätze eines Textblocks standen 70 px auseinander statt 11 | die Spalten einer Rasterreihe sind gleich hoch, die Hülle wurde mitgestreckt, und `align-content:normal` verteilt die überschüssige Höhe auf die Zeilen | `align-content:start` an jeder Hülle, die gestreckt werden kann |
| Hero zeigte minutenlang nur das Standbild, die Seite lud endlos | das Design nennt zwei `<source>`; die erste ist eine 71–167 MB große 4K-Fassung. Der Browser lädt die ERSTE abspielbare Quelle — auf sechs Seiten brach er sie ab und fiel zurück, auf karriere.html spielte er die 104-MB-Datei wirklich | Quellenreihenfolge bei `<video>` ist keine Qualitätsstufe, sondern eine Ladeanweisung |
| Impressumsabschnitt stand auf dem Telefon 31 px über dem Bildschirmrand | `<main>` ist ein Raster; Rasterelemente haben `min-width:auto` und schrumpfen nicht unter ihr längstes Wort — hier „Verbraucherstreitbeilegung/Universalschlichtungsstelle" mit 401 px | bei Rastern IMMER `min-width:0` mitgeben, wenn Text darin umbrechen können soll; `overflow-wrap` allein genügt nicht |
| Vergleich meldete 212 px Versatz auf einer Seite, die nicht angefasst war | ich hatte während des laufenden Vergleichs neu gebaut; `vergleich.mjs` hatte die Textliste beim Start eingelesen | Prüfläufe nicht überlappen lassen, im Zweifel neu starten |
| „Telefon" statt „T" verschob auf brandschutz@375 px alles ab dem CTA um 56 px | das ausgeschriebene Wort macht die Schaltfläche ~40 px breiter, dadurch bricht die CTA-Reihe auf zwei Zeilen um — im Design lief sie knapp über den Rand | reine Wortänderungen für die Prüfung **zurücksetzen** statt ausblenden; ein unsichtbares Element behält seine falsche Breite |
| 0,11 % bei 375 px, Diff-Pixel entlang der Bildkanten | der IntersectionObserver startete eine Reveal-Transition **nach** dem Einfrieren; beide Seiten wurden an einem anderen Punkt der 1,15-s-Easingkurve fotografiert (0,46 px Versatz) | Einfrieren in einer Schleife, bis keine Animation mehr `running` ist |

**Merksatz zu Einzelausreißern:** Wenn GENAU EINE Seite/Breite-Kombination
abweicht, die Seite bei den anderen Breiten aber durchläuft, und die Abweichung
ungefähr eine Zeilenhöhe beträgt — erst denselben Lauf wiederholen. Am
07.09.2026 meldete `objekttueren @ 1440px` einmal 5531/5446 px und im
Wiederholungslauf 5446/5446. Abweichend war die **Referenz**, nicht der
Nachbau: das ch-Race des Designs (§5) schlägt unter Last gelegentlich noch
durch. Erst wenn es reproduzierbar ist, lohnt die Suche.

**Merksatz zum Einfrieren:** `document.getAnimations()` einmal aufzurufen
genügt nicht. `motion.js` startet über den IntersectionObserver ständig neue
Transitions — auch noch nach dem Einfrieren. Alle drei Vergleichsskripte
schleifen deshalb so lange, bis nichts mehr `playState === 'running'` meldet.
Wenn ein Vergleich Abweichungen **entlang von Bildkanten** meldet, ist es fast
immer das: Layout identisch, Animationsphase verschieden.

### Der Reveal-Zustand — der subtilste Unterschied im ganzen Projekt

`motion.js` versteckt beim Start alles unter dem Falz und blendet es per
IntersectionObserver ein. Dieser Zustand **klebt am DOM-Knoten**.

Das Design tauscht beim Filtern die Karten-Knoten komplett aus. Dadurch läuft
`prepReveal()` bei jedem Filterwechsel neu — der Zustand wird also
zurückgesetzt. Der Nachbau blendet dieselben Knoten nur aus und ein.

Ohne Gegenmaßnahme entstehen daraus zwei Abweichungen, beide live sichtbar:

1. Eine Karte, die beim Laden unter dem Falz lag, bleibt **weiß**, sobald ein
   Filter sie nach oben schiebt.
2. Eine einmal eingeblendete Karte bleibt sichtbar, obwohl ein späterer Filter
   sie wieder unter den Falz schiebt — das Design würde sie erneut verstecken.

`resetReveal()` in `assets/js/app.js` bildet `prepReveal()` nach (gleiche
Schwellen, eigener IntersectionObserver mit denselben Parametern) und läuft
nach jedem Filterwechsel über alle Karten.

**Beim FAQ bewusst NICHT**: dort behält auch das Design seine Knoten, der
Reveal-Zustand klebt dort also in beiden Fassungen gleich.

## 9. Befehle

```bash
npm run build      # Design → Website
npm run serve      # lokaler Server
npm run check      # build + alle Prüfungen
node tools/fonts.mjs   # Schriften neu ziehen (selten nötig)
node tools/map.mjs     # Kartenbild neu erzeugen (nur bei Umzug/Zoomwechsel)
node tools/absaetze.mjs   # zeigt, wie der Splitter die Bestandstexte teilt
```

Die drei letzten sind **Einmal-Werkzeuge**: `fonts.mjs` und `map.mjs` legen
Dateien ab, die danach im Repo liegen; sie laufen nicht bei jedem Build.
`absaetze.mjs` schreibt nichts, es zeigt nur die vorgeschlagene Aufteilung —
nützlich, wenn ein Text im Design neu formuliert wurde.

**Reihenfolge bei einem Design-Update:**
1. `_design/` neu ziehen (§1), Dateigrößen gegen `list_files` prüfen
2. `npm run build` — Warnungen ernst nehmen, sie zeigen genau auf neue
   Ausdrücke, neue Seiten oder unbekannte Event-Handler
3. `node tools/lint.mjs` und `node tools/geom.mjs` — das ist die Abnahme
4. `tools/interact.mjs`, `tools/a11y.mjs` bei Änderungen an der Interaktion

Der Build ist absichtlich laut: unbekannte `sc-if`-Ausdrücke, nicht auflösbare
`sc-for`-Listen, unbekannte Event-Handler und id-Verweise, die die
`-mobil`-Umbenennung nicht mitzieht, erzeugen jeweils eine Warnung und einen
Exit-Code ≠ 0. Ohne diese Warnungen verschwänden ganze Blöcke lautlos.

Deployment: GitHub Pages aus dem Repo-Root des `main`-Branch.
Die Site-URL steht als `SITE` oben in `tools/build.mjs` — bei einer
eigenen Domain dort ändern und neu bauen.
