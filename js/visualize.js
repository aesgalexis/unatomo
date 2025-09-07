(function(){
  const SELECTORS = {
    // Fallbacks por si tus ABs no llevan clase/atributo propio:
    ab: ['.AB', '.ab', '[data-ab]', '[data-type="ab"]', '#listA > *', '#listB > *', '#listL > *'],
    containers: {
      main:    ['#frameA', '#main', '.main', '[data-area="main"]', 'main'],
      side:    ['#frameB', '#side', '.side', '.sidebar', '[data-area="side"]', 'aside'],
      landing: ['#frameL', '#landing', '.landing', '[data-area="landing"]']
    }
  };

  function classify(el){
    for (const s of SELECTORS.containers.main)    if (el.closest(s)) return 'main';
    for (const s of SELECTORS.containers.side)    if (el.closest(s)) return 'side';
    for (const s of SELECTORS.containers.landing) if (el.closest(s)) return 'landing';
    return 'main';
  }

  function getTitle(el){
  // 1) Título real del AB: el texto del botón .btn (ya viene con timestamp si aplica)
  const btn = el.querySelector('.btn');
  if (btn) return (btn.textContent || '').trim();

  // 2) Fallbacks por si algún AB no tiene .btn renderizado
  const tEl = el.querySelector('[data-title], .ab-title, .title, h3, h4, input[type="text"]');
  let title = '';
  if (tEl) title = (tEl.value || tEl.innerText || tEl.textContent || '').trim();
  if (!title) title = (el.getAttribute('data-title') || '').trim();
  if (!title) title = 'Atomic Button';
  return title;
}

  function getBody(el){
    // Preferimos textarea si existe:
    const ta = el.querySelector('textarea');
    if (ta && typeof ta.value === 'string') {
      return ta.value.trim();
    }
    // Otras opciones comunes:
    const bEl = el.querySelector('[data-body], .ab-body, .content, p');
    if (bEl) return (bEl.innerText || bEl.textContent || '').trim();
    // Último recurso: texto del propio nodo, limitado
    return (el.innerText || el.textContent || '').trim();
  }

  function collectABs(){
    const nodes = new Set();
    for (const sel of SELECTORS.ab) document.querySelectorAll(sel).forEach(n => nodes.add(n));
    const arr = [];
    nodes.forEach(el => {
      const where = classify(el);
      const title = getTitle(el);
      const isDefault = /^a?t{1,2}omic button$/i.test(title); // Atomic/Attomic
      const body  = getBody(el);
      arr.push({ where, title, body, isDefault });
    });
    return arr;
  }

  function go(){
    const btn = document.getElementById('visualizeAtom');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const ab = collectABs();
      const data = { ab, ts: Date.now(), siteTitle: document.title };
      try { sessionStorage.setItem('atomABData', JSON.stringify(data)); } catch(_) {}
      // misma pestaña para conservar sessionStorage
      location.href = 'atom.html';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
