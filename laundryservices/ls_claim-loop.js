(() => {
  const target = document.getElementById("ls-claim-loop-text");
  if (!target) return;

  const phrases = [
    "Tu proceso, Nuestra visi\u00f3n",
    "Your process, Our insight",
    "Il tuo processo, la nostra visione",
    "\u0397 \u03b4\u03b9\u03b1\u03b4\u03b9\u03ba\u03b1\u03c3\u03af\u03b1 \u03c3\u03b1\u03c2, \u03b7 \u03b3\u03bd\u03ce\u03c3\u03b7 \u03bc\u03b1\u03c2",
  ];

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fadeMs = prefersReducedMotion ? 0 : 340;
  const holdMs = prefersReducedMotion ? 3200 : 4600;
  const intervalMs = fadeMs + holdMs;

  let index = 0;
  let intervalId = null;
  let transitionId = null;

  const applyPhrase = (nextIndex) => {
    index = nextIndex % phrases.length;
    target.textContent = phrases[index];
  };

  const tick = () => {
    if (prefersReducedMotion) {
      applyPhrase(index + 1);
      return;
    }

    target.classList.add("is-transitioning");
    transitionId = window.setTimeout(() => {
      applyPhrase(index + 1);
      target.classList.remove("is-transitioning");
      transitionId = null;
    }, fadeMs);
  };

  const start = () => {
    if (intervalId !== null) return;
    intervalId = window.setInterval(tick, intervalMs);
  };

  const stop = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    if (transitionId !== null) {
      window.clearTimeout(transitionId);
      transitionId = null;
      target.classList.remove("is-transitioning");
    }
  };

  applyPhrase(0);
  start();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
      return;
    }
    start();
  });
})();
