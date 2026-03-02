(() => {
  const select = document.getElementById("asunto");
  const brandSelect = document.getElementById("marca");
  const recambiosOnlyFields = Array.from(
    document.querySelectorAll("[data-recambios-only]")
  );
  if (!select) return;

  const allowed = new Set(["card1", "card2", "card3", "card4", "card5", "other"]);
  const params = new URLSearchParams(window.location.search);
  const initialSubject = (params.get("subject") || "").trim().toLowerCase();
  const fromRecambios = initialSubject === "card5";

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

  populateBrands();
  applySubject();
  setRecambiosFieldsVisible(fromRecambios);
  document.addEventListener("app:language-change", applySubject);
})();
