// /static/js/topbar.js
(function(){
  const SLOT_ID = "topbar-slot";

  function ensureSlot(){
    let slot = document.getElementById(SLOT_ID);
    if (!slot){
      slot = document.createElement("div");
      slot.id = SLOT_ID;
      // Lo insertamos al principio del <body> para cargar muy pronto.
      document.body.prepend(slot);
    }
    return slot;
  }

  async function mountTopbar(){
    try{
      const slot = ensureSlot();
      const res = await fetch("/es/topbar.html", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar /es/topbar.html");
      const html = await res.text();
      slot.innerHTML = html;
    }catch(err){
      // Falla en silencio para no romper la app
      console.error("[topbar] ", err);
    }
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", mountTopbar, { once: true });
  }else{
    mountTopbar();
  }
})();

