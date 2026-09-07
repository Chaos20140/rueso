/**
 * Verhaltens-Vergleich: fährt Original (Claude-Design) und Nachbau durch
 * dieselben Interaktionen und vergleicht den resultierenden Zustand.
 *
 *   node tools/interact.mjs [--port 65311]
 *
 * Deckt ab, was ein Pixel-Diff nicht sieht: Akkordeon, Dropdown, Mobilmenü,
 * Hover-Zustände, Cursor-Vorschau, Referenz-Filter, Projektdialog,
 * Kontakt-Themen, Sprachumschaltung.
 *
 * Bewusste Abweichungen (siehe CLAUDE.md §7) sind als ERWARTET markiert und
 * zählen nicht als Fehler.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abweichungenAusblenden } from './vergleich.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean)
  .map(s => s.trim().split(/\s+/)).map(([k, v]) => [k, v ?? true]));
const PORT = args.port || process.env.PORT || '65311';
const BASE = `http://127.0.0.1:${PORT}`;

const fontCss = fs.readFileSync(path.join(ROOT, 'assets', 'css', 'fonts.css'), 'utf8')
  .replace(/url\(\.\.\/fonts\//g, `url(${BASE}/assets/fonts/`);

async function open(browser, url, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: width < 900 });
  await ctx.route('**/*.mp4', r => r.abort());
  await ctx.route('https://fonts.googleapis.com/**', r =>
    r.fulfill({ status: 200, contentType: 'text/css', body: fontCss }));
  await ctx.route('https://fonts.gstatic.com/**', r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|404|ERR_ABORTED/.test(m.text())) errs.push(m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  // Bewusst abweichende Textbloecke beidseitig ausblenden. Hier geht es zwar
  // ums Verhalten, nicht ums Layout — aber der FAQ-Vergleich misst die Hoehe
  // der aufgeklappten Antwort, und die ist im Nachbau durch die Absaetze
  // groesser. Siehe tools/vergleich.mjs.
  await abweichungenAusblenden(page);
  return { ctx, page, errs };
}

let fails = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function check(name, a, b, opts = {}) {
  const ok = eq(a, b);
  if (ok) { console.log(`  ok    ${name}`); return; }
  if (opts.expected) { console.log(`  ERW   ${name} — ${opts.expected}`); return; }
  fails++;
  console.log(`  ABW   ${name}`);
  console.log('        ref: ' + JSON.stringify(a));
  console.log('        neu: ' + JSON.stringify(b));
}
function assert(name, cond, detail = '') {
  if (cond) { console.log(`  ok    ${name}`); return; }
  fails++;
  console.log(`  ABW   ${name}${detail ? ' — ' + detail : ''}`);
}

/* ================= Startseite ================= */

const faqState = (page) => page.evaluate(() => [...document.querySelectorAll('#faq button[aria-expanded]')].map(b => ({
  expanded: b.getAttribute('aria-expanded'),
  sign: b.lastElementChild.textContent.trim(),
  rows: getComputedStyle(b.nextElementSibling).gridTemplateRows,
  h: Math.round(b.nextElementSibling.getBoundingClientRect().height),
})));

async function faqSequence(page) {
  const o = { initial: await faqState(page) };
  const btns = page.locator('#faq button[aria-expanded]');
  await btns.nth(2).click(); await page.waitForTimeout(900); o.click3 = await faqState(page);
  await btns.nth(2).click(); await page.waitForTimeout(900); o.closeSame = await faqState(page);
  await btns.nth(0).click(); await page.waitForTimeout(900); o.click1 = await faqState(page);
  return o;
}

/** Sichtbarkeit des Leistungen-Dropdowns, normalisiert (ref entfernt es aus dem DOM, Nachbau versteckt es). */
const svcVisible = (page) => page.evaluate(() => {
  const a = [...document.querySelectorAll('nav a')].find(x =>
    /^(Fassaden|Facades)$/.test(x.textContent.trim()) && x.closest('div[style*="520px"]'));
  if (!a) return false;
  const r = a.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
});

async function servicesDropdown(page) {
  const trigger = page.locator('nav a[href*="leistungen"]').first();
  const closed0 = await svcVisible(page);
  await trigger.hover(); await page.waitForTimeout(600);
  const opened = await svcVisible(page);
  await page.mouse.move(5, 500); await page.waitForTimeout(600);
  const closed1 = await svcVisible(page);
  return { closed0, opened, closed1 };
}

async function hoverStates(page) {
  const row = page.locator('[data-preview-row]').first();
  const base = await row.evaluate(el => getComputedStyle(el).paddingLeft);
  await row.hover(); await page.waitForTimeout(700);
  const hov = await row.evaluate(el => getComputedStyle(el).paddingLeft);
  const preview = await page.evaluate(() => {
    const img = document.querySelector('[data-preview-img]');
    const cs = getComputedStyle(img);
    return { opacity: cs.opacity, hasSrc: !!img.getAttribute('src'), position: cs.position };
  });
  const cta = page.locator('nav a').filter({ hasText: /^(Kontakt|Contact)$/ }).last();
  const ctaBase = await cta.evaluate(el => getComputedStyle(el).backgroundColor);
  await cta.hover(); await page.waitForTimeout(600);
  const ctaHover = await cta.evaluate(el => getComputedStyle(el).backgroundColor);
  return { row: { base, hov }, preview, cta: { base: ctaBase, hover: ctaHover } };
}

const overlayVisible = (page) => page.evaluate(() => {
  const o = [...document.querySelectorAll('div')].find(d => {
    const cs = getComputedStyle(d);
    return cs.position === 'fixed' && cs.zIndex === '55' && d.getBoundingClientRect().height > 300;
  });
  return !!o;
});

async function mobileMenu(page) {
  const burger = page.locator('nav button[aria-label="Menü"]');
  const before = await overlayVisible(page);
  await burger.click(); await page.waitForTimeout(700);
  const opened = await overlayVisible(page);
  const links = await page.evaluate(() => {
    const o = [...document.querySelectorAll('div')].find(d => {
      const cs = getComputedStyle(d);
      return cs.position === 'fixed' && cs.zIndex === '55' && d.getBoundingClientRect().height > 300;
    });
    // Nicht nur <a> zaehlen: im Nachbau ist „Leistungen“ bewusst eine
    // Schaltflaeche (Akkordeon, CLAUDE.md §7). Gezaehlt werden die
    // Menueeintraege, egal mit welchem Element sie umgesetzt sind.
    return o ? o.querySelectorAll('a, button[aria-controls]').length : 0;
  });
  await burger.click(); await page.waitForTimeout(700);
  const closedAgain = await overlayVisible(page);
  return { before, opened, links, closedAgain };
}

/* ================= Referenzen ================= */

/**
 * Nur sichtbare Karten zählen: das Original entfernt gefilterte Karten aus dem
 * DOM, der Nachbau blendet sie aus — sichtbar ist in beiden Fällen dasselbe.
 * Der Zähler wird über seinen Elterntext gefunden, damit die Suche nicht in
 * das (im Nachbau stets vorhandene, versteckte) Nav-Dropdown läuft.
 */
const gridState = (page) => page.evaluate(() => {
  const cards = [...document.querySelectorAll('button')].filter(b => b.querySelector('img[data-parallax]'));
  const vis = cards.filter(c => c.getBoundingClientRect().height > 0);
  const holder = [...document.querySelectorAll('div')].find(d =>
    /^\d{2}\s+(Projekte|projects)$/.test(d.textContent.trim()));
  return { visible: vis.length, counter: holder ? holder.textContent.trim().slice(0, 2) : null };
});

const modalState = (page) => page.evaluate(() => {
  const d = [...document.querySelectorAll('[role="dialog"]')].find(x => x.getBoundingClientRect().height > 0);
  if (!d) return { open: false };
  const h2 = d.querySelector('h2');
  const dds = [...d.querySelectorAll('dd')].map(x => x.textContent.trim());
  return { open: true, title: h2 ? h2.textContent.trim() : null, dds, bodyLocked: document.body.style.overflow };
});

async function referenzenFlow(page) {
  const o = { initial: await gridState(page) };
  const filters = page.locator('button').filter({ hasText: /^(Fassaden|Facades)$/ }).first();
  await filters.click(); await page.waitForTimeout(800);
  o.filterFassade = await gridState(page);
  const all = page.locator('button').filter({ hasText: /^(Alle|All)$/ }).first();
  await all.click(); await page.waitForTimeout(800);
  o.filterAll = await gridState(page);

  const card = page.locator('button').filter({ has: page.locator('img[data-parallax]') }).first();
  await card.click(); await page.waitForTimeout(900);
  o.modalOpen = await modalState(page);
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
  o.modalClosed = await modalState(page);
  return o;
}

/* ================= Kontakt ================= */

const chipState = (page) => page.evaluate(() => {
  const chips = [...document.querySelectorAll('button')].filter(b =>
    /border-radius:\s*999px/.test(b.getAttribute('style') || '') && b.textContent.trim().length < 20 && b.closest('form, main'));
  return chips.map(c => ({ label: c.textContent.trim(), bg: getComputedStyle(c).backgroundColor }));
});

async function kontaktChips(page) {
  const o = { initial: await chipState(page) };
  const chips = page.locator('button').filter({ hasText: /^(Brandschutz|Fire protection)$/ }).first();
  await chips.click(); await page.waitForTimeout(600);
  o.afterSelect = await chipState(page);
  return o;
}

/* ================= Lauf ================= */

const main = async () => {
  const browser = await chromium.launch();

  console.log('\n══ Startseite · Desktop 1440×900 ══');
  {
    const R = await open(browser, `${BASE}/_design/RUESO-Start.dc.html`, 1440, 900);
    const N = await open(browser, `${BASE}/index.html`, 1440, 900);
    const [a, b] = [await faqSequence(R.page), await faqSequence(N.page)];
    check('FAQ Ausgangszustand', a.initial, b.initial);
    check('FAQ Klick #3 öffnet, #1 schließt', a.click3, b.click3);
    check('FAQ erneuter Klick schließt', a.closeSame, b.closeSame);
    check('FAQ Klick #1', a.click1, b.click1);
    check('Leistungen-Dropdown', await servicesDropdown(R.page), await servicesDropdown(N.page));
    check('Hover Zeile / Cursor-Vorschau / CTA', await hoverStates(R.page), await hoverStates(N.page));
    assert('keine JS-Fehler', N.errs.length === 0, N.errs.join(' | '));
    await R.ctx.close(); await N.ctx.close();
  }

  console.log('\n══ Startseite · Mobil 375×812 ══');
  {
    const R = await open(browser, `${BASE}/_design/RUESO-Start.dc.html`, 375, 812);
    const N = await open(browser, `${BASE}/index.html`, 375, 812);
    check('Mobilmenü öffnen/schließen', await mobileMenu(R.page), await mobileMenu(N.page));
    check('FAQ mobil', await faqState(R.page), await faqState(N.page));
    // Design hat keinen Escape-Handler fürs Mobilmenü — bewusste Ergänzung.
    await N.page.locator('nav button[aria-label="Menü"]').click();
    await N.page.waitForTimeout(500);
    await N.page.keyboard.press('Escape');
    await N.page.waitForTimeout(500);
    assert('Ergänzung: Escape schließt das Mobilmenü', (await overlayVisible(N.page)) === false);
    assert('keine JS-Fehler', N.errs.length === 0, N.errs.join(' | '));
    await R.ctx.close(); await N.ctx.close();
  }

  console.log('\n══ Referenzen · Filter und Projektdialog ══');
  {
    const R = await open(browser, `${BASE}/_design/RUESO-Referenzen.dc.html`, 1440, 900);
    const N = await open(browser, `${BASE}/referenzen.html`, 1440, 900);
    const [a, b] = [await referenzenFlow(R.page), await referenzenFlow(N.page)];
    check('Raster Ausgangszustand', a.initial, b.initial);
    check('Filter „Fassaden"', a.filterFassade, b.filterFassade);
    check('Filter „Alle"', a.filterAll, b.filterAll);
    check('Projektdialog offen', a.modalOpen, b.modalOpen);
    check('Projektdialog per Escape zu', a.modalClosed, b.modalClosed);
    assert('keine JS-Fehler', N.errs.length === 0, N.errs.join(' | '));
    await R.ctx.close(); await N.ctx.close();
  }

  console.log('\n══ Kontakt · Themen-Chips ══');
  {
    const R = await open(browser, `${BASE}/_design/RUESO-Kontakt.dc.html`, 1440, 900);
    const N = await open(browser, `${BASE}/kontakt.html`, 1440, 900);
    const [a, b] = [await kontaktChips(R.page), await kontaktChips(N.page)];
    check('Chips Ausgangszustand', a.initial, b.initial);
    check('Chip-Auswahl', a.afterSelect, b.afterSelect);
    assert('keine JS-Fehler', N.errs.length === 0, N.errs.join(' | '));
    await R.ctx.close(); await N.ctx.close();
  }

  console.log('\n══ Sprachumschaltung und Verlinkung ══');
  {
    const N = await open(browser, `${BASE}/index.html`, 1440, 900);
    await N.page.locator('nav button[data-lang="en"]').click();
    await N.page.waitForURL('**/en/**', { timeout: 10000 }).catch(() => {});
    await N.page.waitForTimeout(1200);
    const en = await N.page.evaluate(() => ({
      path: location.pathname, lang: document.documentElement.lang,
      h1: document.querySelector('h1').textContent.replace(/\s+/g, ' ').trim(),
    }));
    assert('DE → EN', /\/en\/index\.html$/.test(en.path) && en.lang === 'en' && /Facades\. Windows\. Doors\./.test(en.h1), JSON.stringify(en));
    await N.page.locator('nav button[data-lang="de"]').click();
    await N.page.waitForTimeout(1200);
    const back = await N.page.evaluate(() => ({ path: location.pathname, lang: document.documentElement.lang }));
    assert('EN → DE', !/\/en\//.test(back.path) && back.lang === 'de', JSON.stringify(back));

    // Alle internen Links müssen ein Ziel haben
    const dead = await N.page.evaluate(() => [...document.querySelectorAll('a[href]')]
      .map(a => a.getAttribute('href'))
      .filter(h => h === '#' || /\.dc\.html/.test(h)));
    assert('keine toten internen Links', dead.length === 0, dead.join(', '));
    await N.ctx.close();
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} Abweichung(en)` : '\n✓ alle Verhaltensprüfungen bestanden');
  process.exitCode = fails ? 1 : 0;
};

main();
