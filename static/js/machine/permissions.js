export const canSeeTab = (role, tab) => {
  if (role === "admin") return ["quehaceres", "general", "historial"].includes(tab);
  if (role === "usuario") return tab === "quehaceres";
  if (role === "tecnico" || role === "externo") {
    return ["quehaceres", "general", "historial"].includes(tab);
  }
  return false;
};

export const canEditStatus = (role) => {
  return role === "usuario" || role === "admin";
};

export const canEditTasks = () => {
  return false;
};

export const canDownloadHistory = (role) => {
  return role === "tecnico" || role === "admin";
};

export const canSeeConfig = () => {
  return false;
};
