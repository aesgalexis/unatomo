import {
  observeMachineAdmin,
  subscribeMachines,
} from "/laundryservices/ls_maquinaria/agregador/ls_machine-store.js";
import { isAdminUser } from "/laundryservices/ls_maquinaria/agregador/firebase-config.js";

const LANGS = ["es", "en", "it", "el"];

const META = {
  es: {
    title: "Maquinaria de ocasion | Laundry Services",
    desc: "Listado de maquinaria de ocasion de Laundry Services.",
    loading: "Cargando maquinaria...",
    empty: "No hay maquinaria disponible en este momento.",
    error: "No se pudo cargar el listado de maquinaria.",
    labels: {
      price: "Precio:",
      info: "+ info",
      edit: "Editar",
      photos: "Ver fotos",
      gallery: "Imagenes de",
      image: "imagen",
      shippingOnly: "Envio incluido",
      startupOnly: "Puesta en marcha incluida",
      shippingStartup: "Envio y puesta en marcha incluida",
      heating: "Calefacción:",
      partsWarranty: (years) => `${years} ano de garantia de piezas`,
      partsWarrantyPlural: (years) => `${years} anos de garantia de piezas`,
      type: "Tipo",
      brand: "Marca",
      model: "Modelo",
      capacity: "Capacidad",
      year: "Ano",
      status: "Estado",
      location: "Ubicacion",
      id: "ID:",
    },
  },
  en: {
    title: "Used Machinery | Laundry Services",
    desc: "Used machinery listing from Laundry Services.",
    loading: "Loading machinery...",
    empty: "No machinery is available right now.",
    error: "The machinery listing could not be loaded.",
    labels: {
      price: "Price:",
      info: "+ info",
      edit: "Edit",
      photos: "View photos",
      gallery: "Images for",
      image: "image",
      shippingOnly: "Shipping included",
      startupOnly: "Commissioning included",
      shippingStartup: "Shipping and commissioning included",
      heating: "Heating:",
      partsWarranty: (years) => `${years} year parts warranty`,
      partsWarrantyPlural: (years) => `${years} years parts warranty`,
      type: "Type",
      brand: "Brand",
      model: "Model",
      capacity: "Capacity",
      year: "Year",
      status: "Status",
      location: "Location",
      id: "ID:",
    },
  },
  it: {
    title: "Macchinari usati | Laundry Services",
    desc: "Elenco di macchinari usati di Laundry Services.",
    loading: "Caricamento macchinari...",
    empty: "Al momento non ci sono macchinari disponibili.",
    error: "Impossibile caricare l'elenco dei macchinari.",
    labels: {
      price: "Prezzo:",
      info: "+ info",
      edit: "Modifica",
      photos: "Vedi foto",
      gallery: "Immagini di",
      image: "immagine",
      shippingOnly: "Spedizione inclusa",
      startupOnly: "Messa in servizio inclusa",
      shippingStartup: "Spedizione e messa in servizio incluse",
      heating: "Riscaldamento:",
      partsWarranty: (years) => `${years} anno di garanzia sui ricambi`,
      partsWarrantyPlural: (years) => `${years} anni di garanzia sui ricambi`,
      type: "Tipo",
      brand: "Marca",
      model: "Modello",
      capacity: "Capacita",
      year: "Anno",
      status: "Stato",
      location: "Ubicazione",
      id: "ID:",
    },
  },
  el: {
    title: "\u039c\u03b5\u03c4\u03b1\u03c7\u03b5\u03b9\u03c1\u03b9\u03c3\u03bc\u03b5\u03bd\u03b1 \u03bc\u03b7\u03c7\u03b1\u03bd\u03b7\u03bc\u03b1\u03c4\u03b1 | Laundry Services",
    desc: "\u039b\u03b9\u03c3\u03c4\u03b1 \u03bc\u03b5\u03c4\u03b1\u03c7\u03b5\u03b9\u03c1\u03b9\u03c3\u03bc\u03b5\u03bd\u03c9\u03bd \u03bc\u03b7\u03c7\u03b1\u03bd\u03b7\u03bc\u03b1\u03c4\u03c9\u03bd \u03b1\u03c0\u03bf \u03c4\u03bf Laundry Services.",
    loading: "\u03a6\u03bf\u03c1\u03c4\u03c9\u03c3\u03b7 \u03bc\u03b7\u03c7\u03b1\u03bd\u03b7\u03bc\u03b1\u03c4\u03c9\u03bd...",
    empty: "\u0394\u03b5\u03bd \u03c5\u03c0\u03b1\u03c1\u03c7\u03b5\u03b9 \u03b4\u03b9\u03b1\u03b8\u03b5\u03c3\u03b9\u03bc\u03bf \u03bc\u03b7\u03c7\u03b1\u03bd\u03b7\u03bc\u03b1 \u03b1\u03c5\u03c4\u03b7 \u03c4\u03b7 \u03c3\u03c4\u03b9\u03b3\u03bc\u03b7.",
    error: "\u0394\u03b5\u03bd \u03b7\u03c4\u03b1\u03bd \u03b4\u03c5\u03bd\u03b1\u03c4\u03b7 \u03b7 \u03c6\u03bf\u03c1\u03c4\u03c9\u03c3\u03b7 \u03c4\u03b7\u03c2 \u03bb\u03b9\u03c3\u03c4\u03b1\u03c2 \u03bc\u03b7\u03c7\u03b1\u03bd\u03b7\u03bc\u03b1\u03c4\u03c9\u03bd.",
    labels: {
      price: "\u03a4\u03b9\u03bc\u03b7:",
      info: "+ info",
      edit: "\u0395\u03c0\u03b5\u03be\u03b5\u03c1\u03b3\u03b1\u03c3\u03b9\u03b1",
      photos: "\u03a0\u03c1\u03bf\u03b2\u03bf\u03bb\u03b7 \u03c6\u03c9\u03c4\u03bf",
      gallery: "\u0395\u03b9\u03ba\u03bf\u03bd\u03b5\u03c2 \u03b3\u03b9\u03b1",
      image: "\u03b5\u03b9\u03ba\u03bf\u03bd\u03b1",
      shippingOnly: "\u03a0\u03b5\u03c1\u03b9\u03bb\u03b1\u03bc\u03b2\u03b1\u03bd\u03b5\u03c4\u03b1\u03b9 \u03b1\u03c0\u03bf\u03c3\u03c4\u03bf\u03bb\u03b7",
      startupOnly: "\u03a0\u03b5\u03c1\u03b9\u03bb\u03b1\u03bc\u03b2\u03b1\u03bd\u03b5\u03c4\u03b1\u03b9 \u03b8\u03b5\u03c3\u03b7 \u03c3\u03b5 \u03bb\u03b5\u03b9\u03c4\u03bf\u03c5\u03c1\u03b3\u03b9\u03b1",
      shippingStartup: "\u03a0\u03b5\u03c1\u03b9\u03bb\u03b1\u03bc\u03b2\u03b1\u03bd\u03bf\u03bd\u03c4\u03b1\u03b9 \u03b1\u03c0\u03bf\u03c3\u03c4\u03bf\u03bb\u03b7 \u03ba\u03b1\u03b9 \u03b8\u03b5\u03c3\u03b7 \u03c3\u03b5 \u03bb\u03b5\u03b9\u03c4\u03bf\u03c5\u03c1\u03b3\u03b9\u03b1",
      heating: "\u0398\u03b5\u03c1\u03bc\u03b1\u03bd\u03c3\u03b7:",
      partsWarranty: (years) => `${years} \u03b5\u03c4\u03bf\u03c2 \u03b5\u03b3\u03b3\u03c5\u03b7\u03c3\u03b7 \u03b1\u03bd\u03c4\u03b1\u03bb\u03bb\u03b1\u03ba\u03c4\u03b9\u03ba\u03c9\u03bd`,
      partsWarrantyPlural: (years) => `${years} \u03b5\u03c4\u03b7 \u03b5\u03b3\u03b3\u03c5\u03b7\u03c3\u03b7 \u03b1\u03bd\u03c4\u03b1\u03bb\u03bb\u03b1\u03ba\u03c4\u03b9\u03ba\u03c9\u03bd`,
      type: "\u03a4\u03c5\u03c0\u03bf\u03c2",
      brand: "\u039c\u03b1\u03c1\u03ba\u03b1",
      model: "\u039c\u03bf\u03bd\u03c4\u03b5\u03bb\u03bf",
      capacity: "\u0399\u03ba\u03b1\u03bd\u03bf\u03c4\u03b7\u03c4\u03b1",
      year: "\u0395\u03c4\u03bf\u03c2",
      status: "\u039a\u03b1\u03c4\u03b1\u03c3\u03c4\u03b1\u03c3\u03b7",
      location: "\u03a4\u03bf\u03c0\u03bf\u03b8\u03b5\u03c3\u03b9\u03b1",
      id: "ID:",
    },
  },
};

const TYPE_LABELS = {
  plegadora: { es: "Plegadora", en: "Folder", it: "Piegatrice", el: "\u0394\u03b9\u03c0\u03bb\u03c9\u03c4\u03b9\u03ba\u03bf" },
  lavadora: { es: "Lavadora", en: "Washer", it: "Lavatrice", el: "\u03a0\u03bb\u03c5\u03bd\u03c4\u03b7\u03c1\u03b9\u03bf" },
  tunel: { es: "Tunel", en: "Tunnel", it: "Tunnel", el: "\u03a4\u03bf\u03c5\u03bd\u03b5\u03bb" },
  secadora: { es: "Secadora", en: "Dryer", it: "Essiccatore", el: "\u03a3\u03c4\u03b5\u03b3\u03bd\u03c9\u03c4\u03b7\u03c1\u03b9\u03bf" },
  calandra: { es: "Calandra", en: "Ironer", it: "Calandra", el: "\u039a\u03b1\u03bb\u03b1\u03bd\u03b4\u03c1\u03b1" },
  prensa: { es: "Prensa", en: "Press", it: "Pressa", el: "\u03a0\u03c1\u03b5\u03c3\u03b1" },
  otro: { es: "Otro", en: "Other", it: "Altro", el: "\u0391\u03bb\u03bb\u03bf" },
};

const STATE_LABELS = {
  usada: { es: "Usada", en: "Used", it: "Usata", el: "\u039c\u03b5\u03c4\u03b1\u03c7\u03b5\u03b9\u03c1\u03b9\u03c3\u03bc\u03b5\u03bd\u03bf" },
  bueno: { es: "Bueno", en: "Good", it: "Buono", el: "\u039a\u03b1\u03bb\u03b7" },
  muy_bueno: { es: "Muy Bueno", en: "Very Good", it: "Molto buono", el: "\u03a0\u03bf\u03bb\u03c5 \u03ba\u03b1\u03bb\u03b7" },
  excelente: { es: "Excelente", en: "Excellent", it: "Eccellente", el: "\u0395\u03be\u03b1\u03b9\u03c1\u03b5\u03c4\u03b9\u03ba\u03b7" },
  repasada: { es: "Repasada", en: "Overhauled", it: "Revisionata", el: "\u0391\u03bd\u03b1\u03ba\u03b1\u03c4\u03b1\u03c3\u03ba\u03b5\u03c5\u03b1\u03c3\u03bc\u03b5\u03bd\u03bf" },
};

const copies = Array.from(document.querySelectorAll("[data-legal-lang]"));
let isMachineAdmin = false;
let currentMachines = [];

if (copies.length) {
  const normalizeLang = (lang) => (LANGS.includes(lang) ? lang : "es");

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

  const formatPrice = (machine) => {
    if (typeof machine.precioAmount === "number" && Number.isFinite(machine.precioAmount)) {
      const amount = Math.round(machine.precioAmount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `${amount} EUR`;
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
    const years = Number.parseInt(machine.garantiaPiezasAnos, 10);
    if (Number.isFinite(years) && years > 0) {
      return years === 1 ? labels.partsWarranty(years) : labels.partsWarrantyPlural(years);
    }
    return machine.garantiaTexto || "";
  };

  const translateHeating = (value, lang) => {
    const normalized = normalizeKey(value);
    if (normalized === "gas") return lang === "it" ? "Gas" : lang === "el" ? "\u0391\u03b5\u03c1\u03b9\u03bf" : "Gas";
    if (normalized === "vapor") return lang === "en" ? "Steam" : lang === "it" ? "Vapore" : lang === "el" ? "\u0391\u03c4\u03bc\u03bf\u03c2" : "Vapor";
    if (normalized === "aceite") return lang === "en" ? "Oil" : lang === "it" ? "Olio" : lang === "el" ? "\u039b\u03b1\u03b4\u03b9" : "Aceite";
    return value || "";
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
      subject: "card6",
      type,
      brand: machine.marca || "",
      model: machine.modelo || "",
      year: machine.anio != null ? String(machine.anio) : "",
      id: machine.id || "",
    });
    return `/laundryservices/ls_contacto.html?${params.toString()}`;
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
    const price = escapeHtml(formatPrice(machine));
    const extras = buildExtras(machine, lang).map(escapeHtml);
    const heating = machine.calefaccion ? escapeHtml(translateHeating(machine.calefaccion, lang)) : "";
    const comments = machine.comentarios ? escapeHtml(machine.comentarios) : "";
    const images = Array.isArray(machine.imagenes) ? machine.imagenes.filter((item) => item?.url) : [];
    const hasImages = images.length > 0;
    const extrasText = extras.length ? ` · ${extras.join(" · ")}` : "";
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
            <div><strong>${escapeHtml(labels.price)}</strong> <span class="ls-price">${price}</span>${escapeHtml(extrasText)} | <strong>${escapeHtml(labels.id)}</strong> ${machineId}</div>
            <div class="ls-table-actions">
              ${hasImages ? `<button type="button" class="ls-mini-action ls-gallery-toggle" data-gallery-id="${machineId}"><span class="ls-mini-action-label">${escapeHtml(labels.photos)}</span></button>` : ""}
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
          ? `<tr class="ls-table-gallery-row" data-gallery-id="${machineId}" data-gallery-open="false" hidden>
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
  };

  const renderMachinesForCopy = (copy, machines) => {
    const lang = normalizeLang(copy.getAttribute("data-legal-lang"));
    const body = copy.querySelector(".ls-table tbody");
    if (!body) return;
    if (!machines.length) {
      renderTableState(copy, META[lang].empty);
      return;
    }
    body.innerHTML = machines.map((machine) => renderMachineRows(machine, lang)).join("");
    applyFilter(copy, copy.dataset.activeFilter || "all");
  };

  const applyLanguage = (lang) => {
    const active = normalizeLang(lang);
    let visible = false;
    copies.forEach((copy) => {
      const match = copy.getAttribute("data-legal-lang") === active;
      copy.hidden = !match;
      if (match) visible = true;
    });
    if (!visible) {
      const fallback = copies.find((copy) => copy.getAttribute("data-legal-lang") === "en");
      if (fallback) fallback.hidden = false;
    }

    const meta = META[active] || META.es;
    document.title = meta.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", meta.desc);
  };

  const applyFilter = (copy, filter) => {
    copy.dataset.activeFilter = filter;
    const rows = Array.from(copy.querySelectorAll(".ls-table tbody tr[data-machine-id]"));
    const select = copy.querySelector("[data-filter-select]");
    rows.forEach((row) => {
      const typeCell = row.querySelector("td[data-type]");
      const subrow =
        row.nextElementSibling && row.nextElementSibling.classList.contains("ls-table-subrow")
          ? row.nextElementSibling
          : null;
      const galleryRow =
        subrow && subrow.nextElementSibling && subrow.nextElementSibling.classList.contains("ls-table-gallery-row")
          ? subrow.nextElementSibling
          : null;
      const matches = filter === "all" || (typeCell && typeCell.dataset.type === filter);
      row.hidden = !matches;
      if (subrow) subrow.hidden = !matches;
      if (galleryRow) {
        galleryRow.hidden = !matches || galleryRow.dataset.galleryOpen !== "true";
      }
    });
    if (select) select.value = filter;
  };

  copies.forEach((copy) => {
    copy.dataset.activeFilter = "all";
    const select = copy.querySelector("[data-filter-select]");
    if (select) {
      select.addEventListener("change", () => {
        applyFilter(copy, select.value || "all");
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
    if (priceRow && priceRow.classList.contains("ls-table-subrow")) {
      priceRow.classList.toggle("is-gallery-open", nextOpen);
    }
  });

  const initial =
    (window.unatomoI18n && typeof window.unatomoI18n.getLanguage === "function"
      ? window.unatomoI18n.getLanguage()
      : document.documentElement.lang) || "es";

  applyLanguage(initial);
  copies.forEach((copy) => renderTableState(copy, META[normalizeLang(copy.getAttribute("data-legal-lang"))].loading));

  subscribeMachines(
    (machines) => {
      currentMachines = machines;
      copies.forEach((copy) => renderMachinesForCopy(copy, machines));
    },
    () => {
      copies.forEach((copy) => renderTableState(copy, META[normalizeLang(copy.getAttribute("data-legal-lang"))].error));
    }
  );

  document.addEventListener("app:language-change", (event) => {
    applyLanguage(event?.detail?.lang || "es");
  });

  observeMachineAdmin((user) => {
    const nextAdmin = isAdminUser(user);
    if (nextAdmin === isMachineAdmin) return;
    isMachineAdmin = nextAdmin;
    copies.forEach((copy) => renderMachinesForCopy(copy, currentMachines));
  });
}
