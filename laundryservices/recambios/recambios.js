import { functions } from "/static/js/firebase/firebaseApp.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";
import { loadLaundryCatalog } from "/laundryservices/recambios/catalog-repo.js";
import { prepareImages, setupImageInput } from "/laundryservices/recambios/image-upload.js";

const submitSpareRequest = httpsCallable(functions, "submitLaundrySpareRequest");

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
const successPanel = document.querySelector("#success-panel");
const copyElement = document.querySelector("#laundry-spares-copy");
const copy = copyElement ? JSON.parse(copyElement.textContent) : {};

let catalog = { manufacturers: [], categories: [], models: [] };
const language = normalizeLanguage(document.documentElement.lang);
let currentStep = 1;
let selectedManufacturer = "";
let selectedAllianceBrand = "";
let selectedCategory = "";
const submissionId = crypto.randomUUID();

function normalizeLanguage(value) {
  const normalized = String(value || "es").slice(0, 2).toLowerCase();
  return ["es", "en", "it", "el"].includes(normalized) ? normalized : "es";
}

function t(key) {
  return copy[key] || key;
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

function showSuccess(requestId) {
  const reference = requestId || submissionId.slice(0, 8).toUpperCase();
  document.querySelector(".spares-hero").hidden = true;
  document.querySelector(".spares-progress").hidden = true;
  form.hidden = true;
  statusElement.hidden = true;
  successPanel.hidden = false;
  document.body.classList.add("request-complete");
  document.querySelector("#success-reference").textContent = t("success_reference").replace("{reference}", reference);
  document.querySelector("#success-title").focus({ preventScroll: true });
  successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
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

function initializeLocalizedFields() {
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
    const images = await prepareImages(document.querySelector("#plate-images"));
    statusElement.textContent = t("sending");
    const response = await submitSpareRequest(buildSubmission(images));
    if (!response?.data?.ok) throw new Error("submission-rejected");
    statusElement.dataset.state = "success";
    showSuccess(response.data.requestId);
  } catch (error) {
    console.error(error);
    statusElement.dataset.state = "error";
    statusElement.textContent = error?.message === "images-too-large" ? t("images_payload_too_large") : t("send_error");
    submitButton.disabled = false;
  }
});

setupImageInput({
  input: document.querySelector("#plate-images"),
  preview: document.querySelector("#plate-previews"),
  error: document.querySelector("#plate-error"),
  translate: t,
  onChange: updateSummary,
});

async function initialize() {
  try {
    catalog = await loadLaundryCatalog();
  } catch (error) {
    console.error(error);
    statusElement.hidden = false;
    statusElement.dataset.state = "error";
    statusElement.textContent = t("catalog_error");
    manufacturerSelect.disabled = true;
  }

  renderManufacturers();
  renderCategories();
  initializeLocalizedFields();
  showStep(1, false);
}

initialize();
