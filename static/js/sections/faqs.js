export const render = (mount) => {
  const wrap = document.createElement("div");
  wrap.className = "section-block";
  wrap.innerHTML = `
    <h2>FAQs</h2>
    <div class="section-faq">
      <p>No question asked</p>
    </div>
  `;
  mount.appendChild(wrap);
};
