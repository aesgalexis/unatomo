(() => {
  const THEME_KEY = "ls_theme";
  try {
    const stored = localStorage.getItem(THEME_KEY);
    const theme = stored === "dark" || stored === "light" ? stored : "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.backgroundColor = theme === "dark" ? "#000" : "#fff";
  } catch {}
})();
