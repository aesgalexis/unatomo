import { auth } from "/static/js/registro/firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const badge = document.getElementById("session-badge");
const actionBtn = document.getElementById("session-action");

function setBadge(text) {
  if (!badge) return;
  badge.hidden = false;
  badge.textContent = text;
}

function setGuest() {
  setBadge("Invitado");
  if (actionBtn) {
    actionBtn.textContent = "Iniciar sesión";
    actionBtn.dataset.state = "guest";
  }
}

function setUser(user) {
  const label = user?.displayName || user?.email || "Usuario";
  setBadge(label);
  if (actionBtn) {
    actionBtn.textContent = "Cerrar sesión";
    actionBtn.dataset.state = "user";
  }
}

setGuest();

actionBtn?.addEventListener("click", async () => {
  const state = actionBtn.dataset.state || "guest";

  if (state === "guest") {
    window.location.href = "/es/auth/login.html";
    return;
  }

  try {
    actionBtn.disabled = true;
    await signOut(auth);
    window.location.href = "/?setup=1";
  } catch (e) {
    actionBtn.disabled = false;
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) setUser(user);
  else setGuest();
});
