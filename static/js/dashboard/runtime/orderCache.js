const ORDER_CACHE_KEY = "unatomo_order_v1";

export const loadOrderCache = () => {
  try {
    const raw = localStorage.getItem(ORDER_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const saveOrderCache = (list) => {
  try {
    const map = {};
    (list || []).forEach((machine) => {
      if (machine?.id) map[machine.id] = machine.order ?? 0;
    });
    localStorage.setItem(ORDER_CACHE_KEY, JSON.stringify(map));
  } catch {
    // Local cache is a non-critical ordering fallback.
  }
};
