export const CANONICAL_NFC_ORIGIN = "https://unatomo.com";

export const getSafeMobileQrUrl = (value, currentOrigin) => {
  try {
    const url = new URL(value);
    const allowedOrigin = url.origin === currentOrigin ||
      url.origin === CANONICAL_NFC_ORIGIN;
    return allowedOrigin && url.pathname.startsWith("/nfc/") ? url : null;
  } catch {
    return null;
  }
};
