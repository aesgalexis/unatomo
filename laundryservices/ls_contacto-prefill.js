(() => {
  const select = document.getElementById("asunto");
  if (!select) return;

  const allowed = new Set(["card1", "card2", "card3", "card4", "card5", "other"]);
  const applySubject = () => {
    const params = new URLSearchParams(window.location.search);
    const subject = (params.get("subject") || "").trim().toLowerCase();
    if (!allowed.has(subject)) return;
    if (!select.querySelector(`option[value="${subject}"]`)) return;
    select.value = subject;
  };

  applySubject();
  document.addEventListener("app:language-change", applySubject);
})();
