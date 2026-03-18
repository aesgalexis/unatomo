import { auth } from "/static/js/registro/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const OWNER_EMAIL = "aesg.alexis@gmail.com";

const TYPE_OPTIONS = [
  "Plegadora de toallas",
  "Lavadora",
  "Tunel",
  "Secadora",
  "Calandra",
  "Prensa",
  "Otro",
];

const STATE_OPTIONS = ["Usada", "Bueno", "Muy Bueno", "Excelente"];

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const collectExistingIds = () => {
  const ids = new Set();
  document.querySelectorAll("[data-machine-id]").forEach((row) => {
    const id = (row.getAttribute("data-machine-id") || "").trim().toUpperCase();
    if (id) ids.add(id);
  });
  return [...ids];
};

const getNextMachineId = (type) => {
  const helper = window.lsMachineId;
  if (!helper || typeof helper.getTypePrefix !== "function") return "M001";

  const prefix = helper.getTypePrefix(type);
  const existing = collectExistingIds();
  let max = 0;
  existing.forEach((id) => {
    if (!id.startsWith(prefix)) return;
    const seq = Number(id.slice(1));
    if (Number.isFinite(seq)) max = Math.max(max, seq);
  });
  return helper.buildMachineId(type, max + 1);
};

const createButton = () => {
  const wrap = document.createElement("div");
  wrap.className = "ls-filterbar-admin";
  wrap.hidden = true;
  wrap.innerHTML = `
    <button type="button" class="ls-machine-add-btn">Añadir</button>
  `;
  return wrap;
};

const createDialog = () => {
  const dialog = document.createElement("dialog");
  dialog.className = "ls-machine-add-dialog";
  dialog.innerHTML = `
    <form method="dialog" class="ls-machine-add-sheet">
      <div class="ls-machine-add-head">
        <h2>Agregar maquinaria</h2>
        <button type="button" class="ls-machine-add-close" aria-label="Cerrar">×</button>
      </div>

      <div class="ls-machine-add-grid">
        <div class="form-field">
          <label for="ls-add-type">Tipo</label>
          <select id="ls-add-type" class="field" required>
            ${TYPE_OPTIONS.map((option) => `<option value="${option}">${option}</option>`).join("")}
          </select>
        </div>

        <div class="form-field">
          <label for="ls-add-id">ID sugerido</label>
          <input id="ls-add-id" class="field" type="text" readonly />
        </div>

        <div class="form-field">
          <label for="ls-add-brand">Marca</label>
          <input id="ls-add-brand" class="field" type="text" required autocomplete="off" />
        </div>

        <div class="form-field">
          <label for="ls-add-model">Modelo</label>
          <input id="ls-add-model" class="field" type="text" required autocomplete="off" />
        </div>

        <div class="form-field">
          <label for="ls-add-year">Año</label>
          <input id="ls-add-year" class="field" type="number" min="1900" max="2100" required />
        </div>

        <div class="form-field">
          <label for="ls-add-state">Estado</label>
          <select id="ls-add-state" class="field" required>
            ${STATE_OPTIONS.map((option) => `<option value="${option}">${option}</option>`).join("")}
          </select>
        </div>

        <div class="form-field">
          <label for="ls-add-location">Ubicación</label>
          <input id="ls-add-location" class="field" type="text" required autocomplete="off" />
        </div>

        <div class="form-field">
          <label for="ls-add-price">Precio</label>
          <input id="ls-add-price" class="field" type="text" placeholder="17.000 €" required autocomplete="off" />
        </div>

        <div class="form-field form-field--full">
          <div class="ls-machine-inline">
            <label><input id="ls-add-shipping" type="checkbox" checked /> Envío incluido</label>
            <label><input id="ls-add-startup" type="checkbox" checked /> Puesta en marcha incluida</label>
            <label><input id="ls-add-warranty-enabled" type="checkbox" /> Garantía de piezas</label>
          </div>
        </div>

        <div class="form-field form-field--full">
          <label for="ls-add-warranty">Detalle de garantía</label>
          <input id="ls-add-warranty" class="field" type="text" placeholder="1 año de garantía de piezas" autocomplete="off" />
        </div>

        <div class="form-field form-field--full">
          <label for="ls-add-images">Imágenes</label>
          <input id="ls-add-images" class="field" type="file" multiple accept="image/*" />
        </div>
      </div>

      <div class="ls-machine-add-meta">
        <div><strong>Carpeta sugerida:</strong> <span id="ls-add-folder">LaundryServices/ls_maquinaria/imagenes/M001/</span></div>
        <div><strong>Resumen:</strong> <span id="ls-add-summary">Completa los campos para generar la ficha.</span></div>
        <div><strong>Archivos seleccionados:</strong></div>
        <ul id="ls-add-files" class="ls-machine-file-list">
          <li>Sin imágenes seleccionadas.</li>
        </ul>
      </div>

      <p id="ls-add-status" class="ls-machine-add-status" aria-live="polite"></p>

      <div class="ls-machine-add-actions">
        <button type="button" class="ls-mini-action" id="ls-add-cancel">Cancelar</button>
        <button type="submit" class="btn-pill btn-pill-solid">Preparar alta</button>
      </div>
    </form>
  `;
  document.body.appendChild(dialog);
  return dialog;
};

const dialog = createDialog();
const form = dialog.querySelector("form");
const openers = [];
const typeField = dialog.querySelector("#ls-add-type");
const idField = dialog.querySelector("#ls-add-id");
const brandField = dialog.querySelector("#ls-add-brand");
const modelField = dialog.querySelector("#ls-add-model");
const yearField = dialog.querySelector("#ls-add-year");
const stateField = dialog.querySelector("#ls-add-state");
const locationField = dialog.querySelector("#ls-add-location");
const priceField = dialog.querySelector("#ls-add-price");
const shippingField = dialog.querySelector("#ls-add-shipping");
const startupField = dialog.querySelector("#ls-add-startup");
const warrantyEnabledField = dialog.querySelector("#ls-add-warranty-enabled");
const warrantyField = dialog.querySelector("#ls-add-warranty");
const imagesField = dialog.querySelector("#ls-add-images");
const folderEl = dialog.querySelector("#ls-add-folder");
const summaryEl = dialog.querySelector("#ls-add-summary");
const filesEl = dialog.querySelector("#ls-add-files");
const statusEl = dialog.querySelector("#ls-add-status");

const renderDerivedState = () => {
  const nextId = getNextMachineId(typeField.value);
  idField.value = nextId;
  folderEl.textContent = `LaundryServices/ls_maquinaria/imagenes/${nextId}/`;

  const parts = [];
  if (typeField.value) parts.push(typeField.value);
  if (brandField.value.trim()) parts.push(brandField.value.trim());
  if (modelField.value.trim()) parts.push(modelField.value.trim());
  if (yearField.value.trim()) parts.push(yearField.value.trim());
  if (stateField.value) parts.push(stateField.value);
  if (locationField.value.trim()) parts.push(locationField.value.trim());

  const extras = [];
  if (priceField.value.trim()) extras.push(`precio ${priceField.value.trim()}`);
  if (shippingField.checked) extras.push("envío incluido");
  if (startupField.checked) extras.push("puesta en marcha incluida");
  if (warrantyEnabledField.checked && warrantyField.value.trim()) {
    extras.push(warrantyField.value.trim());
  }

  summaryEl.textContent =
    parts.length || extras.length
      ? `${parts.join(" · ")}${extras.length ? " · " + extras.join(" · ") : ""}`
      : "Completa los campos para generar la ficha.";
};

const renderFiles = () => {
  const files = Array.from(imagesField.files || []);
  filesEl.innerHTML = "";
  if (!files.length) {
    filesEl.innerHTML = "<li>Sin imágenes seleccionadas.</li>";
    return;
  }
  files.forEach((file) => {
    const item = document.createElement("li");
    item.textContent = file.name;
    filesEl.appendChild(item);
  });
};

const resetStatus = () => {
  statusEl.textContent = "";
  statusEl.removeAttribute("data-state");
};

const openDialog = () => {
  resetStatus();
  renderDerivedState();
  renderFiles();
  dialog.showModal();
};

dialog.querySelector(".ls-machine-add-close").addEventListener("click", () => dialog.close());
dialog.querySelector("#ls-add-cancel").addEventListener("click", () => dialog.close());

[typeField, brandField, modelField, yearField, stateField, locationField, priceField, shippingField, startupField, warrantyEnabledField, warrantyField].forEach((field) => {
  field.addEventListener("input", renderDerivedState);
  field.addEventListener("change", renderDerivedState);
});

imagesField.addEventListener("change", renderFiles);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderDerivedState();
  renderFiles();
  statusEl.dataset.state = "ok";
  statusEl.textContent = `Ficha preparada. Crea la carpeta ${folderEl.textContent} y coloca ahí las imágenes seleccionadas.`;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && dialog.open) dialog.close();
});

document.querySelectorAll(".ls-filterbar").forEach((bar) => {
  const adminWrap = createButton();
  const button = adminWrap.querySelector("button");
  button.addEventListener("click", openDialog);
  openers.push(adminWrap);
  bar.appendChild(adminWrap);
});

onAuthStateChanged(auth, (user) => {
  const isOwner = normalizeEmail(user?.email) === OWNER_EMAIL;
  openers.forEach((wrap) => {
    wrap.hidden = !isOwner;
  });
});
