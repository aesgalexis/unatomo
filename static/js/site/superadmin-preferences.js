const LANGUAGE_TOGGLE_KEY = "unatomo_superadmin_language_toggle_visible_v1";

export const isSuperadminLanguageToggleVisible = () => {
  try {
    return localStorage.getItem(LANGUAGE_TOGGLE_KEY) !== "false";
  } catch {
    return true;
  }
};

export const applySuperadminLanguageTogglePreference = () => {
  const visible = isSuperadminLanguageToggleVisible();
  document.documentElement.dataset.superadminLanguageToggle = visible ? "true" : "false";
  return visible;
};

export const setSuperadminLanguageToggleVisible = (visible) => {
  try {
    localStorage.setItem(LANGUAGE_TOGGLE_KEY, visible ? "true" : "false");
  } catch {
    // Keep the preference active for the current page when storage is unavailable.
  }
  document.documentElement.dataset.superadminLanguageToggle = visible ? "true" : "false";
};
