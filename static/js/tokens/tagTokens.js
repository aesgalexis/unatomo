import { functions } from "/static/js/firebase/firebaseApp.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";

const createMachineTagTokenCallable = httpsCallable(functions, "createMachineTagToken");

export const createTagToken = async (_uid, machineId) => {
  if (!machineId) throw new Error("missing-machine-id");
  const response = await createMachineTagTokenCallable({ machineId });
  const tagId = (response?.data?.tagId || "").toString().trim();
  if (!tagId) throw new Error("tag-generate-failed");
  return tagId;
};
