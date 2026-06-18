import {
  collection,
  doc,
  onSnapshot,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { db } from "/static/js/firebase/firebaseApp.js";
import { normalizeMachine } from "../machineStore.js";
import {
  markAdminLoadFailure,
  markAdminLoadSuccess,
  markOwnerLoadFailure,
  markOwnerLoadSuccess
} from "../components/loading/dashboardLoadState.js";

export const createDashboardSubscriptions = ({
  state,
  updateLoading,
  scheduleRebuild,
  renderCards,
  renderInviteBanner,
  renderTopbarNotifications,
  isRecentLocalWrite
}) => {
  let ownerUnsub = null;
  let adminLinksUnsub = null;
  let inviteUnsub = null;
  let transferInviteUnsub = null;
  const adminMachineUnsubs = new Map();

  const cleanup = () => {
    if (ownerUnsub) ownerUnsub();
    if (adminLinksUnsub) adminLinksUnsub();
    if (inviteUnsub) inviteUnsub();
    if (transferInviteUnsub) transferInviteUnsub();
    ownerUnsub = null;
    adminLinksUnsub = null;
    inviteUnsub = null;
    transferInviteUnsub = null;
    adminMachineUnsubs.forEach((unsub) => unsub?.());
    adminMachineUnsubs.clear();
  };

  const subscribeOwnerMachines = (uid) => {
    if (ownerUnsub) ownerUnsub();
    const q = query(collection(db, "machines"), where("ownerUid", "==", uid));
    ownerUnsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.hasPendingWrites) return;
        markOwnerLoadSuccess(state);
        updateLoading();
        const changedIds = snap.docChanges().map((change) => change.doc.id);
        if (changedIds.length && changedIds.every((id) => isRecentLocalWrite(id))) {
          return;
        }
        const list = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        const normalized = list
          .map((m, idx) => normalizeMachine(m, idx))
          .filter(Boolean)
          .map((m) => ({
            ...m,
            tenantId: uid,
            role: "owner",
            ownerEmail: state.adminEmail || ""
          }));
        state.ownerMachines = normalized;
        scheduleRebuild({ preserveScroll: true });
      },
      () => {
        markOwnerLoadFailure(state);
        updateLoading();
        renderCards({ preserveScroll: true });
      }
    );
  };

  const syncAdminMachineListeners = (links) => {
    const nextIds = new Set();
    (links || []).forEach((link) => {
      if (!link || !link.machineId || !link.ownerUid) return;
      if (link.status && link.status !== "accepted") return;
      nextIds.add(link.machineId);
      if (adminMachineUnsubs.has(link.machineId)) return;
      const ref = doc(db, "machines", link.machineId);
      const unsub = onSnapshot(
        ref,
        { includeMetadataChanges: true },
        (snap) => {
          if (snap.metadata.hasPendingWrites) return;
          if (isRecentLocalWrite(link.machineId)) return;
          if (!snap.exists()) return;
          const data = snap.data() || {};
          if (data.ownerUid && data.ownerUid !== link.ownerUid) return;
          const normalized = normalizeMachine(
            { id: snap.id, ...data },
            state.draftMachines.length
          );
          normalized.tenantId = link.ownerUid;
          normalized.role = "admin";
          normalized.ownerEmail = link.ownerEmail || "";
          state.adminMachines = (state.adminMachines || [])
            .filter((m) => m.id !== link.machineId);
          state.adminMachines = [normalized, ...state.adminMachines];
          scheduleRebuild({ preserveScroll: true });
        },
        () => {
          const currentUnsub = adminMachineUnsubs.get(link.machineId);
          if (currentUnsub) currentUnsub();
          adminMachineUnsubs.delete(link.machineId);
          state.adminMachines = (state.adminMachines || [])
            .filter((m) => m.id !== link.machineId);
          scheduleRebuild({ preserveScroll: true });
        }
      );
      adminMachineUnsubs.set(link.machineId, unsub);
    });

    Array.from(adminMachineUnsubs.keys()).forEach((id) => {
      if (!nextIds.has(id)) {
        const unsub = adminMachineUnsubs.get(id);
        if (unsub) unsub();
        adminMachineUnsubs.delete(id);
        state.adminMachines = (state.adminMachines || []).filter((m) => m.id !== id);
      }
    });
  };

  const subscribeAdminLinks = (uid) => {
    if (adminLinksUnsub) adminLinksUnsub();
    const q = query(
      collection(db, "admin_machine_links"),
      where("adminUid", "==", uid)
    );
    adminLinksUnsub = onSnapshot(
      q,
      (snap) => {
        markAdminLoadSuccess(state);
        updateLoading();
        const links = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        state.adminLinks = links;
        const activeLinks = links
          .filter((link) => link.status !== "left" && link.status !== "rejected");
        syncAdminMachineListeners(activeLinks);
        scheduleRebuild({ preserveScroll: true });
      },
      () => {
        markAdminLoadFailure(state);
        updateLoading();
        renderCards({ preserveScroll: true });
      }
    );
  };

  const subscribePendingInvites = (emailLower) => {
    if (inviteUnsub) inviteUnsub();
    if (!emailLower) {
      state.pendingInvites = [];
      renderInviteBanner();
      return;
    }
    const q = query(
      collection(db, "admin_machine_invites"),
      where("adminEmailLower", "==", emailLower),
      where("status", "==", "pending")
    );
    inviteUnsub = onSnapshot(
      q,
      (snap) => {
        state.pendingInvites = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        renderInviteBanner();
      },
      () => {
        state.pendingInvites = [];
        renderInviteBanner();
      }
    );
  };

  const subscribePendingTransferInvites = (uid) => {
    if (transferInviteUnsub) transferInviteUnsub();
    if (!uid) {
      state.pendingTransferInvites = [];
      renderTopbarNotifications();
      return;
    }
    const q = query(
      collection(db, "machine_transfer_invites"),
      where("toOwnerUid", "==", uid),
      where("status", "==", "pending")
    );
    transferInviteUnsub = onSnapshot(
      q,
      (snap) => {
        state.pendingTransferInvites = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        renderTopbarNotifications();
      },
      () => {
        state.pendingTransferInvites = [];
        renderTopbarNotifications();
      }
    );
  };

  return {
    cleanup,
    subscribeAdminLinks,
    subscribeOwnerMachines,
    subscribePendingInvites,
    subscribePendingTransferInvites
  };
};
