(() => {
  try {
    const stored = localStorage.getItem("theme");
    const theme =
      stored === "dark" || stored === "light" ? stored : "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.backgroundColor = theme === "dark" ? "#000" : "#fff";
  } catch {}
})();
