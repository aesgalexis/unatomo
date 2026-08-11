const clearPrintMode = () => {
  document.body.classList.remove("qr-print-printing", "qr-print-include-back");
};

const printDocument = (includeBackNames) =>
  new Promise((resolve) => {
    clearPrintMode();
    document.body.classList.add("qr-print-printing");
    if (includeBackNames) document.body.classList.add("qr-print-include-back");
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      window.removeEventListener("afterprint", cleanup);
      clearPrintMode();
      resolve();
    };
    window.addEventListener("afterprint", cleanup);
    window.setTimeout(() => {
      if (typeof window.print === "function") window.print();
      else if (typeof globalThis.print === "function") globalThis.print();
      window.setTimeout(cleanup, 1000);
    }, 0);
  });

export const requestQrPrint = async (includeBackNames) => {
  try {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
  } catch {
    // Ignore focus cleanup failures.
  }
  await printDocument(includeBackNames);
};

export const getFocusedQrMachineId = () => {
  try {
    return new URLSearchParams(window.location.search).get("machineId") || "";
  } catch {
    return "";
  }
};
