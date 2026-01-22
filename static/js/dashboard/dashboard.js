const mount = document.getElementById("dashboard-mount");

if (mount) {
  const wrap = document.createElement("div");
  wrap.className = "dashboard-wrap";

  const rect = document.createElement("div");
  rect.className = "dashboard-rect";

  wrap.appendChild(rect);
  mount.appendChild(wrap);
}
