export function initTopbarNotifications() {
  const wrap = document.getElementById("notif-menu-wrap");
  if (!wrap) return;

  const btn = wrap.querySelector("#notif-menu-btn");
  const menu = wrap.querySelector("#notif-menu");
  if (!btn || !menu) return;
  const menuId = "notif";

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
