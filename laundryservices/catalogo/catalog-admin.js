import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  auth,
  loginWithGoogle,
  resolveAdminUser,
} from "/laundryservices/ls_maquinaria/agregador/firebase-config.js";
import {
  loadLaundryCatalog,
  publishLaundryCatalog,
} from "/laundryservices/recambios/catalog-repo.js";
import {
  formatLaundryCatalog,
  parseLaundryCatalog,
  summarizeLaundryCatalog,
} from "/laundryservices/recambios/catalog-schema.js";

const elements = {
  accessTitle: document.getElementById("access-title"),
  accessMessage: document.getElementById("access-message"),
  login: document.getElementById("login-button"),
  refreshAccess: document.getElementById("refresh-access-button"),
  switchAccount: document.getElementById("switch-account-button"),
  editor: document.getElementById("editor-panel"),
  editorUser: document.getElementById("editor-user"),
  source: document.getElementById("catalog-json"),
  summary: document.getElementById("catalog-summary"),
  validation: document.getElementById("validation-panel"),
  reload: document.getElementById("reload-button"),
  format: document.getElementById("format-button"),
  validate: document.getElementById("validate-button"),
  publish: document.getElementById("publish-button"),
};

const summaryLabels = {
  manufacturers: "Fabricantes",
  modelGroups: "Familias",
  models: "Modelos",
  spareParts: "Recambios",
};

let currentUser = null;
let loadedVersion = 0;

const setButtonBusy = (button, busy) => {
  button.disabled = busy;
  button.setAttribute("aria-busy", String(busy));
};

const showAccess = ({ title, message, login = false, refresh = false, switchAccount = false }) => {
  elements.accessTitle.textContent = title;
  elements.accessMessage.textContent = message;
  elements.login.hidden = !login;
  elements.refreshAccess.hidden = !refresh;
  elements.switchAccount.hidden = !switchAccount;
};

const renderSummary = (catalog) => {
  const summary = summarizeLaundryCatalog(catalog);
  elements.summary.innerHTML = Object.entries(summary).map(([key, value]) => `
    <div class="catalog-summary-item">
      <strong>${value}</strong>
      <span>${summaryLabels[key]}</span>
    </div>
  `).join("");
};

const showValidation = (result, successMessage = "Catálogo válido.") => {
  elements.validation.hidden = false;
  elements.validation.classList.toggle("is-error", !result.valid);
  if (result.valid) {
    elements.validation.textContent = successMessage;
    renderSummary(result.catalog);
    return;
  }
  const errors = result.errors.slice(0, 20);
  const title = document.createElement("strong");
  const list = document.createElement("ul");
  title.textContent = "No se puede publicar.";
  errors.forEach((error) => {
    const item = document.createElement("li");
    item.textContent = error;
    list.append(item);
  });
  elements.validation.replaceChildren(title, list);
};

const readEditor = () => parseLaundryCatalog(elements.source.value);

const loadCatalog = async () => {
  setButtonBusy(elements.reload, true);
  elements.validation.hidden = true;
  try {
    const catalog = await loadLaundryCatalog();
    loadedVersion = catalog.version;
    elements.source.value = formatLaundryCatalog(catalog);
    renderSummary(catalog);
  } catch (error) {
    console.error("Laundry catalogue load failed.", error);
    showValidation({
      valid: false,
      errors: ["No se ha podido cargar el catálogo publicado. Sincroniza primero el catálogo inicial o vuelve a intentarlo."],
    });
  } finally {
    setButtonBusy(elements.reload, false);
  }
};

const authorize = async (user, forceRefresh = false) => {
  currentUser = user || null;
  elements.editor.hidden = true;
  if (!user) {
    showAccess({
      title: "Acceso privado",
      message: "Inicia sesión con una cuenta autorizada para editar el catálogo.",
      login: true,
    });
    return;
  }

  showAccess({
    title: "Comprobando permisos",
    message: `Verificando ${user.email || user.uid}…`,
    switchAccount: true,
  });
  const isAdmin = await resolveAdminUser(user, forceRefresh);
  if (!isAdmin) {
    showAccess({
      title: "Cuenta sin permiso",
      message: "Esta cuenta no tiene el claim laundryServicesAdmin. Si acaba de asignarse, actualiza los permisos.",
      refresh: true,
      switchAccount: true,
    });
    return;
  }

  showAccess({
    title: "Acceso autorizado",
    message: "Los cambios se publicarán en Firestore con tu identificador de usuario.",
    switchAccount: true,
  });
  elements.editorUser.textContent = user.email || user.uid;
  elements.editor.hidden = false;
  await loadCatalog();
};

elements.login.addEventListener("click", async () => {
  setButtonBusy(elements.login, true);
  try {
    await loginWithGoogle();
  } catch (error) {
    console.error("Laundry catalogue login failed.", error);
    showAccess({
      title: "No se ha podido iniciar sesión",
      message: "Cierra cualquier ventana emergente abierta y vuelve a intentarlo.",
      login: true,
    });
  } finally {
    setButtonBusy(elements.login, false);
  }
});

elements.refreshAccess.addEventListener("click", async () => {
  if (!currentUser) return;
  setButtonBusy(elements.refreshAccess, true);
  try {
    await authorize(currentUser, true);
  } finally {
    setButtonBusy(elements.refreshAccess, false);
  }
});

elements.switchAccount.addEventListener("click", async () => {
  setButtonBusy(elements.switchAccount, true);
  try {
    await signOut(auth);
    await loginWithGoogle();
  } catch (error) {
    console.error("Laundry catalogue account switch failed.", error);
  } finally {
    setButtonBusy(elements.switchAccount, false);
  }
});

elements.reload.addEventListener("click", loadCatalog);

elements.format.addEventListener("click", () => {
  const result = readEditor();
  if (!result.valid) {
    showValidation(result);
    return;
  }
  elements.source.value = formatLaundryCatalog(result.catalog);
  showValidation(result, "JSON formateado y válido.");
});

elements.validate.addEventListener("click", () => showValidation(readEditor()));

elements.publish.addEventListener("click", async () => {
  const result = readEditor();
  if (!result.valid) {
    showValidation(result);
    return;
  }
  if (!currentUser || !await resolveAdminUser(currentUser, true)) {
    await authorize(currentUser, true);
    return;
  }

  const nextCatalog = {
    ...result.catalog,
    version: Math.max(loadedVersion, result.catalog.version) + 1,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  const confirmed = window.confirm(
    `Se publicará la versión ${nextCatalog.version} en Firestore. ¿Continuar?`
  );
  if (!confirmed) return;

  setButtonBusy(elements.publish, true);
  try {
    await publishLaundryCatalog(nextCatalog, currentUser, loadedVersion);
    loadedVersion = nextCatalog.version;
    elements.source.value = formatLaundryCatalog(nextCatalog);
    showValidation(
      { valid: true, errors: [], catalog: nextCatalog },
      `Versión ${nextCatalog.version} publicada correctamente en Firestore.`
    );
  } catch (error) {
    console.error("Laundry catalogue publication failed.", error);
    const stale = error?.message === "laundry-catalog-stale";
    showValidation({
      valid: false,
      errors: [stale ?
        "El catálogo ha cambiado desde que lo cargaste. Recarga Firestore antes de volver a editar." :
        "Firestore ha rechazado la publicación. Comprueba los permisos y vuelve a intentarlo."],
    });
  } finally {
    setButtonBusy(elements.publish, false);
  }
});

onAuthStateChanged(auth, (user) => authorize(user));
