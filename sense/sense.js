// All localized copy lives in the four physical HTML pages.
const languageToggle = document.getElementById('lang-toggle');
const languageMenu = document.getElementById('lang-menu');
const shoe = document.querySelector('.ls-footer-disclosure-control');
const shoeToggle = shoe.querySelector('button');
const shoePanel = document.getElementById('sense-shoe-panel');

const setLanguageOpen = (open) => {
  languageToggle.setAttribute('aria-expanded', String(open));
  languageMenu.hidden = !open;
};
const setShoeOpen = (open) => {
  shoeToggle.setAttribute('aria-expanded', String(open));
  shoePanel.hidden = !open;
  shoe.classList.toggle('is-open', open);
  if (open) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    shoePanel.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'instant' : 'smooth' });
  }
};
languageToggle.addEventListener('click', () => setLanguageOpen(languageMenu.hidden));
shoeToggle.addEventListener('click', () => setShoeOpen(shoePanel.hidden));
// The shared footer expands its height; reveal its final bounds after that motion.
shoe.addEventListener('transitionend', (event) => {
  if (event.target === shoe && event.propertyName === 'max-height' && !shoePanel.hidden) {
    shoePanel.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.lang-picker')) setLanguageOpen(false);
  if (!shoe.contains(event.target)) setShoeOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!languageMenu.hidden) { setLanguageOpen(false); languageToggle.focus(); }
  if (!shoePanel.hidden) { setShoeOpen(false); shoeToggle.focus(); }
});
