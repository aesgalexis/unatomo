(() => {
  const TYPE_PREFIX_RULES = {
    folder: "P",
    folding_machine: "P",
    plegadora: "P",
    washer: "L",
    washing_machine: "L",
    lavadora: "L",
    tunnel: "T",
    washing_tunnel: "T",
    tunel: "T",
    dryer: "S",
    tumble_dryer: "S",
    secadora: "S",
    ironer: "C",
    calender: "C",
    calandra: "C",
    press: "R",
    prensa: "R",
    packaging_machine: "E",
    packaging_machinery: "E",
    empaquetadora: "E",
    empaquetadoras: "E",
  };

  const normalizeTypeKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const getTypePrefix = (type) => TYPE_PREFIX_RULES[normalizeTypeKey(type)] || "M";

  const formatSequence = (sequence) => String(Math.max(1, Number(sequence) || 1)).padStart(3, "0");

  const buildMachineId = (type, sequence) => `${getTypePrefix(type)}${formatSequence(sequence)}`;

  window.lsMachineId = {
    typePrefixRules: { ...TYPE_PREFIX_RULES },
    getTypePrefix,
    formatSequence,
    buildMachineId,
  };
})();
