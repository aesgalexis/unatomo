/* mobile_dots.css — Dots como parte del layout (sin fixed/sticky) */

/* Pantallas móviles (puedes ajustar el ancho si quieres) */
@media (max-width: 1200px) {

  /* 1) Anula cualquier posicionamiento previo de los contenedores de dots */
  #screen2 .dots-acerca,
  #screen3 .dots,
  #screen4 .dots,
  #screen5 .dots {
    position: static !important;     /* clave: en flujo */
    z-index: auto !important;        /* no por encima del carrusel */
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    gap: 6px !important;

    /* bloque propio debajo del carrusel */
    margin: 12px 0 0 !important;     /* un poco de aire */
    padding: 0 !important;
    height: 28px !important;         /* suficiente para 1 fila de puntos */
    background: transparent !important;

    /* neutraliza efectos pasados */
    top: auto !important;
    right: auto !important;
    left: auto !important;
    bottom: auto !important;
    transform: none !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    transition: none !important;
  }

  /* 2) Asegura que los carruseles NO reserven hueco extra abajo */
  #screen2 .acerca .acerca-mobile,
  #screen3 .servicios .grid,
  #screen4 .tecno .grid,
  #screen5 .soft .grid {
    padding-bottom: 0 !important;    /* nada de espacio para “dots flotantes” */
  }

  /* 3) Botones (puntos) */
  #screen2 .dots-acerca .dot,
  #screen3 .dots .dot,
  #screen4 .dots .dot,
  #screen5 .dots .dot {
    width: 6px !important;
    height: 6px !important;
    border-radius: 50% !important;
    border: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    appearance: none !important;
    -webkit-appearance: none !important;
    background: currentColor !important;
    -webkit-tap-highlight-color: transparent !important;
  }

  /* 4) Colores por tema (igual que tenías) */
  :root[data-theme="light"] #screen2 .dots-acerca .dot,
  :root[data-theme="light"] #screen3 .dots .dot,
  :root[data-theme="light"] #screen4 .dots .dot,
  :root[data-theme="light"] #screen5 .dots .dot { color: hsl(0 0% 15% / 0.55) !important; }
  :root[data-theme="light"] #screen2 .dots-acerca .dot[aria-current="true"],
  :root[data-theme="light"] #screen3 .dots .dot[aria-current="true"],
  :root[data-theme="light"] #screen4 .dots .dot[aria-current="true"],
  :root[data-theme="light"] #screen5 .dots .dot[aria-current="true"],
  :root[data-theme="light"] #screen2 .dots-acerca .dot.active,
  :root[data-theme="light"] #screen3 .dots .dot.active,
  :root[data-theme="light"] #screen4 .dots .dot.active,
  :root[data-theme="light"] #screen5 .dots .dot.active { color: hsl(0 0% 0%); }

  :root[data-theme="dark"] #screen2 .dots-acerca .dot,
  :root[data-theme="dark"] #screen3 .dots .dot,
  :root[data-theme="dark"] #screen4 .dots .dot,
  :root[data-theme="dark"] #screen5 .dots .dot { color: hsl(0 0% 85% / 0.55) !important; }
  :root[data-theme="dark"] #screen2 .dots-acerca .dot[aria-current="true"],
  :root[data-theme="dark"] #screen3 .dots .dot[aria-current="true"],
  :root[data-theme="dark"] #screen4 .dots .dot[aria-current="true"],
  :root[data-theme="dark"] #screen5 .dots .dot[aria-current="true"],
  :root[data-theme="dark"] #screen2 .dots-acerca .dot.active,
  :root[data-theme="dark"] #screen3 .dots .dot.active,
  :root[data-theme="dark"] #screen4 .dots .dot.active,
  :root[data-theme="dark"] #screen5 .dots .dot.active { color: hsl(0 0% 100%); }
}
