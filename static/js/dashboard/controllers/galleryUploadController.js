import { installDocumentHooks } from "../cardHooks/documentHooks.js";
import {
  openGalleryUploadBox,
  openGalleryUploadModal
} from "../components/galleryUploadModal/galleryUploadModal.js";

export const createGalleryUploadController = ({
  assertStorageAvailable,
  getDraftById,
  notifyTopbar,
  refreshStorageFullState,
  renderCards,
  state,
  t,
  updateMachine,
  upsertMachine
}) => {
  const openGalleryUpload = () => {
    const useModal = window.matchMedia("(max-width: 768px)").matches;
    const inlineContainer = useModal
      ? null
      : document.querySelector("#machineList.gallery-view");
    if (inlineContainer?.querySelector(".gallery-upload-dialog.is-inline")) {
      if (window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    const documentHooks = {};
    installDocumentHooks(documentHooks, {
      assertStorageAvailable,
      expandedById: new Set(state.expandedById || []),
      getDraftById,
      notifyTopbar,
      refreshStorageFullState,
      renderCards,
      state,
      t,
      updateMachine,
      upsertMachine
    });
    const openUploadSurface = useModal ? openGalleryUploadModal : openGalleryUploadBox;
    const uploadFlow = openUploadSurface({
      machines: state.draftMachines || [],
      ...(useModal ? {} : { container: inlineContainer }),
      onUpload: async ({ machineId, kind, file }) => {
        const uploaded = await documentHooks.onUploadMachineDocument(
          machineId,
          kind,
          file,
          null,
          { preserveTab: true, deferRender: true }
        );
        renderCards({ preserveScroll: true, preserveAnchor: false });
        return uploaded;
      }
    });
    if (inlineContainer && window.scrollY > 0) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
    return uploadFlow;
  };

  return { openGalleryUpload };
};
