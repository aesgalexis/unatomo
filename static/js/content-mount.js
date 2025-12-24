const mounts = document.querySelectorAll("[data-include-html]");
for (const el of mounts) {
  const url = (el.getAttribute("data-include-html") || "").trim();
  if (!url) continue;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("include fetch failed");
    el.innerHTML = await res.text();
  } catch {
    el.innerHTML = "";
  }
}
