import {
  auth,
  loginWithGoogle,
  loginWithEmail,
  validateRegistrationCode,
  registerWithGoogle,
  registerWithEmail
} from "/static/js/registro/firebase-init.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

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
    if (!box.hidden) emailInput?.focus();
  }

  btnOpen.addEventListener("click", toggleBox);

  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = "/es/index.html";
  });

  btnGoogle?.addEventListener("click", async () => {
    clearStatus();
    try {
      btnGoogle.disabled = true;
      showStatus("Conectando con Google…");

      const res = await loginWithGoogle();
      if (!res.ok) return showStatus("No se pudo iniciar sesión.");

      showStatus("Sesión iniciada. Redirigiendo…");
      setTimeout(() => (window.location.href = "/es/index.html"), 650);
    } catch {
      showStatus("Error en el inicio de sesión con Google.");
    } finally {
      btnGoogle.disabled = false;
    }
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus();

    const email = (emailInput?.value || "").trim();
    const pw = passInput?.value || "";
    if (!email || !pw) return showStatus("Completa los campos obligatorios.");

    try {
      if (btnEmail) btnEmail.disabled = true;
      showStatus("Iniciando sesión…");

      const res = await loginWithEmail(email, pw);
      if (!res.ok) return showStatus("No se pudo iniciar sesión.");

      showStatus("Sesión iniciada. Redirigiendo…");
      setTimeout(() => (window.location.href = "/es/index.html"), 650);
    } catch (e2) {
      const code = String(e2?.code || "");
      if (
        code.includes("auth/invalid-credential") ||
        code.includes("auth/wrong-password") ||
        code.includes("auth/user-not-found")
      ) showStatus("Correo o contraseña incorrectos.");
      else if (code.includes("auth/invalid-email")) showStatus("Correo no válido.");
      else if (code.includes("auth/too-many-requests")) showStatus("Demasiados intentos. Prueba más tarde.");
      else showStatus("Error iniciando sesión.");
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

  registerBtn.addEventListener("click", toggleBox);
try {
  const flag = sessionStorage.getItem("unatomo_open_register") === "1";
  if (flag) {
    sessionStorage.removeItem("unatomo_open_register");
    if (box.hidden) toggleBox();
  }
} catch {}
  async function go() {
    clearStatus();

    const raw = (input.value || "").trim();
    if (!raw) {
      setStatus("Introduce un código válido.");
      input.focus();
      return;
    }

    try {
      submit.disabled = true;
      setStatus("Validando código…");

      const res = await validateRegistrationCode(raw);
      if (!res.valid) {
        setStatus("Código no válido.");
        input.focus();
        return;
      }

      try { sessionStorage.setItem("unatomo_access_code", res.code); } catch {}
      try { localStorage.setItem("unatomo_access_code", res.code); } catch {}

      setStatus("Código correcto. Redirigiendo…");
const target = `/es/auth/registro.html?code=${encodeURIComponent(res.code)}`;
      setTimeout(() => (window.location.href = target), 650);
    } catch {
      setStatus("Error validando el código.");
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
    window.location.href = "/es/index.html";
  }

  document.documentElement.style.visibility = "visible";

  onAuthStateChanged(auth, (user) => {
    if (user) goHome();
  });

  btnGoogle?.addEventListener("click", async () => {
    clearStatus();
    try {
      btnGoogle.disabled = true;
      setStatus("Conectando con Google…");

      const res = await loginWithGoogle();
      if (!res.ok) return setStatus("No se pudo iniciar sesión.");

      setStatus("Sesión iniciada. Redirigiendo…");
      setTimeout(goHome, 650);
    } catch {
      setStatus("Error en el inicio de sesión con Google.");
    } finally {
      btnGoogle.disabled = false;
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus();

    const email = (document.getElementById("email")?.value || "").trim();
    const password = document.getElementById("password")?.value || "";
    if (!email || !password) return setStatus("Completa los campos obligatorios.");

    try {
      if (btnEmail) btnEmail.disabled = true;
      setStatus("Iniciando sesión…");

      const res = await loginWithEmail(email, password);
      if (!res.ok) return setStatus("No se pudo iniciar sesión.");

      setStatus("Sesión iniciada. Redirigiendo…");
      setTimeout(goHome, 650);
    } catch (e2) {
      const code = String(e2?.code || "");
      if (
        code.includes("auth/invalid-credential") ||
        code.includes("auth/wrong-password") ||
        code.includes("auth/user-not-found")
      ) setStatus("Correo o contraseña incorrectos.");
      else if (code.includes("auth/invalid-email")) setStatus("Correo no válido.");
      else if (code.includes("auth/too-many-requests")) setStatus("Demasiados intentos. Prueba más tarde.");
      else setStatus("Error iniciando sesión.");
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

    if (!code) return window.location.replace("/?setup=1");

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
      return window.location.replace("/?setup=1");
    }

    document.documentElement.style.visibility = "visible";

    btnGoogle?.addEventListener("click", async () => {
      clearStatus();
      try {
        btnGoogle.disabled = true;
        setStatus("Conectando con Google…");

        const res = await registerWithGoogle(code);
        if (!res.ok) return setStatus("No se pudo completar el registro.");

        setStatus("Registro completado. Redirigiendo…");
        setTimeout(() => (window.location.href = "/es/index.html"), 650);
      } catch {
        setStatus("Error en el registro con Google.");
      } finally {
        btnGoogle.disabled = false;
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearStatus();

      const nombre = (document.getElementById("nombre")?.value || "").trim();
      const email = (document.getElementById("email")?.value || "").trim();
      const p1 = document.getElementById("password")?.value || "";
      const p2 = document.getElementById("password2")?.value || "";

      if (!email || !p1 || !p2) return setStatus("Completa los campos obligatorios.");
      if (p1.length < 8) return setStatus("La contraseña debe tener al menos 8 caracteres.");
      if (p1 !== p2) return setStatus("Las contraseñas no coinciden.");

      try {
        if (btnEmail) btnEmail.disabled = true;
        setStatus("Creando cuenta…");

        const res = await registerWithEmail(code, email, p1, nombre);
        if (!res.ok) return setStatus("No se pudo completar el registro.");

        setStatus("Registro completado. Redirigiendo…");
        setTimeout(() => (window.location.href = "/es/index.html"), 650);
      } catch (e2) {
        const msg = String(e2?.code || "");
        if (msg.includes("auth/email-already-in-use")) setStatus("Ese correo ya tiene cuenta.");
        else if (msg.includes("auth/invalid-email")) setStatus("Correo no válido.");
        else if (msg.includes("auth/weak-password")) setStatus("Contraseña demasiado débil.");
        else setStatus("Error creando la cuenta.");
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
    setBadge("Invitado");
    actionBtn.textContent = "Iniciar sesión";
    actionBtn.dataset.state = "guest";
  }
  function setUser(user) {
    const label = user?.displayName || user?.email || "Usuario";
    setBadge(label);
    actionBtn.textContent = "Cerrar sesión";
    actionBtn.dataset.state = "user";
  }

  setGuest();

  actionBtn.addEventListener("click", async () => {
    const state = actionBtn.dataset.state || "guest";

    if (state === "guest") {
      window.location.href = "/es/auth/login.html";
      return;
    }

    try {
      actionBtn.disabled = true;
      await signOut(auth);
      window.location.href = "/?setup=1";
    } catch {
      actionBtn.disabled = false;
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (user) setUser(user);
    else setGuest();
  });
}

initSetupLogin();
initSetupRegisterCode();
initLoginPage();
initRegisterPage();
initSessionUI();
