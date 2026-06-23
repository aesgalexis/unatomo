const DEFAULT_COLLAPSED_HEIGHT = 108;
const EXPAND_FACTOR = 2.5;
const heightFrames = new Map();

export const getCollapsedHeightPx = () => {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--mc-collapsed-height")
    .trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : DEFAULT_COLLAPSED_HEIGHT;
};

export const recalcMachineCardHeight = (card) => {
  const header = card.querySelector(".mc-header");
  const expand = card.querySelector(".mc-expand");
  const target = Math.max(
    getCollapsedHeightPx() * EXPAND_FACTOR,
    header.offsetHeight + expand.scrollHeight
  );
  card.style.maxHeight = `${target}px`;
};

export const collapseMachineCard = (card, options = {}) => {
  card.dataset.expanded = "false";
  card.style.maxHeight = `${getCollapsedHeightPx()}px`;
  if (options.suppressAnimation) {
    card.classList.add("mc-no-anim");
    requestAnimationFrame(() => card.classList.remove("mc-no-anim"));
  }
};

export const expandMachineCard = (card, options = {}) => {
  card.dataset.expanded = "true";
  recalcMachineCardHeight(card);
  if (options.suppressAnimation) {
    card.classList.add("mc-no-anim");
    requestAnimationFrame(() => card.classList.remove("mc-no-anim"));
  }
};

export const scheduleMachineCardHeight = (id, callback) => {
  if (heightFrames.has(id)) cancelAnimationFrame(heightFrames.get(id));
  heightFrames.set(id, requestAnimationFrame(callback));
};
