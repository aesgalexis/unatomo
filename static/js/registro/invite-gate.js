const TARGET_KEY = "unatomo_register_target";
const OPEN_KEY = "unatomo_open_register";

const setTarget = (targetUrl) => {
  if (!targetUrl) return;
  try { sessionStorage.setItem(TARGET_KEY, targetUrl); } catch {}
};

export const getRegisterTarget = () => {
  try {
    const target = sessionStorage.getItem(TARGET_KEY);
    return target || "";
  } catch {
    return "";
  }
};

export const clearRegisterTarget = () => {
  try { sessionStorage.removeItem(TARGET_KEY); } catch {}
};

export const requestInviteCodeAndRedirect = (targetUrl, options = {}) => {
  setTarget(targetUrl);
  const box = document.getElementById("register-code-box");
  const input = document.getElementById("register-code-input");

  if (box) {
    if (box.hidden) {
      if (typeof options.showInline === "function") {
        options.showInline();
      } else {
        box.hidden = false;
      }
    }
    if (input) input.focus();
    return;
  }

  try { sessionStorage.setItem(OPEN_KEY, "1"); } catch {}
  window.location.href = "/?setup=1";
};

export const shouldOpenInviteGate = () => {
  try {
    return sessionStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
};

export const clearInviteGateFlag = () => {
  try { sessionStorage.removeItem(OPEN_KEY); } catch {}
};