<script>
(function(){
  const SELECTORS = {
    // Si tus ABs no tienen clase/atributo, añadimos fallback a los hijos de las listas A/B/L
    ab: ['.AB', '.ab', '[data-ab]', '[data-type="ab"]', '#listA > *', '#listB > *', '#listL > *'],
    containers: {
      main:    ['#frameA', '#main', '.main', '[data-area="main"]', 'main'],
      side:    ['#frameB', '#side', '.side', '.sidebar', '[data-area="side"]', 'aside'],
      landing: ['#frameL', '#landing', '.landing', '[data-area="landing"]']
    }
  };

  function classify(el){
    for(const s of SELECTORS.containers.main)    if(el.closest(s))    return 'main';
    for(const s of SELECTORS.containers.side)    if(el.closest(s))    return 'side';
    for(const s of SELECTORS.containers.landing) if(el.closest(s))    return 'landing';
    return 'main';
  }

  function collectABs(){
    const nodes = new Set();
    for (const sel of SELECTORS.ab) document.querySelectorAll(sel).forEach(n => nodes.add(n));
    const arr = [];
    nodes.forEach(el => {
      const where = classify(el);
      const text  = (el.innerText || el.textContent || '').trim().replace(/\s+/g,' ').slice(0,1200);
      arr.push({ where, text });
    });
    return arr;
  }

  document.getElementById('visualizeAtom').addEventListener('click', () => {
    const ab = collectABs();
    const data = { ab, ts: Date.now() };
    try { sessionStorage.setItem('atomABData', JSON.stringify(data)); } catch(_) {}
    // Importante: navegación en la MISMA pestaña para conservar sessionStorage
    location.href = '/atom.html';
  });
})();
</script>
