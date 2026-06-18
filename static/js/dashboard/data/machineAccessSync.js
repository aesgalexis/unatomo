import {
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { db } from "/static/js/firebase/firebaseApp.js";

export const createMachineAccessSync = ({ applyOperationalPatch }) => {
  const tagUnsubs = new Map();
  const tagIdByMachineId = new Map();
  const machineIdByTagId = new Map();

  const cleanup = () => {
    tagUnsubs.forEach((unsub) => unsub?.());
    tagUnsubs.clear();
    tagIdByMachineId.clear();
    machineIdByTagId.clear();
  };

  const sync = (machines) => {
    const nextTagIds = new Set();
    tagIdByMachineId.clear();
    machineIdByTagId.clear();

    (machines || []).forEach((machine) => {
      if (!machine.tagId) return;
      nextTagIds.add(machine.tagId);
      tagIdByMachineId.set(machine.id, machine.tagId);
      machineIdByTagId.set(machine.tagId, machine.id);
      if (tagUnsubs.has(machine.tagId)) return;

      const ref = doc(db, "machine_access", machine.tagId);
      const unsub = onSnapshot(
        ref,
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() || {};
          const targetId = machineIdByTagId.get(machine.tagId);
          if (!targetId) return;
          applyOperationalPatch(targetId, data);
        },
        () => {
          const currentUnsub = tagUnsubs.get(machine.tagId);
          if (currentUnsub) currentUnsub();
          tagUnsubs.delete(machine.tagId);
        }
      );
      tagUnsubs.set(machine.tagId, unsub);
    });

    Array.from(tagUnsubs.keys()).forEach((tagId) => {
      if (!nextTagIds.has(tagId)) {
        const unsub = tagUnsubs.get(tagId);
        if (unsub) unsub();
        tagUnsubs.delete(tagId);
      }
    });
  };

  return { cleanup, sync };
};
