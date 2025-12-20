import { auth } from "/static/js/registro/firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const badge = document.getElementById("session-badge");
const actionBtn = document.getElementById("session-action");

let mode = "guest";

function renderGuest() {
  mode = "guest";
  if (badge) badge.textContent = "Invitado";
  if (actionBtn) actionBtn.textContent = "Iniciar sesión";
}

function renderUser(user) {
  mode = "user";
  const label = user?.displayName || user?.email || "Usuario";
  if (badge) badge.textContent = label;
  if (actionBtn) actionBtn.textContent = "Cerrar sesión";
}

renderGuest();

actionBtn?.addEventListener("click", async (e) => {
  if (mode === "guest") {
    window.location.href = "/auth/login.html";
    return;
  }

  try {
    actionBtn.disabled = true;
    await signOut(auth);
    window.location.href = "/?setup=1";
  } catch (err) {
    actionBtn.disabled = false;
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) renderUser(user);
  else renderGuest();
});
