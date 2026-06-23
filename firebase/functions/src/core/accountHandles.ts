export const ACCOUNT_HANDLE_RESERVATION_MS = 90 * 24 * 60 * 60 * 1000;
export const ACCOUNT_HANDLE_CHANGE_COOLDOWN_MS = 60 * 1000;

const ACCOUNT_HANDLE_PATTERN =
  /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])$/;
const RESERVED_ACCOUNT_HANDLES = new Set([
  "admin",
  "administrador",
  "administrator",
  "api",
  "nfc",
  "root",
  "sistema",
  "soporte",
  "support",
  "system",
  "todo",
  "unatomo",
  "www",
]);

export const normalizeAccountHandle = (value: unknown) =>
  (value || "").toString().trim().replace(/^@+/, "").toLowerCase();

export const getAccountHandleValidationError = (handle: string) => {
  if (!ACCOUNT_HANDLE_PATTERN.test(handle) || /[._-]{2}/.test(handle)) {
    return "handle-invalid";
  }
  if (RESERVED_ACCOUNT_HANDLES.has(handle)) return "handle-reserved";
  return "";
};

export const firestoreValueToMillis = (value: unknown) => {
  if (value && typeof (value as {toMillis?: unknown}).toMillis === "function") {
    return (value as {toMillis: () => number}).toMillis();
  }
  const parsed = new Date((value || "").toString()).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const isExpiredAccountHandle = (
  data: FirebaseFirestore.DocumentData,
  now = Date.now(),
) => data.status === "reserved" &&
  firestoreValueToMillis(data.reservedUntil) <= now;
