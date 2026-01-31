export const render = (container, machine, hooks, options = {}) => {
  const tagStatusData = options.tagStatus || {};
  const canEditConfig = options.canEditConfig !== false;

  const tagRow = document.createElement("div");
  tagRow.className = "mc-config-row mc-config-row-tag";

  const tagLabel = document.createElement("span");
  tagLabel.className = "mc-config-label";
  tagLabel.textContent = "Tag ID";

  const tagInput = document.createElement("input");
  tagInput.className = "mc-tag-input";
  tagInput.type = "text";
  tagInput.placeholder = "Ej: TAG_TEST_001";
  tagInput.value = machine.tagId || "";
  tagInput.addEventListener("click", (event) => event.stopPropagation());

  const tagBtn = document.createElement("button");
  tagBtn.type = "button";
  tagBtn.className = "mc-tag-connect";
  tagBtn.textContent = machine.tagId ? "Desconectar" : "Conectar";
  tagBtn.disabled = !tagInput.value.trim() && !machine.tagId;
  tagBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (machine.tagId) {
      if (hooks.onDisconnectTag) hooks.onDisconnectTag(machine.id, tagInput, tagStatus);
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
    tagStatus.textContent = "Tag enlazado";
    tagStatus.dataset.state = "ok";
    if (hooks.onContentResize) hooks.onContentResize();
  }

  const accessRow = document.createElement("div");
  accessRow.className = "mc-config-row mc-config-row-url";

  const accessLabel = document.createElement("span");
  accessLabel.className = "mc-config-label";
  accessLabel.textContent = "URL";

  const accessInput = document.createElement("input");
  accessInput.className = "mc-url-input";
  accessInput.type = "text";
  accessInput.readOnly = true;
  accessInput.value = machine.tagId
    ? `${window.location.origin}/es/m.html?tag=${encodeURIComponent(machine.tagId)}`
    : "";
  accessInput.addEventListener("click", (event) => event.stopPropagation());

  const accessCopy = document.createElement("button");
  accessCopy.type = "button";
  accessCopy.className = "mc-url-copy";
  accessCopy.setAttribute("title", "Copiar");
  accessCopy.setAttribute("aria-label", "Copiar");
  accessCopy.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4" y="4" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  accessCopy.addEventListener("click", (event) => {
    event.stopPropagation();
    if (hooks.onCopyTagUrl) hooks.onCopyTagUrl(machine.id, accessCopy, accessInput);
  });

  const accessGenerate = document.createElement("button");
  accessGenerate.type = "button";
  accessGenerate.className = "mc-tag-generate";
  accessGenerate.textContent = "Generar";
  accessGenerate.disabled = !!machine.tagId;
  accessGenerate.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (machine.tagId) return;
    accessGenerate.disabled = true;
    tagStatus.textContent = "Generando...";
    tagStatus.dataset.state = "neutral";
    if (hooks.onContentResize) hooks.onContentResize();
    try {
      const newTagId = await hooks.onGenerateTag(machine.id);
      tagInput.value = newTagId;
      tagBtn.disabled = false;
      accessRow.style.display = "";
      if (hooks.onConnectTag) hooks.onConnectTag(machine.id, tagInput, tagStatus);
    } catch {
      tagStatus.textContent = "Error al generar tag";
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

  if (!canEditConfig || options.disableConfigActions) {
    tagInput.readOnly = true;
    tagBtn.disabled = true;
    accessGenerate.disabled = true;
    accessCopy.disabled = true;
  } else if (!machine.tagId) {
    accessCopy.disabled = true;
  }

  tagControls.appendChild(accessGenerate);
  tagControls.appendChild(tagInput);
  tagControls.appendChild(tagBtn);

  container.appendChild(tagRow);
  container.appendChild(tagStatus);
  container.appendChild(accessRow);
};
