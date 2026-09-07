/**
 * Lädt die im Design verwendeten Google-Schriften einmalig herunter und
 * erzeugt assets/css/fonts.css mit lokalen @font-face-Regeln.
 *
 * Warum selbst hosten?
 *  1. Layout-Determinismus — `max-width:16ch` löst gegen die Fallback-Schrift
 *     auf, solange Figtree noch lädt; dadurch springt die Zeilenzahl der
 *     Überschriften. Same-Origin + preload beseitigt das Race.
 *  2. DSGVO — kein Verbindungsaufbau des Besuchers zu Google-Servern.
 *  3. Tempo — ein Roundtrip weniger, kein DNS auf zwei Fremd-Hosts.
 *
 *   node tools/fonts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT_DIR = path.join(ROOT, 'assets', 'fonts');
const CSS_OUT = path.join(ROOT, 'assets', 'css', 'fonts.css');

const SRC = 'https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Nur die für DE/EN nötigen Subsets — spart ~70 % Gewicht.
const KEEP = ['latin', 'latin-ext'];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  fs.mkdirSync(FONT_DIR, { recursive: true });
  const css = await fetch(SRC, { headers: { 'user-agent': UA } }).then(r => r.text());

  // Google kommentiert jede Gruppe mit /* latin */ o. ä. vor der @font-face-Regel.
  const blocks = [...css.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)]
    .filter(([, subset]) => KEEP.includes(subset));

  // Figtree ist eine Variable Font: Google liefert für ALLE aufrechten
  // Schnitte (300–700) dieselbe woff2-URL zurück. Ohne Zusammenfassung läge
  // dieselbe Datei fünfmal unter verschiedenen Namen im Repo — und zwei
  // Kopien davon würden per preload doppelt geladen.
  const fileFor = new Map();      // url → Dateiname
  const out = [];
  let bytes = 0;

  for (const [, subset, rule] of blocks) {
    const family = /font-family:\s*'([^']+)'/.exec(rule)[1];
    const weight = /font-weight:\s*(\d+)/.exec(rule)[1];
    const style = /font-style:\s*(\w+)/.exec(rule)[1];
    const url = /url\((https:[^)]+\.woff2)\)/.exec(rule)[1];

    if (!fileFor.has(url)) {
      // Alle Schnitte, die auf diese Datei zeigen, für den Namen einsammeln
      const weights = blocks
        .filter(([, s, r]) => r.includes(url))
        .map(([, , r]) => /font-weight:\s*(\d+)/.exec(r)[1]);
      const range = weights.length > 1
        ? `${Math.min(...weights.map(Number))}-${Math.max(...weights.map(Number))}`
        : weight;
      const name = `${slug(family)}-${range}${style === 'italic' ? 'i' : ''}-${subset}.woff2`;
      const buf = Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
      fs.writeFileSync(path.join(FONT_DIR, name), buf);
      bytes += buf.length;
      fileFor.set(url, name);
    }

    out.push(rule
      .replace(/url\(https:[^)]+\.woff2\)/, `url(../fonts/${fileFor.get(url)})`)
      // block: Text bleibt kurz unsichtbar statt in Fallback-Metrik zu
      // rendern — damit lösen ch-Einheiten nie gegen die Ersatzschrift auf.
      .replace(/font-display:\s*\w+;/, 'font-display: block;')
      .replace(/\s+/g, ' ').trim());
  }

  // Verwaiste Dateien früherer Läufe entfernen
  const wanted = new Set(fileFor.values());
  for (const f of fs.readdirSync(FONT_DIR)) {
    if (f.endsWith('.woff2') && !wanted.has(f)) { fs.unlinkSync(path.join(FONT_DIR, f)); console.log(`  entfernt: ${f}`); }
  }

  fs.writeFileSync(CSS_OUT,
    '/* Selbst gehostete Schriften — erzeugt von tools/fonts.mjs, nicht von Hand ändern. */\n'
    + out.join('\n') + '\n');

  console.log(`✓ ${blocks.length} Schnitte → ${fileFor.size} Dateien (${(bytes / 1024).toFixed(0)} kB)`);
  console.log(`✓ ${path.relative(ROOT, CSS_OUT)}`);
}

main();
