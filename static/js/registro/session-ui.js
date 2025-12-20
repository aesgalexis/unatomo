import { auth } from "/static/js/registro/firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const badge = document.getElementById("session-badge");
const actionBtn = document.getElementById("session-action");

function setGuest() {
  if (badge) {
    badge.hidden = false;
    badge.textContent = "Invitado";
  }

  if (actionBtn) {
    actionBtn.textContent = "Iniciar sesión";
    actionBtn.onclick = () => {
      window.location.href = "/auth/login.html";
    };
  }
}

function setUser(user) {
  const label = user?.displayName || user?.email || "Sesión iniciada";

  if (badge) {
    badge.hidden = false;
    badge.textContent = label;
  }

  if (actionBtn) {
    actionBtn.textContent = "Cerrar sesión";
    actionBtn.onclick = async () => {
      try {
        actionBtn.disabled = true;
        await signOut(auth);
        window.location.href = "/?setup=1";
      } catch (e) {
        actionBtn.disabled = false;
      }
    };
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) setUser(user);
  else setGuest();
});
