const mount = document.getElementById("public-section-mount");
const sectionId = document.body.dataset.publicSection;

const renderers = {
  tags: () => import("/static/js/sections/tags.js"),
  novedades: () => import("/static/js/sections/novedades.js"),
};

if (mount && renderers[sectionId]) {
  const { render } = await renderers[sectionId]();
  render(mount, { headingTag: "h1" });
}
