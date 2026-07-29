(() => {
  const THEME_KEY = "ls_theme";
  let theme = "dark";
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") theme = stored;
  } catch {}
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.backgroundColor = theme === "dark" ? "#000" : "#fff";
})();
