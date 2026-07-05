import { functions } from "/static/js/firebase/firebaseApp.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";

const createDownloadUrlCallable = httpsCallable(
  functions,
  "createMachineDocumentDownloadUrl"
);

export const createGalleryDownloadUrl = async ({
  machineId,
  storagePath,
  fileName
}) => {
  const response = await createDownloadUrlCallable({
    machineId,
    storagePath,
    fileName
  });
  return (response?.data?.url || "").toString();
};
