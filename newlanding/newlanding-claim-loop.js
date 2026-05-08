(() => {
  const target = document.getElementById("newlanding-claim-text");
  if (!target) return;

  const phrases = [
    "Nos gustan las m\u00e1quinas",
    "We like machines",
    "Ci piacciono le macchine",
    "\u039c\u03b1\u03c2 \u03b1\u03c1\u03ad\u03c3\u03bf\u03c5\u03bd \u03bf\u03b9 \u03bc\u03b7\u03c7\u03b1\u03bd\u03ad\u03c2",
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
