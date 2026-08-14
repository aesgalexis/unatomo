const STORAGE_KEY = "unatomo_mobile_lab_url";
const DEFAULT_PATH = "/nfc/es/m.html?tag=G-P76W-ARQL";

const getSafeLabUrl = (value) => {
  try {
    const url = new URL(value || DEFAULT_PATH, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/nfc/")) {
      return new URL(DEFAULT_PATH, window.location.origin);
    }
    return url;
  } catch {
    return new URL(DEFAULT_PATH, window.location.origin);
  }
};

const showUrl = (address, url) => {
  if (!address) return;
  address.textContent = `${url.pathname}${url.search}${url.hash}`;
  address.title = url.href;
};

let initialUrl = getSafeLabUrl(DEFAULT_PATH);
try {
  initialUrl = getSafeLabUrl(localStorage.getItem(STORAGE_KEY));
} catch {
  // The lab still works when browser storage is unavailable.
}

document.querySelectorAll(".phone-shell").forEach((shell) => {
  const frame = shell.querySelector("iframe");
  const address = shell.querySelector(".phone-address-url");
  if (!frame) return;

  frame.src = `${initialUrl.pathname}${initialUrl.search}${initialUrl.hash}`;
  showUrl(address, initialUrl);

  const syncFrameUrl = () => {
    let currentUrl = getSafeLabUrl(frame.src);
    try {
      currentUrl = getSafeLabUrl(frame.contentWindow.location.href);
    } catch {
      // Firebase popups may briefly prevent access; keep the last safe URL.
    }
    showUrl(address, currentUrl);
    try {
      localStorage.setItem(STORAGE_KEY, currentUrl.href);
    } catch {
      // The visible URL still updates without persistence.
    }
  };

  frame.addEventListener("load", () => {
    syncFrameUrl();
    try {
      frame.contentWindow.addEventListener("hashchange", syncFrameUrl);
      frame.contentWindow.addEventListener("popstate", syncFrameUrl);
    } catch {
      // Only same-origin lab pages expose their navigation events.
    }
  });
});
