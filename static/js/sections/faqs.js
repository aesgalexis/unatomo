import { getCurrentLang } from "/static/js/site/locale.js";

export const render = (mount) => {
  const isEn = getCurrentLang() === "en";
  const wrap = document.createElement("div");
  wrap.className = "section-block";
  wrap.innerHTML = `
    <h2>FAQs</h2>
    <div class="section-faq">
      <p>${isEn ? "No question asked" : "No hay ninguna pregunta planteada"}</p>
    </div>
  `;
  mount.appendChild(wrap);
};
