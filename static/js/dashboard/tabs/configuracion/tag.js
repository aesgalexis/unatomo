import { t } from "../../i18n.js";
import { buildMachineTagUrl } from "../../tags/tagAssetsRepo.js";

export const render = (container, machine, hooks, options = {}) => {
  const tagStatusData = options.tagStatus || {};
  const canEditConfig = options.canEditConfig !== false;
  const tagUrl = machine.tagUrl || buildMachineTagUrl(machine.tagId);

  const tagRow = document.createElement("div");
  tagRow.className = "mc-config-row mc-config-row-tag";

  const tagLabel = document.createElement("span");
  tagLabel.className = "mc-config-label";
  tagLabel.textContent = t("config.tagId", "Tag ID");

  const tagInput = document.createElement("input");
  tagInput.className = "mc-tag-input";
  tagInput.type = "text";
  tagInput.placeholder = t("config.tagExample", "Ej: TAG_TEST_001");
  tagInput.value = machine.tagId || "";
  tagInput.addEventListener("click", (event) => event.stopPropagation());

  const tagBtn = document.createElement("button");
  tagBtn.type = "button";
  tagBtn.className = "mc-tag-connect";
  tagBtn.textContent = machine.tagId
    ? t("config.disconnect", "Desconectar")
    : t("config.connect", "Conectar");
  tagBtn.disabled = !tagInput.value.trim() && !machine.tagId;
  tagBtn.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (machine.tagId) {
      if (hooks.onDisconnectTag) {
        await hooks.onDisconnectTag(machine.id, tagInput, tagStatus);
      }
      return;
    }
    if (hooks.onConnectTag) hooks.onConnectTag(machine.id, tagInput, tagStatus);
  });

  tagInput.addEventListener("input", (event) => {
    event.stopPropagation();
    const hasValue = !!tagInput.value.trim();
    tagBtn.disabled = !hasValue;
    if (!hasValue) {
      tagStatus.textContent = "";
      tagStatus.dataset.state = "";
      if (hooks.onContentResize) hooks.onContentResize();
    }
  });

  const tagControls = document.createElement("div");
  tagControls.className = "mc-config-controls";

  tagRow.appendChild(tagLabel);
  tagRow.appendChild(tagControls);

  const tagStatus = document.createElement("div");
  tagStatus.className = "mc-tag-status";
  if (tagStatusData.text) {
    tagStatus.textContent = tagStatusData.text;
    tagStatus.dataset.state = tagStatusData.state || "";
    if (hooks.onContentResize) hooks.onContentResize();
  } else if (machine.tagId) {
    tagStatus.textContent = t("config.tagLinked", "Tag enlazado");
    tagStatus.dataset.state = "ok";
    if (hooks.onContentResize) hooks.onContentResize();
  }

  const accessRow = document.createElement("div");
  accessRow.className = "mc-config-row mc-config-row-url";

  const accessLabel = document.createElement("span");
  accessLabel.className = "mc-config-label";
  accessLabel.textContent = t("config.url", "URL");

  const accessInput = document.createElement("input");
  accessInput.className = "mc-url-input";
  accessInput.type = "text";
  accessInput.readOnly = true;
  accessInput.value = tagUrl;
  accessInput.addEventListener("click", (event) => event.stopPropagation());

  const accessCopy = document.createElement("button");
  accessCopy.type = "button";
  accessCopy.className = "mc-url-copy";
  accessCopy.setAttribute("title", t("config.copy", "Copiar"));
  accessCopy.setAttribute("aria-label", t("config.copy", "Copiar"));
  accessCopy.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
    '<rect x="9" y="9" width="11" height="11" rx="2" fill="none" ' +
    'stroke="currentColor" stroke-width="2"/>' +
    '<rect x="4" y="4" width="11" height="11" rx="2" fill="none" ' +
    'stroke="currentColor" stroke-width="2"/></svg>';
  accessCopy.addEventListener("click", (event) => {
    event.stopPropagation();
    if (hooks.onCopyTagUrl) hooks.onCopyTagUrl(machine.id, accessCopy, accessInput);
  });

  const accessGenerate = document.createElement("button");
  accessGenerate.type = "button";
  accessGenerate.className = "mc-tag-generate";
  accessGenerate.textContent = t("config.generate", "Generar");
  accessGenerate.disabled = !!machine.tagId;
  accessGenerate.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (machine.tagId) return;
    accessGenerate.disabled = true;
    tagStatus.textContent = t("config.generating", "Generando...");
    tagStatus.dataset.state = "neutral";
    if (hooks.onContentResize) hooks.onContentResize();
    try {
      const newTagId = await hooks.onGenerateTag(machine.id);
      tagInput.value = newTagId;
      tagBtn.disabled = false;
      accessRow.style.display = "";
      if (hooks.onConnectTag) hooks.onConnectTag(machine.id, tagInput, tagStatus);
    } catch {
      tagStatus.textContent = t("config.generateError", "Error al generar tag");
      tagStatus.dataset.state = "error";
      accessGenerate.disabled = false;
      if (hooks.onContentResize) hooks.onContentResize();
    }
  });

  const accessControls = document.createElement("div");
  accessControls.className = "mc-config-controls";
  accessControls.appendChild(accessInput);
  accessControls.appendChild(accessCopy);

  accessRow.appendChild(accessLabel);
  accessRow.appendChild(accessControls);

  const qrRow = document.createElement("div");
  qrRow.className = "mc-config-row mc-config-row-qr";

  const qrLabel = document.createElement("span");
  qrLabel.className = "mc-config-label";
  qrLabel.textContent = t("config.qr", "QR");

  const qrControls = document.createElement("div");
  qrControls.className = "mc-config-controls";

  const qrGenerate = document.createElement("button");
  qrGenerate.type = "button";
  qrGenerate.className = "mc-tag-generate";
  qrGenerate.textContent = machine.tagQrUrl
    ? t("config.regenerateQr", "Regenerar QR")
    : t("config.generateQr", "Generar QR");
  qrGenerate.disabled = !machine.tagId;
  qrGenerate.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (!machine.tagId || !hooks.onGenerateTagQr) return;
    qrGenerate.disabled = true;
    qrStatus.textContent = t("config.generatingQr", "Generando QR...");
    qrStatus.dataset.state = "neutral";
    if (hooks.onContentResize) hooks.onContentResize();
    try {
      await hooks.onGenerateTagQr(machine.id, qrStatus);
    } catch {
      qrStatus.textContent = t("config.qrGenerateError", "Error al generar QR");
      qrStatus.dataset.state = "error";
      if (hooks.onContentResize) hooks.onContentResize();
    } finally {
      qrGenerate.disabled = !machine.tagId;
    }
  });

  const qrDownload = document.createElement("a");
  qrDownload.className = "mc-qr-download";
  qrDownload.href = machine.tagQrUrl || "#";
  qrDownload.textContent = t("config.downloadQr", "Descargar QR");
  qrDownload.hidden = !machine.tagQrUrl;
  qrDownload.target = "_blank";
  qrDownload.rel = "noreferrer";
  const qrExt = (machine.tagQrPath || "").toLowerCase().endsWith(".svg") ? "svg" : "png";
  qrDownload.download = machine.tagId ? `${machine.tagId}.${qrExt}` : `tag-qr.${qrExt}`;
  qrDownload.addEventListener("click", (event) => event.stopPropagation());

  qrControls.appendChild(qrGenerate);
  qrControls.appendChild(qrDownload);
  qrRow.appendChild(qrLabel);
  qrRow.appendChild(qrControls);

  const qrStatus = document.createElement("div");
  qrStatus.className = "mc-tag-status";

  if (!canEditConfig || options.disableConfigActions) {
    tagInput.readOnly = true;
    tagBtn.disabled = true;
    accessGenerate.disabled = true;
    accessCopy.disabled = true;
    qrGenerate.disabled = true;
  } else if (!machine.tagId) {
    accessCopy.disabled = true;
  }

  tagControls.appendChild(accessGenerate);
  tagControls.appendChild(tagInput);
  tagControls.appendChild(tagBtn);

  container.appendChild(tagRow);
  container.appendChild(tagStatus);
  container.appendChild(accessRow);
  container.appendChild(qrRow);
  container.appendChild(qrStatus);
};
