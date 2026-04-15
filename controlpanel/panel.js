import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";
import { auth, functions } from "/static/js/firebase/firebaseApp.js";
import { getCurrentLang, localizeEsPath } from "/static/js/site/locale.js";
import { isControlPanelUser } from "/controlpanel/access.js";

const mount = document.getElementById("controlpanel-mount");
const isEn = getCurrentLang() === "en";

const text = {
  usersTitle: isEn ? "Users" : "Usuarios",
  usersLoading: isEn ? "Loading users..." : "Cargando usuarios...",
  usersEmpty: isEn ? "No users found." : "No se han encontrado usuarios.",
  usersError: isEn ? "Unable to load users." : "No se han podido cargar los usuarios.",
  usersHint: isEn
    ? "Accounts detected through Unatomo sign-in flows."
    : "Cuentas detectadas a trav\u00e9s de los flujos de acceso de Unatomo.",
  codesTitle: isEn ? "Registration codes" : "C\u00f3digos de registro",
  codesLoading: isEn
    ? "Loading active registration codes..."
    : "Cargando c\u00f3digos de registro activos...",
  codesEmpty: isEn
    ? "No active registration codes found."
    : "No se han encontrado c\u00f3digos de registro activos.",
  codesError: isEn
    ? "Unable to load registration codes."
    : "No se han podido cargar los c\u00f3digos de registro.",
  codesHint: isEn
    ? "Currently active registration codes."
    : "C\u00f3digos de registro actualmente activos.",
  codePlaceholder: isEn ? "Custom code (optional)" : "C\u00f3digo personalizado (opcional)",
  addCode: isEn ? "Add code" : "A\u00f1adir c\u00f3digo",
  deleteCode: isEn ? "Delete" : "Eliminar",
  codesSaving: isEn ? "Saving..." : "Guardando...",
  codesDeleting: isEn ? "Deleting..." : "Eliminando...",
  confirmDeleteCode: isEn
    ? (code) => `Delete registration code ${code}?`
    : (code) => `¿Eliminar el código de registro ${code}?`,
  codeCreated: isEn
    ? (code) => `Code created: ${code}`
    : (code) => `C\u00f3digo creado: ${code}`,
  codeDeleted: isEn
    ? (code) => `Code deleted: ${code}`
    : (code) => `C\u00f3digo eliminado: ${code}`,
  codeActionError: isEn
    ? "Unable to update registration codes."
    : "No se han podido actualizar los c\u00f3digos de registro.",
  noName: isEn ? "Unnamed user" : "Usuario sin nombre",
  noEmail: isEn ? "No email" : "Sin correo",
  backToHome: localizeEsPath("/es/index.html"),
  login: localizeEsPath("/es/auth/login.html")
};

const listUsersCallable = httpsCallable(functions, "listControlPanelUsers");
const listCodesCallable = httpsCallable(functions, "listControlPanelRegistrationCodes");
const createCodeCallable = httpsCallable(functions, "createControlPanelRegistrationCode");
const deleteCodeCallable = httpsCallable(functions, "deleteControlPanelRegistrationCode");

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

const renderState = (body, hint, message, state = "") => {
  body.innerHTML = "";
  const note = document.createElement("p");
  note.className = "controlpanel-note";
  note.textContent = hint;
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
  note.textContent = text.usersHint;
  body.appendChild(note);

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "controlpanel-state";
    empty.textContent = text.usersEmpty;
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

const renderCodes = (body, items, handlers = {}) => {
  body.innerHTML = "";
  const note = document.createElement("p");
  note.className = "controlpanel-note";
  note.textContent = text.codesHint;
  body.appendChild(note);

  const actions = document.createElement("div");
  actions.className = "controlpanel-actions";

  const codeInput = document.createElement("input");
  codeInput.type = "text";
  codeInput.className = "controlpanel-input";
  codeInput.placeholder = text.codePlaceholder;
  codeInput.maxLength = 32;
  codeInput.autocomplete = "off";
  codeInput.spellcheck = false;

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "controlpanel-btn";
  addBtn.textContent = text.addCode;
  addBtn.addEventListener("click", () => {
    if (handlers.onAddCode) handlers.onAddCode(codeInput.value || "");
  });

  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/\s+/g, "");
  });
  codeInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (handlers.onAddCode) handlers.onAddCode(codeInput.value || "");
  });

  actions.appendChild(codeInput);
  actions.appendChild(addBtn);
  body.appendChild(actions);

  const status = document.createElement("p");
  status.className = "controlpanel-state";
  status.hidden = true;
  body.appendChild(status);

  const setStatus = (message = "", state = "") => {
    status.hidden = !message;
    status.textContent = message;
    if (state) status.dataset.state = state;
    else status.removeAttribute("data-state");
  };

  if (handlers.setStatusRef) handlers.setStatusRef(setStatus, addBtn, codeInput);

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "controlpanel-state";
    empty.textContent = text.codesEmpty;
    body.appendChild(empty);
    return;
  }

  const list = document.createElement("ul");
  list.className = "controlpanel-list";
  items.forEach((item) => {
    const row = document.createElement("li");
    row.className = "controlpanel-user controlpanel-user--action";

    const code = document.createElement("div");
    code.className = "controlpanel-user-name";
    code.textContent = item.code || "-";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "controlpanel-link-danger";
    remove.textContent = text.deleteCode;
    remove.addEventListener("click", () => {
      if (handlers.onDeleteCode) handlers.onDeleteCode(item.code || "");
    });

    row.appendChild(code);
    row.appendChild(remove);
    list.appendChild(row);
  });
  body.appendChild(list);
};

if (mount) {
  const wrap = document.createElement("div");
  wrap.className = "controlpanel-wrap";
  const usersCard = createCard(text.usersTitle);
  const codesCard = createCard(text.codesTitle);
  wrap.appendChild(usersCard);
  wrap.appendChild(codesCard);
  mount.appendChild(wrap);

  usersCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(usersCard));
  codesCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(codesCard));

  const usersBody = usersCard.querySelector(".controlpanel-body");
  const codesBody = codesCard.querySelector(".controlpanel-body");
  let updateCodesStatus = () => {};
  let addCodeButton = null;
  let addCodeInput = null;

  const loadCodes = async () => {
    if (!codesBody) return;
    renderState(codesBody, text.codesHint, text.codesLoading);
    try {
      const codesResponse = await listCodesCallable();
      const codes = Array.isArray(codesResponse?.data?.items) ? codesResponse.data.items : [];
      renderCodes(codesBody, codes, {
        setStatusRef: (setStatus, addBtn, codeInput) => {
          updateCodesStatus = setStatus;
          addCodeButton = addBtn;
          addCodeInput = codeInput;
        },
        onAddCode: async (rawCode) => {
          if (addCodeButton) addCodeButton.disabled = true;
          if (addCodeInput) addCodeInput.disabled = true;
          updateCodesStatus(text.codesSaving);
          try {
            const code = (rawCode || "").toString().trim().toUpperCase();
            const response = await createCodeCallable(code ? { code } : {});
            const created = response?.data?.code ? String(response.data.code) : "";
            await loadCodes();
            if (addCodeInput) addCodeInput.value = "";
            updateCodesStatus(created ? text.codeCreated(created) : "", "");
          } catch {
            updateCodesStatus(text.codeActionError, "error");
          } finally {
            if (addCodeButton) addCodeButton.disabled = false;
            if (addCodeInput) addCodeInput.disabled = false;
          }
        },
        onDeleteCode: async (code) => {
          if (!code) return;
          if (!window.confirm(text.confirmDeleteCode(code))) return;
          updateCodesStatus(text.codesDeleting);
          try {
            await deleteCodeCallable({ code });
            await loadCodes();
            updateCodesStatus(text.codeDeleted(code), "");
          } catch {
            updateCodesStatus(text.codeActionError, "error");
          }
        },
      });
    } catch {
      renderState(codesBody, text.codesHint, text.codesError, "error");
    }
  };

  if (usersBody) renderState(usersBody, text.usersHint, text.usersLoading);
  if (codesBody) renderState(codesBody, text.codesHint, text.codesLoading);

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

    if (!usersBody || !codesBody) return;
    renderState(usersBody, text.usersHint, text.usersLoading);

    try {
      const usersResponse = await listUsersCallable();
      const users = Array.isArray(usersResponse?.data?.items) ? usersResponse.data.items : [];
      renderUsers(usersBody, users);
    } catch {
      renderState(usersBody, text.usersHint, text.usersError, "error");
    }

    await loadCodes();
  });
}
