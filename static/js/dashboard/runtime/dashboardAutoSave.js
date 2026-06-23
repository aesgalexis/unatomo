import { initAutoSave } from "../autoSave.js";
import { assignTag, validateTag } from "../tagRepo.js";
import { upsertMachine } from "../firestoreRepo.js";
import { upsertMachineAccessFromMachine } from "../machineAccessRepo.js";

export const createDashboardAutoSave = ({
  getDraftById,
  markLocalWrite,
  state,
  t,
  updateSaveState,
  updateTagStatusUI
}) => initAutoSave({
  notify: updateSaveState,
  saveFn: async (machineId, reason) => {
    if (!state.uid) throw new Error("no-auth");
    const machine = getDraftById(machineId);
    if (!machine) return;
    const tenantId = machine.tenantId || state.uid;
    const skipTagSync = typeof reason === "string" && reason.startsWith("admin");
    if (machine.tagId && !skipTagSync) {
      const result = await validateTag(machine.tagId);
      if (!result.exists) {
        state.tagStatusById[machine.id] = {
          text: t("config.tagNotFound", "El Tag ID introducido no existe"),
          state: "error"
        };
        updateTagStatusUI(machine.id);
        throw new Error("tag-missing");
      }
      if (result.machineId && result.machineId !== machine.id) {
        state.tagStatusById[machine.id] = {
          text: t("config.tagAlreadyAssigned", "Tag ya está asignado"),
          state: "error"
        };
        updateTagStatusUI(machine.id);
        throw new Error("tag-assigned");
      }
    }
    await upsertMachine(tenantId, machine);
    machine.isNew = false;
    if (machine.tagId && !skipTagSync) {
      try {
        await assignTag(machine.tagId, tenantId, machine.id);
        await upsertMachineAccessFromMachine(tenantId, machine, state.uid);
        state.tagStatusById[machine.id] = {
          text: t("dashboard.tagLinked", "Tag enlazado"),
          state: "ok"
        };
      } catch {
        state.tagStatusById[machine.id] = {
          text: t("dashboard.savedTagPending", "Guardado. Tag pendiente de sincronizar"),
          state: "error"
        };
      }
    }
    updateTagStatusUI(machine.id);
  },
  onSaveStart: (machineId) => markLocalWrite(machineId)
});
