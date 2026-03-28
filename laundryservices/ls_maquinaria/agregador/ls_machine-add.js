import {
  createMachine,
  ensureInitialMachinesBootstrapped,
  getSuggestedMachineId,
  observeMachineAdmin,
  updateMachine,
} from "./ls_machine-store.js";
import { isAdminUser } from "./firebase-config.js";

const TYPE_OPTIONS = ["Plegadora", "Lavadora", "Tunel", "Secadora", "Calandra", "Prensa", "Empaquetadora", "Otro"];
const STATE_OPTIONS = ["Usada", "Bueno", "Muy Bueno", "Excelente", "Repasada"];
const HEATING_OPTIONS = ["", "Gas", "Vapor", "Aceite"];

const createAdminWrap = () => {
  const wrap = document.createElement("div");
  wrap.className = "ls-filterbar-admin";
  wrap.hidden = true;
  wrap.innerHTML = `
    <button type="button" class="ls-machine-add-btn" data-machine-auth="add">Añadir</button>
  `;
  return wrap;
};

const createDialog = () => {
  const dialog = document.createElement("dialog");
  dialog.className = "ls-machine-add-dialog";
  dialog.innerHTML = `
    <form method="dialog" class="ls-machine-add-sheet">
      <div class="ls-machine-add-head">
        <h2 id="ls-machine-dialog-title">Agregar maquinaria</h2>
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
          <label for="ls-add-id">ID</label>
          <input id="ls-add-id" class="field" type="text" readonly />
        </div>

        <div class="form-field">
          <label for="ls-add-brand">Marca</label>
          <input id="ls-add-brand" class="field" type="text" required autocomplete="off" />
        </div>

        <div class="form-field">
          <label for="ls-add-model">Modelo</label>
          <input id="ls-add-model" class="field" type="text" autocomplete="off" />
        </div>

        <div class="form-field">
          <label for="ls-add-capacity">Capacidad</label>
          <input id="ls-add-capacity" class="field" type="number" min="0" step="1" inputmode="numeric" autocomplete="off" />
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
          <input id="ls-add-price" class="field" type="text" placeholder="17000 o Consultar" autocomplete="off" />
        </div>

        <div class="form-field" id="ls-add-heating-wrap" hidden>
          <label for="ls-add-heating">Calefacción</label>
          <select id="ls-add-heating" class="field">
            ${HEATING_OPTIONS.map((option) => `<option value="${option}">${option || "Seleccionar..."}</option>`).join("")}
          </select>
        </div>

        <div class="form-field form-field--full">
          <div class="ls-machine-inline">
            <label><input id="ls-add-shipping" type="checkbox" checked /> Envío incluido</label>
            <label><input id="ls-add-startup" type="checkbox" checked /> Puesta en marcha incluida</label>
          </div>
        </div>

        <div class="form-field">
          <label for="ls-add-warranty-type">Tipo de garantía</label>
          <select id="ls-add-warranty-type" class="field">
            <option value="">Sin garantía</option>
            <option value="piezas">Garantía de piezas</option>
            <option value="total">Garantía total</option>
          </select>
        </div>

        <div class="form-field form-field--full">
          <label for="ls-add-warranty">Detalle de garantía</label>
          <input id="ls-add-warranty" class="field" type="text" placeholder="1 año de garantía de piezas" autocomplete="off" />
        </div>

        <div class="form-field form-field--full">
          <label for="ls-add-images">Imágenes</label>
          <input id="ls-add-images" class="field" type="file" multiple accept="image/*" />
        </div>

        <div class="form-field form-field--full">
          <label for="ls-add-comments">Comentarios</label>
          <textarea id="ls-add-comments" class="field" rows="4"></textarea>
        </div>
      </div>

      <div class="ls-machine-add-meta">
        <div><strong>Ruta en Storage:</strong> <span id="ls-add-folder">maquinaria/M001/</span></div>
        <div><strong>Resumen:</strong> <span id="ls-add-summary">Completa los campos para generar la ficha.</span></div>
        <div><strong>Archivos seleccionados:</strong></div>
        <ul id="ls-add-files" class="ls-machine-file-list">
          <li>Sin imágenes seleccionadas.</li>
        </ul>
      </div>

      <p id="ls-add-status" class="ls-machine-add-status" aria-live="polite"></p>

      <div class="ls-machine-add-actions">
        <button type="button" class="ls-mini-action" id="ls-add-cancel">Cancelar</button>
        <button type="submit" class="btn-pill btn-pill-solid" id="ls-add-submit">Preparar alta</button>
      </div>
    </form>
  `;
  document.body.appendChild(dialog);
  return dialog;
};

const adminWraps = [];
let currentUser = null;
let renderToken = 0;
let dialogMode = "create";
let editingMachine = null;

const dialog = createDialog();
const form = dialog.querySelector("form");
const titleEl = dialog.querySelector("#ls-machine-dialog-title");
const typeField = dialog.querySelector("#ls-add-type");
const idField = dialog.querySelector("#ls-add-id");
const brandField = dialog.querySelector("#ls-add-brand");
const modelField = dialog.querySelector("#ls-add-model");
const capacityField = dialog.querySelector("#ls-add-capacity");
const yearField = dialog.querySelector("#ls-add-year");
const stateField = dialog.querySelector("#ls-add-state");
const locationField = dialog.querySelector("#ls-add-location");
const priceField = dialog.querySelector("#ls-add-price");
const heatingWrap = dialog.querySelector("#ls-add-heating-wrap");
const heatingField = dialog.querySelector("#ls-add-heating");
const shippingField = dialog.querySelector("#ls-add-shipping");
const startupField = dialog.querySelector("#ls-add-startup");
const warrantyTypeField = dialog.querySelector("#ls-add-warranty-type");
const warrantyField = dialog.querySelector("#ls-add-warranty");
const imagesField = dialog.querySelector("#ls-add-images");
const commentsField = dialog.querySelector("#ls-add-comments");
const folderEl = dialog.querySelector("#ls-add-folder");
const summaryEl = dialog.querySelector("#ls-add-summary");
const filesEl = dialog.querySelector("#ls-add-files");
const statusEl = dialog.querySelector("#ls-add-status");
const submitButton = dialog.querySelector("#ls-add-submit");

const normalizeCapacity = (value) => {
  const numeric = String(value || "").trim().replace(/[^\d]/g, "");
  return numeric ? `${numeric} kg` : "";
};

const normalizePricePreview = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.toLowerCase() === "consultar") return "Consultar";
  const numeric = raw.replace(/[^\d]/g, "");
  if (!numeric) return raw;
  return `${Number.parseInt(numeric, 10).toLocaleString("es-ES")} EUR`;
};

const setBusy = (busy) => {
  submitButton.disabled = busy;
  submitButton.textContent = busy ? "Guardando..." : dialogMode === "edit" ? "Guardar cambios" : "Preparar alta";
};

const resetStatus = () => {
  statusEl.textContent = "";
  statusEl.removeAttribute("data-state");
};

const renderFiles = () => {
  const files = Array.from(imagesField.files || []);
  filesEl.innerHTML = "";

  if (files.length) {
    files.forEach((file) => {
      const item = document.createElement("li");
      item.textContent = file.name;
      filesEl.appendChild(item);
    });
    return;
  }

  if (dialogMode === "edit" && Array.isArray(editingMachine?.imagenes) && editingMachine.imagenes.length) {
    const item = document.createElement("li");
    item.textContent = `${editingMachine.imagenes.length} imagen(es) ya asociadas. Las nuevas se añadirán.`;
    filesEl.appendChild(item);
    return;
  }

  filesEl.innerHTML = "<li>Sin imágenes seleccionadas.</li>";
};

const renderDerivedState = async () => {
  const token = ++renderToken;
  const isEditing = dialogMode === "edit" && editingMachine?.id;
  const nextId = isEditing ? editingMachine.id : await getSuggestedMachineId(typeField.value);
  if (token !== renderToken) return;

  idField.value = nextId;
  folderEl.textContent = `maquinaria/${nextId}/`;

  const isDryer = typeField.value === "Secadora";
  heatingWrap.hidden = !isDryer;
  if (!isDryer) heatingField.value = "";

  const parts = [];
  if (typeField.value) parts.push(typeField.value);
  if (brandField.value.trim()) parts.push(brandField.value.trim());
  if (modelField.value.trim()) parts.push(modelField.value.trim());
  if (capacityField.value.trim()) parts.push(normalizeCapacity(capacityField.value));
  if (yearField.value.trim()) parts.push(yearField.value.trim());
  if (stateField.value) parts.push(stateField.value);
  if (locationField.value.trim()) parts.push(locationField.value.trim());

  const extras = [];
  if (priceField.value.trim()) extras.push(`precio ${normalizePricePreview(priceField.value)}`);
  if (shippingField.checked && startupField.checked) extras.push("envío y puesta en marcha incluida");
  else if (shippingField.checked) extras.push("envío incluido");
  else if (startupField.checked) extras.push("puesta en marcha incluida");
  if (warrantyTypeField.value && warrantyField.value.trim()) extras.push(warrantyField.value.trim());
  if (isDryer && heatingField.value) extras.push(`calefacción ${heatingField.value}`);
  if (commentsField.value.trim()) extras.push("comentarios");

  summaryEl.textContent =
    parts.length || extras.length
      ? `${parts.join(" · ")}${extras.length ? " · " + extras.join(" · ") : ""}`
      : "Completa los campos para generar la ficha.";
};

const clearForm = () => {
  form.reset();
  dialogMode = "create";
  editingMachine = null;
  titleEl.textContent = "Agregar maquinaria";
  typeField.disabled = false;
  typeField.value = TYPE_OPTIONS[0];
  stateField.value = STATE_OPTIONS[0];
  shippingField.checked = true;
  startupField.checked = true;
  warrantyTypeField.value = "";
  heatingField.value = "";
  submitButton.textContent = "Preparar alta";
  void renderDerivedState();
  renderFiles();
  resetStatus();
};

const fillFormForEdit = (machine) => {
  dialogMode = "edit";
  editingMachine = machine;
  titleEl.textContent = `Editar ${machine.id}`;
  typeField.value = machine.categoria || TYPE_OPTIONS[0];
  typeField.disabled = true;
  idField.value = machine.id || "";
  brandField.value = machine.marca || "";
  modelField.value = machine.modelo || "";
  capacityField.value = String(machine.capacidad || "").replace(/[^\d]/g, "");
  yearField.value = machine.anio != null ? String(machine.anio) : "";
  stateField.value = machine.estado || STATE_OPTIONS[0];
  locationField.value = machine.ubicacion || "";
  priceField.value = machine.precioTexto || "";
  heatingField.value = machine.calefaccion || "";
  shippingField.checked = Boolean(machine.envioIncluido);
  startupField.checked = Boolean(machine.puestaEnMarchaIncluida);
  warrantyTypeField.value = machine.garantiaTipo || (machine.garantiaPiezasAnos ? "piezas" : machine.garantiaTexto ? "total" : "");
  warrantyField.value = machine.garantiaTexto || "";
  commentsField.value = machine.comentarios || "";
  imagesField.value = "";
  submitButton.textContent = "Guardar cambios";
  void renderDerivedState();
  renderFiles();
  resetStatus();
};

const openCreateDialog = () => {
  clearForm();
  dialog.showModal();
};

const openEditDialog = (machine) => {
  if (!isAdminUser(currentUser) || !machine) return;
  fillFormForEdit(machine);
  dialog.showModal();
};

const syncAdminControls = async (user) => {
  currentUser = user || null;
  const isAdmin = isAdminUser(user);

  if (isAdmin) {
    try {
      await ensureInitialMachinesBootstrapped();
    } catch {}
  }

  adminWraps.forEach((wrap) => {
    const addButton = wrap.querySelector('[data-machine-auth="add"]');
    wrap.hidden = !isAdmin;
    addButton.hidden = !isAdmin;
  });

  document.dispatchEvent(
    new CustomEvent("ls:machine-admin-change", {
      detail: { isAdmin },
    })
  );
};

dialog.querySelector(".ls-machine-add-close").addEventListener("click", () => dialog.close());
dialog.querySelector("#ls-add-cancel").addEventListener("click", () => dialog.close());

[
  typeField,
  brandField,
  modelField,
  capacityField,
  yearField,
  stateField,
  locationField,
  priceField,
  heatingField,
  shippingField,
  startupField,
  warrantyTypeField,
  warrantyField,
  commentsField,
].forEach((field) => {
  field.addEventListener("input", renderDerivedState);
  field.addEventListener("change", renderDerivedState);
});

imagesField.addEventListener("change", renderFiles);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetStatus();

  if (!isAdminUser(currentUser)) {
    statusEl.dataset.state = "error";
    statusEl.textContent = "Necesitas iniciar sesión como administrador para guardar maquinaria.";
    return;
  }

  const payload = {
    categoria: typeField.value,
        marca: brandField.value,
        modelo: modelField.value,
        capacidad: normalizeCapacity(capacityField.value),
        anio: yearField.value,
        estado: stateField.value,
        ubicacion: locationField.value,
    precio: priceField.value,
    calefaccion: heatingField.value,
    envioIncluido: shippingField.checked,
    puestaEnMarchaIncluida: startupField.checked,
        garantiaTipo: warrantyTypeField.value,
        garantiaDetalle: warrantyField.value,
        comentarios: commentsField.value,
  };

  setBusy(true);
  try {
    const saved =
      dialogMode === "edit"
        ? await updateMachine(editingMachine?.id, payload, imagesField.files, currentUser, editingMachine)
        : await createMachine(payload, imagesField.files, currentUser);

    statusEl.dataset.state = "ok";
    statusEl.textContent =
      dialogMode === "edit"
        ? `Máquina ${saved.id} actualizada correctamente.`
        : `Máquina ${saved.id} guardada correctamente.`;
    dialog.close();
    clearForm();
  } catch (error) {
    statusEl.dataset.state = "error";
    statusEl.textContent = error?.message || "No se pudo guardar la máquina.";
  } finally {
    setBusy(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && dialog.open) dialog.close();
});

document.addEventListener("ls:machine-edit", (event) => {
  openEditDialog(event.detail?.machine || null);
});

document.querySelectorAll(".ls-filterbar").forEach((bar) => {
  const wrap = createAdminWrap();
  const addButton = wrap.querySelector('[data-machine-auth="add"]');
  addButton.addEventListener("click", openCreateDialog);
  adminWraps.push(wrap);
  bar.appendChild(wrap);
});

observeMachineAdmin(syncAdminControls);
void renderDerivedState();
renderFiles();
