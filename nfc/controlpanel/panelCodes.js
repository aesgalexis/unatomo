export const createCodesRenderer = ({ text }) => {
  const renderCodes = (body, items, handlers = {}) => {
    body.innerHTML = "";
    const note = document.createElement("p");
    note.className = "controlpanel-note";
    note.textContent = text.codesHint;
    body.appendChild(note);

    const actions = document.createElement("div");
    actions.className = "controlpanel-actions";

    const codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.className = "controlpanel-input";
    codeInput.placeholder = text.codePlaceholder;
    codeInput.maxLength = 32;
    codeInput.autocomplete = "off";
    codeInput.spellcheck = false;

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "controlpanel-btn";
    addBtn.textContent = text.addCode;
    addBtn.addEventListener("click", () => {
      if (handlers.onAddCode) handlers.onAddCode(codeInput.value || "");
    });

    const cleanupBtn = document.createElement("button");
    cleanupBtn.type = "button";
    cleanupBtn.className = "controlpanel-btn";
    cleanupBtn.textContent = text.cleanupLegacyCodes;
    cleanupBtn.addEventListener("click", () => {
      if (handlers.onCleanupLegacyLinks) handlers.onCleanupLegacyLinks();
    });

    codeInput.addEventListener("input", () => {
      codeInput.value = codeInput.value.toUpperCase().replace(/\s+/g, "");
    });
    codeInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      if (handlers.onAddCode) handlers.onAddCode(codeInput.value || "");
    });

    actions.appendChild(codeInput);
    actions.appendChild(addBtn);
    actions.appendChild(cleanupBtn);
    body.appendChild(actions);

    const status = document.createElement("p");
    status.className = "controlpanel-state";
    status.hidden = true;
    body.appendChild(status);

    const setStatus = (message = "", state = "") => {
      status.hidden = !message;
      status.textContent = message;
      if (state) status.dataset.state = state;
      else status.removeAttribute("data-state");
    };

    if (handlers.setStatusRef) {
      handlers.setStatusRef(setStatus, addBtn, codeInput, cleanupBtn);
    }

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "controlpanel-state";
      empty.textContent = text.codesEmpty;
      body.appendChild(empty);
      return;
    }

    const list = document.createElement("ul");
    list.className = "controlpanel-list";
    items.forEach((item) => {
      const row = document.createElement("li");
      row.className = "controlpanel-user controlpanel-user--action";

      const code = document.createElement("div");
      code.className = "controlpanel-user-name";
      code.textContent = item.code || "-";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "controlpanel-link-danger";
      remove.textContent = text.deleteCode;
      remove.addEventListener("click", () => {
        if (handlers.onDeleteCode) handlers.onDeleteCode(item.code || "");
      });

      row.appendChild(code);
      row.appendChild(remove);
      list.appendChild(row);
    });
    body.appendChild(list);
  };

  return { renderCodes };
};
