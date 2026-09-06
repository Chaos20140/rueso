// RÜSO redesign — Scroll-Motion-Engine (Reveal, Parallax, Wort-Reveal, horizontales Pinning, Stage-Sync, Hover-Preview, Hero)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const EASE = 'cubic-bezier(.22,.61,.36,1)';

export function createMotion(root, opts = {}) {
  if (!root) return { scan() {}, destroy() {} };
  const reduce = opts.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seen = new WeakSet();
  const S = { parallax: [], words: [], pins: [], stages: [], heroes: [], previews: [] };
  const alive = arr => arr.filter(x => (x.el || x.w || x.c).isConnected);

  // Reveal
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
  const show = el => { el.style.opacity = '1'; el.style.transform = 'none'; };
  function prepReveal(el) {
    let delay = +(el.dataset.delay || 0);
    const par = el.parentElement;
    if (par && par.dataset.stagger) {
      const sibs = [...par.children].filter(c => c.hasAttribute('data-reveal'));
      delay += sibs.indexOf(el) * +par.dataset.stagger;
    }
    el.style.transition = `opacity .9s ${EASE} ${delay}ms, transform 1.15s ${EASE} ${delay}ms`;
    if (reduce) return;
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight * 0.92 && r.bottom > 0 && !el.dataset.revealForce) return; // bereits sichtbar → kein Flackern
    const kind = el.dataset.reveal || 'up';
    el.style.opacity = '0';
    el.style.transform = kind === 'scale' ? 'scale(.94)' : kind === 'left' ? 'translate3d(-40px,0,0)' : kind === 'right' ? 'translate3d(40px,0,0)' : kind === 'none' ? 'none' : 'translate3d(0,40px,0)';
    io.observe(el);
  }

  // Wort-Reveal
  function prepWords(el) {
    const words = el.textContent.split(/\s+/).filter(Boolean);
    if (!words.length) return;
    el.textContent = '';
    const spans = words.map(w => {
      const s = document.createElement('span');
      s.textContent = w + ' ';
      s.style.cssText = 'opacity:.14;transition:opacity .45s ease';
      el.appendChild(s);
      return s;
    });
    S.words.push({ el, spans });
    if (reduce) spans.forEach(s => (s.style.opacity = '1'));
  }
  function updWords() {
    if (reduce) return;
    for (const w of S.words) {
      const r = w.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const start = innerHeight * 0.88, end = innerHeight * 0.34;
      const p = clamp((start - r.top) / (start - end + r.height * 0.6), 0, 1);
      const n = w.spans.length;
      w.spans.forEach((s, i) => { s.style.opacity = (0.14 + 0.86 * clamp(p * (n + 2) - i, 0, 1)).toFixed(3); });
    }
  }

  // Parallax
  function updParallax() {
    for (const p of S.parallax) {
      const ref = p.el.parentElement || p.el;
      const r = ref.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) continue;
      const c = (r.top + r.height / 2) - innerHeight / 2;
      const y = reduce ? 0 : -c * p.f;
      p.el.style.transform = `translate3d(0,${y.toFixed(1)}px,0) scale(${p.s})`;
    }
  }

  // Horizontales Pinning
  function layoutPin(p) {
    const dist = Math.max(0, p.inner.scrollWidth - innerWidth);
    p.dist = dist;
    if (innerWidth < 900 || reduce) {
      p.disabled = true; p.w.style.height = ''; p.inner.style.transform = '';
      p.track.style.position = 'relative'; p.track.style.height = 'auto'; p.track.style.overflow = 'visible';
      p.track.style.paddingTop = '72px'; p.track.style.paddingBottom = '72px';
      p.inner.style.width = 'auto'; p.inner.style.overflowX = 'auto'; p.inner.style.scrollbarWidth = 'none';
      p.inner.style.scrollSnapType = 'x mandatory'; p.inner.style.paddingBottom = '8px';
      p.inner.querySelectorAll('[data-pin-img]').forEach(img => { img.style.transform = 'scale(1.06)'; });
      [...p.inner.children].forEach(c => { c.style.scrollSnapAlign = 'start'; });
      if (p.bar) p.bar.style.transform = 'scaleX(1)';
      return;
    }
    p.disabled = false;
    p.track.style.position = 'sticky'; p.track.style.height = '100vh'; p.track.style.overflow = 'hidden';
    p.track.style.paddingTop = ''; p.track.style.paddingBottom = '';
    p.inner.style.width = 'max-content'; p.inner.style.overflowX = ''; p.inner.style.scrollSnapType = ''; p.inner.style.paddingBottom = '';
    p.w.style.height = (innerHeight + dist) + 'px';
  }
  function updPins() {
    for (const p of S.pins) {
      if (p.disabled) continue;
      const r = p.w.getBoundingClientRect();
      const total = p.w.offsetHeight - innerHeight;
      const prog = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
      p.inner.style.transform = `translate3d(${(-prog * p.dist).toFixed(1)}px,0,0)`;
      p.inner.querySelectorAll('[data-pin-img]').forEach(img => {
        const cr = img.parentElement.getBoundingClientRect();
        const cx = (cr.left + cr.width / 2) - innerWidth / 2;
        img.style.transform = `translate3d(${(cx * 0.07).toFixed(1)}px,0,0) scale(1.18)`;
      });
      if (p.bar) p.bar.style.transform = `scaleX(${prog.toFixed(4)})`;
      if (p.count) p.count.textContent = String(Math.min(p.n, 1 + Math.round(prog * (p.n - 1)))).padStart(2, '0');
    }
  }

  // Stage (linke Spalte sticky, rechte Spalte scrollt)
  function prepStage(c) {
    const items = [...c.querySelectorAll('[data-stage-item]')];
    const titles = [...c.querySelectorAll('[data-stage-title]')];
    titles.forEach((t, i) => {
      t.style.transition = `opacity .55s ${EASE}, transform .8s ${EASE}`;
      if (i > 0) { t.style.opacity = '0'; t.style.transform = 'translate3d(0,28px,0)'; }
    });
    S.stages.push({ c, items, titles, num: c.querySelector('[data-stage-num]'), bar: c.querySelector('[data-stage-bar]'), active: 0 });
  }
  function updStages() {
    for (const s of S.stages) {
      if (!s.items.length) continue;
      let best = 0, bd = 1e9;
      s.items.forEach((it, i) => {
        const r = it.getBoundingClientRect();
        const d = Math.abs((r.top + r.height / 2) - innerHeight / 2);
        if (d < bd) { bd = d; best = i; }
      });
      if (best !== s.active) {
        s.titles.forEach((t, i) => {
          t.style.opacity = i === best ? '1' : '0';
          t.style.transform = i === best ? 'none' : (i < best ? 'translate3d(0,-28px,0)' : 'translate3d(0,28px,0)');
        });
        if (s.num) s.num.textContent = String(best + 1).padStart(2, '0');
        s.active = best;
      }
      if (s.bar) {
        const cr = s.c.getBoundingClientRect();
        const p = clamp((innerHeight * 0.5 - cr.top) / Math.max(1, cr.height - innerHeight * 0.5), 0, 1);
        s.bar.style.transform = `scaleY(${p.toFixed(4)})`;
      }
    }
  }

  // Hero (sticky, Inhalt schiebt sich darüber)
  function updHero() {
    for (const h of S.heroes) {
      const total = h.el.offsetHeight * 0.9 || innerHeight;
      const top = h.el.parentElement ? h.el.parentElement.getBoundingClientRect().top : 0;
      const p = clamp(-top / total, 0, 1);
      if (h.media) h.media.style.transform = reduce ? 'none' : `scale(${(1 + p * 0.16).toFixed(4)}) translate3d(0,${(p * 30).toFixed(1)}px,0)`;
      if (h.dim) h.dim.style.opacity = (0.3 + p * 0.6).toFixed(3);
      if (h.content) { h.content.style.transform = `translate3d(0,${(-p * 90).toFixed(1)}px,0)`; h.content.style.opacity = String(clamp(1 - p * 1.7, 0, 1)); }
    }
  }

  // Hover-Preview (Bild folgt dem Cursor)
  function prepPreview(c) {
    const img = c.querySelector('[data-preview-img]');
    if (!img) return;
    const st = { c, img, x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, on: false, raf: 0 };
    img.style.transition = `opacity .35s ease, transform .6s ${EASE}`;
    img.style.opacity = '0';
    img.style.transform = 'scale(.88) rotate(-3deg)';
    const loop = () => {
      st.x += (st.tx - st.x) * 0.16; st.y += (st.ty - st.y) * 0.16;
      img.style.left = st.x.toFixed(1) + 'px'; img.style.top = st.y.toFixed(1) + 'px';
      st.raf = (Math.abs(st.tx - st.x) > 0.3 || Math.abs(st.ty - st.y) > 0.3 || st.on) ? requestAnimationFrame(loop) : 0;
    };
    if (window.matchMedia('(hover: none)').matches) return; // Touch: keine Cursor-Vorschau
    const hide = () => { st.on = false; img.style.opacity = '0'; img.style.transform = 'scale(.88) rotate(-3deg)'; };
    const showRow = (row) => {
      const src = row.dataset.img;
      if (src && img.getAttribute('src') !== src) img.setAttribute('src', src);
      st.on = true; img.style.opacity = '1'; img.style.transform = 'scale(1) rotate(0deg)';
    };
    c.addEventListener('mousemove', e => { st.tx = e.clientX; st.ty = e.clientY; if (!st.raf) loop(); });
    c.addEventListener('mouseleave', hide);
    c.addEventListener('mouseover', e => {
      const row = e.target.closest('[data-preview-row]');
      if (!row || !c.contains(row)) { hide(); return; }
      // Position sofort auf den Cursor setzen (kein Sprung aus der Ecke)
      st.tx = e.clientX; st.ty = e.clientY;
      if (!st.on) { st.x = st.tx; st.y = st.ty; img.style.left = st.x + 'px'; img.style.top = st.y + 'px'; }
      showRow(row);
      if (!st.raf) loop();
    });
    // Beim Scrollen prüfen, ob unter dem Cursor noch eine Zeile liegt
    st.onScroll = () => {
      if (!st.on) return;
      const el = document.elementFromPoint(st.tx, st.ty);
      const row = el && el.closest && el.closest('[data-preview-row]');
      if (!row || !c.contains(row)) hide(); else showRow(row);
    };
    addEventListener('scroll', st.onScroll, { passive: true });
    S.previews.push(st);
  }

  function scan() {
    root.querySelectorAll('[data-reveal]').forEach(el => { if (seen.has(el)) return; seen.add(el); prepReveal(el); });
    root.querySelectorAll('[data-parallax]').forEach(el => { if (seen.has(el)) return; seen.add(el); S.parallax.push({ el, f: +el.dataset.parallax || 0.1, s: +(el.dataset.scale || 1) }); });
    root.querySelectorAll('[data-words]').forEach(el => { if (seen.has(el)) return; seen.add(el); prepWords(el); });
    root.querySelectorAll('[data-pin-h]').forEach(w => {
      if (seen.has(w)) return;
      const track = w.querySelector('[data-pin-track]'), inner = w.querySelector('[data-pin-inner]');
      if (!track || !inner) return;
      seen.add(w);
      const p = { w, track, inner, bar: w.querySelector('[data-pin-bar]'), count: w.querySelector('[data-pin-count]'), n: inner.children.length };
      S.pins.push(p); layoutPin(p);
    });
    root.querySelectorAll('[data-stage]').forEach(c => { if (seen.has(c)) return; if (!c.querySelector('[data-stage-item]')) return; seen.add(c); prepStage(c); });
    root.querySelectorAll('[data-hero]').forEach(el => {
      if (seen.has(el)) return; seen.add(el);
      S.heroes.push({ el, media: el.querySelector('[data-hero-media]'), dim: el.querySelector('[data-hero-dim]'), content: el.querySelector('[data-hero-content]') });
      el.querySelectorAll('video').forEach(v => { v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); });
    });
    root.querySelectorAll('[data-preview]').forEach(c => { if (seen.has(c)) return; seen.add(c); prepPreview(c); });
    // Pins neu vermessen, wenn Kinder nachgeladen wurden
    S.pins.forEach(p => { const n = p.inner.children.length; if (n !== p.n) { p.n = n; layoutPin(p); } });
    tick();
  }

  let raf = 0;
  function tick() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      S.parallax = alive(S.parallax); S.words = alive(S.words); S.stages = alive(S.stages);
      updHero(); updParallax(); updWords(); updPins(); updStages();
    });
  }
  const onResize = () => { S.pins.forEach(layoutPin); tick(); };
  addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', onResize);
  let moT = 0;
  const mo = new MutationObserver(() => { clearTimeout(moT); moT = setTimeout(scan, 80); });
  mo.observe(root, { childList: true, subtree: true });
  scan();
  // Bilder laden nach → Pins nachmessen
  const late = setInterval(() => { S.pins.forEach(layoutPin); tick(); }, 1200);
  setTimeout(() => clearInterval(late), 8000);

  return {
    scan,
    destroy() { mo.disconnect(); io.disconnect(); removeEventListener('scroll', tick); removeEventListener('resize', onResize); clearInterval(late); S.previews.forEach(p => p.onScroll && removeEventListener('scroll', p.onScroll)); },
  };
}
