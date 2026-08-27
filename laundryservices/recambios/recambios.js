import { functions } from "/static/js/firebase/firebaseApp.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";

const submitSpareRequest = httpsCallable(functions, "submitLaundrySpareRequest");

const translations = {
  es: {
    eyebrow: "Recambios y componentes",
    title: "Identifiquemos tu máquina",
    intro: "Dinos qué equipo tienes y describe el recambio que necesitas. Si no conoces el modelo, una foto de la placa nos ayudará a localizarlo.",
    progress_label: "Progreso de la solicitud",
    progress_machine: "Máquina",
    progress_identification: "Identificación",
    progress_spare: "Recambio",
    progress_contact: "Contacto",
    machine_title: "¿Qué máquina tienes?",
    machine_help: "Selecciona la marca, el tipo de equipo y el modelo. Si no aparece, podrás escribirlo tal como figura en la placa.",
    manufacturer_label: "Marca",
    choose_manufacturer: "Selecciona una marca…",
    manufacturer_error: "Selecciona una marca.",
    alliance_label: "Marca de Alliance",
    alliance_help: "Elige el nombre que aparece en la máquina.",
    choose_alliance_brand: "Selecciona una marca…",
    alliance_error: "Selecciona una marca de Alliance.",
    category_label: "Tipo de máquina",
    choose_category: "Selecciona un tipo…",
    category_error: "Selecciona el tipo de máquina.",
    model_label: "Modelo o familia",
    choose_model: "Selecciona un modelo…",
    unknown_model: "No aparece / No lo sé",
    model_error: "Selecciona un modelo o indica que no aparece.",
    manual_model_label: "Modelo escrito en la placa",
    model_placeholder: "Ej. HS-6024",
    manual_model_help: "Escríbelo exactamente como aparece, aunque esté incompleto.",
    identification_title: "Ayúdanos a identificarla",
    identification_help: "Fotografía la placa completa y asegúrate de que todos los datos se lean con claridad.",
    plate_title: "Fotos de la placa",
    plate_help: "Añade hasta 4 imágenes nítidas. JPG, PNG o WEBP; máximo 8 MB por imagen.",
    choose_images: "Añadir imágenes",
    spare_title: "¿Qué recambio necesitas?",
    spare_help: "Nómbralo con tus palabras. No hace falta conocer la denominación técnica.",
    spare_name_label: "Nombre del recambio",
    spare_name_placeholder: "Ej. goma de puerta, pantalla, rodamiento…",
    reference_label: "Referencia de la pieza",
    reference_placeholder: "Si aparece en la pieza",
    quantity_label: "Cantidad",
    description_label: "Descripción o detalles",
    description_placeholder: "Dónde está montado, qué ha ocurrido o cualquier medida y marca visible.",
    plate_required: "Añade al menos una foto de la placa.",
    contact_title: "¿Dónde te respondemos?",
    contact_help: "Revisaremos la información y contactaremos contigo para confirmar el recambio.",
    name_label: "Nombre",
    email_label: "Correo electrónico",
    phone_label: "Teléfono",
    country_label: "País",
    fiscal_title: "Datos para oferta y facturación",
    fiscal_help: "Los usaremos para preparar correctamente la oferta y, si procede, la factura.",
    legal_name_label: "Razón social",
    tax_id_label: "CIF / NIF / VAT",
    fiscal_address_label: "Dirección fiscal",
    postal_code_label: "Código postal",
    city_label: "Población",
    province_label: "Provincia / región",
    summary_title: "Resumen de la solicitud",
    edit_machine: "Editar máquina",
    privacy_prefix: "He leído y acepto la",
    privacy_link: "política de privacidad",
    back: "Atrás",
    continue: "Continuar",
    send: "Enviar solicitud",
    other_manufacturer: "Otro / No lo sé",
    unknown_brand: "No lo sé",
    images_too_many: "Puedes añadir un máximo de 4 imágenes.",
    image_too_large: "Cada imagen debe ocupar menos de 8 MB.",
    image_wrong_type: "Solo se admiten imágenes JPG, PNG o WEBP.",
    images_processing: "Preparando las imágenes…",
    images_payload_too_large: "Las imágenes ocupan demasiado. Prueba con fotos de menor resolución.",
    sending: "Enviando solicitud…",
    success: "Solicitud enviada correctamente. Referencia: {reference}. Revisaremos la información y contactaremos contigo.",
    send_error: "No hemos podido enviar la solicitud. Inténtalo de nuevo dentro de unos minutos.",
    summary_manufacturer: "Fabricante",
    summary_brand: "Marca",
    summary_category: "Máquina",
    summary_model: "Modelo",
    summary_spare: "Recambio",
    summary_reference: "Referencia",
    summary_images: "Imágenes",
    summary_legal_name: "Razón social",
    summary_tax_id: "CIF / NIF / VAT",
    summary_fiscal_address: "Dirección fiscal",
    not_indicated: "No indicado",
    images_count: "{count} adjuntas"
  },
  en: {
    eyebrow: "Spare parts and components",
    title: "Let's identify your machine",
    intro: "Tell us which equipment you have and describe the spare part you need. If you do not know the model, a photo of the data plate will help us identify it.",
    progress_label: "Request progress",
    progress_machine: "Machine",
    progress_identification: "Identification",
    progress_spare: "Spare part",
    progress_contact: "Contact",
    machine_title: "Which machine do you have?",
    machine_help: "Choose the brand, equipment type and model. If it is not listed, you can enter it exactly as shown on the data plate.",
    manufacturer_label: "Brand",
    choose_manufacturer: "Choose a brand…",
    manufacturer_error: "Choose a brand.",
    alliance_label: "Alliance brand",
    alliance_help: "Choose the name shown on the machine.",
    choose_alliance_brand: "Choose a brand…",
    alliance_error: "Choose an Alliance brand.",
    category_label: "Machine type",
    choose_category: "Choose a type…",
    category_error: "Choose the machine type.",
    model_label: "Model or family",
    choose_model: "Choose a model…",
    unknown_model: "Not listed / I don't know",
    model_error: "Choose a model or indicate that it is not listed.",
    manual_model_label: "Model shown on the data plate",
    model_placeholder: "E.g. HS-6024",
    manual_model_help: "Enter it exactly as shown, even if the text is incomplete.",
    identification_title: "Help us identify it",
    identification_help: "Photograph the full data plate and make sure every detail is clearly readable.",
    plate_title: "Data plate photos",
    plate_help: "Add up to 4 clear images. JPG, PNG or WEBP; maximum 8 MB each.",
    choose_images: "Add images",
    spare_title: "Which spare part do you need?",
    spare_help: "Name it in your own words. You do not need to know the technical term.",
    spare_name_label: "Spare part name",
    spare_name_placeholder: "E.g. door seal, display, bearing…",
    reference_label: "Part reference",
    reference_placeholder: "If shown on the part",
    quantity_label: "Quantity",
    description_label: "Description or details",
    description_placeholder: "Where it is fitted, what happened, or any visible dimensions and markings.",
    plate_required: "Add at least one photo of the data plate.",
    contact_title: "Where should we reply?",
    contact_help: "We will review the information and contact you to confirm the spare part.",
    name_label: "Name",
    email_label: "Email",
    phone_label: "Phone",
    country_label: "Country",
    fiscal_title: "Quotation and billing details",
    fiscal_help: "We will use these details to prepare the quotation and, where applicable, the invoice.",
    legal_name_label: "Legal company name",
    tax_id_label: "Tax ID / VAT number",
    fiscal_address_label: "Billing address",
    postal_code_label: "Postal code",
    city_label: "City",
    province_label: "Province / region",
    summary_title: "Request summary",
    edit_machine: "Edit machine",
    privacy_prefix: "I have read and accept the",
    privacy_link: "privacy policy",
    back: "Back",
    continue: "Continue",
    send: "Send request",
    other_manufacturer: "Other / I don't know",
    unknown_brand: "I don't know",
    images_too_many: "You can add a maximum of 4 images.",
    image_too_large: "Each image must be smaller than 8 MB.",
    image_wrong_type: "Only JPG, PNG or WEBP images are accepted.",
    images_processing: "Preparing the images…",
    images_payload_too_large: "The images are too large. Try photos with a lower resolution.",
    sending: "Sending request…",
    success: "Request sent successfully. Reference: {reference}. We will review the information and contact you.",
    send_error: "We could not send the request. Please try again in a few minutes.",
    summary_manufacturer: "Manufacturer",
    summary_brand: "Brand",
    summary_category: "Machine",
    summary_model: "Model",
    summary_spare: "Spare part",
    summary_reference: "Reference",
    summary_images: "Images",
    summary_legal_name: "Legal name",
    summary_tax_id: "Tax ID / VAT",
    summary_fiscal_address: "Billing address",
    not_indicated: "Not provided",
    images_count: "{count} attached"
  }
};

const form = document.querySelector(".spares-form");
const manufacturerSelect = document.querySelector("#manufacturer-select");
const categorySelect = document.querySelector("#category-select");
const modelSelect = document.querySelector("#model-select");
const manualModelField = document.querySelector("#manual-model-field");
const modelInput = document.querySelector("#model-input");
const nextButton = document.querySelector("#next-button");
const backButton = document.querySelector("#back-button");
const submitButton = document.querySelector("#submit-button");
const statusElement = form.querySelector(".form-status");

let catalog = { manufacturers: [], categories: [], models: [] };
let language = normalizeLanguage(window.unatomoI18n?.getLanguage?.() || document.documentElement.lang);
let currentStep = 1;
let selectedManufacturer = "";
let selectedAllianceBrand = "";
let selectedCategory = "";
const submissionId = crypto.randomUUID();
const MAX_PREPARED_IMAGE_BYTES = 2.5 * 1024 * 1024;
const MAX_TOTAL_PREPARED_BYTES = 8 * 1024 * 1024;

function normalizeLanguage(value) {
  return String(value || "es").toLowerCase().startsWith("es") ? "es" : "en";
}

function t(key) {
  return translations[language]?.[key] || translations.es[key] || key;
}

function getCategoryLabel(category) {
  return category?.label?.[language] || category?.label?.es || category?.id || "";
}

function getManufacturerName(manufacturer) {
  return manufacturer?.id === "other" ? t("other_manufacturer") : manufacturer?.name || "";
}

function setHiddenValue(id, value) {
  document.querySelector(id).value = value || "";
}

function renderManufacturers() {
  manufacturerSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = t("choose_manufacturer");
  manufacturerSelect.append(placeholder);
  catalog.manufacturers.forEach((manufacturer) => {
    if (manufacturer.id === "alliance") {
      (manufacturer.brands || []).forEach((brand) => {
        const option = document.createElement("option");
        option.value = `alliance::${brand}`;
        option.textContent = brand === "No lo sé" ? `Alliance · ${t("unknown_brand")}` : `${brand} · Alliance`;
        manufacturerSelect.append(option);
      });
    } else {
      const option = document.createElement("option");
      option.value = manufacturer.id;
      option.textContent = getManufacturerName(manufacturer);
      manufacturerSelect.append(option);
    }
  });
  manufacturerSelect.value = selectedManufacturer === "alliance" ? `alliance::${selectedAllianceBrand}` : selectedManufacturer;
}

function renderCategories() {
  categorySelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = t("choose_category");
  categorySelect.append(placeholder);
  catalog.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = getCategoryLabel(category);
    categorySelect.append(option);
  });
  categorySelect.value = selectedCategory;
  categorySelect.disabled = !selectedManufacturer;
}

function selectManufacturer(value) {
  const [manufacturerId, allianceBrand = ""] = value.split("::");
  selectedManufacturer = manufacturerId;
  selectedAllianceBrand = allianceBrand;
  selectedCategory = "";
  modelInput.value = "";
  const manufacturer = catalog.manufacturers.find((item) => item.id === selectedManufacturer);
  setHiddenValue("#manufacturer-value", getManufacturerName(manufacturer));
  setHiddenValue("#alliance-brand-value", selectedAllianceBrand === "No lo sé" ? t("unknown_brand") : selectedAllianceBrand);
  setHiddenValue("#category-value", "");
  setHiddenValue("#catalog-model-value", "");
  document.querySelector("#manufacturer-error").hidden = true;
  document.querySelector("#category-error").hidden = true;
  document.querySelector("#model-error").hidden = true;
  manualModelField.hidden = true;
  renderManufacturers();
  renderCategories();
  updateModelOptions();
}

function getFilteredModels() {
  return catalog.models.filter((group) => {
    if (group.manufacturerId !== selectedManufacturer || group.categoryId !== selectedCategory) return false;
    if (selectedManufacturer !== "alliance" || !selectedAllianceBrand || selectedAllianceBrand === "No lo sé") return true;
    return group.brand === selectedAllianceBrand;
  });
}

function updateModelOptions() {
  const previousValue = modelSelect.value;
  modelSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = t("choose_model");
  modelSelect.append(placeholder);
  getFilteredModels().forEach((group) => {
    const optionGroup = document.createElement("optgroup");
    optionGroup.label = [group.brand, group.family].filter(Boolean).join(" · ");
    group.models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = model;
      optionGroup.append(option);
    });
    modelSelect.append(optionGroup);
  });
  const unknownOption = document.createElement("option");
  unknownOption.value = "__manual__";
  unknownOption.textContent = t("unknown_model");
  modelSelect.append(unknownOption);
  modelSelect.disabled = !selectedCategory;
  if (Array.from(modelSelect.options).some((option) => option.value === previousValue)) {
    modelSelect.value = previousValue;
  }
}

function syncCatalogModel() {
  const selected = modelSelect.value;
  setHiddenValue("#catalog-model-value", selected === "__manual__" ? "Modelo indicado manualmente" : selected);
}

function validateStep(step) {
  if (step === 1) {
    const manufacturerValid = Boolean(selectedManufacturer);
    const categoryValid = Boolean(selectedCategory);
    const modelValid = Boolean(modelSelect.value);
    document.querySelector("#manufacturer-error").hidden = manufacturerValid;
    document.querySelector("#category-error").hidden = categoryValid;
    document.querySelector("#model-error").hidden = modelValid;
    return manufacturerValid && categoryValid && modelValid;
  }

  if (step === 2) {
    const hasPlateImage = Boolean(document.querySelector("#plate-images").files?.length);
    const error = document.querySelector("#plate-error");
    if (!hasPlateImage) {
      error.textContent = t("plate_required");
      error.hidden = false;
      return false;
    }
    error.hidden = true;
  }

  const stepElement = document.querySelector(`[data-step="${step}"]`);
  const requiredFields = Array.from(stepElement.querySelectorAll("[required]"));
  const invalidField = requiredFields.find((field) => !field.checkValidity());
  if (invalidField) {
    invalidField.reportValidity();
    invalidField.focus();
    return false;
  }
  return true;
}

function showStep(step, shouldFocus = true) {
  currentStep = Math.max(1, Math.min(4, step));
  document.querySelectorAll(".spares-step").forEach((section) => {
    const active = Number(section.dataset.step) === currentStep;
    section.hidden = !active;
    section.classList.toggle("is-active", active);
  });
  document.querySelectorAll("[data-step-indicator]").forEach((item) => {
    const itemStep = Number(item.dataset.stepIndicator);
    item.classList.toggle("is-active", itemStep === currentStep);
    item.classList.toggle("is-complete", itemStep < currentStep);
  });
  backButton.hidden = currentStep === 1;
  nextButton.hidden = currentStep === 4;
  submitButton.hidden = currentStep !== 4;
  if (currentStep === 4) updateSummary();
  if (shouldFocus) {
    document.querySelector(`[data-step="${currentStep}"] h2`)?.focus?.({ preventScroll: true });
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setupImageInput(inputId, previewId, errorId) {
  const input = document.querySelector(inputId);
  const preview = document.querySelector(previewId);
  const error = document.querySelector(errorId);
  let urls = [];

  input.addEventListener("change", () => {
    urls.forEach(URL.revokeObjectURL);
    urls = [];
    preview.replaceChildren();
    error.hidden = true;
    const files = Array.from(input.files || []);
    let message = "";
    if (files.length > 4) message = t("images_too_many");
    else if (files.some((file) => file.size > 8 * 1024 * 1024)) message = t("image_too_large");
    else if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) message = t("image_wrong_type");
    if (message) {
      input.value = "";
      error.textContent = message;
      error.hidden = false;
      return;
    }
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      urls.push(url);
      const figure = document.createElement("figure");
      figure.className = "image-preview";
      const image = document.createElement("img");
      image.src = url;
      image.alt = file.name;
      figure.append(image);
      preview.append(figure);
    });
    updateSummary();
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image-load-failed"));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("image-compression-failed"));
    }, "image/jpeg", quality);
  });
}

async function prepareImage(file, index) {
  if (file.size <= MAX_PREPARED_IMAGE_BYTES) {
    return { blob: file, name: file.name, type: file.type };
  }
  const image = await loadImage(file);
  const maxDimension = 2200;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas-unavailable");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let blob = await canvasToBlob(canvas, 0.84);
  if (blob.size > MAX_PREPARED_IMAGE_BYTES) blob = await canvasToBlob(canvas, 0.68);
  if (blob.size > MAX_PREPARED_IMAGE_BYTES) throw new Error("images-too-large");
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
  return {
    blob,
    name: `${baseName || `placa-${index + 1}`}.jpg`,
    type: "image/jpeg"
  };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error || new Error("file-read-failed"));
    reader.readAsDataURL(blob);
  });
}

async function prepareImages() {
  const files = Array.from(document.querySelector("#plate-images").files || []);
  const prepared = await Promise.all(files.map(prepareImage));
  const totalBytes = prepared.reduce((sum, image) => sum + image.blob.size, 0);
  if (totalBytes > MAX_TOTAL_PREPARED_BYTES) throw new Error("images-too-large");
  return Promise.all(prepared.map(async (image) => ({
    name: image.name,
    type: image.type,
    content: await blobToBase64(image.blob)
  })));
}

function fieldValue(selector) {
  return document.querySelector(selector).value.trim();
}

function buildSubmission(images) {
  const manufacturer = catalog.manufacturers.find((item) => item.id === selectedManufacturer);
  const category = catalog.categories.find((item) => item.id === selectedCategory);
  return {
    submissionId,
    language,
    website: form.querySelector('[name="_gotcha"]').value,
    manufacturer: getManufacturerName(manufacturer),
    allianceBrand: selectedManufacturer === "alliance" && selectedAllianceBrand !== "No lo sé" ? selectedAllianceBrand : "",
    category: getCategoryLabel(category),
    model: modelSelect.value === "__manual__" ? (modelInput.value.trim() || t("unknown_model")) : modelSelect.value,
    spareName: fieldValue("#spare-name"),
    partReference: fieldValue("#part-reference"),
    quantity: Number(fieldValue("#quantity")) || 1,
    description: fieldValue("#spare-description"),
    contactName: fieldValue("#contact-name"),
    email: fieldValue("#email"),
    phone: fieldValue("#phone"),
    legalName: fieldValue("#legal-name"),
    taxId: fieldValue("#tax-id"),
    country: fieldValue("#country"),
    fiscalAddress: fieldValue("#fiscal-address"),
    postalCode: fieldValue("#postal-code"),
    city: fieldValue("#city"),
    province: fieldValue("#province"),
    privacyAccepted: form.querySelector('[name="privacidad_aceptada"]').checked,
    images
  };
}

function updateSummary() {
  const list = document.querySelector("#request-summary-list");
  const manufacturer = catalog.manufacturers.find((item) => item.id === selectedManufacturer);
  const category = catalog.categories.find((item) => item.id === selectedCategory);
  const imageCount = document.querySelector("#plate-images").files?.length || 0;
  const addressParts = [
    document.querySelector("#fiscal-address").value.trim(),
    document.querySelector("#postal-code").value.trim(),
    document.querySelector("#city").value.trim(),
    document.querySelector("#province").value.trim(),
    document.querySelector("#country").value.trim()
  ].filter(Boolean);
  const rows = [
    [t("summary_manufacturer"), getManufacturerName(manufacturer) || t("not_indicated")],
    ...(selectedManufacturer === "alliance" ? [[t("summary_brand"), selectedAllianceBrand === "No lo sé" ? t("unknown_brand") : selectedAllianceBrand]] : []),
    [t("summary_category"), getCategoryLabel(category) || t("not_indicated")],
    [t("summary_model"), modelSelect.value === "__manual__" ? (modelInput.value.trim() || t("unknown_model")) : (modelSelect.value || t("not_indicated"))],
    [t("summary_spare"), document.querySelector("#spare-name").value.trim() || t("not_indicated")],
    [t("summary_reference"), document.querySelector("#part-reference").value.trim() || t("not_indicated")],
    [t("summary_images"), t("images_count").replace("{count}", imageCount)],
    [t("summary_legal_name"), document.querySelector("#legal-name").value.trim() || t("not_indicated")],
    [t("summary_tax_id"), document.querySelector("#tax-id").value.trim() || t("not_indicated")],
    [t("summary_fiscal_address"), addressParts.join(", ") || t("not_indicated")]
  ];
  list.replaceChildren();
  rows.forEach(([term, description]) => {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = description;
    list.append(dt, dd);
  });
}

function applyTranslations() {
  document.documentElement.querySelectorAll("[data-spares-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.sparesI18n);
  });
  document.documentElement.querySelectorAll("[data-spares-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.sparesI18nPlaceholder);
  });
  document.documentElement.querySelectorAll("[data-spares-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.sparesI18nAria));
  });
  document.title = language === "es" ? "Solicitar un recambio | UNATOMO · Laundry Services" : "Request a spare part | UNATOMO · Laundry Services";
  document.querySelector("#language-value").value = language;
  renderManufacturers();
  renderCategories();
  updateModelOptions();
  updateSummary();
}

manufacturerSelect.addEventListener("change", () => selectManufacturer(manufacturerSelect.value));
categorySelect.addEventListener("change", () => {
  selectedCategory = categorySelect.value;
  const category = catalog.categories.find((item) => item.id === selectedCategory);
  setHiddenValue("#category-value", getCategoryLabel(category));
  setHiddenValue("#catalog-model-value", "");
  document.querySelector("#category-error").hidden = true;
  document.querySelector("#model-error").hidden = true;
  modelInput.value = "";
  manualModelField.hidden = true;
  updateModelOptions();
});
modelSelect.addEventListener("change", () => {
  manualModelField.hidden = modelSelect.value !== "__manual__";
  if (modelSelect.value !== "__manual__") modelInput.value = "";
  document.querySelector("#model-error").hidden = true;
  syncCatalogModel();
});
modelInput.addEventListener("input", syncCatalogModel);
form.addEventListener("input", () => {
  if (currentStep === 4) updateSummary();
});
nextButton.addEventListener("click", () => {
  if (validateStep(currentStep)) showStep(currentStep + 1);
});
backButton.addEventListener("click", () => showStep(currentStep - 1));
document.querySelectorAll("[data-go-step]").forEach((button) => button.addEventListener("click", () => showStep(Number(button.dataset.goStep))));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateStep(4)) return;
  statusElement.hidden = false;
  statusElement.dataset.state = "";
  statusElement.textContent = t("images_processing");
  submitButton.disabled = true;
  syncCatalogModel();
  try {
    const images = await prepareImages();
    statusElement.textContent = t("sending");
    const response = await submitSpareRequest(buildSubmission(images));
    if (!response?.data?.ok) throw new Error("submission-rejected");
    statusElement.dataset.state = "success";
    statusElement.textContent = t("success").replace("{reference}", response.data.requestId || submissionId.slice(0, 8).toUpperCase());
    form.classList.add("is-sent");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    console.error(error);
    statusElement.dataset.state = "error";
    statusElement.textContent = error?.message === "images-too-large" ? t("images_payload_too_large") : t("send_error");
    submitButton.disabled = false;
  }
});

document.addEventListener("app:language-change", (event) => {
  language = normalizeLanguage(event.detail?.lang);
  applyTranslations();
});

setupImageInput("#plate-images", "#plate-previews", "#plate-error");

async function initialize() {
  try {
    const response = await fetch("/laundryservices/recambios/catalogo-maquinas.json");
    if (!response.ok) throw new Error(`Catalogue failed: ${response.status}`);
    catalog = await response.json();
  } catch (error) {
    console.error(error);
  }

  renderManufacturers();
  renderCategories();
  applyTranslations();
  showStep(1, false);
}

initialize();
