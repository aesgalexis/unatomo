(function () {
  function init() {
    const btn = document.getElementById("export-pdf");
    if (!btn) return;
    btn.addEventListener("click", () => {
      window.print();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
