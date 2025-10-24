(function() {
  let jumped = false;

  window.addEventListener("wheel", (event) => {
    if (jumped) return;
    if (event.deltaY > 0) {
      jumped = true;
      document.getElementById("screen2").scrollIntoView({ 
        behavior: "smooth" 
      });
    }
  }, { passive: true });
})();
