export const createMobileDashboardController = (dependencies) => {
  const {
    collapseCard,
    isMobileViewport,
    list,
    mobileBackBtn,
    mount,
    searchInput,
    state
  } = dependencies;
  const isMobileDashboardViewport = isMobileViewport;

  const resetInitialMobileScroll = () => {
    if (!isMobileDashboardViewport()) return;
    const scrollTop = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    scrollTop();
    requestAnimationFrame(() => {
      scrollTop();
      requestAnimationFrame(scrollTop);
    });
    window.setTimeout(scrollTop, 80);
    window.setTimeout(scrollTop, 240);
  };

  const clearMobileDetailState = () => {
    state.mobileFocusedMachineId = "";
    state.mobileDetailJustEntered = false;
  };

  const syncMobileDetailUI = () => {
    const focusedId = state.mobileFocusedMachineId || "";
    const enabled = isMobileDashboardViewport() && !!focusedId;
    mount.dataset.mobileDetail = enabled ? "true" : "false";
    list.dataset.mobileDetail = enabled ? "true" : "false";
    list.dataset.mobileFocusedId = enabled ? focusedId : "";
    mobileBackBtn.hidden = !enabled;

    Array.from(list.querySelectorAll(".machine-card")).forEach((card) => {
      const isFocused = enabled && card.dataset.machineId === focusedId;
      card.classList.toggle("is-mobile-focus", isFocused);
      card.classList.toggle("is-mobile-detail-enter", isFocused && state.mobileDetailJustEntered);
    });
    Array.from(list.querySelectorAll(".machine-group")).forEach((group) => {
      const containsFocused = enabled && !!group.querySelector(`.machine-card[data-machine-id="${focusedId}"]`);
      group.classList.toggle("is-mobile-focus-path", containsFocused);
    });
    Array.from(list.querySelectorAll(".machine-card-wrap")).forEach((wrap) => {
      const containsFocused = enabled && !!wrap.querySelector(`.machine-card[data-machine-id="${focusedId}"]`);
      wrap.classList.toggle("is-mobile-focus-path", containsFocused);
    });
    state.mobileDetailJustEntered = false;
  };

  mobileBackBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    mobileBackBtn.blur();
    searchInput.blur();
    state.expandedById = [];
    clearMobileDetailState();
    Array.from(list.querySelectorAll(".machine-card")).forEach((card) =>
      collapseCard(card, { suppressAnimation: true })
    );
    syncMobileDetailUI();
  });

  if (window.matchMedia) {
    const mobileMedia = window.matchMedia("(max-width: 768px)");
    const handleMobileViewportChange = () => {
      if (!mobileMedia.matches) {
        clearMobileDetailState();
      } else if (!state.mobileFocusedMachineId && Array.isArray(state.expandedById) && state.expandedById[0]) {
        state.mobileFocusedMachineId = state.expandedById[0];
      }
      syncMobileDetailUI();
    };
    if (typeof mobileMedia.addEventListener === "function") {
      mobileMedia.addEventListener("change", handleMobileViewportChange);
    } else if (typeof mobileMedia.addListener === "function") {
      mobileMedia.addListener(handleMobileViewportChange);
    }
  }

  return {
    clearMobileDetailState,
    isMobileDashboardViewport,
    resetInitialMobileScroll,
    syncMobileDetailUI
  };
};
