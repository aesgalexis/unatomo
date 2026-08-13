import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { auth, functions } from "/static/js/firebase/firebaseApp.js";
import { getCurrentLang } from "/static/js/site/locale.js";
import { setTopbarLogoLoading } from "/static/js/topbar/loading-logo.js";
import { isControlPanelUser } from "/nfc/controlpanel/access.js";
import { createControlPanelCallables } from "./panelCallables.js";
import { createCodesRenderer } from "./panelCodes.js";
import { createAccessRequestsRenderer } from "./panelAccessRequests.js";
import { createEmailTemplatesRenderer } from "./panelEmailTemplates.js";
import { createLocalCardsRenderer } from "./panelLocalCards.js";
import {
  createCard,
  renderState,
  toggleCard
} from "./panelShared.js";
import { createStatsBackupRenderer } from "./panelStatsBackup.js";
import { createSystemIntegrityRenderer } from "./panelSystemIntegrity.js";
import { createTagsRenderer } from "./panelTags.js";
import { createUsersRenderer } from "./panelUsers.js";
import { createPanelText } from "./panelText.js";

const mount = document.getElementById("controlpanel-mount");
const isEn = getCurrentLang() === "en";
const text = createPanelText(isEn);
let pendingPanelOperations = 0;
const trackPanelOperation = async (operation) => {
  pendingPanelOperations += 1;
  setTopbarLogoLoading("control-panel", true);
  try {
    return await operation();
  } finally {
    pendingPanelOperations = Math.max(0, pendingPanelOperations - 1);
    setTopbarLogoLoading("control-panel", pendingPanelOperations > 0);
  }
};
const rawCallables = createControlPanelCallables(functions);
const callables = Object.fromEntries(
  Object.entries(rawCallables).map(([name, callable]) => [
    name,
    (...args) => trackPanelOperation(() => callable(...args))
  ])
);
const { renderSystemStatus, renderIntegrityStatus } = createSystemIntegrityRenderer({
  text,
  isEn
});
const { renderCodeStats, renderBackupStatus } = createStatsBackupRenderer({
  text,
  isEn
});
const { renderWhatsNewControl, renderSuperadminPreferences, renderAgentCard } =
  createLocalCardsRenderer({ text });
const { renderUsers } = createUsersRenderer({ text });
const { renderCodes } = createCodesRenderer({ text });
const { renderAccessRequests } = createAccessRequestsRenderer({ text });
const { renderEmailTemplates } = createEmailTemplatesRenderer({ text });
const { renderTags } = createTagsRenderer({ text, isEn });

const sectionIcon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;

if (mount) {
  const wrap = document.createElement("div");
  wrap.className = "controlpanel-wrap";
  const systemStatusCard = createCard(text.systemTitle);
  const integrityCard = createCard(text.integrityTitle);
  const codeStatsCard = createCard(text.codeStatsTitle);
  const backupCard = createCard(text.backupTitle);
  const agentCard = createCard(text.agentCardTitle);
  const preferencesCard = createCard(text.preferencesTitle);
  const whatsNewCard = createCard(text.whatsNewTitle);
  const usersCard = createCard(text.usersTitle);
  const codesCard = createCard(text.codesTitle);
  const accessRequestsCard = createCard(text.accessRequestsTitle);
  const emailTemplatesCard = createCard(text.emailTemplatesTitle);
  const tagsCard = createCard(text.tagsTitle);
  const panelSections = [
    {id: "code", label: text.codeStatsTitle, card: codeStatsCard, icon: sectionIcon('<path d="M8 9 4 12l4 3M16 9l4 3-4 3M14 5l-4 14"/>')},
    {id: "system", label: text.systemTitle, card: systemStatusCard, icon: sectionIcon('<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>')},
    {id: "integrity", label: text.integrityTitle, card: integrityCard, icon: sectionIcon('<path d="M12 3.5 19 6v5.2c0 4.2-2.8 7.7-7 9.3-4.2-1.6-7-5.1-7-9.3V6z"/><path d="m9 12 2 2 4-4"/>')},
    {id: "backup", label: text.backupTitle, card: backupCard, icon: sectionIcon('<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6"/>')},
    {id: "agent", label: text.agentCardTitle, card: agentCard, icon: sectionIcon('<path d="M8 8h8v8H8zM12 3v3M12 18v3M3 12h3M18 12h3"/>')},
    {id: "preferences", label: text.preferencesTitle, card: preferencesCard, icon: sectionIcon('<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="11" cy="18" r="1.7"/>')},
    {id: "whats-new", label: text.whatsNewTitle, card: whatsNewCard, icon: sectionIcon('<path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="4"/>')},
    {id: "users", label: text.usersTitle, card: usersCard, icon: sectionIcon('<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3.2 2.5-5 5.5-5s4.9 1.8 5.5 5M16 7.5a2.5 2.5 0 0 1 0 5M16 14c2.5.2 4 1.8 4.5 4.5"/>')},
    {id: "codes", label: text.codesTitle, card: codesCard, icon: sectionIcon('<path d="M8 7h8M8 12h8M8 17h5"/><rect x="4" y="3" width="16" height="18" rx="2"/>')},
    {id: "access", label: text.accessRequestsTitle, card: accessRequestsCard, icon: sectionIcon('<path d="M4 12h11M12 8l4 4-4 4M18 5h2v14h-2"/>')},
    {id: "email", label: text.emailTemplatesTitle, card: emailTemplatesCard, icon: sectionIcon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>')},
    {id: "tags", label: text.tagsTitle, card: tagsCard, icon: sectionIcon('<path d="M4 4h8l8 8-8 8-8-8z"/><circle cx="9" cy="9" r="1.5"/>')},
  ];
  panelSections.forEach(({card}) => wrap.appendChild(card));

  const panelLayout = document.createElement("div");
  panelLayout.className = "controlpanel-layout";
  const sectionTree = document.createElement("aside");
  sectionTree.className = "dashboard-group-tree controlpanel-section-tree";
  sectionTree.setAttribute("aria-label", text.panelTreeAria);
  sectionTree.innerHTML = `
    <div class="dashboard-group-tree-header">
      <div class="dashboard-group-tree-title">${text.panelTitle}</div>
    </div>
    <div class="dashboard-group-tree-list controlpanel-section-tree-list" role="tree"></div>
  `;
  const sectionTreeList = sectionTree.querySelector(".controlpanel-section-tree-list");
  const sectionTreeButtons = new Map();
  let activeSectionId = "code";
  const selectSection = (sectionId) => {
    if (!panelSections.some(({id}) => id === sectionId)) return;
    activeSectionId = sectionId;
    sectionTreeButtons.forEach((button, id) => {
      const selected = id === activeSectionId;
      button.setAttribute("aria-selected", String(selected));
      button.closest(".controlpanel-section-tree-row")?.classList.toggle("is-selected", selected);
    });
    panelSections.forEach(({id, card}) => {
      const active = id === activeSectionId;
      card.classList.toggle("is-active", active);
      card.dataset.expanded = active ? "true" : "false";
      card.querySelector(".controlpanel-toggle")?.setAttribute("aria-expanded", String(active));
      const body = card.querySelector(".controlpanel-body");
      const icon = card.querySelector(".controlpanel-icon");
      if (body) body.hidden = !active;
      if (icon) icon.textContent = active ? "-" : "+";
    });
  };
  panelSections.forEach(({id, label, icon}) => {
    const row = document.createElement("div");
    row.className = "dashboard-group-tree-row controlpanel-section-tree-row";
    row.style.setProperty("--tree-indent", "0.05rem");
    const spacer = document.createElement("span");
    spacer.className = "dashboard-group-tree-toggle-spacer";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dashboard-group-tree-node controlpanel-section-tree-node";
    button.setAttribute("role", "treeitem");
    button.setAttribute("aria-level", "1");
    button.setAttribute("aria-selected", "false");
    const iconElement = document.createElement("span");
    iconElement.className = "dashboard-group-tree-icon controlpanel-section-tree-icon";
    iconElement.setAttribute("aria-hidden", "true");
    iconElement.innerHTML = icon;
    const labelElement = document.createElement("span");
    labelElement.className = "dashboard-group-tree-label";
    labelElement.textContent = label;
    button.append(iconElement, labelElement);
    button.addEventListener("click", () => selectSection(id));
    row.append(spacer, button);
    sectionTreeList?.appendChild(row);
    sectionTreeButtons.set(id, button);
  });
  panelLayout.append(sectionTree, wrap);
  mount.appendChild(panelLayout);
  selectSection(activeSectionId);

  systemStatusCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(systemStatusCard));
  integrityCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(integrityCard));
  codeStatsCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(codeStatsCard));
  backupCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(backupCard));
  agentCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(agentCard));
  preferencesCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(preferencesCard));
  whatsNewCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(whatsNewCard));
  usersCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(usersCard));
  codesCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(codesCard));
  accessRequestsCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(accessRequestsCard));
  emailTemplatesCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(emailTemplatesCard));
  tagsCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(tagsCard));

  const systemStatusBody = systemStatusCard.querySelector(".controlpanel-body");
  const integrityBody = integrityCard.querySelector(".controlpanel-body");
  const codeStatsBody = codeStatsCard.querySelector(".controlpanel-body");
  const backupBody = backupCard.querySelector(".controlpanel-body");
  const agentBody = agentCard.querySelector(".controlpanel-body");
  const preferencesBody = preferencesCard.querySelector(".controlpanel-body");
  const whatsNewBody = whatsNewCard.querySelector(".controlpanel-body");
  const usersBody = usersCard.querySelector(".controlpanel-body");
  const codesBody = codesCard.querySelector(".controlpanel-body");
  const accessRequestsBody = accessRequestsCard.querySelector(".controlpanel-body");
  const emailTemplatesBody = emailTemplatesCard.querySelector(".controlpanel-body");
  const tagsBody = tagsCard.querySelector(".controlpanel-body");
  let updateCodesStatus = () => {};
  let addCodeButton = null;
  let addCodeInput = null;
  let cleanupLegacyCodeLinksButton = null;
  let emailLanguage = isEn ? "en" : "es";
  let emailDeliveryStatus = "";
  let updateEmailDeliveryStatus = () => {};

  const loadSystemStatus = async () => {
    if (!systemStatusBody || !integrityBody) return;
    renderState(
      systemStatusBody,
      text.systemHint,
      text.systemLoading
    );
    renderState(
      integrityBody,
      text.integrityHint,
      text.integrityLoading
    );
    try {
      const response = await callables.getSystemStatus();
      const data = response?.data || {};
      renderSystemStatus(systemStatusBody, data);
      renderIntegrityStatus(integrityBody, data.integrity || {});
    } catch {
      renderState(
        systemStatusBody,
        text.systemHint,
        text.systemError,
        "error"
      );
      renderState(
        integrityBody,
        text.integrityHint,
        text.integrityError,
        "error"
      );
    }
  };

  const loadCodes = async () => {
    if (!codesBody) return;
    renderState(codesBody, text.codesHint, text.codesLoading);
    try {
      const codesResponse = await callables.listCodes();
      const codes = Array.isArray(codesResponse?.data?.items) ? codesResponse.data.items : [];
      renderCodes(codesBody, codes, {
        setStatusRef: (setStatus, addBtn, codeInput, cleanupBtn) => {
          updateCodesStatus = setStatus;
          addCodeButton = addBtn;
          addCodeInput = codeInput;
          cleanupLegacyCodeLinksButton = cleanupBtn;
        },
        onAddCode: async (rawCode) => {
          if (addCodeButton) addCodeButton.disabled = true;
          if (addCodeInput) addCodeInput.disabled = true;
          updateCodesStatus(text.codesSaving);
          try {
            const code = (rawCode || "").toString().trim().toUpperCase();
            const response = await callables.createCode(code ? { code } : {});
            const created = response?.data?.code ? String(response.data.code) : "";
            await loadCodes();
            await loadTags();
            if (addCodeInput) addCodeInput.value = "";
            updateCodesStatus(created ? text.codeCreated(created) : "", "");
          } catch {
            updateCodesStatus(text.codeActionError, "error");
          } finally {
            if (addCodeButton) addCodeButton.disabled = false;
            if (addCodeInput) addCodeInput.disabled = false;
          }
        },
        onDeleteCode: async (code) => {
          if (!code) return;
          if (!window.confirm(text.confirmDeleteCode(code))) return;
          updateCodesStatus(text.codesDeleting);
          try {
            await callables.deleteCode({ code });
            await loadCodes();
            updateCodesStatus(text.codeDeleted(code), "");
          } catch {
            updateCodesStatus(text.codeActionError, "error");
          }
        },
        onCleanupLegacyLinks: async () => {
          if (!window.confirm(text.cleanupLegacyCodesConfirm)) return;
          if (cleanupLegacyCodeLinksButton) {
            cleanupLegacyCodeLinksButton.disabled = true;
          }
          updateCodesStatus(text.cleanupLegacyCodesRunning);
          try {
            const response = await callables.cleanupLegacyCodeLinks();
            const cleaned = Number(response?.data?.cleaned || 0);
            updateCodesStatus(text.cleanupLegacyCodesDone(cleaned), "");
          } catch {
            updateCodesStatus(text.codeActionError, "error");
          } finally {
            if (cleanupLegacyCodeLinksButton) {
              cleanupLegacyCodeLinksButton.disabled = false;
            }
          }
        },
      });
    } catch {
      renderState(codesBody, text.codesHint, text.codesError, "error");
    }
  };

  const loadAccessRequests = async () => {
    if (!accessRequestsBody) return;
    renderState(accessRequestsBody, text.accessRequestsHint, text.accessRequestsLoading);
    try {
      const response = await callables.listAccessRequests();
      const items = Array.isArray(response?.data?.items) ? response.data.items : [];
      renderAccessRequests(accessRequestsBody, items, {
        onReview: async (item, decision) => {
          if (decision === "rejected" && !window.confirm(text.accessRequestReject)) return;
          await callables.reviewAccessRequest({ requestId: item.id, decision });
          await Promise.all([loadAccessRequests(), loadCodes(), loadEmailTemplates()]);
        }
      });
    } catch {
      renderState(accessRequestsBody, text.accessRequestsHint, text.accessRequestsError, "error");
    }
  };

  const loadEmailTemplates = async (language = emailLanguage, status = emailDeliveryStatus) => {
    if (!emailTemplatesBody) return;
    emailLanguage = language;
    emailDeliveryStatus = status;
    renderState(
      emailTemplatesBody,
      text.emailTemplatesHint,
      text.emailTemplatesLoading
    );
    try {
      const templatesResponse = await callables.listEmailTemplates({ language });
      const deliveriesResponse = await callables.listEmailDeliveries({ status })
        .catch(() => null);
      const items = Array.isArray(templatesResponse?.data?.items)
        ? templatesResponse.data.items
        : [];
      const deliveries = deliveriesResponse?.data || {unavailable: true};
      renderEmailTemplates(emailTemplatesBody, items, language, {
        ...deliveries,
        status,
      }, {
        onLanguageChange: (nextLanguage) => loadEmailTemplates(nextLanguage, status),
        onDeliveryFilter: (nextStatus) => loadEmailTemplates(language, nextStatus),
        setDeliveryStatusRef: (setStatus) => {
          updateEmailDeliveryStatus = setStatus;
        },
        onRetry: async (item, button) => {
          if (!window.confirm(text.emailDeliveryRetryConfirm)) return;
          button.disabled = true;
          updateEmailDeliveryStatus(text.emailDeliveryRetrying);
          try {
            await callables.retryEmailDelivery({ messageId: item.id });
            await loadEmailTemplates(language, status);
            updateEmailDeliveryStatus(text.emailDeliveryRetryDone);
          } catch {
            button.disabled = false;
            updateEmailDeliveryStatus(text.emailDeliveryRetryError, "error");
          }
        },
      });
    } catch {
      renderState(
        emailTemplatesBody,
        text.emailTemplatesHint,
        text.emailTemplatesError,
        "error"
      );
    }
  };

  const loadTags = async () => {
    if (!tagsBody) return;
    renderState(tagsBody, text.tagsHint, text.tagsLoading);
    try {
      const response = await callables.listTags();
      const items = Array.isArray(response?.data?.items) ? response.data.items : [];
      renderTags(tagsBody, items);
    } catch {
      renderState(tagsBody, text.tagsHint, text.tagsError, "error");
    }
  };

  const loadCodeStats = async () => {
    if (!codeStatsBody) return;
    renderState(codeStatsBody, text.codeStatsHint, text.codeStatsLoading);
    try {
      const response = await trackPanelOperation(() =>
        fetch(`/static/data/code-stats.json?ts=${Date.now()}`, { cache: "no-store" })
      );
      if (!response.ok) throw new Error("code-stats-unavailable");
      const stats = await response.json();
      renderCodeStats(codeStatsBody, stats);
    } catch {
      renderState(codeStatsBody, text.codeStatsHint, text.codeStatsError, "error");
    }
  };

  const loadBackupStatus = async () => {
    if (!backupBody) return;
    renderState(backupBody, text.backupHint, text.backupLoading);
    try {
      const response = await trackPanelOperation(() =>
        fetch(`/static/data/nfc-backup-status-public.json?ts=${Date.now()}`, { cache: "no-store" })
      );
      if (!response.ok) throw new Error("backup-status-unavailable");
      const status = await response.json();
      renderBackupStatus(backupBody, status);
    } catch {
      renderState(backupBody, text.backupHint, text.backupError, "error");
    }
  };

  const loadWhatsNewControl = async () => {
    if (!whatsNewBody) return;
    renderState(whatsNewBody, text.whatsNewHint, text.whatsNewLoading);
    try {
      const response = await trackPanelOperation(() =>
        fetch(`/static/data/codex-flags.json?ts=${Date.now()}`, { cache: "no-store" })
      );
      const flags = response.ok ? await response.json() : {};
      renderWhatsNewControl(whatsNewBody, flags);
    } catch {
      renderWhatsNewControl(whatsNewBody, {});
    }
  };

  if (systemStatusBody) {
    renderState(systemStatusBody, text.systemHint, text.systemLoading);
  }
  if (integrityBody) {
    renderState(integrityBody, text.integrityHint, text.integrityLoading);
  }
  if (codeStatsBody) renderState(codeStatsBody, text.codeStatsHint, text.codeStatsLoading);
  if (backupBody) renderState(backupBody, text.backupHint, text.backupLoading);
  if (agentBody) renderAgentCard(agentBody);
  if (preferencesBody) renderSuperadminPreferences(preferencesBody);
  if (whatsNewBody) renderState(whatsNewBody, text.whatsNewHint, text.whatsNewLoading);
  if (usersBody) renderState(usersBody, text.usersHint, text.usersLoading);
  if (codesBody) renderState(codesBody, text.codesHint, text.codesLoading);
  if (accessRequestsBody) renderState(accessRequestsBody, text.accessRequestsHint, text.accessRequestsLoading);
  if (emailTemplatesBody) {
    renderState(
      emailTemplatesBody,
      text.emailTemplatesHint,
      text.emailTemplatesLoading
    );
  }
  if (tagsBody) renderState(tagsBody, text.tagsHint, text.tagsLoading);

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = text.login;
      return;
    }

    const allowed = await isControlPanelUser(user);
    if (!allowed) {
      window.location.href = text.backToHome;
      return;
    }

    if (
      !codeStatsBody ||
      !systemStatusBody ||
      !integrityBody ||
      !backupBody ||
      !agentBody ||
      !preferencesBody ||
      !whatsNewBody ||
      !usersBody ||
      !codesBody ||
      !accessRequestsBody ||
      !emailTemplatesBody ||
      !tagsBody
    ) return;
    await loadSystemStatus();
    await loadCodeStats();
    await loadBackupStatus();
    await loadWhatsNewControl();
    renderState(usersBody, text.usersHint, text.usersLoading);

    let updateUsersStatus = () => {};
    const loadUsers = async () => {
      if (!usersBody) return;
      renderState(usersBody, text.usersHint, text.usersLoading);
      try {
        const usersResponse = await callables.listUsers();
        const users = Array.isArray(usersResponse?.data?.items) ? usersResponse.data.items : [];
        renderUsers(usersBody, users, {
          setStatusRef: (setStatus) => {
            updateUsersStatus = setStatus;
          },
          onToggleCollaborator: async (item, enabled, input) => {
            const uid = (item?.uid || "").toString().trim();
            if (!uid) return;
            input.disabled = true;
            updateUsersStatus("");
            try {
              await callables.setUserCollaborator({ uid, enabled });
              item.suggestionsCollaborator = enabled;
              updateUsersStatus(text.userCollaboratorSaved, "");
            } catch {
              input.checked = !enabled;
              updateUsersStatus(text.userCollaboratorError, "error");
            } finally {
              input.disabled = false;
            }
          },
          onDeleteUser: async (item) => {
            const uid = (item?.uid || "").toString().trim();
            if (!uid) return;
            const label = item.displayName || item.email || uid;
            if (!window.confirm(text.confirmDeleteUser(label))) return;
            updateUsersStatus(text.usersDeleting);
            try {
              await callables.deleteUser({ uid });
              await loadUsers();
              await loadTags();
              updateUsersStatus(text.usersDeleted, "");
            } catch {
              updateUsersStatus(text.usersActionError, "error");
            }
          },
        });
      } catch {
        renderState(usersBody, text.usersHint, text.usersError, "error");
      }
    };

    await loadUsers();
    await loadCodes();
    await loadAccessRequests();
    await loadEmailTemplates();
    await loadTags();
  });
}
