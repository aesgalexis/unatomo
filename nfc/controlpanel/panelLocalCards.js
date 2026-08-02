import {
  isSuperadminLanguageToggleVisible,
  setSuperadminLanguageToggleVisible
} from "/static/js/site/superadmin-preferences.js";

const WHATS_NEW_LOCAL_KEY = "unatomo_whats_new_codex_enabled_v1";
const AGENT_ROLE_LOCAL_KEY = "unatomo_codex_agent_role_v1";
const REPO_LOCAL_ROOT = "C:\\proyectos\\unatomo";
const REPO_LOCAL_ROOT_URI = "C:/proyectos/unatomo";

export const createLocalCardsRenderer = ({ text }) => {
  const getLocalWhatsNewFlag = (fallback) => {
    try {
      const raw = localStorage.getItem(WHATS_NEW_LOCAL_KEY);
      if (raw === "true") return true;
      if (raw === "false") return false;
    } catch {
      // ignore storage failures
    }
    return fallback;
  };

  const renderWhatsNewControl = (body, flags = {}) => {
    body.innerHTML = "";
    const note = document.createElement("p");
    note.className = "controlpanel-note";
    note.textContent = text.whatsNewHint;
    body.appendChild(note);

    const enabled = getLocalWhatsNewFlag(flags.whatsNewUpdates !== false);
    const status = document.createElement("p");
    status.className = "controlpanel-state";
    status.dataset.state = enabled ? "ok" : "error";
    status.textContent = enabled ? text.whatsNewEnabled : text.whatsNewDisabled;
    body.appendChild(status);

    const source = document.createElement("p");
    source.className = "controlpanel-note";
    source.textContent = text.whatsNewSource;
    body.appendChild(source);

    const pending = document.createElement("p");
    pending.className = "controlpanel-note controlpanel-note-superadmin";
    pending.textContent = text.whatsNewPending;
    body.appendChild(pending);

    const actions = document.createElement("div");
    actions.className = "controlpanel-actions";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "controlpanel-btn";
    toggle.textContent = enabled ? text.whatsNewDisable : text.whatsNewEnable;
    toggle.disabled = true;
    actions.appendChild(toggle);
    body.appendChild(actions);
  };

  const renderSuperadminPreferences = (body) => {
    body.innerHTML = "";

    const note = document.createElement("p");
    note.className = "controlpanel-note";
    note.textContent = text.preferencesHint;
    body.appendChild(note);

    const row = document.createElement("div");
    row.className = "controlpanel-preference-row";

    const label = document.createElement("span");
    label.className = "controlpanel-preference-label";
    label.textContent = text.languageToggleLabel;

    const control = document.createElement("div");
    control.className = "controlpanel-preference-control";
    const status = document.createElement("span");
    status.className = "controlpanel-preference-status";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "controlpanel-preference-switch";
    toggle.setAttribute("role", "switch");
    toggle.setAttribute("aria-label", text.languageToggleLabel);
    toggle.innerHTML = '<span class="controlpanel-preference-switch-knob"></span>';

    const sync = (visible) => {
      toggle.dataset.enabled = visible ? "true" : "false";
      toggle.setAttribute("aria-checked", visible ? "true" : "false");
      status.textContent = visible ? text.languageToggleVisible : text.languageToggleHidden;
    };

    sync(isSuperadminLanguageToggleVisible());
    toggle.addEventListener("click", () => {
      const visible = toggle.getAttribute("aria-checked") !== "true";
      setSuperadminLanguageToggleVisible(visible);
      sync(visible);
    });

    control.appendChild(status);
    control.appendChild(toggle);
    row.appendChild(label);
    row.appendChild(control);
    body.appendChild(row);
  };

  const getLocalMdPath = (relativePath) =>
    `${REPO_LOCAL_ROOT}\\${relativePath.replace(/\//g, "\\")}`;

  const getVsCodeMdUri = (relativePath) =>
    `vscode://file/${encodeURI(`${REPO_LOCAL_ROOT_URI}/${relativePath}`)}`;

  const copyText = async (value) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    if (!copied) throw new Error("copy-failed");
  };

  const renderAgentDocuments = (body) => {
    const section = document.createElement("section");
    section.className = "controlpanel-agent-docs";

    const title = document.createElement("h3");
    title.className = "controlpanel-agent-docs-title";
    title.textContent = text.agentDocsTitle;

    const hint = document.createElement("p");
    hint.className = "controlpanel-note";
    hint.textContent = text.agentDocsHint;

    const status = document.createElement("p");
    status.className = "controlpanel-state controlpanel-agent-docs-status";
    status.hidden = true;

    const list = document.createElement("ul");
    list.className = "controlpanel-agent-docs-list";

    text.agentDocuments.forEach((doc) => {
      const item = document.createElement("li");
      item.className = "controlpanel-agent-doc";

      const copy = document.createElement("div");
      copy.className = "controlpanel-agent-doc-copy";

      const name = document.createElement("strong");
      name.textContent = doc.title;

      const description = document.createElement("span");
      description.textContent = doc.description;

      const path = document.createElement("code");
      path.textContent = doc.path;

      copy.appendChild(name);
      copy.appendChild(description);
      copy.appendChild(path);

      const actions = document.createElement("div");
      actions.className = "controlpanel-agent-doc-actions";

      const open = document.createElement("a");
      open.className = "controlpanel-btn controlpanel-agent-doc-open";
      open.href = getVsCodeMdUri(doc.path);
      open.textContent = text.agentDocOpen;

      const copyPath = document.createElement("button");
      copyPath.type = "button";
      copyPath.className = "controlpanel-btn";
      copyPath.textContent = text.agentDocCopy;
      copyPath.addEventListener("click", async () => {
        try {
          await copyText(getLocalMdPath(doc.path));
          status.hidden = false;
          status.textContent = text.agentDocCopied;
          status.dataset.state = "ok";
        } catch {
          status.hidden = false;
          status.textContent = text.agentDocCopyError;
          status.dataset.state = "error";
        }
      });

      actions.appendChild(open);
      actions.appendChild(copyPath);
      item.appendChild(copy);
      item.appendChild(actions);
      list.appendChild(item);
    });

    section.appendChild(title);
    section.appendChild(hint);
    section.appendChild(list);
    section.appendChild(status);
    body.appendChild(section);
  };

  const renderAgentCard = (body) => {
    body.innerHTML = "";

    const note = document.createElement("p");
    note.className = "controlpanel-note";
    note.textContent = text.agentCardHint;
    body.appendChild(note);

    const badge = document.createElement("p");
    badge.className = "controlpanel-note controlpanel-note-superadmin";
    badge.textContent = text.agentCardLocalOnly;
    body.appendChild(badge);

    const selectedRole = (() => {
      try {
        return localStorage.getItem(AGENT_ROLE_LOCAL_KEY) || "";
      } catch {
        return "";
      }
    })();
    const roleOptions = text.agentRoleOptions;
    const currentRole = roleOptions.some((option) => option.value === selectedRole)
      ? selectedRole
      : roleOptions[0].value;

    const roleRow = document.createElement("div");
    roleRow.className = "controlpanel-agent-role";

    const roleLabel = document.createElement("label");
    roleLabel.className = "controlpanel-agent-role-label";
    roleLabel.htmlFor = "controlpanel-agent-role";
    roleLabel.textContent = text.agentRoleLabel;

    const roleSelect = document.createElement("select");
    roleSelect.id = "controlpanel-agent-role";
    roleSelect.className = "controlpanel-input controlpanel-agent-role-select";
    roleOptions.forEach((option) => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      item.selected = option.value === currentRole;
      roleSelect.appendChild(item);
    });
    roleSelect.addEventListener("change", () => {
      try {
        localStorage.setItem(AGENT_ROLE_LOCAL_KEY, roleSelect.value);
      } catch {
        // local preference only; ignore storage failures
      }
    });

    roleRow.appendChild(roleLabel);
    roleRow.appendChild(roleSelect);
    body.appendChild(roleRow);

    const details = document.createElement("dl");
    details.className = "controlpanel-agent-card";
    Object.entries(text.agentCardFields).forEach(([key, label]) => {
      const row = document.createElement("div");
      row.className = "controlpanel-agent-row";

      const term = document.createElement("dt");
      term.textContent = label;

      const value = document.createElement("dd");
      value.textContent = text.agentCardValues[key] || "-";

      row.appendChild(term);
      row.appendChild(value);
      details.appendChild(row);
    });
    body.appendChild(details);
    renderAgentDocuments(body);
  };

  return {
    renderWhatsNewControl,
    renderSuperadminPreferences,
    renderAgentCard
  };
};
