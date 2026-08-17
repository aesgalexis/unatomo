import { fetchMachine, upsertMachine } from "../firestoreRepo.js";
import { resendAccountEmailVerification, respondAdminInvite, respondMachineTransferInvite } from "../admin/adminFunctionsRepo.js";
import { normalizeEmail } from "../admin/accountDirectoryRepo.js";
import { normalizeMachine } from "../machineStore.js";
import { auth } from "/static/js/firebase/firebaseApp.js";
import { setTopbarLogoLoading } from "/static/js/topbar/loading-logo.js";

export const createMachineAccessController = ({
  state,
  inviteBanner,
  notifyTopbar,
  renderCards,
  renderTopbarNotifications,
  t
}) => {
  const expandedInviteGroups = new Set();

  const resendVerificationEmail = async () => {
    try {
      const result = await resendAccountEmailVerification();
      notifyTopbar(result.alreadyVerified
        ? t("dashboard.emailAlreadyVerified", "El correo ya está verificado")
        : t("dashboard.verificationResent", "Correo de verificación enviado"));
      return true;
    } catch {
      notifyTopbar(t("dashboard.verificationResendError", "No se pudo reenviar el correo"));
      return false;
    }
  };

  const renderInviteBanner = () => {
    const invites = Array.isArray(state.pendingInvites) ? state.pendingInvites : [];
    const showBanner = state.activeView === "dashboard";
    inviteBanner.hidden = !showBanner;
    if (!invites.length) {
      inviteBanner.innerHTML = "";
      inviteBanner.style.display = "none";
      renderTopbarNotifications();
      return;
    }
    const formatInviteText = (ownerLabel, count) =>
      t("dashboard.inviteManage", (value, total) => `${value} wants you to manage ${total} machines`)(
        ownerLabel,
        count
      );

    inviteBanner.innerHTML = "";
    inviteBanner.style.display = showBanner ? "flex" : "none";
    const grouped = new Map();
    invites.forEach((invite) => {
      const ownerLabel = invite.ownerEmail || t("dashboard.anonymousUser", "Un usuario");
      const key = `${invite.ownerUid || ""}|${ownerLabel}`;
      if (!grouped.has(key)) {
        grouped.set(key, { ownerLabel, invites: [] });
      }
      grouped.get(key).invites.push(invite);
    });
    grouped.forEach(({ ownerLabel, invites: groupInvites }, groupKey) => {
      const row = document.createElement("div");
      row.className = "invite-row invite-row--admin";
      const copy = document.createElement("div");
      copy.className = "invite-copy";
      const text = document.createElement("div");
      text.className = "invite-text";
      text.textContent = groupInvites.length === 1
        ? t(
          "dashboard.inviteManageMachine",
          (owner, machine) => `${owner} quiere que administres “${machine}”`
        )(ownerLabel, groupInvites[0].machineTitle || t("machine.machine", "Equipo"))
        : formatInviteText(ownerLabel, groupInvites.length);
      copy.appendChild(text);

      let machineList = null;
      let toggleBtn = null;
      if (groupInvites.length > 1) {
        const preview = document.createElement("div");
        preview.className = "invite-preview";
        const previewNames = groupInvites
          .slice(0, 2)
          .map((invite) => invite.machineTitle || t("machine.machine", "Equipo"));
        preview.textContent = previewNames.join(" · ");
        const remaining = groupInvites.length - previewNames.length;
        if (remaining > 0) {
          preview.textContent += ` · ${t("dashboard.inviteMoreMachines", (count) => `+${count} más`)(remaining)}`;
        }
        toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className = "invite-toggle";
        copy.appendChild(preview);
        copy.appendChild(toggleBtn);
      }

      const actions = document.createElement("div");
      actions.className = "invite-actions";

      const addDecisionButton = (container, decisionInvites, decision, label, loadingLabel) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = decision === "accepted" ? "mc-location-accept" : "mc-location-cancel";
        button.textContent = label;
        button.addEventListener("click", async () => {
          const controls = Array.from(row.querySelectorAll("button"));
          controls.forEach((control) => { control.disabled = true; });
          button.classList.add("is-loading");
          button.setAttribute("aria-busy", "true");
          button.textContent = loadingLabel;
          const loadingSource = `admin-invite-response-${decisionInvites.map((invite) => invite.id).join("-")}`;
          setTopbarLogoLoading(loadingSource, true);
          try {
            for (const invite of decisionInvites) {
              await handleInviteDecision(invite, decision);
            }
          } catch {
            // handleInviteDecision already reports the failure.
          } finally {
            setTopbarLogoLoading(loadingSource, false);
            if (button.isConnected) {
              controls.forEach((control) => { control.disabled = false; });
              button.classList.remove("is-loading");
              button.removeAttribute("aria-busy");
              button.textContent = label;
            }
          }
        });
        container.appendChild(button);
      };

      if (groupInvites.length === 1) {
        addDecisionButton(actions, groupInvites, "accepted", t("card.accept", "Aceptar"), t("dashboard.accepting", "Aceptando..."));
        addDecisionButton(actions, groupInvites, "rejected", t("dashboard.reject", "Rechazar"), t("dashboard.rejecting", "Rechazando..."));
      } else {
        addDecisionButton(actions, groupInvites, "accepted", t("dashboard.acceptAll", (count) => `Aceptar todos (${count})`)(groupInvites.length), t("dashboard.accepting", "Aceptando..."));
        addDecisionButton(actions, groupInvites, "rejected", t("dashboard.rejectAll", "Rechazar todos"), t("dashboard.rejecting", "Rechazando..."));

        machineList = document.createElement("div");
        machineList.className = "invite-machine-list";
        groupInvites.forEach((invite) => {
          const machineRow = document.createElement("div");
          machineRow.className = "invite-machine-row";
          const machineName = document.createElement("span");
          machineName.className = "invite-machine-name";
          machineName.textContent = invite.machineTitle || t("machine.machine", "Equipo");
          const machineActions = document.createElement("div");
          machineActions.className = "invite-machine-actions";
          addDecisionButton(machineActions, [invite], "accepted", t("card.accept", "Aceptar"), t("dashboard.accepting", "Aceptando..."));
          addDecisionButton(machineActions, [invite], "rejected", t("dashboard.reject", "Rechazar"), t("dashboard.rejecting", "Rechazando..."));
          machineRow.append(machineName, machineActions);
          machineList.appendChild(machineRow);
        });

        const syncExpandedState = () => {
          const expanded = expandedInviteGroups.has(groupKey);
          machineList.hidden = !expanded;
          toggleBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
          toggleBtn.textContent = expanded
            ? t("dashboard.hideInviteMachines", "Ocultar equipos")
            : t("dashboard.showInviteMachines", (count) => `Ver equipos (${count})`)(groupInvites.length);
        };
        toggleBtn.addEventListener("click", () => {
          if (expandedInviteGroups.has(groupKey)) expandedInviteGroups.delete(groupKey);
          else expandedInviteGroups.add(groupKey);
          syncExpandedState();
        });
        syncExpandedState();
      }

      row.appendChild(copy);
      row.appendChild(actions);
      if (machineList) row.appendChild(machineList);
      inviteBanner.appendChild(row);
    });
    renderTopbarNotifications();
  };

  const handleInviteDecision = async (invite, decision) => {
    if (!invite || !invite.ownerUid || !invite.machineId) return;
    try {
      await respondAdminInvite(invite.id, decision);
    } catch {
      notifyTopbar(
        `Permisos: ownerUid=${invite.ownerUid} admin=${normalizeEmail(state.adminEmail || "")}`
      );
      throw new Error("admin-link-update-denied");
    }

    if (decision === "accepted") {
      const ownerMachine = await fetchMachine(null, invite.machineId);
      if (ownerMachine) {
        const user = state.adminLabel || state.adminEmail || t("dashboard.admin", "Administrador");
        const logs = [
          ...(ownerMachine.logs || []),
          {
            ts: new Date().toISOString(),
            type: "admin_accept",
            admin: state.adminEmail || "",
            user
          }
        ];
        try {
          await upsertMachine(invite.ownerUid, {
            ...ownerMachine,
            adminName: state.adminLabel || "",
            logs,
            tenantId: invite.ownerUid
          });
        } catch {
          // ignore log failures
        }
        const normalized = normalizeMachine(ownerMachine, state.draftMachines.length);
        normalized.tenantId = invite.ownerUid;
        normalized.role = "admin";
        normalized.ownerEmail = invite.ownerEmail || "";
        state.draftMachines = [normalized, ...state.draftMachines];
        renderCards({ preserveScroll: true });
      }
    }

    state.pendingInvites = state.pendingInvites.filter((i) => i.id !== invite.id);
    renderInviteBanner();
  };

  const handleTransferDecision = async (invite, decision) => {
    if (!invite || !invite.id) return;
    try {
      await respondMachineTransferInvite(invite.id, decision);
      notifyTopbar(
        decision === "accepted"
          ? t("dashboard.transferAccepted", "Transferencia aceptada")
          : t("dashboard.transferRejected", "Transferencia rechazada")
      );
    } catch {
      notifyTopbar(t("dashboard.transferError", "No se pudo procesar la transferencia"));
      return;
    }
    state.pendingTransferInvites = state.pendingTransferInvites.filter((i) => i.id !== invite.id);
    renderTopbarNotifications();
  };

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible" || !auth.currentUser || state.emailVerified) return;
    try {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      state.emailVerified = auth.currentUser.emailVerified === true;
      renderInviteBanner();
    } catch {
      // Keep the notice until verification state can be refreshed.
    }
  });

  return { handleInviteDecision, handleTransferDecision, renderInviteBanner, resendVerificationEmail };
};
