(() => {
  const IMAGE_MANIFEST = {
    P001: [
      "/laundryservices/ls_maquinaria/imagenes/P001/IMG_2946.JPG",
      "/laundryservices/ls_maquinaria/imagenes/P001/IMG_2947.JPG",
    ],
    L001: [
      "/laundryservices/ls_maquinaria/imagenes/L001/unnamed.jpg",
    ],
  };

  const rows = Array.from(document.querySelectorAll(".ls-table tbody tr[data-machine-id]"));
  if (!rows.length) return;

  rows.forEach((row) => {
    const id = row.getAttribute("data-machine-id");
    const images = IMAGE_MANIFEST[id];
    if (!id || !Array.isArray(images) || !images.length) return;

    const priceRow =
      row.nextElementSibling && row.nextElementSibling.classList.contains("ls-table-subrow")
        ? row.nextElementSibling
        : null;
    if (!priceRow) return;
    priceRow.classList.add("ls-table-subrow-has-gallery");

    const galleryRow = document.createElement("tr");
    galleryRow.className = "ls-table-gallery-row";
    galleryRow.setAttribute("data-gallery-id", id);
    galleryRow.dataset.galleryOpen = "false";
    galleryRow.hidden = true;
    galleryRow.innerHTML = `
      <td colspan="7">
        <div class="ls-machine-gallery" aria-label="Imagenes de ${id}">
          ${images
            .map(
              (src, index) => `
                <a href="${src}" target="_blank" rel="noreferrer">
                  <img src="${src}" alt="${id} imagen ${index + 1}" loading="lazy" />
                </a>
              `
            )
            .join("")}
        </div>
      </td>
    `;

    priceRow.insertAdjacentElement("afterend", galleryRow);
  });

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest(".ls-gallery-toggle");
    if (!toggle) return;
    const id = toggle.getAttribute("data-gallery-id");
    if (!id) return;
    const galleries = document.querySelectorAll(`.ls-table-gallery-row[data-gallery-id="${id}"]`);
    galleries.forEach((row) => {
      const priceRow = row.previousElementSibling;
      const nextOpen = row.dataset.galleryOpen !== "true";
      row.dataset.galleryOpen = nextOpen ? "true" : "false";
      row.hidden = !nextOpen;
      if (priceRow && priceRow.classList.contains("ls-table-subrow")) {
        priceRow.classList.toggle("is-gallery-open", nextOpen);
      }
    });
  });
})();
