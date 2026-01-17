import { render, bindGlobalHandlers } from "./ui.js";

function updateStatusYear() {
  const el = document.querySelector(".status-left");
  if (!el) return;
  const year = String(new Date().getFullYear());
  el.innerHTML = el.innerHTML.replace(/\b20\d{2}\b/, year);
}

window.addEventListener("DOMContentLoaded", () => {
  updateStatusYear();
  bindGlobalHandlers();
  render();
});
