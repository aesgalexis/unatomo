import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";
import { auth, functions } from "/static/js/firebase/firebaseApp.js";
import { getCurrentLang, localizeEsPath } from "/static/js/site/locale.js";
import { isControlPanelUser } from "/controlpanel/access.js";

const mount = document.getElementById("controlpanel-mount");
const isEn = getCurrentLang() === "en";

const text = {
  title: isEn ? "Users" : "Usuarios",
  loading: isEn ? "Loading users..." : "Cargando usuarios...",
  empty: isEn ? "No users found." : "No se han encontrado usuarios.",
  error: isEn ? "Unable to load users." : "No se han podido cargar los usuarios.",
  hint: isEn
    ? "Accounts detected through Unatomo sign-in flows."
    : "Cuentas detectadas a través de los flujos de acceso de Unatomo.",
  noName: isEn ? "Unnamed user" : "Usuario sin nombre",
  noEmail: isEn ? "No email" : "Sin correo",
  backToHome: localizeEsPath("/es/index.html"),
  login: localizeEsPath("/es/auth/login.html")
};

const listUsersCallable = httpsCallable(functions, "listControlPanelUsers");

const createCard = (title) => {
  const card = document.createElement("section");
  card.className = "controlpanel-card";
  card.dataset.expanded = "true";
  card.innerHTML = `
    <button type="button" class="controlpanel-toggle" aria-expanded="true">
      <span class="controlpanel-title">${title}</span>
      <span class="controlpanel-icon">-</span>
    </button>
    <div class="controlpanel-body"></div>
  `;
  return card;
};

const toggleCard = (card) => {
  const body = card.querySelector(".controlpanel-body");
  const toggle = card.querySelector(".controlpanel-toggle");
  const icon = card.querySelector(".controlpanel-icon");
  const open = card.dataset.expanded === "true";
  card.dataset.expanded = open ? "false" : "true";
  if (toggle) toggle.setAttribute("aria-expanded", String(!open));
  if (icon) icon.textContent = open ? "+" : "-";
  if (body) body.hidden = open;
};

const renderState = (body, message, state = "") => {
  body.innerHTML = "";
  const note = document.createElement("p");
  note.className = "controlpanel-note";
  note.textContent = text.hint;
  body.appendChild(note);

  const status = document.createElement("p");
  status.className = "controlpanel-state";
  if (state) status.dataset.state = state;
  status.textContent = message;
  body.appendChild(status);
};

const renderUsers = (body, items) => {
  body.innerHTML = "";
  const note = document.createElement("p");
  note.className = "controlpanel-note";
  note.textContent = text.hint;
  body.appendChild(note);

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "controlpanel-state";
    empty.textContent = text.empty;
    body.appendChild(empty);
    return;
  }

  const list = document.createElement("ul");
  list.className = "controlpanel-list";
  items.forEach((item) => {
    const row = document.createElement("li");
    row.className = "controlpanel-user";

    const name = document.createElement("div");
    name.className = "controlpanel-user-name";
    name.textContent = item.displayName || text.noName;

    const meta = document.createElement("div");
    meta.className = "controlpanel-user-meta";
    meta.textContent = item.email || text.noEmail;

    row.appendChild(name);
    row.appendChild(meta);
    list.appendChild(row);
  });
  body.appendChild(list);
};

if (mount) {
  const wrap = document.createElement("div");
  wrap.className = "controlpanel-wrap";
  const usersCard = createCard(text.title);
  wrap.appendChild(usersCard);
  mount.appendChild(wrap);

  usersCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(usersCard));

  const usersBody = usersCard.querySelector(".controlpanel-body");
  if (usersBody) renderState(usersBody, text.loading);

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = text.login;
      return;
    }

    const allowed = await isControlPanelUser(user);
    if (!allowed) {
      window.location.href = text.backToHome;
      return;
    }

    if (!usersBody) return;
    renderState(usersBody, text.loading);
    try {
      const response = await listUsersCallable();
      const items = Array.isArray(response?.data?.items) ? response.data.items : [];
      renderUsers(usersBody, items);
    } catch {
      renderState(usersBody, text.error, "error");
    }
  });
}
