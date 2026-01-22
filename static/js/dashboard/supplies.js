const mount = document.getElementById("supplies-mount");

if (mount) {
  const wrap = document.createElement("div");
  wrap.className = "supplies-wrap";

  const rect = document.createElement("div");
  rect.className = "supplies-rect";

  const list = document.createElement("div");
  list.className = "supplies-grid";

  const items = [
    "Agua",
    "Electricidad",
    "Gas",
    "Producto químico",
    "Químicos",
  ];

  items.forEach((label) => {
    const card = document.createElement("div");
    card.className = "supplies-card";

    const title = document.createElement("div");
    title.className = "supplies-card-title";
    title.textContent = label;

    card.appendChild(title);
    list.appendChild(card);
  });

  rect.appendChild(list);
  wrap.appendChild(rect);
  mount.appendChild(wrap);
}
