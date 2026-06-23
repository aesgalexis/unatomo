import { fetchMachine, upsertMachine } from "../firestoreRepo.js";
import { respondAdminInvite, respondMachineTransferInvite } from "../admin/adminFunctionsRepo.js";
import { normalizeEmail } from "../admin/accountDirectoryRepo.js";
import { normalizeMachine } from "../machineStore.js";

export const createMachineAccessController = ({
  state,
  inviteBanner,
  notifyTopbar,
  renderCards,
  renderTopbarNotifications,
  t
}) => {
  const renderInviteBanner = () => {
    const invites = Array.isArray(state.pendingInvites) ? state.pendingInvites : [];
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
    inviteBanner.style.display = "flex";
    const grouped = new Map();
    invites.forEach((invite) => {
      const ownerLabel = invite.ownerEmail || t("dashboard.anonymousUser", "Un usuario");
      const key = `${invite.ownerUid || ""}|${ownerLabel}`;
      if (!grouped.has(key)) {
        grouped.set(key, { ownerLabel, invites: [] });
      }
      grouped.get(key).invites.push(invite);
    });
    grouped.forEach(({ ownerLabel, invites: groupInvites }) => {
      const row = document.createElement("div");
      row.className = "invite-row";
      const text = document.createElement("div");
      text.className = "invite-text";
      text.textContent = formatInviteText(ownerLabel, groupInvites.length);
      const actions = document.createElement("div");
      actions.className = "invite-actions";
      const acceptBtn = document.createElement("button");
      acceptBtn.type = "button";
      acceptBtn.className = "mc-location-accept";
      acceptBtn.textContent = t("card.accept", "Aceptar");
      acceptBtn.addEventListener("click", async () => {
        for (const invite of groupInvites) {
          await handleInviteDecision(invite, "accepted");
        }
      });
      const rejectBtn = document.createElement("button");
      rejectBtn.type = "button";
      rejectBtn.className = "mc-location-cancel";
      rejectBtn.textContent = t("dashboard.reject", "Rechazar");
      rejectBtn.addEventListener("click", async () => {
        for (const invite of groupInvites) {
          await handleInviteDecision(invite, "rejected");
        }
      });
      actions.appendChild(acceptBtn);
      actions.appendChild(rejectBtn);
      row.appendChild(text);
      row.appendChild(actions);
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

  return { handleInviteDecision, handleTransferDecision, renderInviteBanner };
};
