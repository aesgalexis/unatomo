(() => {
  const select = document.getElementById("asunto");
  const brandSelect = document.getElementById("marca");
  const messageField = document.getElementById("mensaje");
  const recambiosOnlyFields = Array.from(
    document.querySelectorAll("[data-recambios-only]")
  );
  if (!select) return;

  const allowed = new Set(["card1", "card2", "card3", "card4", "card5", "card6", "other"]);
  const params = new URLSearchParams(window.location.search);
  const initialSubject = (params.get("subject") || "").trim().toLowerCase();
  const fromRecambios = initialSubject === "card5";
  const machineType = (params.get("type") || "").trim();
  const machineBrand = (params.get("brand") || "").trim();
  const machineModel = (params.get("model") || "").trim();
  const machineYear = (params.get("year") || "").trim();
  const machineId = (params.get("id") || "").trim();

  const getLang = () => {
    if (window.unatomoI18n && typeof window.unatomoI18n.getLanguage === "function") {
      return window.unatomoI18n.getLanguage();
    }
    return (document.documentElement.lang || "es").slice(0, 2).toLowerCase();
  };

  const buildMachineMessage = () => {
    if (!machineType || !machineBrand || !machineModel || !machineYear) return "";
    const parts = [machineType, machineBrand, machineModel, machineYear];
    if (machineId) parts.push(machineId);
    const machineLabel = parts.join(", ");
    const lang = getLang();
    if (lang === "en") {
      return `I want to receive information about the following machine: ${machineLabel}`;
    }
    if (lang === "it") {
      return `Voglio ricevere informazioni sulla seguente macchina: ${machineLabel}`;
    }
    if (lang === "el") {
      return `Θελω να λαβω πληροφοριες για το ακολουθο μηχανημα: ${machineLabel}`;
    }
    return `Quiero recibir información sobre la siguiente maquina: ${machineLabel}`;
  };

  const populateBrands = () => {
    if (!brandSelect) return;
    const brands = Array.isArray(window.lsRecambiosBrandList)
      ? [...window.lsRecambiosBrandList].sort((a, b) =>
          String(a).localeCompare(String(b), "es", { sensitivity: "base" })
        )
      : [];
    const placeholder = brandSelect.querySelector('option[value=""]');
    const currentValue = brandSelect.value;
    brandSelect.innerHTML = "";
    if (placeholder) brandSelect.appendChild(placeholder);

    for (const brand of brands) {
      const option = document.createElement("option");
      option.value = brand;
      option.textContent = brand;
      brandSelect.appendChild(option);
    }

    if (currentValue && brandSelect.querySelector(`option[value="${currentValue}"]`)) {
      brandSelect.value = currentValue;
    }
  };

  const setRecambiosFieldsVisible = (visible) => {
    for (const field of recambiosOnlyFields) {
      field.hidden = !visible;
      field.setAttribute("aria-hidden", visible ? "false" : "true");
    }
  };

  const applySubject = () => {
    const subject = (params.get("subject") || "").trim().toLowerCase();
    if (!allowed.has(subject)) return;
    if (!select.querySelector(`option[value="${subject}"]`)) return;
    select.value = subject;
  };

  const applyMessage = () => {
    if (!messageField) return;
    if (messageField.value.trim()) return;
    const nextMessage = buildMachineMessage();
    if (!nextMessage) return;
    messageField.value = nextMessage;
  };

  populateBrands();
  applySubject();
  applyMessage();
  setRecambiosFieldsVisible(fromRecambios);
  document.addEventListener("app:language-change", () => {
    applySubject();
    applyMessage();
  });
})();
