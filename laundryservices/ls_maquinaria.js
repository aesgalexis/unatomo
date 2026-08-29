import { subscribeMachines } from "/laundryservices/ls_maquinaria/agregador/ls_machine-public-store.js";

const LANGS = ["es", "en", "it", "el"];
const PAGE_SIZE = 10;
const normalizeLang = (value) => LANGS.includes(String(value || "").slice(0, 2).toLowerCase())
  ? String(value).slice(0, 2).toLowerCase()
  : "es";
const lang = normalizeLang(document.documentElement.lang);
const copyElement = document.querySelector("#laundry-machinery-copy");
const localizedCopy = copyElement ? JSON.parse(copyElement.textContent) : {labels: {}, typeLabels: {}, stateLabels: {}};
const META = {[lang]: localizedCopy};
const TYPE_LABELS = Object.fromEntries(Object.entries(localizedCopy.typeLabels).map(([key, value]) => [key, {[lang]: value}]));
const STATE_LABELS = Object.fromEntries(Object.entries(localizedCopy.stateLabels).map(([key, value]) => [key, {[lang]: value}]));

const copies = Array.from(document.querySelectorAll("article.legal-copy"));
let isMachineAdmin = false;
let currentMachines = [];
let machineryLoaded = false;
let allowEmptyState = false;
window.setTimeout(() => {
  allowEmptyState = true;
  if (!currentMachines.length) {
    copies.forEach((copy) => renderMachinesForCopy(copy, currentMachines));
  }
}, 1800);

if (copies.length) {

  const normalizeKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const formatPrice = (machine, lang) => {
    if (typeof machine.precioAmount === "number" && Number.isFinite(machine.precioAmount)) {
      const amount = Math.round(machine.precioAmount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `${amount} EUR`;
    }
    if (String(machine.precioTexto || "").trim().toLowerCase() === "consultar") {
      return META[lang].labels.consult;
    }
    return machine.precioTexto || "";
  };

  const translateType = (value, lang) => {
    const normalized = normalizeKey(value);
    return TYPE_LABELS[normalized]?.[lang] || value || "";
  };

  const translateState = (value, lang) => {
    const normalized = normalizeKey(value);
    return STATE_LABELS[normalized]?.[lang] || value || "";
  };

  const getWarrantyText = (machine, lang) => {
    const labels = META[lang].labels;
    const months = Number.parseInt(machine.garantiaMeses, 10);
    const years = Number.parseInt(machine.garantiaPiezasAnos, 10);
    const warrantyType = String(machine.garantiaTipo || "").trim();
    if (Number.isFinite(months) && months > 0) {
      if (warrantyType === "total") {
        return labels.fullWarrantyMonths.replace("{n}", months);
      }
      return labels.partsWarrantyMonths.replace("{n}", months);
    }
    if (Number.isFinite(years) && years > 0) {
      if (warrantyType === "total") {
        return years === 1 ? labels.fullWarrantyOne : labels.fullWarrantyMany.replace("{n}", years);
      }
      return years === 1 ? labels.partsWarrantyOne : labels.partsWarrantyMany.replace("{n}", years);
    }
    return machine.garantiaTexto || "";
  };

  const translateHeating = (value, lang) => {
    const normalized = normalizeKey(value);
    return localizedCopy.heatingLabels?.[normalized] || value || "";
  };

  const getCapacityValue = (machine) => {
    if (machine.capacidad) return String(machine.capacidad);
    const model = String(machine.modelo || "").trim();
    const match = model.match(/\b\d+(?:[.,]\d+)?\s*(?:kg|kgs|l|lt|lts)\b/i);
    return match ? match[0] : "";
  };

  const buildExtras = (machine, lang) => {
    const labels = META[lang].labels;
    const extras = [];
    if (machine.envioIncluido && machine.puestaEnMarchaIncluida) extras.push(labels.shippingStartup);
    else if (machine.envioIncluido) extras.push(labels.shippingOnly);
    else if (machine.puestaEnMarchaIncluida) extras.push(labels.startupOnly);

    const warranty = getWarrantyText(machine, lang);
    if (warranty) extras.push(warranty);
    return extras;
  };

  const buildInfoHref = (machine, lang) => {
    const type = translateType(machine.categoria, lang);
    const params = new URLSearchParams({
      subject: "investment",
      type,
      brand: machine.marca || "",
      model: machine.modelo || "",
      year: machine.anio != null ? String(machine.anio) : "",
      id: machine.id || "",
    });
    return `${localizedCopy.contactPath}?${params.toString()}`;
  };

  const renderMachineRows = (machine, lang) => {
    const labels = META[lang].labels;
    const machineId = escapeHtml(machine.id);
    const type = escapeHtml(translateType(machine.categoria, lang));
    const brand = escapeHtml(machine.marca);
    const model = escapeHtml(machine.modelo);
    const capacity = escapeHtml(getCapacityValue(machine));
    const year = escapeHtml(machine.anio ?? "");
    const state = escapeHtml(translateState(machine.estado, lang));
    const location = escapeHtml(machine.ubicacion);
    const price = escapeHtml(formatPrice(machine, lang));
    const extras = buildExtras(machine, lang).map(escapeHtml);
    const heating = machine.calefaccion ? escapeHtml(translateHeating(machine.calefaccion, lang)) : "";
    const comments = machine.comentarios ? escapeHtml(machine.comentarios) : "";
    const images = Array.isArray(machine.imagenes) ? machine.imagenes.filter((item) => item?.url) : [];
    const hasImages = images.length > 0;
    const extrasText = extras.length ? ` · ${extras.join(" · ")}` : "";
    const visibilityText = isMachineAdmin && machine.visible === false ? " · Oculta" : "";
    const infoHref = buildInfoHref(machine, lang);

    return `
      <tr data-machine-id="${machineId}">
        <td data-type="${type}" data-label="${escapeHtml(labels.type)}">${type}</td>
        <td data-label="${escapeHtml(labels.brand)}">${brand}</td>
        <td data-label="${escapeHtml(labels.model)}">${model}</td>
        <td data-label="${escapeHtml(labels.capacity)}">${capacity}</td>
        <td data-label="${escapeHtml(labels.year)}">${year}</td>
        <td data-label="${escapeHtml(labels.status)}">${state}</td>
        <td data-label="${escapeHtml(labels.location)}">${location}</td>
      </tr>
      <tr class="ls-table-subrow${hasImages ? " ls-table-subrow-has-gallery" : ""}">
        <td colspan="7">
          ${comments ? `<div class="ls-table-meta ls-table-comment">${comments}</div>` : ""}
          ${heating ? `<div class="ls-table-meta"><strong>${escapeHtml(labels.heating)}</strong> ${heating}</div>` : ""}
          <div class="ls-table-subrow-inner">
            <div><strong>${escapeHtml(labels.price)}</strong> <span class="ls-price">${price}</span>${escapeHtml(extrasText)}${visibilityText} | <strong>${escapeHtml(labels.id)}</strong> ${machineId}</div>
            <div class="ls-table-actions">
              ${hasImages ? `<button type="button" class="ls-mini-action ls-gallery-toggle" data-gallery-id="${machineId}" aria-expanded="false" aria-controls="ls-gallery-${machineId}"><span class="ls-mini-action-label">${escapeHtml(labels.photos)}</span></button>` : ""}
              <a class="ls-mini-action" href="${escapeHtml(infoHref)}"><span class="ls-mini-action-label">${escapeHtml(labels.info)}</span></a>
              ${
                isMachineAdmin
                  ? `<button type="button" class="ls-mini-action ls-machine-edit-trigger" data-machine-id="${machineId}"><span class="ls-mini-action-label">${escapeHtml(labels.edit)}</span></button>`
                  : ""
              }
            </div>
          </div>
        </td>
      </tr>
      ${
        hasImages
          ? `<tr id="ls-gallery-${machineId}" class="ls-table-gallery-row" data-gallery-id="${machineId}" data-gallery-open="false" hidden>
              <td colspan="7">
                <div class="ls-machine-gallery" aria-label="${escapeHtml(`${labels.gallery} ${machine.id}`)}">
                  ${images
                    .map(
                      (image, index) => `
                        <a href="${escapeHtml(image.url)}" target="_blank" rel="noreferrer">
                          <img src="${escapeHtml(image.url)}" alt="${escapeHtml(`${machine.id} ${labels.image} ${index + 1}`)}" loading="lazy" />
                        </a>
                      `
                    )
                    .join("")}
                </div>
              </td>
            </tr>`
          : ""
      }
    `;
  };

  const renderTableState = (copy, message) => {
    const body = copy.querySelector(".ls-table tbody");
    if (!body) return;
    body.innerHTML = `
      <tr class="ls-table-state-row">
        <td class="ls-table-state" colspan="7">${escapeHtml(message)}</td>
      </tr>
    `;
    const status = copy.querySelector("[data-page-status]");
    const prev = copy.querySelector("[data-page-prev]");
    const next = copy.querySelector("[data-page-next]");
    if (status) status.textContent = "";
    if (prev) prev.disabled = true;
    if (next) next.disabled = true;
  };

  const getFilteredMachines = (copy, machines) => {
    const filter = copy.dataset.activeFilter || "all";
    if (filter === "all") return machines;
    return machines.filter((machine) => translateType(machine.categoria, lang) === filter);
  };

  const renderPagination = (copy, currentPage, totalPages) => {
    const labels = META[lang].labels;
    const status = copy.querySelector("[data-page-status]");
    const prev = copy.querySelector("[data-page-prev]");
    const next = copy.querySelector("[data-page-next]");
    if (status) status.textContent = labels.page.replace("{current}", currentPage).replace("{total}", totalPages);
    if (prev) {
      prev.disabled = currentPage <= 1;
      prev.textContent = labels.prev;
    }
    if (next) {
      next.disabled = currentPage >= totalPages;
      next.textContent = labels.next;
    }
  };

  const scrollToPageStart = () => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const renderMachinesForCopy = (copy, machines) => {
    const body = copy.querySelector(".ls-table tbody");
    if (!body) return;
    const visibleMachines = isMachineAdmin
      ? machines
      : machines.filter((machine) => machine.visible !== false);
    const filteredMachines = getFilteredMachines(copy, visibleMachines);
    if (!filteredMachines.length) {
      renderTableState(copy, machineryLoaded && allowEmptyState ? META[lang].empty : META[lang].loading);
      return;
    }
    const totalPages = Math.max(1, Math.ceil(filteredMachines.length / PAGE_SIZE));
    const requestedPage = Number.parseInt(copy.dataset.activePage || "1", 10) || 1;
    const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
    copy.dataset.activePage = String(currentPage);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageMachines = filteredMachines.slice(start, start + PAGE_SIZE);
    body.innerHTML = pageMachines.map((machine) => renderMachineRows(machine, lang)).join("");
    renderPagination(copy, currentPage, totalPages);
  };

  const applyFilter = (copy, filter) => {
    copy.dataset.activeFilter = filter;
    copy.dataset.activePage = "1";
    const select = copy.querySelector("[data-filter-select]");
    if (select) select.value = filter;
    renderMachinesForCopy(copy, currentMachines);
  };

  copies.forEach((copy) => {
    copy.dataset.activeFilter = "all";
    copy.dataset.activePage = "1";
    const select = copy.querySelector("[data-filter-select]");
    if (select) {
      select.addEventListener("change", () => {
        applyFilter(copy, select.value || "all");
      });
    }
    const prev = copy.querySelector("[data-page-prev]");
    const next = copy.querySelector("[data-page-next]");
    if (prev) {
      prev.addEventListener("click", () => {
        const currentPage = Number.parseInt(copy.dataset.activePage || "1", 10) || 1;
        if (currentPage <= 1) return;
        copy.dataset.activePage = String(currentPage - 1);
        renderMachinesForCopy(copy, currentMachines);
        window.requestAnimationFrame(scrollToPageStart);
      });
    }
    if (next) {
      next.addEventListener("click", () => {
        const currentPage = Number.parseInt(copy.dataset.activePage || "1", 10) || 1;
        copy.dataset.activePage = String(currentPage + 1);
        renderMachinesForCopy(copy, currentMachines);
        window.requestAnimationFrame(scrollToPageStart);
      });
    }
  });

  document.addEventListener("click", (event) => {
    const editTrigger = event.target.closest(".ls-machine-edit-trigger");
    if (editTrigger) {
      const machineId = editTrigger.getAttribute("data-machine-id");
      const machine = currentMachines.find((item) => item.id === machineId);
      if (machine && isMachineAdmin) {
        document.dispatchEvent(
          new CustomEvent("ls:machine-edit", {
            detail: { machine },
          })
        );
      }
      return;
    }

    const toggle = event.target.closest(".ls-gallery-toggle");
    if (!toggle) return;
    const galleryId = toggle.getAttribute("data-gallery-id");
    if (!galleryId) return;
    const activeCopy = copies.find((copy) => !copy.hidden);
    if (!activeCopy) return;
    const gallery = activeCopy.querySelector(`.ls-table-gallery-row[data-gallery-id="${galleryId}"]`);
    if (!gallery) return;
    const priceRow = gallery.previousElementSibling;
    const nextOpen = gallery.dataset.galleryOpen !== "true";
    gallery.dataset.galleryOpen = nextOpen ? "true" : "false";
    gallery.hidden = !nextOpen;
    toggle.setAttribute("aria-expanded", String(nextOpen));
    if (priceRow && priceRow.classList.contains("ls-table-subrow")) {
      priceRow.classList.toggle("is-gallery-open", nextOpen);
    }
  });

  copies.forEach((copy) => renderTableState(copy, META[lang].loading));

  subscribeMachines(
    (machines) => {
      currentMachines = machines;
      machineryLoaded = true;
      copies.forEach((copy) => renderMachinesForCopy(copy, machines));
    },
    () => {
      machineryLoaded = true;
      copies.forEach((copy) => renderTableState(copy, META[lang].error));
    }
  );

  document.addEventListener("ls:machine-admin-change", (event) => {
    const nextAdmin = event.detail?.isAdmin === true;
    if (nextAdmin === isMachineAdmin) return;
    isMachineAdmin = nextAdmin;
    copies.forEach((copy) => renderMachinesForCopy(copy, currentMachines));
  });

  if (new URLSearchParams(window.location.search).get("admin") === "1") {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/laundryservices/ls_maquinaria/agregador/ls_machine-add.css";
    document.head.append(stylesheet);
    import("/laundryservices/ls_maquinaria/agregador/ls_machine-add.js");
  }
}
