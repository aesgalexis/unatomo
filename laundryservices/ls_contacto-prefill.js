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

  const buildMachineMessage = () => {
    if (!machineType || !machineBrand || !machineModel) return "";
    const parts = [machineType, machineBrand, machineModel];
    if (machineYear) parts.push(machineYear);
    if (machineId) parts.push(machineId);
    const machineLabel = parts.join(", ");
    const template = messageField?.dataset.machineMessageTemplate || "{machine}";
    return template.replace("{machine}", machineLabel);
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
})();
