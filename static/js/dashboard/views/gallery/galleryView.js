import { t } from "../../i18n.js";
import { buildGalleryEntries, filterGalleryEntries } from "./galleryModel.js";
import { createGalleryDownloadUrl } from "./galleryRepo.js";

const SIZE_STEPS = [112, 144, 184, 232, 296];
let currentSizeIndex = 0;

const DOWNLOAD_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 3v11"></path>
    <path d="m7 10 5 5 5-5"></path>
    <path d="M5 21h14"></path>
  </svg>
`;

const ZOOM_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="10.5" cy="10.5" r="6.5"></circle>
    <path d="m16 16 4.5 4.5"></path>
    <path d="M10.5 8v5"></path>
    <path d="M8 10.5h5"></path>
  </svg>
`;

const textForEntry = (entry) => {
  const extension = entry.extension ? entry.extension.toUpperCase() : "";
  if (entry.mediaType === "pdf") return extension || "PDF";
  if (entry.mediaType === "image") return extension || t("dashboard.galleryImage", "Imagen");
  return extension || t("dashboard.galleryDocument", "Documento");
};

const setGallerySize = (wrap, sizeIndex) => {
  const safeIndex = Math.max(0, Math.min(SIZE_STEPS.length - 1, Number(sizeIndex) || 0));
  currentSizeIndex = safeIndex;
  wrap.style.setProperty("--gallery-item-size", `${SIZE_STEPS[safeIndex]}px`);
};

const createSizeControl = (wrap) => {
  const control = document.createElement("label");
  control.className = "gallery-size";
  const label = document.createElement("span");
  label.className = "gallery-size-icon";
  label.innerHTML = ZOOM_ICON;
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = String(SIZE_STEPS.length - 1);
  input.step = "1";
  input.value = String(currentSizeIndex);
  input.setAttribute("aria-label", t("dashboard.gallerySize", "Tama\u00f1o"));
  input.addEventListener("input", () => setGallerySize(wrap, input.value));
  control.appendChild(label);
  control.appendChild(input);
  return control;
};

const getDownloadName = (entry) => {
  const extension = entry.extension ? `.${entry.extension}` : "";
  const raw = entry.name || `${entry.kind || "document"}${extension}`;
  return raw.toString().trim().replace(/[^\w.-]+/g, "-").slice(0, 80) || "document";
};

const downloadGalleryEntry = async (entry) => {
  if (!entry.storagePath) throw new Error("storage-path-required");
  const signedUrl = await createGalleryDownloadUrl({
    machineId: entry.machineId,
    storagePath: entry.storagePath,
    fileName: getDownloadName(entry)
  });
  if (!signedUrl) throw new Error("download-url-missing");
  const link = document.createElement("a");
  link.href = signedUrl;
  link.download = getDownloadName(entry);
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const createGalleryItem = (entry) => {
  const item = document.createElement("article");
  item.className = `gallery-item gallery-item-${entry.mediaType}`;

  const mediaShell = document.createElement("div");
  mediaShell.className = "gallery-media-shell";

  const openLink = document.createElement("a");
  openLink.className = "gallery-open";
  openLink.href = entry.url;
  openLink.target = "_blank";
  openLink.rel = "noopener noreferrer";
  openLink.setAttribute(
    "aria-label",
    `${entry.name} - ${entry.machineTitle || entry.machineId}`
  );

  const media = document.createElement("div");
  media.className = "gallery-media";
  if (entry.mediaType === "image") {
    const img = document.createElement("img");
    img.src = entry.url;
    img.alt = entry.name;
    img.loading = "lazy";
    img.decoding = "async";
    media.appendChild(img);
  } else {
    const doc = document.createElement("div");
    doc.className = "gallery-document-preview";
    const type = document.createElement("span");
    type.className = "gallery-document-type";
    type.textContent = textForEntry(entry);
    doc.appendChild(type);
    media.appendChild(doc);
  }

  const download = document.createElement("button");
  download.type = "button";
  download.className = "gallery-download";
  download.setAttribute(
    "aria-label",
    t("dashboard.galleryDownload", "Descargar")
  );
  download.setAttribute(
    "data-tooltip",
    t("dashboard.galleryDownload", "Descargar")
  );
  download.innerHTML = DOWNLOAD_ICON;
  download.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    download.classList.add("is-downloading");
    try {
      await downloadGalleryEntry(entry);
    } catch {
      download.classList.add("is-download-error");
      window.setTimeout(() => download.classList.remove("is-download-error"), 1200);
    } finally {
      download.classList.remove("is-downloading");
    }
  });

  const caption = document.createElement("div");
  caption.className = "gallery-caption";
  const name = document.createElement("span");
  name.className = "gallery-name";
  name.textContent = entry.name;
  const meta = document.createElement("span");
  meta.className = "gallery-meta";
  meta.textContent = [
    entry.kindLabel,
    entry.machineTitle || entry.machineId
  ].filter(Boolean).join(" · ");
  caption.appendChild(name);
  caption.appendChild(meta);

  openLink.appendChild(media);
  mediaShell.appendChild(openLink);
  mediaShell.appendChild(download);
  item.appendChild(mediaShell);
  item.appendChild(caption);
  return item;
};

export const renderGalleryView = (container, machines = [], options = {}) => {
  const allEntries = buildGalleryEntries(machines);
  const entries = filterGalleryEntries(allEntries, options.query || "");
  container.className = "gallery-view";
  container.innerHTML = "";

  const wrap = document.createElement("section");
  wrap.className = "gallery-wrap";
  setGallerySize(wrap, currentSizeIndex);

  const header = document.createElement("div");
  header.className = "gallery-header";
  const title = document.createElement("h3");
  title.textContent = t("dashboard.galleryTitle", "Galer\u00eda");
  const count = document.createElement("p");
  count.className = "gallery-count";
  count.textContent = t(
    "dashboard.galleryCount",
    (visible, total) => `${visible}/${total}`
  )(entries.length, allEntries.length);
  header.appendChild(title);
  header.appendChild(count);

  const toolbar = document.createElement("div");
  toolbar.className = "gallery-toolbar";
  toolbar.appendChild(createSizeControl(wrap));

  wrap.appendChild(toolbar);
  wrap.appendChild(header);

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "gallery-empty";
    empty.textContent = (options.query || "").trim()
      ? t("dashboard.galleryNoResults", "No hay documentos para esa b\u00fasqueda.")
      : t("dashboard.galleryEmpty", "No hay documentos subidos.");
    wrap.appendChild(empty);
    container.appendChild(wrap);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "gallery-grid";
  entries.forEach((entry) => grid.appendChild(createGalleryItem(entry)));
  wrap.appendChild(grid);
  container.appendChild(wrap);
};
