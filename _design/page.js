// Gemeinsame Seitenlogik für alle RÜSO-Unterseiten (Sprache, Inhalte, Motion)
export const isPhone = () => typeof location !== 'undefined' && /embed=phone/.test(location.search);

// Im Phone-Preview (?embed=phone) den Parameter beim Seitenwechsel mitnehmen
export function phoneLinks(root) {
  if (!isPhone() || !root) return;
  document.documentElement.style.scrollbarWidth = 'none';
  root.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const h = a.getAttribute('href') || '';
    if (!/\.dc\.html/.test(h) || /embed=phone/.test(h) || /^https?:/.test(h)) return;
    e.preventDefault();
    location.href = h.replace(/(\.dc\.html)(#.*)?$/, '$1?embed=phone$2');
  });
}

export function readLang() { try { return localStorage.getItem('rueso_lang') || null; } catch (e) { return null; } }
export function storeLang(l) { try { localStorage.setItem('rueso_lang', l); } catch (e) {} }

export async function bootPage(comp, opts = {}) {
  const [{ createMotion }, content] = await Promise.all([import('./motion.js'), import('./content.js')]);
  comp.content = content;
  comp.setState({ data: content.getContent(comp.lang()) });
  comp.motion = createMotion(comp.rootRef.current, { reduceMotion: !!comp.props.reduceMotion });
  return content;
}

export function baseVals(comp) {
  const lang = comp.lang();
  const de = lang !== 'en';
  const d = comp.state.data;
  return {
    rootRef: comp.rootRef, lang, isDe: de, isEn: !de,
    setLang: (l) => comp.setLang(l),
    data: d,
    services: d ? d.services : undefined,
    refs: d ? d.refs : undefined,
    partners: d ? d.partners : undefined,
    jobs: d ? d.jobs : undefined,
    preventSubmit: (e) => e.preventDefault(),
  };
}
