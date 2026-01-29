const strip = (value) =>
  (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const normalizeForSearch = (value) =>
  strip(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

export const matchesMachine = (machine, query) => {
  if (!query) return true;
  const haystackTitle = normalizeForSearch(machine.title || "");
  const haystackLocation = normalizeForSearch(machine.location || "");
  return (
    haystackTitle.includes(query) || haystackLocation.includes(query)
  );
};

export const filterMachines = (list, query) => {
  const needle = normalizeForSearch(query || "");
  if (!needle) return list;
  return (list || []).filter((machine) => matchesMachine(machine, needle));
};
