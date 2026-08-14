const STABLE_MENU_VIEWS = new Set([
  "dashboard",
  "registro",
  "todo",
  "estadisticas",
  "galeria",
  "usuarios",
  "privacidad"
]);

export const createDashboardFixedMenusController = ({
  addBar,
  dashboardFixedMenus,
  dashboardFixedMenusSpace,
  dashboardScrollDivider,
  groupTree,
  largeDashboardQuery,
  list,
  mount,
  state
}) => {
  let groupTreeFrame = 0;
  let menusFrame = 0;
  let suggestionsScrollEndTimer = 0;

  const syncGroupTreePosition = () => {
    groupTreeFrame = 0;
    groupTree.classList.remove("is-scroll-position");
    groupTree.style.removeProperty("--dashboard-group-tree-scroll-top");
  };

  const queueGroupTreePosition = () => {
    if (groupTreeFrame) return;
    groupTreeFrame = window.requestAnimationFrame(syncGroupTreePosition);
  };

  const syncSpace = () => {
    if (dashboardFixedMenus.classList.contains("is-secondary-aligned")) return;
    dashboardFixedMenusSpace.style.height = `${dashboardFixedMenus.offsetHeight}px`;
    dashboardScrollDivider.style.top =
      `${Math.round(dashboardFixedMenus.getBoundingClientRect().bottom)}px`;
    queueGroupTreePosition();
  };

  const setSuggestionsComposerOpen = (open) => {
    const form = list.querySelector(".suggestions-form");
    if (form) form.hidden = !open;
  };

  const syncScrollState = () => {
    menusFrame = 0;
    const isPageScrolled = window.scrollY > 0;
    mount.classList.toggle(
      "has-stable-dashboard-menus",
      STABLE_MENU_VIEWS.has(state.activeView)
    );
    dashboardFixedMenus.classList.remove("is-scrolled", "is-secondary-aligned");
    groupTree.classList.toggle("is-content-scrolled", isPageScrolled);
    dashboardScrollDivider.classList.toggle("is-visible", isPageScrolled);
    const showTreeDivider = largeDashboardQuery.matches && !groupTree.hidden;
    dashboardScrollDivider.style.left = showTreeDivider
      ? `${Math.round(groupTree.getBoundingClientRect().right)}px`
      : "0px";
    queueGroupTreePosition();

    if (state.activeView === "sugerencias") {
      window.clearTimeout(suggestionsScrollEndTimer);
      if (isPageScrolled) {
        if (state.suggestionsCreateOpen) {
          state.suggestionsCreateOpen = false;
          setSuggestionsComposerOpen(false);
        }
      } else {
        suggestionsScrollEndTimer = window.setTimeout(() => {
          if (state.activeView !== "sugerencias" || window.scrollY > 0) return;
          state.suggestionsCreateOpen = true;
          setSuggestionsComposerOpen(true);
        }, 120);
      }
    }

    state.internalViewChromeExpanded = false;
    addBar.getAnimations?.().forEach((animation) => animation.cancel());
    syncSpace();
  };

  const queueScrollState = () => {
    if (menusFrame) return;
    menusFrame = window.requestAnimationFrame(syncScrollState);
  };

  syncSpace();
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(syncSpace).observe(dashboardFixedMenus);
  } else {
    window.addEventListener("resize", syncSpace);
  }
  new MutationObserver(queueGroupTreePosition)
    .observe(list, { childList: true, subtree: true });
  window.addEventListener("scroll", queueGroupTreePosition, { passive: true });
  window.addEventListener("resize", queueGroupTreePosition);
  window.addEventListener("scroll", queueScrollState, { passive: true });
  window.addEventListener("resize", queueScrollState);
  queueGroupTreePosition();
  syncScrollState();

  return { queueScrollState, syncSpace };
};
