import {
  auth,
  loginWithGoogle,
  loginWithEmail,
  validateRegistrationCode,
  registerWithGoogle,
  registerWithEmail,
  completeCurrentUserRegistration,
  getUserRegistrationState
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
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getCurrentLang, localizeEsPath } from "/static/js/site/locale.js";

const lang = getCurrentLang();
const isEn = lang === "en";
const paths = {
  home: localizeEsPath("/es/index.html", lang),
  login: localizeEsPath("/es/auth/login.html", lang),
  register: localizeEsPath("/es/auth/registro.html", lang),
};

const text = {
  connectingGoogle: isEn ? "Connecting to Google..." : "Conectando con Google...",
  loginFailed: isEn ? "Could not sign in." : "No se pudo iniciar sesión.",
  loginSuccess: isEn ? "Signed in. Redirecting..." : "Sesión iniciada. Redirigiendo...",
  googleLoginError: isEn ? "Error signing in with Google." : "Error en el inicio de sesión con Google.",
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
  window.location.href = "/setup=1";
};

const handleLoginResult = (res, setStatus) => {
  if (res?.needsRegistration) {
    setStatus(text.activationRequired);
    setTimeout(goActivationFlow, 650);
    return true;
  }
  return false;
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

  btnOpen.addEventListener("click", toggleBox);

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    try {
      const registration = await getUserRegistrationState(user);
      if (registration.allowed) window.location.href = paths.home;
    } catch {}
  });

  btnGoogle.addEventListener("click", async () => {
    clearStatus();
    try {
      btnGoogle.disabled = true;
      showStatus(text.connectingGoogle);

      const res = await loginWithGoogle();
      if (handleLoginResult(res, showStatus)) return;
      if (!res.ok) return showStatus(text.loginFailed);

      showStatus(text.loginSuccess);
      setTimeout(() => (window.location.href = paths.home), 650);
    } catch {
      showStatus(text.googleLoginError);
    } finally {
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
      if (btnEmail) btnEmail.disabled = true;
      showStatus(text.signingIn);

      const res = await loginWithEmail(email, pw);
      if (handleLoginResult(res, showStatus)) return;
      if (!res.ok) return showStatus(text.loginFailed);

      showStatus(text.loginSuccess);
      setTimeout(() => (window.location.href = paths.home), 650);
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
    if (!box.hidden) input.focus();
  }

  registerBtn.addEventListener("click", () => {
    if (!box.hidden) {
      toggleBox();
      return;
    }
    requestInviteCodeAndRedirect(paths.register, { showInline: toggleBox });
  });
  if (shouldOpenInviteGate()) {
    clearInviteGateFlag();
    if (box.hidden) toggleBox();
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
  function goHome() {
    window.location.href = paths.home;
  }

  document.documentElement.style.visibility = "visible";

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    try {
      const registration = await getUserRegistrationState(user);
      if (registration.allowed) goHome();
      else goActivationFlow();
    } catch {
      goActivationFlow();
    }
  });

  btnGoogle.addEventListener("click", async () => {
    clearStatus();
    try {
      btnGoogle.disabled = true;
      setStatus(text.connectingGoogle);

      const res = await loginWithGoogle();
      if (handleLoginResult(res, setStatus)) return;
      if (!res.ok) return setStatus(text.loginFailed);

      setStatus(text.loginSuccess);
      setTimeout(goHome, 650);
    } catch {
      setStatus(text.googleLoginError);
    } finally {
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
      if (btnEmail) btnEmail.disabled = true;
      setStatus(text.signingIn);

      const res = await loginWithEmail(email, password);
      if (handleLoginResult(res, setStatus)) return;
      if (!res.ok) return setStatus(text.loginFailed);

      setStatus(text.loginSuccess);
      setTimeout(goHome, 650);
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

  (async () => {
    let code = "";

    try { code = (sessionStorage.getItem("unatomo_access_code") || "").trim(); } catch {}

    if (!code) {
      code = (new URLSearchParams(window.location.search).get("code") || "").trim();
    }

    if (!code) {
      try { code = (localStorage.getItem("unatomo_access_code") || "").trim(); } catch {}
    }

    if (!code) return window.location.replace("/setup=1");

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
      try { sessionStorage.removeItem("unatomo_access_code"); } catch {}
      try { localStorage.removeItem("unatomo_access_code"); } catch {}
      return window.location.replace("/setup=1");
    }

    document.documentElement.style.visibility = "visible";

    btnGoogle.addEventListener("click", async () => {
      clearStatus();
      try {
        btnGoogle.disabled = true;
        setStatus(text.connectingGoogle);

        const res = auth.currentUser
          ? await completeCurrentUserRegistration(code)
          : await registerWithGoogle(code);
        if (!res.ok) return setStatus(text.registerFailed);

        setStatus(text.registerSuccess);
        setTimeout(() => (window.location.href = paths.home), 650);
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

        const res = await registerWithEmail(code, email, p1, nombre);
        if (!res.ok) return setStatus(text.registerFailed);

        setStatus(text.registerSuccess);
        setTimeout(() => (window.location.href = paths.home), 650);
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
      window.location.href = "/setup=1";
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
