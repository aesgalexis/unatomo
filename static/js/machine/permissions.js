export const canSeeTab = (role, tab) => {
  if (role === "admin") {
    return ["quehaceres", "general", "historial", "configuracion"].includes(tab);
  }
  if (role === "usuario") return tab === "quehaceres";
  if (role === "tecnico" || role === "externo") {
    return ["quehaceres", "general", "historial"].includes(tab);
  }
  return false;
};

export const canEditStatus = (role) => {
  return role === "usuario" || role === "admin";
};

export const canEditTasks = (role) => {
  return role === "admin";
};

export const canDownloadHistory = (role) => {
  return role === "tecnico" || role === "admin";
};

export const canSeeConfig = (role) => {
  return role === "admin";
};
