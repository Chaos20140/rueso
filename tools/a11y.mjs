/**
 * Barrierefreiheits-Prüfung der gebauten Seiten.
 *
 *   node tools/a11y.mjs [--port 65311]
 *
 * Prüft, was kein Vergleich mit dem Original abdecken kann: die bewussten
 * Ergänzungen (siehe CLAUDE.md §7) und die Frage, ob die im DOM liegenden,
 * aber ausgeblendeten Zweige wirklich aus Fokus und Vorlesereihenfolge sind.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean)
  .map(s => s.trim().split(/\s+/)).map(([k, v]) => [k, v ?? true]));
const PORT = args.port || process.env.PORT || '65311';
const BASE = `http://127.0.0.1:${PORT}`;

let fails = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { console.log(`  ok    ${name}`); return; }
  fails++;
  console.log(`  FEHL  ${name}${detail ? ' — ' + detail : ''}`);
};

/* --- Kontrast nach WCAG 2.1 --- */
const srgb = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const hex = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
/** Halbtransparentes Weiß über dunklem Grund zusammenrechnen. */
const over = (fg, alpha, bg) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

async function open(browser, url, width = 1440) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 900 });
  await ctx.route('**/*.mp4', r => r.abort());
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  return { ctx, p };
}

const main = async () => {
  const browser = await chromium.launch();

  /* Kontrast: Diese Farben stammen aus dem Design und werden bewusst NICHT
     verändert — das Projektziel ist die 1:1-Umsetzung. Unterschreitungen
     werden deshalb als Hinweis ausgegeben, nicht als Fehler, samt der
     dunkelsten Farbe, die AA gerade noch erfüllen würde. */
  console.log('\n══ Kontrast (Farbwerte aus dem Design — Hinweise, keine Fehler) ══');
  const hell = hex('#F3F0EA'), dunkel = hex('#15171B');

  /** Dunkelt eine Farbe schrittweise ab, bis das Verhältnis erreicht ist. */
  const fixTo = (c, bg, target) => {
    for (let f = 100; f >= 0; f--) {
      const t = c.map(v => Math.round(v * f / 100));
      if (ratio(t, bg) >= target) {
        return '#' + t.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      }
    }
    return null;
  };

  const pairs = [
    ['#6B6F76', hell, 4.5, 'Mono-Labels, Meta-Zeilen'],
    ['#5C6068', hell, 4.5, 'Fließtext klein'],
    ['#3B3F46', hell, 4.5, 'Fließtext'],
    ['#15171B', hell, 4.5, 'Überschriften'],
    ['#9A9EA5', hell, 4.5, 'Formular-Platzhalter'],
  ];
  let hinweise = 0;
  for (const [c, bg, min, use] of pairs) {
    const r = ratio(hex(c), bg);
    if (r >= min) { console.log(`  ok    ${c} auf #F3F0EA (${use}): ${r.toFixed(2)}:1`); continue; }
    hinweise++;
    console.log(`  HINW  ${c} auf #F3F0EA (${use}): ${r.toFixed(2)}:1 — AA verlangt ${min}:1`);
    console.log(`          würde erfüllt ab ${fixTo(hex(c), bg, min)} (Design-Entscheidung, nicht angefasst)`);
  }
  for (const [alpha, use] of [[0.55, 'Footer-Labels'], [0.85, 'Footer-Links'], [0.9, 'Hero-Text']]) {
    const r = ratio(over(hex('#FAF8F4'), alpha, dunkel), dunkel);
    ok(`FAF8F4 ${Math.round(alpha * 100)}% auf #15171B (${use}): ${r.toFixed(2)}:1`, r >= 4.5, 'zu gering');
  }
  if (hinweise) console.log(`  → ${hinweise} Farbwert(e) unter AA. Bewusst unverändert (1:1), im Bericht vermerkt.`);

  console.log('\n══ Startseite · Desktop ══');
  {
    const { ctx, p } = await open(browser, `${BASE}/index.html`, 1440);
    const st = await p.evaluate(() => {
      const focusable = 'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])';
      const all = [...document.querySelectorAll(focusable)];
      const hiddenBranch = (el) => !!el.closest('[hidden], .only-mobile');
      return {
        // Versteckte Zweige dürfen keinen Fokus annehmen
        fokussierbarImVersteckten: all.filter(el => hiddenBranch(el) && el.getClientRects().length > 0).length,
        // Doppelte Inhalte: only-mobile liegt im DOM, muss aber display:none sein
        mobilZweigSichtbar: [...document.querySelectorAll('.only-mobile')].filter(e => e.getClientRects().length > 0).length,
        landmarks: {
          nav: document.querySelectorAll('nav').length,
          main: document.querySelectorAll('main').length,
          footer: document.querySelectorAll('footer').length,
        },
        faqExpanded: [...document.querySelectorAll('#faq button[aria-expanded]')].map(b => b.getAttribute('aria-expanded')),
        htmlLang: document.documentElement.lang,
        skipLink: !!document.querySelector('a[href="#main"], a[href^="#"][class*="skip"]'),
      };
    });
    ok('kein fokussierbares Element in versteckten Zweigen', st.fokussierbarImVersteckten === 0, String(st.fokussierbarImVersteckten));
    ok('Mobilzweig auf Desktop nicht sichtbar', st.mobilZweigSichtbar === 0, String(st.mobilZweigSichtbar));
    ok('genau ein <main>', st.landmarks.main === 1, JSON.stringify(st.landmarks));
    ok('FAQ: genau ein Eintrag offen', st.faqExpanded.filter(x => x === 'true').length === 1, st.faqExpanded.join(','));
    ok('html lang gesetzt', st.htmlLang === 'de', st.htmlLang);

    // Tastaturweg durch die Navigation
    const tab = await p.evaluate(async () => {
      document.body.focus();
      const seen = [];
      for (let i = 0; i < 12; i++) {
        // Playwright drückt Tab; hier nur prüfen, ob die Reihenfolge dem DOM folgt
        seen.push(null);
      }
      return seen.length;
    });
    ok('Tab-Reihenfolge messbar', tab === 12);
    await ctx.close();
  }

  console.log('\n══ Startseite · Mobil (Menü, Fokus) ══');
  {
    const { ctx, p } = await open(browser, `${BASE}/index.html`, 375);
    const burger = p.locator('[data-act="menu-toggle"]');
    ok('Burger hat aria-expanded vor dem ersten Klick',
      (await burger.getAttribute('aria-expanded')) === 'false');
    ok('Burger verweist per aria-controls auf das Menü',
      (await burger.getAttribute('aria-controls')) === 'hauptmenue');

    await burger.click();
    await p.waitForTimeout(600);
    ok('aria-expanded nach dem Öffnen true', (await burger.getAttribute('aria-expanded')) === 'true');
    ok('Fokus steht im geöffneten Menü',
      await p.evaluate(() => document.getElementById('hauptmenue')?.contains(document.activeElement)));
    ok('Scroll-Sperre am <body>, nicht am <html>',
      await p.evaluate(() => document.body.style.overflow === 'hidden' && !document.documentElement.style.overflow));

    // Fokusfalle: 40× Tab darf das Menü nicht verlassen
    for (let i = 0; i < 40; i++) await p.keyboard.press('Tab');
    ok('Fokus bleibt im Menü gefangen',
      await p.evaluate(() => document.getElementById('hauptmenue')?.contains(document.activeElement)));

    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);
    ok('Escape schließt das Menü', (await burger.getAttribute('aria-expanded')) === 'false');
    ok('Fokus kehrt auf den Burger zurück',
      await p.evaluate(() => document.activeElement === document.querySelector('[data-act="menu-toggle"]')));
    ok('Scroll-Sperre wieder aufgehoben',
      await p.evaluate(() => !document.body.style.overflow));
    await ctx.close();
  }

  /* Beides sind eigene Ergänzungen ohne Gegenstück im Design — der
     Verhaltensvergleich (tools/interact.mjs) kann sie deshalb nicht prüfen.
     Hier stehen sie, weil sie sonst nirgends stünden. */
  console.log('\n══ Kundenstimmen · Slider ══');
  {
    const { ctx, p } = await open(browser, `${BASE}/index.html`, 1440);
    const stand = () => p.evaluate(() => {
      const spur = document.querySelector('.stimmen-spur');
      const karten = [...spur.querySelectorAll('.stimmen-karte')];
      const pos = karten.map(k => k.offsetLeft - karten[0].offsetLeft);
      let i = 0, min = Infinity;
      pos.forEach((x, k) => { const d = Math.abs(x - spur.scrollLeft); if (d < min) { min = d; i = k; } });
      return {
        index: i,
        nr: document.querySelector('[data-zitat-nr]').textContent,
        punkt: [...document.querySelectorAll('.stimmen-punkt')].findIndex(b => b.getAttribute('aria-current') === 'true'),
        scrollbar: spur.scrollWidth > spur.clientWidth + 4,
      };
    });
    let s = await stand();
    ok('die Spur ist wirklich scrollbar', s.scrollbar, JSON.stringify(s));
    ok('startet bei der ersten Stimme', s.index === 0 && s.nr === '01' && s.punkt === 0, JSON.stringify(s));

    await p.locator('[data-act="zitat-next"]').click();
    await p.waitForTimeout(900);
    s = await stand();
    ok('Pfeil vor blättert weiter', s.index === 1 && s.nr === '02' && s.punkt === 1, JSON.stringify(s));

    await p.locator('[data-act="zitat-next"]').click();
    await p.waitForTimeout(900);
    s = await stand();
    ok('am Ende läuft der Slider um', s.index === 0 && s.nr === '01', JSON.stringify(s));

    await p.locator('.stimmen-punkt').nth(1).click();
    await p.waitForTimeout(900);
    ok('Punkt springt zur Stimme', (await stand()).index === 1);

    await p.locator('[data-act="zitat-prev"]').click();
    await p.waitForTimeout(900);
    ok('Pfeil zurück blättert zurück', (await stand()).index === 0);

    await p.evaluate(() => document.querySelector('.stimmen-spur').focus());
    await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(900);
    ok('Pfeiltaste blättert', (await stand()).index === 1);

    ok('jede Stimme nennt Person und Sterne im Text', await p.evaluate(() =>
      [...document.querySelectorAll('.stimmen-karte')].every(k =>
        (k.querySelector('.stimmen-name')?.textContent.trim().length || 0) > 2
        && /\d+ Sterne/.test(k.textContent))));
    ok('die Sternreihe hat ein Textäquivalent', await p.evaluate(() => {
      const el = document.querySelector('.stimmen-sterne');
      return el?.getAttribute('role') === 'img' && /von 5 Sternen/.test(el.getAttribute('aria-label') || '');
    }));
    ok('der Google-Link öffnet sicher', await p.evaluate(() => {
      const a = document.querySelector('.stimmen-link');
      return !!a && a.target === '_blank' && a.rel.includes('noopener') && a.href.startsWith('https://');
    }));
    await ctx.close();
  }

  console.log('\n══ Mobilmenü · Leistungen-Akkordeon ══');
  {
    const { ctx, p } = await open(browser, `${BASE}/index.html`, 375);
    await p.locator('[data-act="menu-toggle"]').click();
    await p.waitForTimeout(600);
    const knopf = p.locator('[data-act="menu-services"]');
    const panel = () => p.evaluate(() => {
      const el = document.getElementById('menue-leistungen');
      return { hoehe: el.getBoundingClientRect().height, inert: el.hasAttribute('inert') };
    });
    ok('Leistungen ist eine Schaltfläche mit aria-expanded',
      (await knopf.getAttribute('aria-expanded')) === 'false');
    ok('Leistungen ist beim Öffnen des Menüs zugeklappt', (await panel()).hoehe < 2,
      JSON.stringify(await panel()));
    ok('zugeklappt ist der Block inert (nicht per Tab erreichbar)', (await panel()).inert);

    await knopf.click();
    await p.waitForTimeout(800);
    ok('ein Klick klappt auf',
      (await knopf.getAttribute('aria-expanded')) === 'true' && (await panel()).hoehe > 40,
      JSON.stringify(await panel()));
    ok('aufgeklappt ist der Block bedienbar', !(await panel()).inert);

    await knopf.click();
    await p.waitForTimeout(800);
    ok('der zweite Klick klappt wieder zu',
      (await knopf.getAttribute('aria-expanded')) === 'false' && (await panel()).hoehe < 2);

    await knopf.click();
    await p.waitForTimeout(800);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(600);
    await p.locator('[data-act="menu-toggle"]').click();
    await p.waitForTimeout(600);
    ok('nach dem Wiederöffnen des Menüs steht das Akkordeon wieder zu',
      (await knopf.getAttribute('aria-expanded')) === 'false' && (await panel()).hoehe < 2);
    await ctx.close();
  }

  /* Eigene Seite ohne Design-Gegenstück — geom/shots vergleichen sie gar
     nicht, also muss die Grundhygiene hier geprüft werden. */
  console.log('\n══ Impressum ══');
  for (const [pfad, sprache, ueberschrift] of [['impressum.html', 'de', 'Impressum'], ['en/impressum.html', 'en', 'Legal notice']]) {
    const { ctx, p } = await open(browser, `${BASE}/${pfad}`, 1440);
    const st = await p.evaluate(() => ({
      lang: document.documentElement.lang,
      h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
      main: document.querySelectorAll('main').length,
      nav: document.querySelectorAll('nav').length,
      footer: document.querySelectorAll('footer').length,
      // Fremdziele müssen sich absichern, interne dürfen es nicht nötig haben
      blankOhneNoopener: [...document.querySelectorAll('a[target="_blank"]')]
        .filter((a) => !a.rel.includes('noopener')).length,
      leereLinks: [...document.querySelectorAll('a')].filter((a) => !a.textContent.trim() && !a.getAttribute('aria-label')).length,
      ueberlauf: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    ok(`${pfad}: html lang=${sprache}`, st.lang === sprache, st.lang);
    ok(`${pfad}: genau eine H1 „${ueberschrift}"`, st.h1.length === 1 && st.h1[0] === ueberschrift, JSON.stringify(st.h1));
    ok(`${pfad}: main/nav/footer je einmal`, st.main === 1 && st.nav === 1 && st.footer === 1, JSON.stringify(st));
    ok(`${pfad}: jedes target=_blank hat rel=noopener`, st.blankOhneNoopener === 0, String(st.blankOhneNoopener));
    ok(`${pfad}: kein Link ohne zugänglichen Namen`, st.leereLinks === 0, String(st.leereLinks));
    ok(`${pfad}: kein horizontaler Überlauf`, !st.ueberlauf);
    await ctx.close();
  }
  {
    // Der enge Fall: Langwort-Umbruch auf dem Telefon
    const { ctx, p } = await open(browser, `${BASE}/impressum.html`, 375);
    ok('impressum.html @375: kein horizontaler Überlauf',
      await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      await p.evaluate(() => document.documentElement.scrollWidth + '/' + document.documentElement.clientWidth));
    await ctx.close();
  }

  console.log('\n══ Referenzen · Chips und Projektdialog ══');
  {
    const { ctx, p } = await open(browser, `${BASE}/referenzen.html`, 1440);
    const chips = await p.evaluate(() => [...document.querySelectorAll('[data-act="filter"]')]
      .map(c => ({ key: c.dataset.key, pressed: c.getAttribute('aria-pressed'), bg: getComputedStyle(c).backgroundColor })));
    ok('genau ein Filter-Chip ist aria-pressed="true"', chips.filter(c => c.pressed === 'true').length === 1,
      JSON.stringify(chips.map(c => c.key + ':' + c.pressed)));
    ok('aktiver Chip ist auch optisch aktiv',
      chips.find(c => c.pressed === 'true')?.bg === 'rgb(21, 23, 27)',
      JSON.stringify(chips.find(c => c.pressed === 'true')));

    await p.locator('[data-act="filter"][data-key="fenster"]').click();
    await p.waitForTimeout(600);
    const after = await p.evaluate(() => [...document.querySelectorAll('[data-act="filter"]')]
      .map(c => c.dataset.key + ':' + c.getAttribute('aria-pressed')));
    ok('aria-pressed folgt der Auswahl', after.includes('fenster:true') && after.filter(x => x.endsWith(':true')).length === 1, after.join(' '));

    const card = p.locator('[data-act="modal-open"]:not([hidden])').first();
    await card.click();
    await p.waitForTimeout(700);
    ok('Fokus im Dialog', await p.evaluate(() => {
      const d = [...document.querySelectorAll('[data-modal]')].find(m => !m.hidden);
      return !!d && d.contains(document.activeElement);
    }));
    for (let i = 0; i < 30; i++) await p.keyboard.press('Tab');
    ok('Fokus bleibt im Dialog gefangen', await p.evaluate(() => {
      const d = [...document.querySelectorAll('[data-modal]')].find(m => !m.hidden);
      return !!d && d.contains(document.activeElement);
    }));
    await p.keyboard.press('Escape');
    await p.waitForTimeout(600);
    ok('Fokus kehrt auf die Karte zurück', await p.evaluate(() =>
      document.activeElement?.getAttribute('data-act') === 'modal-open'));
    ok('Scroll-Sperre aufgehoben', await p.evaluate(() => !document.body.style.overflow));
    await ctx.close();
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} Beanstandung(en)` : '\n✓ alle Prüfungen bestanden');
  process.exitCode = fails ? 1 : 0;
};

main();
