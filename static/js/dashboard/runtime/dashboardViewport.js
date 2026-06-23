export const createDashboardViewport = ({ list, state, syncSearchVisualState }) => {
  const captureViewportAnchor = () => {
    const cards = Array.from(list.querySelectorAll(".machine-card"));
    if (!cards.length) return null;
    const expanded = state.expandedById?.[0]
      ? list.querySelector(`.machine-card[data-machine-id="${state.expandedById[0]}"]`)
      : null;
    const candidates = expanded ? [expanded, ...cards.filter((card) => card !== expanded)] : cards;
    const viewportTop = 96;
    const target =
      candidates.find((card) => card.getBoundingClientRect().bottom > viewportTop) ||
      candidates[0];
    if (!target) return null;
    return {
      id: target.dataset.machineId || "",
      top: target.getBoundingClientRect().top
    };
  };

  const restoreViewport = (scrollY, anchor) => {
    requestAnimationFrame(() => {
      if (anchor?.id) {
        const anchoredCard = list.querySelector(`.machine-card[data-machine-id="${anchor.id}"]`);
        if (anchoredCard) {
          const nextTop = anchoredCard.getBoundingClientRect().top;
          window.scrollBy(0, nextTop - anchor.top);
          syncSearchVisualState();
          return;
        }
      }
      window.scrollTo(0, scrollY || 0);
      syncSearchVisualState();
    });
  };

  return { captureViewportAnchor, restoreViewport };
};
