(() => {
  const cards = document.querySelectorAll(".service-card");
  if (!cards.length) return;

  const isInteractive = (target) =>
    !!target.closest("button, a, input, select, textarea, label");

  const setCollapsed = (card, collapsed) => {
    card.classList.toggle("is-collapsed", collapsed);
    card.dataset.collapsed = collapsed ? "true" : "false";
    card.setAttribute("aria-expanded", String(!collapsed));
    const body = card.querySelector(".service-card-body");
    if (body) body.hidden = collapsed;
  };

  const collapseOthers = (activeCard) => {
    cards.forEach((otherCard) => {
      if (otherCard === activeCard) return;
      setCollapsed(otherCard, true);
    });
  };

  cards.forEach((card) => {
    const title = card.querySelector("h2");
    if (!title) return;

    let body = card.querySelector(".service-card-body");
    if (!body) {
      body = document.createElement("div");
      body.className = "service-card-body";
      let node = title.nextSibling;
      while (node) {
        const next = node.nextSibling;
        body.appendChild(node);
        node = next;
      }
      card.appendChild(body);
    }

    const toggle = () => {
      const scrollBefore = window.scrollY;
      const topBefore = card.getBoundingClientRect().top;
      const isCollapsed = card.classList.contains("is-collapsed");

      if (isCollapsed) {
        collapseOthers(card);
        setCollapsed(card, false);
      } else {
        setCollapsed(card, true);
      }

      const topAfter = card.getBoundingClientRect().top;
      const delta = topAfter - topBefore;
      if (delta !== 0) {
        const nextScroll = scrollBefore + delta;
        window.scrollTo(0, nextScroll);
        requestAnimationFrame(() => window.scrollTo(0, nextScroll));
      }
    };

    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    setCollapsed(card, true);

    card.addEventListener("click", (event) => {
      if (isInteractive(event.target)) return;
      event.preventDefault();
      toggle();
    });

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggle();
    });
  });
})();
