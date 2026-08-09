import { t } from "/static/js/dashboard/i18n.js";
import { machineLabel } from "./machineTasksData.js";

const COMMAND_FREQUENCIES = [
  ["puntual", "oneOff", "Tarea puntual"],
  ["diaria", "daily", "Diaria"],
  ["semanal", "weekly", "Semanal"],
  ["mensual", "monthly", "Mensual"],
  ["trimestral", "quarterly", "Trimestral"],
  ["semestral", "semiannual", "Semestral"],
  ["anual", "annual", "Anual"],
  ["custom", "custom", "Personalizada"]
];

const normalizeCommandText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const getCommandAssignableUsers = (machine = {}) => {
  const safeMachine = machine && typeof machine === "object" ? machine : {};
  const users = Array.isArray(safeMachine.assignableUsers)
    ? safeMachine.assignableUsers
    : Array.isArray(safeMachine.users) ? safeMachine.users : [];
  const seen = new Set();
  return users
    .filter((user) => ["operator", "technician", "usuario", "tecnico"]
      .includes(String(user?.role || "").toLowerCase()))
    .map((user) => ({
      userId: String(user.userId || user.id || ""),
      username: String(user.username || "").trim(),
      role: ["technician", "tecnico"].includes(user.role) ? "technician" : "operator"
    }))
    .filter((user) => {
      const key = user.userId || normalizeCommandText(user.username);
      if (!key || !user.username || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => left.username.localeCompare(right.username, undefined, { sensitivity: "base" }));
};

export const renderMachineTaskComposer = (
  root,
  machines,
  onCreate,
  fieldsOpen = false,
  onClose = null,
  options = {}
) => {
  const modal = options.modal === true;
  const sortedMachines = machines.slice().sort((left, right) =>
    machineLabel(left).localeCompare(machineLabel(right), undefined, { sensitivity: "base" })
  );
  const form = document.createElement("form");
  form.className = modal
    ? "status-incident-form machine-task-create-form machine-task-command-form machine-task-modal-form"
    : "machine-task-create-form machine-task-command-form";
  form.hidden = !fieldsOpen;
  const heading = document.createElement("strong");
  heading.className = "machine-task-create-title";
  heading.textContent = t("dashboard.todoNewTask", "Nueva tarea");
  const fields = document.createElement("div");
  fields.className = "machine-task-create-fields";
  const createControl = (tag, placeholder = "") => {
    const element = document.createElement(tag);
    element.className = "machine-task-create-control";
    if (tag === "input") element.type = "text";
    if (placeholder) element.placeholder = placeholder;
    return element;
  };
  const addPlaceholder = (select, label) => {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = label;
    select.appendChild(option);
  };

  const machineSelect = createControl("select");
  addPlaceholder(machineSelect, t("dashboard.machine", "Equipo"));
  sortedMachines.forEach((machine) => {
    const option = document.createElement("option");
    option.value = machine.id;
    option.textContent = machineLabel(machine);
    machineSelect.appendChild(option);
  });
  const titleInput = createControl("input", t("tasks.taskIncidentPlaceholder", "Título"));
  titleInput.maxLength = 64;
  const descriptionInput = createControl("input", t("tasks.description", "Descripción"));
  descriptionInput.maxLength = 1024;
  const frequencySelect = createControl("select");
  addPlaceholder(frequencySelect, t("tasks.frequency", "Frecuencia"));
  COMMAND_FREQUENCIES.forEach(([value, key, fallback]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = t(`tasks.${key}`, fallback);
    frequencySelect.appendChild(option);
  });
  const assigneeSelect = createControl("select");
  const customAmount = createControl("input");
  customAmount.type = "number";
  customAmount.min = "1";
  customAmount.max = "999";
  customAmount.value = "1";
  customAmount.hidden = true;
  const customUnit = createControl("select");
  const commandUnits = [
    ["hours", "hours", "horas"],
    ["days", "days", "días"],
    ["weeks", "weeks", "semanas"],
    ["months", "months", "meses"]
  ];
  commandUnits.forEach(([value, key, fallback]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = t(`tasks.${key}`, fallback);
    customUnit.appendChild(option);
  });
  customUnit.value = "days";
  customUnit.hidden = true;
  fields.append(
    machineSelect,
    titleInput,
    descriptionInput,
    frequencySelect,
    assigneeSelect,
    customAmount,
    customUnit
  );

  const composer = document.createElement("div");
  composer.className = "todo-composer machine-task-command-composer";
  const editor = document.createElement("div");
  editor.className = "todo-input machine-task-command-editor";
  editor.contentEditable = "true";
  editor.setAttribute("role", "textbox");
  editor.setAttribute("aria-multiline", "true");
  editor.dataset.placeholder = t(
    "dashboard.todoCommandPlaceholder",
    "#Equipo, Título, Descripción, Frecuencia, @Asignación"
  );
  const suggestions = document.createElement("div");
  suggestions.className = "machine-task-command-suggestions";
  suggestions.hidden = true;
  suggestions.setAttribute("role", "listbox");
  composer.append(editor, suggestions);

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = modal
    ? "status-incident-confirm machine-task-create-submit"
    : "dashboard-users-primary todo-submit machine-task-create-submit";
  submit.textContent = t("tasks.create", "Crear");
  const actions = document.createElement("div");
  actions.className = modal
    ? "status-incident-actions machine-task-create-actions"
    : "dashboard-users-create-actions machine-task-create-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = modal
    ? "status-incident-cancel machine-task-create-cancel"
    : "dashboard-users-secondary machine-task-create-cancel";
  cancel.textContent = t("common.cancel", "Cancelar");
  cancel.addEventListener("click", () => onClose?.());
  actions.append(cancel, submit);
  if (!modal) form.appendChild(heading);
  form.append(fields, composer, actions);

  let draft = {
    machineId: "",
    title: "",
    description: "",
    frequency: "",
    customDueAmount: "1",
    customDueUnit: "days",
    assignedTo: null
  };
  let activeSuggestion = 0;
  let visibleSuggestions = [];
  let activeSuggestionRange = null;
  let showInlineSuggestion = false;

  const getMachine = (machineId = draft.machineId) =>
    sortedMachines.find((machine) => machine.id === machineId) || null;
  const fillAssignees = (selected = draft.assignedTo) => {
    assigneeSelect.replaceChildren();
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = t("tasks.assignTo", "Asignar");
    assigneeSelect.appendChild(empty);
    getCommandAssignableUsers(getMachine()).forEach((user) => {
      const option = document.createElement("option");
      option.value = user.userId || `username:${normalizeCommandText(user.username)}`;
      option.textContent = user.username;
      option.dataset.userId = user.userId;
      option.dataset.username = user.username;
      option.dataset.role = user.role;
      assigneeSelect.appendChild(option);
    });
    const key = selected?.userId || (selected?.username
      ? `username:${normalizeCommandText(selected.username)}` : "");
    assigneeSelect.value = key;
    if (!assigneeSelect.value) assigneeSelect.value = "";
  };
  const readAssignee = () => {
    const option = assigneeSelect.selectedOptions[0];
    if (!option?.value) return null;
    return {
      userId: option.dataset.userId || "",
      username: option.dataset.username || option.textContent || "",
      role: option.dataset.role || "operator"
    };
  };
  const frequencyToken = () => {
    if (!draft.frequency) return "";
    if (draft.frequency !== "custom") return `/${draft.frequency}`;
    const unitLabel = commandUnits.find(([value]) => value === draft.customDueUnit)?.[2] || "días";
    return `/cada ${draft.customDueAmount || 1} ${unitLabel}`;
  };
  const setCaretAtEnd = () => {
    const selection = window.getSelection?.();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };
  const renderEditor = (focus = false) => {
    const fields = [
      draft.title,
      draft.description,
      frequencyToken(),
      draft.assignedTo?.username ? `@${draft.assignedTo.username}` : ""
    ].filter(Boolean);
    const machine = getMachine();
    const command = `${machine ? `#${machineLabel(machine)}, ` : ""}${fields.join(", ")}`;
    if (editor.textContent !== command) editor.textContent = command;
    if (focus) {
      editor.focus();
      setCaretAtEnd();
    }
  };
  const validate = () => {
    const customValid = draft.frequency !== "custom" || Number(draft.customDueAmount) >= 1;
    submit.disabled = !(draft.machineId && draft.title.trim() && customValid);
  };
  const syncFieldsFromDraft = () => {
    machineSelect.value = draft.machineId;
    titleInput.value = draft.title;
    descriptionInput.value = draft.description;
    frequencySelect.value = draft.frequency;
    customAmount.value = draft.customDueAmount || "1";
    customUnit.value = draft.customDueUnit || "days";
    const custom = draft.frequency === "custom";
    customAmount.hidden = !custom;
    customUnit.hidden = !custom;
    fillAssignees(draft.assignedTo);
    validate();
  };
  const removeOnce = (source, fragment) => {
    if (!fragment) return source;
    const index = source.toLowerCase().indexOf(fragment.toLowerCase());
    return index < 0 ? source : `${source.slice(0, index)} ${source.slice(index + fragment.length)}`;
  };
  const parseEditor = () => {
    const text = String(editor.textContent || "").trim();
    let remainder = text;
    const machine = sortedMachines
      .slice()
      .sort((a, b) => machineLabel(b).length - machineLabel(a).length)
      .find((item) => normalizeCommandText(text).includes(normalizeCommandText(`#${machineLabel(item)}`)));
    if (machine) remainder = removeOnce(remainder, `#${machineLabel(machine)}`);
    const structuredSegments = /^\s*,/.test(remainder)
      ? remainder.replace(/^\s*,\s*/, "").split(",")
      : null;
    const titleMatch = remainder.match(/\*\*([^*]+)\*\*/);
    const structuredTitle = structuredSegments?.[0]?.replace(/^\*\*|\*\*$/g, "").trim() || "";
    let title = titleMatch?.[1]?.trim() || structuredTitle;
    if (titleMatch) remainder = removeOnce(remainder, titleMatch[0]);
    else {
      const plainTitleMatch = remainder.match(/^\s*,\s*([^,\/@]+?)(?=\s*(?:,|\/|@|$))/);
      if (plainTitleMatch) {
        title = plainTitleMatch[1].trim();
        remainder = remainder.slice(plainTitleMatch[0].length).replace(/^\s*,\s*/, "");
      }
    }
    let frequency = "";
    let customDueAmount = "1";
    let customDueUnit = "days";
    const customMatch = remainder.match(/\/cada\s+(\d{1,3})\s+(horas?|d[ií]as?|semanas?|meses?)/i);
    if (customMatch) {
      frequency = "custom";
      customDueAmount = customMatch[1];
      const normalizedUnit = normalizeCommandText(customMatch[2]);
      customDueUnit = normalizedUnit.startsWith("hora") ? "hours"
        : normalizedUnit.startsWith("semana") ? "weeks"
          : normalizedUnit.startsWith("mes") ? "months" : "days";
      remainder = removeOnce(remainder, customMatch[0]);
    } else {
      const frequencyMatch = remainder.match(/\/(puntual|diaria|semanal|mensual|trimestral|semestral|anual)\b/i);
      if (frequencyMatch) {
        frequency = frequencyMatch[1].toLowerCase();
        remainder = removeOnce(remainder, frequencyMatch[0]);
      }
    }
    const users = getCommandAssignableUsers(machine || getMachine());
    const assigned = users
      .slice()
      .sort((a, b) => b.username.length - a.username.length)
      .find((user) => normalizeCommandText(text).includes(normalizeCommandText(`@${user.username}`))) || null;
    if (assigned) remainder = removeOnce(remainder, `@${assigned.username}`);
    draft = {
      machineId: machine?.id || "",
      title,
      description: structuredSegments && structuredSegments.length > 1
        ? structuredSegments[1].replace(/\s+/g, " ").trim()
        : remainder.replace(/\s+/g, " ").trim(),
      frequency,
      customDueAmount,
      customDueUnit,
      assignedTo: assigned
    };
    syncFieldsFromDraft();
  };
  const syncDraftFromFields = () => {
    draft = {
      machineId: machineSelect.value,
      title: titleInput.value.trim().slice(0, 64),
      description: descriptionInput.value.trim().slice(0, 1024),
      frequency: frequencySelect.value,
      customDueAmount: customAmount.value || "1",
      customDueUnit: customUnit.value || "days",
      assignedTo: readAssignee()
    };
    renderEditor();
    validate();
  };
  const getCaretOffset = () => {
    const selection = window.getSelection?.();
    if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) {
      return String(editor.textContent || "").length;
    }
    const range = selection.getRangeAt(0).cloneRange();
    range.selectNodeContents(editor);
    range.setEnd(selection.anchorNode, selection.anchorOffset);
    return range.toString().length;
  };
  const setCaretOffset = (offset) => {
    const selection = window.getSelection?.();
    if (!selection) return;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let remaining = Math.max(0, offset);
    let node = walker.nextNode();
    while (node) {
      if (remaining <= node.textContent.length) {
        const range = document.createRange();
        range.setStart(node, remaining);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      remaining -= node.textContent.length;
      node = walker.nextNode();
    }
    setCaretAtEnd();
  };
  const normalizeEditorSeparators = (preserveCaret = true) => {
    const text = String(editor.textContent || "");
    const caret = preserveCaret ? getCaretOffset() : 0;
    const normalized = text.replace(/\s*,\s*/g, ", ");
    if (normalized === text) return;
    editor.textContent = normalized;
    if (preserveCaret) {
      setCaretOffset(text.slice(0, caret).replace(/\s*,\s*/g, ", ").length);
    }
  };
  const closeSuggestions = () => {
    suggestions.hidden = true;
    suggestions.replaceChildren();
    visibleSuggestions = [];
    activeSuggestion = 0;
    activeSuggestionRange = null;
    showInlineSuggestion = false;
    delete editor.dataset.inlineSuggestion;
  };
  const showStageHint = (label) => {
    closeSuggestions();
    if (label) editor.dataset.inlineSuggestion = ` ${label}`;
  };
  const replaceActiveCommand = (replacement) => {
    const text = String(editor.textContent || "");
    const caret = getCaretOffset();
    const before = text.slice(0, caret);
    const match = before.match(/(^|\s)([#/@])([^\s,]*)$/);
    const range = activeSuggestionRange || (match ? {
      start: caret - match[0].length + (match[1] ? 1 : 0),
      end: caret
    } : null);
    if (!range) return;
    editor.textContent = `${text.slice(0, range.start)}${replacement} ${text.slice(range.end)}`;
    parseEditor();
    renderEditor(true);
    closeSuggestions();
    refreshSuggestions();
  };
  const refreshSuggestions = () => {
    const text = String(editor.textContent || "");
    const caret = getCaretOffset();
    const before = text.slice(0, caret);
    const match = before.match(/(^|\s)([#/@])([^\s,]*)$/);
    activeSuggestionRange = null;
    showInlineSuggestion = false;
    delete editor.dataset.inlineSuggestion;
    if (match) {
      activeSuggestionRange = {
        start: caret - match[0].length + (match[1] ? 1 : 0),
        end: caret
      };
      const marker = match[2];
      const query = normalizeCommandText(match[3]);
      if (marker === "#") {
        visibleSuggestions = sortedMachines
          .filter((machine) => normalizeCommandText(machineLabel(machine)).includes(query))
          .map((machine) => ({ label: machineLabel(machine), replacement: `#${machineLabel(machine)}` }));
        if (!query) editor.dataset.inlineSuggestion = ` ${t("dashboard.machine", "Equipo")}`;
      } else if (marker === "@") {
        visibleSuggestions = getCommandAssignableUsers(getMachine())
          .filter((user) => normalizeCommandText(user.username).includes(query))
          .map((user) => ({ label: `@${user.username}`, replacement: `@${user.username}` }));
      } else {
        visibleSuggestions = COMMAND_FREQUENCIES
          .filter(([value]) => value !== "custom" && normalizeCommandText(value).includes(query))
          .map(([value, key, fallback]) => ({
            label: t(`tasks.${key}`, fallback),
            replacement: `/${value}`
          }));
        if (normalizeCommandText("cada").includes(query)) {
          visibleSuggestions.push({ label: t("tasks.custom", "Personalizada"), replacement: "/cada 1 días" });
        }
      }
    } else {
      const machine = getMachine();
      const machineToken = machine ? `#${machineLabel(machine)}` : "";
      const machineStart = machineToken
        ? normalizeCommandText(before).indexOf(normalizeCommandText(machineToken))
        : -1;
      const afterMachine = machineStart >= 0 ? before.slice(machineStart + machineToken.length) : "";
      const commaCount = (afterMachine.match(/,/g) || []).length;
      if (!/,\s*$/.test(before)) {
        closeSuggestions();
        return;
      }
      if (commaCount === 1) {
        showStageHint(t("tasks.taskIncidentPlaceholder", "Título"));
        return;
      }
      if (commaCount === 2) {
        showStageHint(t("tasks.description", "Descripción"));
        return;
      }
      if (commaCount < 3) {
        closeSuggestions();
        return;
      }
      activeSuggestionRange = { start: caret, end: caret };
      showInlineSuggestion = true;
      if (commaCount === 3) {
        visibleSuggestions = COMMAND_FREQUENCIES.map(([value, key, fallback]) => ({
          label: t(`tasks.${key}`, fallback),
          replacement: value === "custom" ? "/cada 1 días" : `/${value}`
        }));
      } else {
        visibleSuggestions = getCommandAssignableUsers(machine)
          .map((user) => ({ label: `@${user.username}`, replacement: `@${user.username}` }));
      }
    }
    if (showInlineSuggestion && visibleSuggestions.length) {
      editor.dataset.inlineSuggestion = ` ${visibleSuggestions[activeSuggestion]?.label || visibleSuggestions[0].label}`;
    }
    suggestions.replaceChildren();
    activeSuggestion = Math.min(activeSuggestion, Math.max(0, visibleSuggestions.length - 1));
    visibleSuggestions.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "machine-task-command-suggestion";
      button.classList.toggle("is-active", index === activeSuggestion);
      button.textContent = item.label;
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => replaceActiveCommand(item.replacement));
      suggestions.appendChild(button);
    });
    suggestions.hidden = !visibleSuggestions.length;
  };
  const refreshActiveSuggestion = () => {
    suggestions.querySelectorAll(".machine-task-command-suggestion").forEach((button, index) => {
      button.classList.toggle("is-active", index === activeSuggestion);
    });
    if (showInlineSuggestion && visibleSuggestions.length) {
      editor.dataset.inlineSuggestion = ` ${visibleSuggestions[activeSuggestion].label}`;
    }
  };

  machineSelect.addEventListener("change", () => {
    draft.machineId = machineSelect.value;
    draft.assignedTo = null;
    fillAssignees();
    syncDraftFromFields();
  });
  [titleInput, descriptionInput].forEach((input) => input.addEventListener("input", syncDraftFromFields));
  frequencySelect.addEventListener("change", () => {
    const custom = frequencySelect.value === "custom";
    customAmount.hidden = !custom;
    customUnit.hidden = !custom;
    syncDraftFromFields();
  });
  customAmount.addEventListener("input", syncDraftFromFields);
  customUnit.addEventListener("change", syncDraftFromFields);
  assigneeSelect.addEventListener("change", syncDraftFromFields);
  editor.addEventListener("input", (event) => {
    if (!event.inputType || event.inputType.startsWith("insert")) normalizeEditorSeparators();
    parseEditor();
    refreshSuggestions();
  });
  editor.addEventListener("keydown", (event) => {
    if (!suggestions.hidden && visibleSuggestions.length) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        activeSuggestion = (activeSuggestion + direction + visibleSuggestions.length) % visibleSuggestions.length;
        refreshActiveSuggestion();
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        replaceActiveCommand(visibleSuggestions[activeSuggestion].replacement);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeSuggestions();
        return;
      }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  editor.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (!suggestions.matches(":hover")) closeSuggestions();
      normalizeEditorSeparators(false);
      parseEditor();
      renderEditor();
    }, 120);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    parseEditor();
    validate();
    if (submit.disabled) return;
    submit.disabled = true;
    try {
      await onCreate?.({
        machineId: draft.machineId,
        title: draft.title,
        description: draft.description,
        frequency: draft.frequency || "puntual",
        customDueAmount: draft.customDueAmount,
        customDueUnit: draft.customDueUnit,
        assignedTo: draft.assignedTo
      });
      draft = {
        machineId: "",
        title: "",
        description: "",
        frequency: "",
        customDueAmount: "1",
        customDueUnit: "days",
        assignedTo: null
      };
      syncFieldsFromDraft();
      renderEditor(true);
    } finally {
      validate();
    }
  });
  fillAssignees();
  renderEditor();
  validate();
  root.appendChild(form);
};
