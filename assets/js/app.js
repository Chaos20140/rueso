/**
 * RÜSO — Seitenlogik.
 *
 * Ersetzt genau die React-State-Anteile der Design-Originale:
 *   RUESO-Start.dc.html      → openFaq, mobile, lang
 *   Nav.dc.html              → menuOpen, servicesOpen, isDesktop, setLang
 *   RUESO-Referenzen.dc.html → filter, openKey (Projektdialog)
 *   RUESO-Kontakt.dc.html    → topic (Themen-Chips)
 *
 * Alles Übrige (Layout, Styles, Scroll-Motion) ist statisch bzw. steckt
 * unverändert in assets/js/motion.js.
 *
 * Verdrahtet wird ausschließlich über data-Attribute, die tools/build.mjs
 * aus den onClick/onMouseEnter-Props des Designs erzeugt.
 */
import { createMotion } from './motion.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ------------------------------------------------------------------ *
 * Scroll-Motion — Original-Engine aus dem Design, unverändert
 * ------------------------------------------------------------------ */
const root = $('#top') || document.body;
createMotion(root, { reduceMotion: false });

/* ------------------------------------------------------------------ *
 * FAQ-Akkordeon  (Design: state.openFaq, Startwert 0)
 * ------------------------------------------------------------------ */
const faqButtons = $$('[data-act="faq"]');
let openFaq = faqButtons.findIndex((b) => b.getAttribute('aria-expanded') === 'true');

function renderFaq() {
  faqButtons.forEach((btn, i) => {
    const on = i === openFaq;
    btn.setAttribute('aria-expanded', String(on));
    const panel = btn.nextElementSibling;
    if (panel) panel.style.gridTemplateRows = on ? '1fr' : '0fr';
    const sign = btn.lastElementChild;
    if (sign) sign.textContent = on ? '–' : '+';
  });
}

/* ------------------------------------------------------------------ *
 * Chip-Gruppen: Referenz-Filter und Kontakt-Themen
 *
 * Die Aktiv-/Inaktiv-Optik steht als Inline-Style im gebauten HTML.
 * Statt sie hier zu duplizieren, liest die Gruppe beide Zustände beim
 * Start aus dem DOM — dadurch kann sie nie vom Build abweichen.
 * ------------------------------------------------------------------ */
function chipGroup(act, onSelect) {
  const chips = $$(`[data-act="${act}"]`);
  if (!chips.length) return null;

  const styleOf = (el) => {
    const cs = getComputedStyle(el);
    return { background: cs.backgroundColor, color: cs.color, borderColor: cs.borderTopColor };
  };
  const active = chips.find((c) => c.getAttribute('aria-pressed') === 'true') || chips[0];
  const ON = styleOf(active);
  const OFF = styleOf(chips.find((c) => c !== active) || active);

  const apply = (key) => {
    chips.forEach((c) => {
      const on = c.dataset.key === key;
      const s = on ? ON : OFF;
      c.style.background = s.background;
      c.style.color = s.color;
      c.style.borderColor = s.borderColor;
      c.setAttribute('aria-pressed', String(on));
    });
    onSelect(key);
  };

  chips.forEach((c) => {
    c.setAttribute('aria-pressed', String(c === active));
    c.addEventListener('click', () => apply(c.dataset.key));
  });
  return apply;
}

/* Referenz-Filter -------------------------------------------------- */
const cards = $$('[data-act="modal-open"]');
const refCount = $('[data-ref-count]');

chipGroup('filter', (key) => {
  let n = 0;
  cards.forEach((card) => {
    const tags = (card.dataset.tags || '').split(' ');
    const show = key === 'all' || tags.includes(key);
    card.hidden = !show;
    if (show) n++;
  });
  if (refCount) refCount.textContent = String(n).padStart(2, '0');
});

/* Kontakt-Themen --------------------------------------------------- */
chipGroup('topic', () => {});

/* ------------------------------------------------------------------ *
 * Projektdialog (Referenzen)  — Design: state.openKey
 * ------------------------------------------------------------------ */
let lastTrigger = null;

function openModal(key, trigger) {
  const box = $(`[data-modal="${CSS.escape(key)}"]`);
  if (!box) return;
  $$('[data-modal]').forEach((m) => { m.hidden = m !== box; });
  document.body.style.overflow = 'hidden';
  lastTrigger = trigger || null;
  const close = $('[data-act="modal-close"][aria-label]', box);
  if (close) close.focus();
}

function closeModal() {
  const open = $$('[data-modal]').filter((m) => !m.hidden);
  if (!open.length) return;
  open.forEach((m) => { m.hidden = true; });
  document.body.style.overflow = '';
  if (lastTrigger) { lastTrigger.focus(); lastTrigger = null; }
}

/* ------------------------------------------------------------------ *
 * Navigation — Mobilmenü und Leistungen-Dropdown
 * ------------------------------------------------------------------ */
const menu = $('[data-toggle="menu"]');
const setMenu = (open) => {
  if (!menu) return;
  menu.hidden = !open;
  const burger = $('[data-act="menu-toggle"]');
  if (burger) burger.setAttribute('aria-expanded', String(open));
  document.documentElement.style.overflow = open ? 'hidden' : '';
};
const menuOpen = () => !!menu && !menu.hidden;

/* ------------------------------------------------------------------ *
 * Zentrale Klick-Delegation
 * ------------------------------------------------------------------ */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;

  switch (el.dataset.act) {
    case 'menu-toggle': setMenu(!menuOpen()); break;
    case 'menu-close': setMenu(false); break;

    case 'modal-open': openModal(el.dataset.key, el); break;
    case 'modal-close': closeModal(); break;
    case 'modal-stop': break;   // Klick im Dialog darf nicht zum Backdrop durch

    case 'lang': {
      const next = el.dataset.lang;
      try { localStorage.setItem('rueso_lang', next); } catch (err) { /* Privatmodus */ }
      if (next === document.body.dataset.lang) break;
      const file = location.pathname.split('/').pop() || 'index.html';
      location.href = (next === 'en' ? 'en/' : '../') + file + location.hash;
      break;
    }
    default: break;
  }
});

document.addEventListener('submit', (e) => {
  if (e.target.closest('[data-act="prevent-submit"]')) e.preventDefault();
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  closeModal();          // Design: Escape schließt den Projektdialog
  setMenu(false);        // Ergänzung: Escape schließt auch das Mobilmenü
});

/* Leistungen-Dropdown: öffnen bei mouseenter, schließen 160 ms nach mouseleave */
const services = $('[data-toggle="services"]');
const svcHost = $('[data-svc-open]');
if (services && svcHost) {
  let timer = 0;
  const show = () => { clearTimeout(timer); services.hidden = false; };
  const hide = () => { clearTimeout(timer); timer = setTimeout(() => { services.hidden = true; }, 160); };
  svcHost.addEventListener('mouseenter', show);
  svcHost.addEventListener('mouseleave', hide);
  // Ergänzung: dieselbe Bedienung per Tastatur
  svcHost.addEventListener('focusin', show);
  svcHost.addEventListener('focusout', (e) => { if (!svcHost.contains(e.relatedTarget)) services.hidden = true; });
}

/* Beim Wechsel auf Desktopbreite ein offenes Mobilmenü schließen
   (Design: Nav rendert isDesktop/isMobile bei resize neu). */
window.matchMedia('(min-width:900px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });

/* Klick auf die FAQ-Schaltflächen */
faqButtons.forEach((btn, i) => {
  btn.addEventListener('click', () => {
    openFaq = openFaq === i ? -1 : i;   // erneuter Klick schließt — Design-Verhalten
    renderFaq();
  });
});
