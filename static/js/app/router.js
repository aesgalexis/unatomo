const normalizeHash = () => {
  if (!window.location.hash) return "#/";
  return window.location.hash;
};

const parseRoute = (hash) => {
  const clean = hash.replace(/^#/, "");
  const path = clean.startsWith("/")  clean : `/${clean}`;
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) {
    return { name: "dashboard" };
  }

  if (parts[0] === "m" && parts[1]) {
    return {
      name: "machine",
      id: parts[1],
      tab: parts[2] || "general"
    };
  }

  return { name: "dashboard" };
};

const onRouteChange = (handler) => {
  window.addEventListener("hashchange", handler);
};

export { normalizeHash, parseRoute, onRouteChange };
