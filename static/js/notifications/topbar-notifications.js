let menuEl = null;
let labelEl = null;
let listEl = null;
let badgeEl = null;
let buttonEl = null;

export function initTopbarNotifications() {
  const wrap = document.getElementById("notif-menu-wrap");
  if (!wrap) return;

  const btn = wrap.querySelector("#notif-menu-btn");
  const menu = wrap.querySelector("#notif-menu");
  if (!btn || !menu) return;
  const menuId = "notif";

  menuEl = menu;
  buttonEl = btn;
  badgeEl = btn.querySelector(".notif-badge");
  if (!badgeEl) {
    badgeEl = document.createElement("span");
    badgeEl.className = "notif-badge";
    badgeEl.hidden = true;
    btn.appendChild(badgeEl);
  }
  labelEl = menu.querySelector("#notif-menu-label");
  if (!labelEl) {
    labelEl = document.createElement("div");
    labelEl.id = "notif-menu-label";
    menu.appendChild(labelEl);
  }
  listEl = menu.querySelector("#notif-menu-list");
  if (!listEl) {
    listEl = document.createElement("div");
    listEl.id = "notif-menu-list";
    menu.appendChild(listEl);
  }

  const closeMenu = () => {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    window.dispatchEvent(
      new CustomEvent("unatomo:topbar-open", { detail: { id: menuId } })
    );
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
  };

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (menu.hidden) {
      openMenu();
    } else {
      closeMenu();
    }
  });

  window.addEventListener("unatomo:topbar-open", (e) => {
    if (e.detail && e.detail.id !== menuId) closeMenu();
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

export function setTopbarNotifications(items = []) {
  if (!menuEl || !labelEl || !listEl) return;
  const hasItems = Array.isArray(items) && items.length > 0;
  if (badgeEl) {
    badgeEl.hidden = !hasItems;
    if (hasItems) {
      const count = items.length;
      badgeEl.textContent = String(count);
      badgeEl.setAttribute("aria-label", `${count} notificaciones pendientes`);
    }
  }
  labelEl.textContent = hasItems
    ? "Notificaciones"
    : "No hay notificaciones pendientes";
  listEl.innerHTML = "";
  if (!hasItems) return;
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "notif-item";

    const text = document.createElement("div");
    text.className = "notif-text";
    text.textContent = item.text || "";

    const actions = document.createElement("div");
    actions.className = "notif-actions";

    (item.actions || []).forEach((action) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = action.className || "btn-secondary";
      btn.textContent = action.label || "Accion";
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (typeof action.onClick === "function") action.onClick();
      });
      actions.appendChild(btn);
    });

    row.appendChild(text);
    row.appendChild(actions);
    listEl.appendChild(row);
  });
}
