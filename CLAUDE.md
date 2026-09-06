# CLAUDE.md — RÜSO GmbH Website

Arbeitsnotizen für Claude. Nicht für den Kunden gedacht.
Ziel des Projekts: **1:1-Umsetzung** des Claude-Design-Projekts als deploybare
statische Website. „1:1" heißt hier messbar: identische Seitenhöhe und
0 % Pixelabweichung gegen das Original bei 1440 / 1024 / 375 px.

---

## 1. Woher der Code kommt

Quelle: Claude-Design-Projekt `f069dcea-80ec-4f5b-bbf9-71690af4dbcc`
(„Redesign mit Awards-Ästhetik").

`_design/` ist eine **byte-identische Kopie** der Design-Dateien und die
Wahrheitsquelle. Nie von Hand ändern — bei Design-Updates neu ziehen:

```bash
# braucht einmalig /design-login in einer interaktiven Claude-Code-Session
```
Dann per `DesignSync` (`method: get_file`) je Datei nach `_design/` schreiben.

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
```

Vier Ebenen, absichtlich unterschiedlich:

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
9. **`robots.txt` sperrt `/_design/` und `/tools/`.** Beides liegt im Repo und
   wird von Pages mit ausgeliefert; ohne Sperre konkurrieren die
   Design-Templates als Duplicate Content mit den echten Seiten.

---

## 8. Offene Punkte / bekannte Grenzen

- **Kontaktformular sendet nicht.** Im Design ist `onSubmit` ein
  `preventDefault` — hier genauso. Für den Livebetrieb braucht es ein Backend
  (Formspree, Cloudflare Worker o. ä.) plus DSGVO-Hinweis.
- **Bilder und Videos liegen weiter auf `www.rueso.de`.** Bei einem Umzug
  müssen sie mitgenommen werden; `content.js` hat alle URLs an einer Stelle
  (`const U`).
- **Kundenstimmen sind Platzhalter** — so im Design angelegt.
- **Öffnungszeiten sind Platzhalter** („Mo–Fr · Zeiten folgen").
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

## 9. Befehle

```bash
npm run build      # Design → Website
npm run serve      # lokaler Server
npm run check      # build + Pixel-Vergleich
node tools/fonts.mjs   # Schriften neu ziehen (selten nötig)
```

Deployment: GitHub Pages aus dem Repo-Root des `main`-Branch.
Die Site-URL steht als `SITE` oben in `tools/build.mjs` — bei einer
eigenen Domain dort ändern und neu bauen.
