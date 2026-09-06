/**
 * Verhaltens-Vergleich: fährt Original und Nachbau durch dieselben
 * Interaktionen und vergleicht den resultierenden Zustand.
 *
 *   node tools/interact.mjs [--port 65311]
 *
 * Deckt ab, was ein Pixel-Diff nicht sieht: Akkordeon, Dropdown,
 * Mobilmenü, Hover-Zustände, Cursor-Vorschau, Sprachumschaltung.
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

const URLS = { ref: `${BASE}/_design/RUESO-Start.dc.html`, neu: `${BASE}/index.html` };

const fontCss = fs.readFileSync(path.join(ROOT, 'assets', 'css', 'fonts.css'), 'utf8')
  .replace(/url\(\.\.\/fonts\//g, `url(${BASE}/assets/fonts/`);

async function open(browser, url, width, height) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    hasTouch: width < 900,
    isMobile: false,
  });
  await ctx.route('**/*.mp4', r => r.abort());
  await ctx.route('https://fonts.googleapis.com/**', r =>
    r.fulfill({ status: 200, contentType: 'text/css', body: fontCss }));
  await ctx.route('https://fonts.gstatic.com/**', r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|404/.test(m.text())) errs.push(m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  return { ctx, page, errs };
}

/* ---------------- Prüfungen ---------------- */

const faqState = (page) => page.evaluate(() => {
  const btns = [...document.querySelectorAll('#faq button[aria-expanded]')];
  return btns.map(b => ({
    expanded: b.getAttribute('aria-expanded'),
    sign: b.lastElementChild.textContent.trim(),
    rows: getComputedStyle(b.nextElementSibling).gridTemplateRows,
    // gemessene Panelhöhe: 0 = zu, > 0 = offen
    h: Math.round(b.nextElementSibling.getBoundingClientRect().height),
  }));
});

async function faqTests(page) {
  const out = {};
  out.initial = await faqState(page);
  await page.locator('#faq button[aria-expanded]').nth(2).click();
  await page.waitForTimeout(900);
  out.afterClick3 = await faqState(page);
  await page.locator('#faq button[aria-expanded]').nth(2).click();
  await page.waitForTimeout(900);
  out.afterCloseSame = await faqState(page);
  await page.locator('#faq button[aria-expanded]').nth(0).click();
  await page.waitForTimeout(900);
  out.afterClick1 = await faqState(page);
  return out;
}

async function servicesDropdown(page) {
  const trigger = page.locator('nav a[href*="leistungen"]').first();
  const before = await page.locator('nav a[href$="fassaden.html"], nav a[href$="RUESO-Fassaden.dc.html"]').count();
  await trigger.hover();
  await page.waitForTimeout(600);
  const visible = await page.evaluate(() => {
    const a = [...document.querySelectorAll('nav a')].find(x => /Fassaden|Facades/.test(x.textContent) && x.closest('div[style*="width:520px"], div[style*="width: 520px"]'));
    if (!a) return null;
    const r = a.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
  });
  await page.mouse.move(5, 400);
  await page.waitForTimeout(500);
  const afterLeave = await page.evaluate(() => {
    const a = [...document.querySelectorAll('nav a')].find(x => /Fassaden|Facades/.test(x.textContent) && x.closest('div[style*="width:520px"], div[style*="width: 520px"]'));
    if (!a) return null;
    const r = a.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  return { beforeCount: before, visible, afterLeave };
}

async function hoverStates(page) {
  const row = page.locator('[data-preview-row]').first();
  const base = await row.evaluate(el => getComputedStyle(el).paddingLeft);
  await row.hover();
  await page.waitForTimeout(700);
  const hov = await row.evaluate(el => getComputedStyle(el).paddingLeft);
  const preview = await page.evaluate(() => {
    const img = document.querySelector('[data-preview-img]');
    if (!img) return null;
    const cs = getComputedStyle(img);
    return { opacity: cs.opacity, hasSrc: !!img.getAttribute('src'), position: cs.position };
  });
  // Kontakt-Button in der Nav
  const cta = page.locator('nav a[href*="kontakt"], nav a[href$="RUESO-Kontakt.dc.html"]').last();
  const ctaBase = await cta.evaluate(el => getComputedStyle(el).backgroundColor).catch(() => null);
  await cta.hover().catch(() => {});
  await page.waitForTimeout(600);
  const ctaHover = await cta.evaluate(el => getComputedStyle(el).backgroundColor).catch(() => null);
  return { rowPadding: { base, hov }, preview, cta: { base: ctaBase, hover: ctaHover } };
}

async function mobileMenu(page) {
  const burger = page.locator('nav button[aria-label="Menü"]');
  if (!(await burger.count())) return { burger: 0 };
  await burger.click();
  await page.waitForTimeout(700);
  const open = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')].filter(a => {
      const r = a.getBoundingClientRect();
      return r.width > 0 && /Referenzen|Projects/.test(a.textContent) && getComputedStyle(a).fontSize.startsWith('3') === false;
    });
    const overlay = [...document.querySelectorAll('div')].find(d => {
      const cs = getComputedStyle(d);
      return cs.position === 'fixed' && cs.zIndex === '55' && d.getBoundingClientRect().height > 300;
    });
    return { overlayVisible: !!overlay, overlayH: overlay ? Math.round(overlay.getBoundingClientRect().height) : 0, links: links.length };
  });
  // Über einen Link im Overlay schließen
  const closer = page.locator('div[style*="z-index:55"] a, div[style*="z-index: 55"] a').first();
  const closed = await (async () => {
    if (!(await closer.count())) return null;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    return page.evaluate(() => {
      const overlay = [...document.querySelectorAll('div')].find(d => {
        const cs = getComputedStyle(d);
        return cs.position === 'fixed' && cs.zIndex === '55' && d.getBoundingClientRect().height > 300;
      });
      return { overlayVisible: !!overlay };
    });
  })();
  return { burger: 1, open, afterEscape: closed };
}

/* ---------------- Lauf ---------------- */

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let fails = 0;
const report = (name, a, b, note = '') => {
  const ok = eq(a, b);
  if (!ok) fails++;
  console.log(`${ok ? '  ok  ' : '  ABW '} ${name}${note ? '  (' + note + ')' : ''}`);
  if (!ok) {
    console.log('        ref: ' + JSON.stringify(a));
    console.log('        neu: ' + JSON.stringify(b));
  }
};

const main = async () => {
  const browser = await chromium.launch();

  console.log('\n══ Desktop 1440×900 ══');
  const R = await open(browser, URLS.ref, 1440, 900);
  const N = await open(browser, URLS.neu, 1440, 900);

  const [rf, nf] = [await faqTests(R.page), await faqTests(N.page)];
  report('FAQ Ausgangszustand', rf.initial, nf.initial);
  report('FAQ Klick auf #3', rf.afterClick3, nf.afterClick3);
  report('FAQ erneuter Klick schließt', rf.afterCloseSame, nf.afterCloseSame);
  report('FAQ Klick auf #1', rf.afterClick1, nf.afterClick1);

  const [rd, nd] = [await servicesDropdown(R.page), await servicesDropdown(N.page)];
  report('Leistungen-Dropdown', rd, nd);

  const [rh, nh] = [await hoverStates(R.page), await hoverStates(N.page)];
  report('Hover Leistungszeile + Cursor-Vorschau + CTA', rh, nh);

  console.log(`  JS-Fehler ref=${R.errs.length} neu=${N.errs.length}`);
  if (N.errs.length) { console.log('        ' + [...new Set(N.errs)].join('\n        ')); fails++; }
  await R.ctx.close(); await N.ctx.close();

  console.log('\n══ Mobil 375×812 ══');
  const Rm = await open(browser, URLS.ref, 375, 812);
  const Nm = await open(browser, URLS.neu, 375, 812);
  const [rmm, nmm] = [await mobileMenu(Rm.page), await mobileMenu(Nm.page)];
  report('Mobilmenü', rmm, nmm);
  const [rmf, nmf] = [await faqState(Rm.page), await faqState(Nm.page)];
  report('FAQ mobil', rmf, nmf);
  console.log(`  JS-Fehler ref=${Rm.errs.length} neu=${Nm.errs.length}`);
  if (Nm.errs.length) { console.log('        ' + [...new Set(Nm.errs)].join('\n        ')); fails++; }
  await Rm.ctx.close(); await Nm.ctx.close();

  console.log('\n══ Sprachumschaltung ══');
  const L = await open(browser, URLS.neu, 1440, 900);
  await L.page.locator('nav button[data-lang="en"]').click();
  await L.page.waitForURL('**/en/**', { timeout: 10000 }).catch(() => {});
  await L.page.waitForTimeout(1500);
  const en = await L.page.evaluate(() => ({
    url: location.pathname,
    lang: document.documentElement.lang,
    h1: document.querySelector('h1').textContent.trim(),
    cta: document.querySelector('nav a[href*="kontakt"]')?.textContent.trim(),
  }));
  console.log('  ' + JSON.stringify(en));
  if (!/\/en\/$/.test(en.url) || en.lang !== 'en' || !/Facades/.test(en.h1)) { console.log('  ABW  Sprachumschaltung'); fails++; }
  else console.log('  ok   DE → EN');
  await L.ctx.close();

  await browser.close();
  console.log(fails ? `\n✗ ${fails} Abweichung(en)` : '\n✓ alle Verhaltensprüfungen bestanden');
  process.exitCode = fails ? 1 : 0;
};

main();
