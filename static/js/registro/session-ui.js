import { auth } from "/static/js/registro/firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const badge = document.getElementById("session-badge");
const loginLink = document.getElementById("session-login");
const logoutBtn = document.getElementById("session-logout");

function setGuest() {
  if (badge) badge.textContent = "Invitado";
  if (loginLink) loginLink.hidden = false;
  if (logoutBtn) logoutBtn.hidden = true;
}

function setUser(user) {
  const label = user?.displayName || user?.email || "Sesión iniciada";
  if (badge) badge.textContent = label;
  if (loginLink) loginLink.hidden = true;
  if (logoutBtn) logoutBtn.hidden = false;
}

onAuthStateChanged(auth, (user) => {
  if (user) setUser(user);
  else setGuest();
});

logoutBtn?.addEventListener("click", async () => {
  try {
    logoutBtn.disabled = true;
    await signOut(auth);
    window.location.href = "/?setup=1";
  } catch (e) {
    logoutBtn.disabled = false;
  }
});
