(() => {
  try {
    const stored = localStorage.getItem("theme");
    if (stored !== "dark" && stored !== "light") return;
    document.documentElement.dataset.theme = stored;
    document.documentElement.style.backgroundColor = stored === "dark" ? "#000" : "#fff";
  } catch {}
})();
