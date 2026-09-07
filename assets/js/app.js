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
 * Reveal-Zustand nach einem Filterwechsel neu berechnen
 *
 * motion.js versteckt beim Start alles unter dem Falz
 * (`opacity:0; translate3d(0,40px,0)`) und blendet es per
 * IntersectionObserver beim Heranscrollen ein. Wer einmal eingeblendet ist,
 * bleibt es — der Zustand klebt am DOM-Knoten.
 *
 * Das Design ersetzt beim Filtern die Karten-Knoten komplett. Damit läuft
 * prepReveal() bei JEDEM Filterwechsel neu: was im Sichtfeld liegt, wird gar
 * nicht erst versteckt, alles andere schon. Der Zustand wird also jedes Mal
 * zurückgesetzt.
 *
 * Der Nachbau blendet dieselben Knoten nur aus und ein. Ohne diese Funktion
 * gäbe es zwei Abweichungen:
 *   1. eine Karte, die beim Laden unter dem Falz lag, bliebe leer, sobald der
 *      Filter sie nach oben schiebt (das war live sichtbar: nach „Türen"
 *      blieb die oberste Karte weiß);
 *   2. eine einmal eingeblendete Karte bliebe sichtbar, auch wenn ein
 *      späterer Filter sie wieder unter den Falz schiebt.
 *
 * Schwellen und Beobachter-Parameter sind 1:1 aus motion.js prepReveal()
 * übernommen. Transition kurz aus, damit der Wechsel wie im Design ohne
 * Nachblenden passiert.
 * ------------------------------------------------------------------ */
const REVEAL_IO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.style.opacity = '1';
    e.target.style.transform = 'none';
    REVEAL_IO.unobserve(e.target);
  }
}, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

function resetReveal(els) {
  for (const el of els) {
    REVEAL_IO.unobserve(el);
    const r = el.getBoundingClientRect();
    const inView = r.top < window.innerHeight * 0.92 && r.bottom > 0;
    const t = el.style.transition;
    el.style.transition = 'none';
    el.style.opacity = inView ? '1' : '0';
    el.style.transform = inView ? 'none' : 'translate3d(0,40px,0)';
    void el.offsetHeight;              // Reflow erzwingen, sonst greift „none" nicht
    el.style.transition = t;
    if (!inView) REVEAL_IO.observe(el);
  }
}

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
  // Der Build markiert den aktiven Chip mit aria-pressed="true" — sich auf
  // "der erste ist der aktive" zu verlassen wäre falsch, sobald das Design
  // einen anderen Startwert vorgibt.
  const active = chips.find((c) => c.getAttribute('aria-pressed') === 'true') || chips[0];
  const inactive = chips.find((c) => c !== active);
  if (!inactive) return null;             // eine Gruppe aus einem Chip hat keinen Zustand
  const ON = styleOf(active);
  const OFF = styleOf(inactive);

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

  chips.forEach((c) => c.addEventListener('click', () => apply(c.dataset.key)));
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
  resetReveal(cards);   // wie im Design: Reveal-Zustand pro Filterwechsel neu
});

/* Kontakt-Themen --------------------------------------------------- */
chipGroup('topic', () => {});

/* ------------------------------------------------------------------ *
 * Projektdialog (Referenzen)  — Design: state.openKey
 * ------------------------------------------------------------------ */
let lastTrigger = null;
let openBox = null;

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])';

function openModal(key, trigger) {
  const box = $(`[data-modal="${CSS.escape(key)}"]`);
  if (!box) return;
  $$('[data-modal]').forEach((m) => { m.hidden = m !== box; });
  // Scroll-Sperre am <body>, wie im Design (RUESO-Referenzen.dc.html).
  // NICHT am <html>: dort würde sie die Overflow-Propagation des Body
  // aufheben und damit sticky-Elemente auf der Seite unwirksam machen.
  document.body.style.overflow = 'hidden';
  openBox = box;
  lastTrigger = trigger || null;
  const close = $('[data-act="modal-close"][aria-label]', box);
  if (close) close.focus({ preventScroll: true });
}

function closeModal() {
  if (!openBox) return;
  $$('[data-modal]').forEach((m) => { m.hidden = true; });
  document.body.style.overflow = '';
  openBox = null;
  // preventScroll: der Rücksprung darf die Seite nicht bewegen — das Design
  // scrollt beim Schließen ebenfalls nicht, und ein Sprung würde außerdem
  // Reveal-Animationen auslösen, die sonst nicht dran wären.
  if (lastTrigger) { lastTrigger.focus({ preventScroll: true }); lastTrigger = null; }
}

/** Fokus im geöffneten Dialog bzw. Mobilmenü halten. */
function trapFocus(e) {
  const box = openBox || (menu && !menu.hidden ? menu : null);
  if (!box || e.key !== 'Tab') return;
  // offsetParent taugt hier nicht: Dialog und Menü sind position:fixed,
  // dort ist offsetParent immer null.
  const items = $$(FOCUSABLE, box).filter((el) => el.getClientRects().length > 0);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  else if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
}

/* ------------------------------------------------------------------ *
 * Navigation — Mobilmenü und Leistungen-Dropdown
 * ------------------------------------------------------------------ */
const menu = $('[data-toggle="menu"]');
const burger = $('[data-act="menu-toggle"]');
const menuOpen = () => !!menu && !menu.hidden;

const setMenu = (open) => {
  if (!menu || menuOpen() === open) return;
  menu.hidden = !open;
  if (burger) burger.setAttribute('aria-expanded', String(open));
  // Sperre am <body>, nicht am <html>: am <html> würde sie die
  // Overflow-Propagation des Body aufheben und den Sticky-Hero aushebeln.
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) {
    const first = $(FOCUSABLE, menu);
    if (first) first.focus({ preventScroll: true });
  } else {
    // Beim Schließen das Leistungen-Akkordeon zurücksetzen, damit das Menü
    // beim nächsten Öffnen wieder auf einen Blick erfassbar ist.
    const auf = $('[data-act="menu-services"]');
    if (auf && auf.getAttribute('aria-expanded') === 'true') {
      auf.setAttribute('aria-expanded', 'false');
      const panel = document.getElementById(auf.getAttribute('aria-controls'));
      if (panel) { panel.style.gridTemplateRows = '0fr'; panel.setAttribute('inert', ''); }
      const zeichen = auf.querySelector('[data-menu-zeichen]');
      if (zeichen) zeichen.textContent = '+';
    }
    if (burger && menu.contains(document.activeElement)) {
      burger.focus({ preventScroll: true });   // Fokus nicht ans <body> verlieren
    }
  }
};

/* ------------------------------------------------------------------ *
 * Zentrale Klick-Delegation
 * ------------------------------------------------------------------ */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;

  switch (el.dataset.act) {
    case 'menu-toggle': setMenu(!menuOpen()); break;
    case 'menu-close': setMenu(false); break;

    // Mobilmenü: „Leistungen" auf- und zuklappen. Mechanik wie beim FAQ
    // (grid-template-rows 0fr↔1fr), damit sich die Seite einheitlich bedient.
    case 'menu-services': {
      const auf = el.getAttribute('aria-expanded') !== 'true';
      el.setAttribute('aria-expanded', String(auf));
      const panel = document.getElementById(el.getAttribute('aria-controls'));
      if (panel) {
        panel.style.gridTemplateRows = auf ? '1fr' : '0fr';
        // Zugeklappt ist der Block nur weggeschnitten (overflow:hidden) — die
        // Links blieben ohne `inert` per Tab erreichbar und für Screenreader
        // sichtbar, obwohl niemand sie sehen kann.
        panel.toggleAttribute('inert', !auf);
      }
      const zeichen = el.querySelector('[data-menu-zeichen]');
      if (zeichen) zeichen.textContent = auf ? '–' : '+';
      break;
    }

    case 'modal-open': openModal(el.dataset.key, el); break;
    case 'modal-close': closeModal(); break;
    case 'modal-stop': break;   // Klick im Dialog darf nicht zum Backdrop durch

    case 'lang': {
      const next = el.dataset.lang;
      try { localStorage.setItem('rueso_lang', next); } catch (err) { /* Privatmodus */ }
      if (next === document.body.dataset.lang) break;
      // Dateiname beibehalten, damit man auf derselben Seite landet.
      // search und hash mitnehmen (Kampagnenparameter, Sprungmarke).
      const file = location.pathname.split('/').pop() || 'index.html';
      location.href = (next === 'en' ? 'en/' : '../') + file + location.search + location.hash;
      break;
    }
    default: break;
  }
});

document.addEventListener('submit', (e) => {
  if (e.target.closest('[data-act="prevent-submit"]')) e.preventDefault();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') { trapFocus(e); return; }
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

/* ------------------------------------------------------------------ *
 * Layoutbreite — an derselben Zahl wie das Design
 *
 * Design und motion.js schalten an `window.innerWidth < 900`. Die
 * Media-Query in site.css ist die Grundlage (greift sofort, ohne JS), aber
 * Firefox misst dort ohne Scrollbalken. data-vw setzt die Entscheidung auf
 * exakt denselben Wert, den auch motion.js verwendet.
 * ------------------------------------------------------------------ */
const syncViewport = () => {
  const mobile = window.innerWidth < 900;
  document.documentElement.dataset.vw = mobile ? 'm' : 'd';
  if (!mobile) setMenu(false);   // Design: Nav rendert bei resize neu
};
syncViewport();
window.addEventListener('resize', syncViewport, { passive: true });

/* Klick auf die FAQ-Schaltflächen */
faqButtons.forEach((btn, i) => {
  btn.addEventListener('click', () => {
    openFaq = openFaq === i ? -1 : i;   // erneuter Klick schließt — Design-Verhalten
    renderFaq();
  });
});

/* ------------------------------------------------------------------ *
 * Kundenstimmen-Slider
 *
 * Bewusste Ergänzung, im Design nicht vorgesehen (CLAUDE.md §7).
 *
 * Kein Transform-Karussell, sondern eine scroll-snap-Spur: Wischen,
 * Trackpad-Geste und Tastatur funktionieren damit ohne eigene Logik, und
 * ohne JS bleibt der Abschnitt vollständig bedienbar. Die Schaltflächen
 * scrollen nur — der Zustand steht immer im `scrollLeft`, nirgends doppelt.
 * ------------------------------------------------------------------ */
const zitatSpur = $('[data-zitat-spur]');
const zitatKarten = zitatSpur ? $$('.stimmen-karte', zitatSpur) : [];

if (zitatSpur && zitatKarten.length > 1) {
  const sanft = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  // Position innerhalb der Spur, unabhängig davon, welches Element gerade
  // offsetParent ist (die Spur selbst ist nicht positioniert).
  const pos = (k) => k.offsetLeft - zitatKarten[0].offsetLeft;

  const index = () => {
    let beste = 0, min = Infinity;
    zitatKarten.forEach((k, i) => {
      const d = Math.abs(pos(k) - zitatSpur.scrollLeft);
      if (d < min) { min = d; beste = i; }
    });
    return beste;
  };

  // Umlaufend: bei zwei Stimmen wäre eine tote Schaltfläche an jedem Ende
  // ärgerlicher als der Sprung zurück an den Anfang.
  const zu = (i) => {
    if (!Number.isFinite(i)) return;
    const n = zitatKarten.length;
    zitatSpur.scrollTo({ left: pos(zitatKarten[((i % n) + n) % n]), behavior: sanft });
  };

  const sync = () => {
    const i = index();
    const nr = $('[data-zitat-nr]');
    if (nr) nr.textContent = String(i + 1).padStart(2, '0');
    $$('.stimmen-punkt').forEach((p, k) => {
      if (k === i) p.setAttribute('aria-current', 'true');
      else p.removeAttribute('aria-current');
    });
  };

  let ruhe = 0;
  zitatSpur.addEventListener('scroll', () => {
    clearTimeout(ruhe);
    ruhe = setTimeout(sync, 90);   // erst wenn das Snap steht, nicht bei jedem Frame
  }, { passive: true });

  zitatSpur.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();            // sonst scrollt der Browser zusätzlich pixelweise
    zu(index() + (e.key === 'ArrowRight' ? 1 : -1));
  });

  // Eigener Listener statt eines Zweigs in der zentralen Delegation: der
  // ganze Slider lebt in diesem Block, samt seiner Hilfsfunktionen. Er wird
  // nur registriert, wenn es die Spur überhaupt gibt.
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act^="zitat-"]');
    if (!el) return;
    if (el.dataset.act === 'zitat-prev') zu(index() - 1);
    else if (el.dataset.act === 'zitat-next') zu(index() + 1);
    else if (el.dataset.act === 'zitat-zu') zu(Number(el.dataset.index));
  });
}
