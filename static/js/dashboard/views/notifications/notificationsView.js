const kindLabel = (kind, isEnglish) => ({
  account: isEnglish ? "Account" : "Cuenta",
  access: isEnglish ? "Access" : "Acceso",
  system: isEnglish ? "System" : "Sistema"
}[kind] || (isEnglish ? "Notification" : "Notificación"));

export const renderNotificationsView = (container, options = {}) => {
  const isEnglish = !!options.isEnglish;
  const items = Array.isArray(options.items) ? options.items : [];
  const header = document.createElement("div");
  header.className = "global-registry-header notifications-header";
  const title = document.createElement("h3");
  title.textContent = isEnglish ? "Notifications" : "Notificaciones";
  const count = document.createElement("span");
  count.className = "global-registry-count notifications-count";
  const pendingCount = items.filter((item) => !item.read).length;
  count.textContent = isEnglish
    ? `${pendingCount} pending`
    : `${pendingCount} pendientes`;
  const headerActions = document.createElement("div");
  headerActions.className = "dashboard-view-header-actions";
  headerActions.appendChild(count);
  header.append(title, headerActions);
  (options.headerContainer || container).appendChild(header);

  const view = document.createElement("section");
  view.className = "notifications-view";
  view.setAttribute("aria-label", title.textContent);
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "notifications-empty";
    empty.innerHTML = `<strong>${isEnglish ? "You're all caught up" : "Estás al día"}</strong><span>${isEnglish ? "There are no notifications requiring your attention." : "No hay notificaciones que requieran tu atención."}</span>`;
    view.appendChild(empty);
    container.appendChild(view);
    return;
  }

  const createActionButton = (action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.className || "btn-secondary";
    button.textContent = action.label || (isEnglish ? "Action" : "Acción");
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      try {
        await action.onClick?.();
      } finally {
        if (button.isConnected) {
          button.disabled = false;
          button.removeAttribute("aria-busy");
        }
      }
    });
    return button;
  };

  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "notification-card";
    article.classList.toggle("is-read", item.read === true);
    article.dataset.kind = item.kind || "system";
    const meta = document.createElement("div");
    meta.className = "notification-card-meta";
    meta.textContent = kindLabel(item.kind, isEnglish);
    const text = document.createElement("p");
    text.className = "notification-card-text";
    text.textContent = item.text || "";
    article.append(meta, text);
    if (item.actions?.length) {
      const actions = document.createElement("div");
      actions.className = "notification-card-actions";
      item.actions.forEach((action) => {
        actions.appendChild(createActionButton(action));
      });
      article.appendChild(actions);
    }
    if (item.children?.length) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "invite-toggle notification-card-toggle";
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = isEnglish
        ? `View equipment (${item.children.length})`
        : `Ver equipos (${item.children.length})`;
      const details = document.createElement("div");
      details.className = "notification-card-children";
      details.hidden = true;
      item.children.forEach((child) => {
        const row = document.createElement("div");
        row.className = "notification-card-child";
        const childText = document.createElement("span");
        childText.textContent = child.text || "";
        const childActions = document.createElement("div");
        childActions.className = "notification-card-actions";
        child.actions?.forEach((action) => childActions.appendChild(createActionButton(action)));
        row.append(childText, childActions);
        details.appendChild(row);
      });
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
        toggle.textContent = expanded
          ? (isEnglish ? `View equipment (${item.children.length})` : `Ver equipos (${item.children.length})`)
          : (isEnglish ? "Hide equipment" : "Ocultar equipos");
        details.hidden = expanded;
      });
      article.append(toggle, details);
    }
    view.appendChild(article);
  });
  container.appendChild(view);
};
