import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { auth, functions } from "/static/js/firebase/firebaseApp.js";
import { getCurrentLang } from "/static/js/site/locale.js";
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
const callables = createControlPanelCallables(functions);
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
  wrap.appendChild(codeStatsCard);
  wrap.appendChild(systemStatusCard);
  wrap.appendChild(integrityCard);
  wrap.appendChild(backupCard);
  wrap.appendChild(agentCard);
  wrap.appendChild(preferencesCard);
  wrap.appendChild(whatsNewCard);
  wrap.appendChild(usersCard);
  wrap.appendChild(codesCard);
  wrap.appendChild(accessRequestsCard);
  wrap.appendChild(emailTemplatesCard);
  wrap.appendChild(tagsCard);
  mount.appendChild(wrap);

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

  const loadEmailTemplates = async (language = isEn ? "en" : "es") => {
    if (!emailTemplatesBody) return;
    renderState(
      emailTemplatesBody,
      text.emailTemplatesHint,
      text.emailTemplatesLoading
    );
    try {
      const response = await callables.listEmailTemplates({ language });
      const items = Array.isArray(response?.data?.items)
        ? response.data.items
        : [];
      renderEmailTemplates(emailTemplatesBody, items, language, {
        onLanguageChange: loadEmailTemplates,
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
      const response = await fetch(`/static/data/code-stats.json?ts=${Date.now()}`, {
        cache: "no-store"
      });
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
      const response = await fetch(`/static/data/nfc-backup-status-public.json?ts=${Date.now()}`, {
        cache: "no-store"
      });
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
      const response = await fetch(`/static/data/codex-flags.json?ts=${Date.now()}`, {
        cache: "no-store"
      });
      const flags = response.ok ? await response.json() : {};
      renderWhatsNewControl(whatsNewBody, flags);
    } catch {
      renderWhatsNewControl(whatsNewBody, {});
    }
  };

  toggleCard(codeStatsCard);
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
