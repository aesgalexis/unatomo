(() => {
  const select = document.getElementById("asunto");
  const messageField = document.getElementById("mensaje");
  if (!select) return;

  const allowed = new Set(["audit", "assistance", "investment", "digital", "other"]);
  const legacySubjects = {
    card1: "audit",
    card2: "investment",
    card3: "digital",
    card4: "assistance",
    card5: "other",
    card6: "investment",
  };
  const params = new URLSearchParams(window.location.search);
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
    if (!machineType || !machineBrand || !machineModel) return "";
    const parts = [machineType, machineBrand, machineModel];
    if (machineYear) parts.push(machineYear);
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
      return `Θέλω να λάβω πληροφορίες για το ακόλουθο μηχάνημα: ${machineLabel}`;
    }
    return `Quiero recibir información sobre la siguiente máquina: ${machineLabel}`;
  };

  const applySubject = () => {
    const requestedSubject = (params.get("subject") || "").trim().toLowerCase();
    const subject = legacySubjects[requestedSubject] || requestedSubject;
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

  applySubject();
  applyMessage();
  document.addEventListener("app:language-change", () => {
    applySubject();
    applyMessage();
  });
})();
