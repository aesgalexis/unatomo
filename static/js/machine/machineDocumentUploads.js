import { appCheck, auth } from "/static/js/firebase/firebaseApp.js";
import {
  preparePlateImageUpload,
  validateManualPdf,
  validateOtherDocument
} from "/static/js/dashboard/documents/machineDocumentsRepo.js";
import { getToken } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app-check.js";

const getUploadEndpoint = () => {
  const projectId = (auth.app.options.projectId || "").toString().trim();
  if (!projectId) throw new Error("missing-project-id");
  return `https://us-central1-${projectId}.cloudfunctions.net/uploadMachineAccessDocument`;
};

const encodeHeader = (value = "") => encodeURIComponent((value || "").toString());

const normalizeUploadError = (payload = {}, response) => {
  const code = (payload.error || payload.code || "").toString();
  if (code.includes("file-type") || code.includes("file-signature")) {
    return new Error("file-type");
  }
  if (code.includes("file-too-large")) return new Error("file-too-large");
  if (code.includes("storage-full")) return new Error("storage-full");
  if (response?.status === 401) return new Error("machine-session-invalid");
  if (response?.status === 403) return new Error("permission-denied");
  return new Error("upload-failed");
};

export const uploadMachineAccessDocument = async ({
  tagId,
  session,
  kind,
  file,
  documentMetadata = {}
}) => {
  if (!tagId || !session?.sessionId || !session?.sessionToken || !file) {
    throw new Error("missing-context");
  }

  let uploadBody = file;
  if (kind === "plate") {
    uploadBody = await preparePlateImageUpload(file);
  } else if (kind === "manual") {
    validateManualPdf(file);
  } else {
    validateOtherDocument(file);
  }

  const headers = {
    "Content-Type": uploadBody.type || file.type || "application/octet-stream",
    "X-Unatomo-Tag-Id": tagId,
    "X-Unatomo-Session-Id": session.sessionId,
    "X-Unatomo-Session-Token": session.sessionToken,
    "X-Unatomo-Document-Kind": kind,
    "X-Unatomo-File-Name": encodeHeader(file.name || "document"),
    "X-Unatomo-Original-Size": String(file.size || uploadBody.size || 0),
    "X-Unatomo-Document-Metadata": encodeHeader(JSON.stringify(documentMetadata || {}))
  };
  if (appCheck) {
    const token = await getToken(appCheck, false);
    if (token?.token) headers["X-Firebase-AppCheck"] = token.token;
  }

  const response = await fetch(getUploadEndpoint(), {
    method: "POST",
    headers,
    body: uploadBody
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.document) {
    throw normalizeUploadError(payload, response);
  }
  return {
    document: payload.document,
    operationalPatch: payload.operationalPatch || null
  };
};
