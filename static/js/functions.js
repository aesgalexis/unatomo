(function () {
  const scrollTopButton = document.getElementById("scroll-top-button");
  if (!scrollTopButton) return;

  scrollTopButton.addEventListener("click", function () {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
})();

