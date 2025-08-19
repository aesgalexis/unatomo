import { render, bindGlobalHandlers } from "./ui.js";

window.addEventListener("DOMContentLoaded", () => {
  bindGlobalHandlers();
  render();
});

