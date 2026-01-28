export const render = (container, machine, hooks, options = {}) => {
  const tagStatusData = options.tagStatus || {};
  const canEditConfig = options.canEditConfig !== false;

  const tagRow = document.createElement("div");
  tagRow.className = "mc-config-row";

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
      accessRow.style.display = "none";
    }
  });

  const tagControls = document.createElement("div");
  tagControls.className = "mc-config-controls";
  tagControls.appendChild(tagInput);
  tagControls.appendChild(tagBtn);

  tagRow.appendChild(tagLabel);
  tagRow.appendChild(tagControls);

  const tagStatus = document.createElement("div");
  tagStatus.className = "mc-tag-status";
  if (tagStatusData.text) {
    tagStatus.textContent = tagStatusData.text;
    tagStatus.dataset.state = tagStatusData.state || "";
  } else if (machine.tagId) {
    tagStatus.textContent = "Tag enlazado";
    tagStatus.dataset.state = "ok";
  }

  const accessRow = document.createElement("div");
  accessRow.className = "mc-config-row";
  accessRow.style.display = machine.tagId ? "" : "none";

  const accessLabel = document.createElement("span");
  accessLabel.className = "mc-config-label";
  accessLabel.textContent = "URL de acceso";

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
  accessCopy.textContent = "Copiar";
  accessCopy.addEventListener("click", (event) => {
    event.stopPropagation();
    if (hooks.onCopyTagUrl) hooks.onCopyTagUrl(machine.id, accessCopy, accessInput);
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
    accessCopy.disabled = true;
  }

  container.appendChild(tagRow);
  container.appendChild(tagStatus);
  container.appendChild(accessRow);
};
