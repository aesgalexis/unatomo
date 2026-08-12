import {
  auth,
  loginWithGoogle,
  loginWithEmail,
  validateRegistrationCode,
  requestAccountAccess,
  registerWithGoogle,
  registerWithEmail,
  completeCurrentUserRegistration,
  getUserRegistrationState,
  isAccountOnboardingRequired,
  getUsableCurrentUser
} from "/static/js/registro/firebase-init.js";
import {
  requestInviteCodeAndRedirect,
  getRegisterTarget,
  clearRegisterTarget,
  shouldOpenInviteGate,
  clearInviteGateFlag
} from "/static/js/registro/invite-gate.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getAppBasePrefix, getCurrentLang, localizeEsPath } from "/static/js/site/locale.js";

const lang = getCurrentLang();
const isEn = lang === "en";
const appBasePrefix = getAppBasePrefix();
const paths = {
  home: localizeEsPath("/es/index.html", lang),
  login: localizeEsPath("/es/auth/login.html", lang),
  register: localizeEsPath("/es/auth/registro.html", lang),
  onboarding: localizeEsPath("/es/onboarding.html", lang),
  setup: `${appBasePrefix || ""}/?setup=1`,
};

const getLoginReturnTarget = () => {
  const value = new URLSearchParams(window.location.search).get("returnTo") || "";
  if (!/^\/nfc\/(?:es|en)\/m\.html(?:\?|#|$)/.test(value)) return "";
  try {
    const target = new URL(value, window.location.origin);
    if (target.origin !== window.location.origin) return "";
    if (!/^\/nfc\/(?:es|en)\/m\.html$/.test(target.pathname)) return "";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "";
  }
};

const loginReturnTarget = getLoginReturnTarget();

const text = {
  connectingGoogle: isEn ? "Connecting to Google..." : "Conectando con Google...",
  googleTakingLonger: isEn
    ? "Google is taking longer than usual. Keep this page open."
    : "Google está tardando más de lo habitual. Mantén esta página abierta.",
  checkingAccount: isEn ? "Checking your account..." : "Comprobando tu cuenta...",
  accountCheckTakingLonger: isEn
    ? "Checking your account is taking longer than usual..."
    : "La comprobación de tu cuenta está tardando más de lo habitual...",
  accountCheckError: isEn
    ? "We could not check your account. Check your connection and try again."
    : "No hemos podido comprobar tu cuenta. Revisa la conexión e inténtalo de nuevo.",
  loginFailed: isEn ? "Could not sign in." : "No se pudo iniciar sesión.",
  loginSuccess: isEn ? "Signed in. Redirecting..." : "Sesión iniciada. Redirigiendo...",
  googleLoginError: isEn ? "Error signing in with Google." : "Error en el inicio de sesión con Google.",
  googlePopupBlocked: isEn
    ? "Safari blocked the Google window. Allow pop-ups for this site and try again."
    : "Safari ha bloqueado la ventana de Google. Permite las ventanas emergentes para este sitio e inténtalo de nuevo.",
  googlePopupClosed: isEn
    ? "The Google window closed before sign-in finished. Try again."
    : "La ventana de Google se cerró antes de completar el acceso. Inténtalo de nuevo.",
  googleNetworkError: isEn
    ? "Google could not be reached. Check your connection and try again."
    : "No se ha podido conectar con Google. Revisa la conexión e inténtalo de nuevo.",
  googleStorageError: isEn
    ? "Safari cannot save the session. Try a non-private tab and allow site storage."
    : "Safari no puede guardar la sesión. Usa una pestaña no privada y permite el almacenamiento del sitio.",
  googleUnauthorizedDomain: isEn
    ? "This domain is not authorized for Google sign-in."
    : "Este dominio no está autorizado para acceder con Google.",
  googleInterrupted: isEn
    ? "The previous Google sign-in was interrupted. Try again."
    : "El acceso anterior con Google se interrumpió. Inténtalo de nuevo.",
  requiredFields: isEn ? "Complete the required fields." : "Completa los campos obligatorios.",
  signingIn: isEn ? "Signing in..." : "Iniciando sesión...",
  wrongCredentials: isEn ? "Incorrect email or password." : "Correo o contraseña incorrectos.",
  invalidEmail: isEn ? "Invalid email." : "Correo no válido.",
  tooManyRequests: isEn ? "Too many attempts. Try again later." : "Demasiados intentos. Prueba más tarde.",
  loginError: isEn ? "Error signing in." : "Error iniciando sesión.",
  activationRequired: isEn ? "This account needs a valid registration code before access." : "Esta cuenta necesita un c\u00f3digo de registro v\u00e1lido antes de acceder.",
  enterValidCode: isEn ? "Enter a valid code." : "Introduce un código válido.",
  validatingCode: isEn ? "Validating code..." : "Validando código...",
  invalidCode: isEn ? "Invalid code." : "Código no válido.",
  validCode: isEn ? "Valid code. Redirecting..." : "Código correcto. Redirigiendo...",
  validateCodeError: isEn ? "Error validating code." : "Error validando el código.",
  requestAccessTitle: isEn ? "Request access" : "Solicitar acceso",
  requestAccessName: isEn ? "Name" : "Nombre",
  requestAccessEmail: isEn ? "Email" : "Correo electrónico",
  requestAccessReason: isEn ? "How would you use UNATOMO/NFC? (optional)" : "¿Cómo usarías UNATOMO/NFC? (opcional)",
  requestAccessSend: isEn ? "Send request" : "Enviar solicitud",
  requestAccessSending: isEn ? "Sending request..." : "Enviando solicitud...",
  requestAccessSent: isEn ? "Request received. We will email you after reviewing it." : "Solicitud recibida. Te enviaremos un correo después de revisarla.",
  requestAccessError: isEn ? "Unable to send the request." : "No se ha podido enviar la solicitud.",
  registerFailed: isEn ? "Could not complete registration." : "No se pudo completar el registro.",
  registerSuccess: isEn ? "Registration completed. Redirecting..." : "Registro completado. Redirigiendo...",
  googleRegisterError: isEn ? "Error registering with Google." : "Error en el registro con Google.",
  passwordMin: isEn ? "Password must be at least 8 characters." : "La contraseña debe tener al menos 8 caracteres.",
  passwordMismatch: isEn ? "Passwords do not match." : "Las contraseñas no coinciden.",
  creatingAccount: isEn ? "Creating account..." : "Creando cuenta...",
  emailInUse: isEn ? "That email already has an account." : "Ese correo ya tiene cuenta.",
  weakPassword: isEn ? "Password is too weak." : "Contraseña demasiado débil.",
  createAccountError: isEn ? "Error creating account." : "Error creando la cuenta.",
  guest: isEn ? "Guest" : "Invitado",
  login: isEn ? "Sign in" : "Iniciar sesión",
  user: isEn ? "User" : "Usuario",
  logout: isEn ? "Sign out" : "Cerrar sesión",
};


const rememberActivationTarget = () => {
  try { sessionStorage.setItem("unatomo_register_target", paths.register); } catch {}
};

const goActivationFlow = () => {
  rememberActivationTarget();
  window.location.href = paths.setup;
};

const getErrorCode = (error) => (error?.code || "").toString().trim();

const reportAuthFailure = (context, error) => {
  console.warn(`[auth] ${context}`, {
    code: getErrorCode(error) || "unknown"
  });
};

const getGoogleErrorText = (error, fallback = text.googleLoginError) => {
  const code = getErrorCode(error);
  if (code === "auth/popup-blocked") return text.googlePopupBlocked;
  if (code === "auth/popup-closed-by-user") return text.googlePopupClosed;
  if (code === "auth/cancelled-popup-request") return text.googleInterrupted;
  if (code === "auth/network-request-failed") return text.googleNetworkError;
  if (
    code === "auth/web-storage-unsupported" ||
    code === "auth/operation-not-supported-in-this-environment"
  ) {
    return text.googleStorageError;
  }
  if (code === "auth/unauthorized-domain") return text.googleUnauthorizedDomain;
  if (code === "auth/too-many-requests") return text.tooManyRequests;
  return fallback;
};

const startSlowStatusTimer = (setStatus, message, delay = 15000) =>
  window.setTimeout(() => setStatus(message), delay);

const completeAuthenticatedLogin = async (user, setStatus, onSuccess) => {
  if (!user) {
    setStatus(text.loginFailed);
    return false;
  }

  setStatus(text.checkingAccount);
  const slowTimer = startSlowStatusTimer(
    setStatus,
    text.accountCheckTakingLonger
  );
  try {
    const registration = await getUserRegistrationState(user);
    if (!registration.allowed) {
      setStatus(text.activationRequired);
      setTimeout(goActivationFlow, 650);
      return false;
    }

    setStatus(text.loginSuccess);
    setTimeout(() => onSuccess(isAccountOnboardingRequired(registration)), 650);
    return true;
  } catch (error) {
    reportAuthFailure("profile-check-failed", error);
    setStatus(text.accountCheckError);
    return false;
  } finally {
    window.clearTimeout(slowTimer);
  }
};

function initSetupLogin() {
  const btnOpen = document.getElementById("go-login");
  const box = document.getElementById("login-box");

  const btnGoogle = document.getElementById("login-google");
  const form = document.getElementById("login-email-form");
  const btnEmail = document.getElementById("login-email-submit");

  const status = document.getElementById("login-status");
  const emailInput = document.getElementById("login-email");
  const passInput = document.getElementById("login-password");

  if (!btnOpen || !box) return;

  function showStatus(t) {
    if (!status) return;
    status.hidden = false;
    status.textContent = t;
  }
  function clearStatus() {
    if (!status) return;
    status.hidden = true;
    status.textContent = "";
  }
  function toggleBox() {
    box.hidden = !box.hidden;
    clearStatus();
    if (!box.hidden) emailInput.focus();
  }
  let interactiveLoginInProgress = false;

  btnOpen.addEventListener("click", (event) => {
    event.preventDefault();
    toggleBox();
  });

  onAuthStateChanged(auth, async (user) => {
    if (!user || interactiveLoginInProgress) return;
    await completeAuthenticatedLogin(
      user,
      showStatus,
      (requiresOnboarding) => {
        window.location.href = requiresOnboarding ? paths.onboarding : paths.home;
      }
    );
  });

  btnGoogle.addEventListener("click", async () => {
    clearStatus();
    let slowTimer = 0;
    try {
      interactiveLoginInProgress = true;
      btnGoogle.disabled = true;
      showStatus(text.connectingGoogle);
      slowTimer = startSlowStatusTimer(showStatus, text.googleTakingLonger);

      const res = await loginWithGoogle();
      window.clearTimeout(slowTimer);
      if (!res.ok) return showStatus(text.loginFailed);
      await completeAuthenticatedLogin(
        res.user,
        showStatus,
        (requiresOnboarding) => {
          window.location.href = requiresOnboarding ? paths.onboarding : paths.home;
        }
      );
    } catch (error) {
      reportAuthFailure("google-login-failed", error);
      showStatus(getGoogleErrorText(error));
    } finally {
      window.clearTimeout(slowTimer);
      interactiveLoginInProgress = false;
      btnGoogle.disabled = false;
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus();

    const email = (emailInput.value || "").trim();
    const pw = passInput.value || "";
    if (!email || !pw) return showStatus(text.requiredFields);

    try {
      interactiveLoginInProgress = true;
      if (btnEmail) btnEmail.disabled = true;
      showStatus(text.signingIn);

      const res = await loginWithEmail(email, pw);
      if (!res.ok) return showStatus(text.loginFailed);
      await completeAuthenticatedLogin(
        res.user,
        showStatus,
      (requiresOnboarding) => {
        window.location.href = requiresOnboarding ? paths.onboarding : paths.home;
      }
      );
    } catch (e2) {
      const code = String(e2.code || "");
      if (
        code.includes("auth/invalid-credential") ||
        code.includes("auth/wrong-password") ||
        code.includes("auth/user-not-found")
      ) showStatus(text.wrongCredentials);
      else if (code.includes("auth/invalid-email")) showStatus(text.invalidEmail);
      else if (code.includes("auth/too-many-requests")) showStatus(text.tooManyRequests);
      else showStatus(text.loginError);
    } finally {
      interactiveLoginInProgress = false;
      if (btnEmail) btnEmail.disabled = false;
    }
  });
}

function initSetupRegisterCode() {
  const registerBtn = document.getElementById("go-register");
  const box = document.getElementById("register-code-box");
  const input = document.getElementById("register-code-input");
  const submit = document.getElementById("register-code-submit");
  const status = document.getElementById("register-code-status");
  const showCodeBtn = document.getElementById("show-code-entry");
  const codeEntry = document.getElementById("register-code-entry");
  const requestBtn = document.getElementById("request-code-link");
  const requestForm = document.getElementById("access-request-form");
  const requestName = document.getElementById("access-request-name");
  const requestEmail = document.getElementById("access-request-email");
  const requestReason = document.getElementById("access-request-reason");
  const requestSubmit = document.getElementById("access-request-submit");
  const requestStatus = document.getElementById("access-request-status");

  if (!registerBtn || !box || !input || !submit || !status) return;

  function clearStatus() {
    status.hidden = true;
    status.textContent = "";
  }
  function setStatus(text) {
    status.hidden = false;
    status.textContent = text;
  }
  function toggleBox() {
    box.hidden = !box.hidden;
    clearStatus();
    if (!box.hidden) {
      showCodeBtn?.focus();
    } else if (codeEntry) {
      codeEntry.hidden = true;
    }
  }

  showCodeBtn?.addEventListener("click", () => {
    if (codeEntry) codeEntry.hidden = false;
    clearStatus();
    input.focus();
  });

  if (requestForm && requestName && requestEmail && requestReason &&
      requestSubmit && requestStatus) {
    requestForm.querySelector("h5").textContent = text.requestAccessTitle;
    requestName.placeholder = text.requestAccessName;
    requestEmail.placeholder = text.requestAccessEmail;
    requestReason.placeholder = text.requestAccessReason;
    requestSubmit.textContent = text.requestAccessSend;
    requestBtn?.addEventListener("click", () => {
      requestForm.hidden = false;
      if (codeEntry) codeEntry.hidden = true;
      requestName.focus();
    });
    requestForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      requestStatus.hidden = false;
      if (!requestName.value.trim() || !requestEmail.value.trim()) {
        requestStatus.textContent = text.requiredFields;
        return;
      }
      requestSubmit.disabled = true;
      requestStatus.textContent = text.requestAccessSending;
      try {
        await requestAccountAccess({
          displayName: requestName.value,
          email: requestEmail.value,
          reason: requestReason.value,
          language: lang
        });
        requestStatus.textContent = text.requestAccessSent;
        requestForm.reset();
      } catch {
        requestStatus.textContent = text.requestAccessError;
      } finally {
        requestSubmit.disabled = false;
      }
    });
  }

  registerBtn.addEventListener("click", () => {
    if (!box.hidden) {
      toggleBox();
      return;
    }
    requestInviteCodeAndRedirect(paths.register, { showInline: toggleBox });
  });
  const shouldOpenFromQuery = new URLSearchParams(window.location.search).get("setup") === "1";
  if (shouldOpenInviteGate() || shouldOpenFromQuery) {
    clearInviteGateFlag();
    if (box.hidden) toggleBox();
    const registrationTitle = document.getElementById("registration-access-title");
    requestAnimationFrame(() => {
      registrationTitle?.scrollIntoView({ block: "start" });
    });
  }
  async function go() {
    clearStatus();

    const raw = (input.value || "").trim();
    if (!raw) {
      setStatus(text.enterValidCode);
      input.focus();
      return;
    }

    try {
      submit.disabled = true;
      setStatus(text.validatingCode);

      const res = await validateRegistrationCode(raw);
      if (!res.valid) {
        setStatus(text.invalidCode);
        input.focus();
        return;
      }

      try { sessionStorage.setItem("unatomo_access_code", res.code); } catch {}
      try { sessionStorage.setItem("unatomo_invite_ok", "1"); } catch {}
      try { localStorage.setItem("unatomo_access_code", res.code); } catch {}

      setStatus(text.validCode);
      const rawTarget = getRegisterTarget() || paths.register;
      clearRegisterTarget();
      const sep = rawTarget.includes("?") ? "&" : "?";
      const target = `${rawTarget}${sep}code=${encodeURIComponent(res.code)}`;
      setTimeout(() => (window.location.href = target), 650);
    } catch {
      setStatus(text.validateCodeError);
    } finally {
      submit.disabled = false;
    }
  }

  submit.addEventListener("click", go);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") go();
  });
}

function initLoginPage() {
  const btnGoogle = document.getElementById("btn-google-login");
  const form = document.getElementById("login-email-form");
  const btnEmail = document.getElementById("btn-email-login");
  const status = document.getElementById("login-status");

  if (!form || !status || (!btnGoogle && !btnEmail)) return;

  function setStatus(t) {
    status.hidden = false;
    status.textContent = t;
  }
  function clearStatus() {
    status.hidden = true;
    status.textContent = "";
  }
  function goHome(requiresOnboarding) {
    window.location.href = requiresOnboarding
      ? paths.onboarding
      : (loginReturnTarget || paths.home);
  }
  let interactiveLoginInProgress = false;

  document.documentElement.style.visibility = "visible";

  onAuthStateChanged(auth, async (user) => {
    if (!user || interactiveLoginInProgress) return;
    await completeAuthenticatedLogin(user, setStatus, goHome);
  });

  btnGoogle.addEventListener("click", async () => {
    clearStatus();
    let slowTimer = 0;
    try {
      interactiveLoginInProgress = true;
      btnGoogle.disabled = true;
      setStatus(text.connectingGoogle);
      slowTimer = startSlowStatusTimer(setStatus, text.googleTakingLonger);

      const res = await loginWithGoogle();
      window.clearTimeout(slowTimer);
      if (!res.ok) return setStatus(text.loginFailed);
      await completeAuthenticatedLogin(res.user, setStatus, goHome);
    } catch (error) {
      reportAuthFailure("google-login-failed", error);
      setStatus(getGoogleErrorText(error));
    } finally {
      window.clearTimeout(slowTimer);
      interactiveLoginInProgress = false;
      btnGoogle.disabled = false;
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus();

    const email = (document.getElementById("email").value || "").trim();
    const password = document.getElementById("password").value || "";
    if (!email || !password) return setStatus(text.requiredFields);

    try {
      interactiveLoginInProgress = true;
      if (btnEmail) btnEmail.disabled = true;
      setStatus(text.signingIn);

      const res = await loginWithEmail(email, password);
      if (!res.ok) return setStatus(text.loginFailed);
      await completeAuthenticatedLogin(res.user, setStatus, goHome);
    } catch (e2) {
      const code = String(e2.code || "");
      if (
        code.includes("auth/invalid-credential") ||
        code.includes("auth/wrong-password") ||
        code.includes("auth/user-not-found")
      ) setStatus(text.wrongCredentials);
      else if (code.includes("auth/invalid-email")) setStatus(text.invalidEmail);
      else if (code.includes("auth/too-many-requests")) setStatus(text.tooManyRequests);
      else setStatus(text.loginError);
    } finally {
      interactiveLoginInProgress = false;
      if (btnEmail) btnEmail.disabled = false;
    }
  });
}

function initRegisterPage() {
  const status = document.getElementById("reg-status");
  const btnGoogle = document.getElementById("btn-google");
  const btnEmail = document.getElementById("btn-email");
  const form = document.getElementById("register-email-form");

  if (!status || !form) return;

  function setStatus(t) {
    status.hidden = false;
    status.textContent = t;
  }
  function clearStatus() {
    status.hidden = true;
    status.textContent = "";
  }
  async function getRegistrationRedirect(result) {
    try {
      const registration = await getUserRegistrationState(auth.currentUser);
      if (!registration.allowed) {
        return result?.alreadyRegistered === true ? paths.home : paths.onboarding;
      }
      return isAccountOnboardingRequired(registration) ? paths.onboarding : paths.home;
    } catch {
      return result?.alreadyRegistered === true ? paths.home : paths.onboarding;
    }
  }
  function clearStoredRegistrationCode() {
    try { sessionStorage.removeItem("unatomo_access_code"); } catch {}
    try { localStorage.removeItem("unatomo_access_code"); } catch {}
  }

  (async () => {
    let code = "";

    try { code = (sessionStorage.getItem("unatomo_access_code") || "").trim(); } catch {}

    if (!code) {
      code = (new URLSearchParams(window.location.search).get("code") || "").trim();
    }

    if (!code) {
      try { code = (localStorage.getItem("unatomo_access_code") || "").trim(); } catch {}
    }

    if (!code) return window.location.replace(paths.setup);

    try { sessionStorage.setItem("unatomo_access_code", code); } catch {}
    try { localStorage.setItem("unatomo_access_code", code); } catch {}

    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("code")) {
        url.searchParams.delete("code");
        history.replaceState({}, "", url.pathname + url.search);
      }
    } catch {}

    const check = await validateRegistrationCode(code);
    if (!check.valid) {
      clearStoredRegistrationCode();
      return window.location.replace(paths.setup);
    }

    document.documentElement.style.visibility = "visible";

    btnGoogle.addEventListener("click", async () => {
      clearStatus();
      try {
        btnGoogle.disabled = true;
        setStatus(text.connectingGoogle);

        const currentUser = await getUsableCurrentUser();
        const res = currentUser
          ? await completeCurrentUserRegistration(code)
          : await registerWithGoogle(code);
        if (!res.ok) return setStatus(text.registerFailed);

        clearStoredRegistrationCode();
        setStatus(text.registerSuccess);
        const destination = await getRegistrationRedirect(res);
        setTimeout(() => (window.location.href = destination), 650);
      } catch {
        setStatus(text.googleRegisterError);
      } finally {
        btnGoogle.disabled = false;
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearStatus();

      const nombre = (document.getElementById("nombre").value || "").trim();
      const email = (document.getElementById("email").value || "").trim();
      const p1 = document.getElementById("password").value || "";
      const p2 = document.getElementById("password2").value || "";

      if (!email || !p1 || !p2) return setStatus(text.requiredFields);
      if (p1.length < 8) return setStatus(text.passwordMin);
      if (p1 !== p2) return setStatus(text.passwordMismatch);

      try {
        if (btnEmail) btnEmail.disabled = true;
        setStatus(text.creatingAccount);

        const currentUser = await getUsableCurrentUser();
        const res = currentUser
          ? await completeCurrentUserRegistration(code)
          : await registerWithEmail(code, email, p1, nombre);
        if (!res.ok) return setStatus(text.registerFailed);

        clearStoredRegistrationCode();
        setStatus(text.registerSuccess);
        const destination = await getRegistrationRedirect(res);
        setTimeout(() => (window.location.href = destination), 650);
      } catch (e2) {
        const msg = String(e2.code || "");
        if (msg.includes("auth/email-already-in-use")) setStatus(text.emailInUse);
        else if (msg.includes("auth/invalid-email")) setStatus(text.invalidEmail);
        else if (msg.includes("auth/weak-password")) setStatus(text.weakPassword);
        else setStatus(text.createAccountError);
      } finally {
        if (btnEmail) btnEmail.disabled = false;
      }
    });
  })().catch(() => {
    document.documentElement.style.visibility = "visible";
  });
}

function initSessionUI() {
  const badge = document.getElementById("session-badge");
  const actionBtn = document.getElementById("session-action");
  if (!badge || !actionBtn) return;

  function setBadge(text) {
    badge.hidden = false;
    badge.textContent = text;
  }
  function setGuest() {
    setBadge(text.guest);
    actionBtn.textContent = text.login;
    actionBtn.dataset.state = "guest";
  }
  function setUser(user) {
    const label = user.displayName || user.email || text.user;
    setBadge(label);
    actionBtn.textContent = text.logout;
    actionBtn.dataset.state = "user";
  }

  setGuest();

  actionBtn.addEventListener("click", async () => {
    const state = actionBtn.dataset.state || "guest";

    if (state === "guest") {
      window.location.href = paths.login;
      return;
    }

    try {
      actionBtn.disabled = true;
      await signOut(auth);
      window.location.href = paths.setup;
    } catch {
      actionBtn.disabled = false;
    }
  });

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setGuest();
      return;
    }
    try {
      const registration = await getUserRegistrationState(user);
      if (registration.allowed) setUser(user);
      else setGuest();
    } catch {
      setGuest();
    }
  });
}

initSetupLogin();
initSetupRegisterCode();
initLoginPage();
initRegisterPage();
initSessionUI();
