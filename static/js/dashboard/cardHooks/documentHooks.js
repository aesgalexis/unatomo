import {
  deleteMachineDocumentFile,
  uploadManualDocument,
  uploadOtherDocument,
  uploadPlateDocument
} from "../documents/machineDocumentsRepo.js";

const DOCUMENT_KINDS = new Set(["plate", "manual", "other"]);
const MAX_OTHER_DISPLAY_NAME = 40;

const assertDocumentKind = (kind) => {
  if (!DOCUMENT_KINDS.has(kind)) throw new Error("unsupported-document");
};

const getTenantId = (machine, fallbackUid = "") =>
  machine?.tenantId || machine?.ownerUid || fallbackUid;

const normalizeOtherDisplayName = (displayName = "") =>
  (displayName || "")
    .toString()
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_OTHER_DISPLAY_NAME);

const getDocumentEntry = (machine, kind, documentId = "") => {
  if (kind === "other") {
    return Array.isArray(machine.documents?.other)
      ? machine.documents.other.find(
          (entry) => entry?.id === documentId || entry?.storagePath === documentId
        )
      : null;
  }
  return machine.documents?.[kind] || null;
};

const withGeneralTabSelected = (state, id, expandedById) => {
  if (!state.selectedTabById) state.selectedTabById = {};
  state.selectedTabById[id] = "general";
  state.expandedById = Array.from(expandedById);
};

export const installDocumentHooks = (hooks, deps = {}) => {
  const {
    assertStorageAvailable,
    expandedById,
    getDraftById,
    notifyTopbar,
    refreshStorageFullState,
    renderCards,
    state,
    t,
    updateMachine,
    upsertMachine
  } = deps;

  hooks.onUploadMachineDocument = async (id, kind, file, statusEl, options = {}) => {
    assertDocumentKind(kind);
    const current = getDraftById(id);
    if (!current || !state.uid) throw new Error("missing-context");
    const tenantId = getTenantId(current, state.uid);
    const previousSize = kind === "other" ? 0 : Number(current.documents?.[kind]?.size || 0);
    await assertStorageAvailable(tenantId, Math.max(0, Number(file?.size || 0) - previousSize));

    const machineForUpload = { ...current, tenantId };
    if (current.isNew) {
      await upsertMachine(tenantId, machineForUpload);
      current.isNew = false;
    }

    const uploadDocument =
      kind === "manual"
        ? uploadManualDocument
        : kind === "other"
          ? uploadOtherDocument
          : uploadPlateDocument;
    const uploaded = await uploadDocument({
      machine: machineForUpload,
      file,
      uploadedBy: state.uid
    });
    const currentDocuments = current.documents || {};
    const documents =
      kind === "other"
        ? {
            ...currentDocuments,
            other: [
              ...(Array.isArray(currentDocuments.other) ? currentDocuments.other : []),
              uploaded
            ]
          }
        : {
            ...currentDocuments,
            [kind]: uploaded
          };
    updateMachine(id, { documents, isNew: false });
    current.documents = documents;
    current.isNew = false;
    if (statusEl) {
      statusEl.textContent = t("general.uploadSaved", "Archivo guardado");
      statusEl.dataset.state = "ok";
    }
    withGeneralTabSelected(state, id, expandedById);
    await upsertMachine(tenantId, getDraftById(id));
    await refreshStorageFullState(tenantId);
    if (!options.silent) {
      notifyTopbar(t("general.uploadSaved", "Archivo guardado"));
    }
    if (kind === "other" && !options.deferRender) {
      window.setTimeout(() => renderCards({ preserveScroll: true }), 0);
    }
    return uploaded;
  };

  hooks.onRefreshMachineDocuments = () => {
    renderCards({ preserveScroll: true });
  };

  hooks.onRenameMachineDocument = async (id, documentId = "", displayName = "") => {
    const current = getDraftById(id);
    if (!current || !state.uid) throw new Error("missing-context");
    const tenantId = getTenantId(current, state.uid);
    const cleanName = normalizeOtherDisplayName(displayName);
    const documents = { ...(current.documents || {}) };
    const otherDocs = Array.isArray(documents.other) ? documents.other : [];
    const nextOtherDocs = otherDocs.map((entry) => {
      if (entry?.id !== documentId && entry?.storagePath !== documentId) return entry;
      const nextEntry = { ...entry };
      if (cleanName) nextEntry.displayName = cleanName;
      else delete nextEntry.displayName;
      return nextEntry;
    });
    documents.other = nextOtherDocs;
    updateMachine(id, { documents });
    current.documents = documents;
    withGeneralTabSelected(state, id, expandedById);
    await upsertMachine(tenantId, getDraftById(id));
    notifyTopbar(t("general.renamed", "Nombre actualizado"));
    return (
      nextOtherDocs.find(
        (entry) => entry?.id === documentId || entry?.storagePath === documentId
      ) || null
    );
  };

  hooks.onDeleteMachineDocument = async (id, kind, statusEl, documentId = "") => {
    assertDocumentKind(kind);
    const current = getDraftById(id);
    if (!current || !state.uid) throw new Error("missing-context");
    const doc = getDocumentEntry(current, kind, documentId);
    if (!doc) return null;
    const tenantId = getTenantId(current, state.uid);
    if (statusEl) {
      statusEl.textContent = t("general.deleting", "Eliminando...");
      statusEl.dataset.state = "neutral";
    }
    await deleteMachineDocumentFile(doc.storagePath).catch((error) => {
      if (error?.code !== "storage/object-not-found") throw error;
    });
    const documents = { ...(current.documents || {}) };
    if (kind === "other") {
      documents.other = (Array.isArray(documents.other) ? documents.other : [])
        .filter((entry) => entry?.id !== documentId && entry?.storagePath !== documentId);
      if (!documents.other.length) delete documents.other;
    } else {
      delete documents[kind];
    }
    updateMachine(id, { documents });
    current.documents = documents;
    withGeneralTabSelected(state, id, expandedById);
    await upsertMachine(tenantId, getDraftById(id));
    await refreshStorageFullState(tenantId);
    notifyTopbar(t("general.deleted", "Archivo eliminado"));
    if (statusEl) {
      statusEl.textContent = t("general.deleted", "Archivo eliminado");
      statusEl.dataset.state = "ok";
    }
    if (kind === "other") {
      window.setTimeout(() => renderCards({ preserveScroll: true }), 0);
    }
    return doc;
  };
};
