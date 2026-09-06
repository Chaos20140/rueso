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
  const blocks = [...css.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)];
  const out = [];
  let kept = 0, bytes = 0;

  for (const [, subset, rule] of blocks) {
    if (!KEEP.includes(subset)) continue;
    const family = /font-family:\s*'([^']+)'/.exec(rule)[1];
    const weight = /font-weight:\s*(\d+)/.exec(rule)[1];
    const style = /font-style:\s*(\w+)/.exec(rule)[1];
    const url = /url\((https:[^)]+\.woff2)\)/.exec(rule)[1];

    const name = `${slug(family)}-${weight}${style === 'italic' ? 'i' : ''}-${subset}.woff2`;
    const buf = Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
    fs.writeFileSync(path.join(FONT_DIR, name), buf);
    bytes += buf.length; kept++;

    out.push(rule
      .replace(/url\(https:[^)]+\.woff2\)/, `url(../fonts/${name})`)
      // block: Text bleibt kurz unsichtbar statt in Fallback-Metrik zu
      // rendern — damit lösen ch-Einheiten nie gegen die Ersatzschrift auf.
      .replace(/font-display:\s*\w+;/, 'font-display: block;')
      .replace(/\s+/g, ' ').trim());
  }

  fs.writeFileSync(CSS_OUT,
    '/* Selbst gehostete Schriften — erzeugt von tools/fonts.mjs, nicht von Hand ändern. */\n'
    + out.join('\n') + '\n');

  console.log(`✓ ${kept} Schnitte (${(bytes / 1024).toFixed(0)} kB) → assets/fonts/`);
  console.log(`✓ ${path.relative(ROOT, CSS_OUT)}`);
}

main();
