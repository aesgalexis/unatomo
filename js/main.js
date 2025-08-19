import { render, bindGlobalHandlers } from "./ui.js";

window.addEventListener("DOMContentLoaded", () => {
  bindGlobalHandlers();
  render();
});
<script>
  window.PRESENCE_WS_URL = "wss://tu-dominio.com/presence";
</script>
