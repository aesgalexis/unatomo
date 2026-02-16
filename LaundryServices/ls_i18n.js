(() => {
  const LANGS = ["es", "en", "el"];

  const I18N = {
    es: {
      page_title: "unatomo | Laundry Services",
      page_desc:
        "Servicios tecnicos para lavanderias industriales: auditoria, asesoramiento y control de productividad.",
      lang_option_en: "Ingles",
      lang_option_es: "Espanol",
      lang_option_el: "Griego",
      hero_title:
        "Auditoria, asesoramiento y soporte tecnico para lavanderias industriales.",
      hero_lead:
        "Servicios independientes para optimizar procesos, validar inversiones y capturar datos utiles para la operacion diaria.",
      card1_title: "Auditoria tecnica y de procesos",
      card1_p1:
        "Deteccion de puntos criticos para optimizar el rendimiento de planta. Realizamos una inspeccion integral para identificar donde se esta perdiendo rendimiento y como se podria evitar. Nos centramos en corregir cuellos de botella, fallos recurrentes y desajustes operativos que lastran la produccion en el dia a dia.",
      card1_p2:
        "Realizamos un informe tecnico por secciones con prioridades claras sobre en que urge intervenir, que mejoras programar y que inversiones pueden resultar mas rentables.",
      card1_p3:
        "Ponemos el foco en el analisis de los flujos de produccion, mantenimiento preventivo, recambios criticos y habitos de trabajo.",
      card1_price: "Desde 1790 EUR/dia",
      card1_price_note: "(Informe incluido en el precio)",
      card1_cta: "Contratar",
      card2_title: "Asesoria independiente de equipamiento",
      card2_p1:
        "Validacion tecnica de inversiones sin conflictos de interes. Aportamos perspectiva tecnica antes de que cierren su proxima compra. No representamos marcas ni cobramos comisiones de fabricantes. Nuestro objetivo es asegurar que el equipo sea el adecuado para su operativa real.",
      card2_p2:
        "Realizamos un analisis exhaustivo de idoneidad, virtudes, limitaciones y flexibilidad de la maquina a medio-largo plazo.",
      card2_p3:
        "Evaluamos el servicio postventa y mantenimiento: dependencia de repuestos, facilidad de servicio tecnico y vida util esperable.",
      card2_p4:
        "Acompanamiento: revision del pliego tecnico y comparativa de alternativas antes de la decision final.",
      card2_price: "Desde 1,5% del coste de la inversion",
      card2_cta: "Solicitar",
      card3_title: "Control de productividad, consumos y captura de datos",
      card3_p1:
        "Software adaptado para recabar datos de todo lo que se pueda considerar relevante para la produccion. Implementamos soluciones de monitorizacion que captura, traduce y representa el trabajo de la lavanderia en datos utiles para el control diario y la toma de decisiones.",
      card3_cta: "Consultar",
      card4_title: "Asistencia técnica",
      card4_cta: "No disponible",
      privacy_link: "Politica de privacidad y cookies",
      legal_footer: "UNATOMO CORE SL - Todos los derechos reservados.",
    },
    en: {
      page_title: "unatomo | Laundry Services",
      page_desc:
        "Technical services for industrial laundries: audits, advisory and productivity control.",
      lang_option_en: "Ingles",
      lang_option_es: "Espanol",
      lang_option_el: "Griego",
      hero_title:
        "Audit, advisory and technical support for industrial laundries.",
      hero_lead:
        "Independent services to optimize processes, validate investments and capture useful data for daily operations.",
      card1_title: "Technical and process audit",
      card1_p1:
        "Detection of critical points to optimize plant performance. We perform a full inspection to identify where performance is being lost and how to prevent it. We focus on correcting bottlenecks, recurring failures and operational imbalances that hurt day-to-day production.",
      card1_p2:
        "We provide a technical report by section with clear priorities on what requires urgent action, what improvements to schedule, and what investments can be more profitable.",
      card1_p3:
        "We focus on production flow analysis, preventive maintenance, critical spare parts and work practices.",
      card1_price: "From 1790 EUR/day",
      card1_price_note: "(Report included in the price)",
      card1_cta: "Hire",
      card2_title: "Independent equipment advisory",
      card2_p1:
        "Technical validation of investments without conflicts of interest. We provide technical perspective before you close your next purchase. We do not represent brands or receive commissions from manufacturers. Our goal is to ensure the equipment truly fits your operation.",
      card2_p2:
        "We perform a thorough analysis of suitability, strengths, limitations and medium-term to long-term flexibility.",
      card2_p3:
        "We evaluate after-sales service and maintenance: spare-part dependency, serviceability and expected useful life.",
      card2_p4:
        "Support: technical specification review and alternative comparison before final decision.",
      card2_price: "From 1.5% of investment cost",
      card2_cta: "Request",
      card3_title: "Productivity control and data capture",
      card3_p1:
        "Custom software to collect data from everything considered relevant to production. We implement monitoring solutions that capture, translate and represent laundry operations into useful data for daily control and decision-making.",
      card3_cta: "Consult",
      card4_title: "Technical assistance",
      card4_cta: "Unavailable",
      privacy_link: "Privacy and cookies policy",
      legal_footer: "UNATOMO CORE SL - All rights reserved.",
    },
    el: {
      page_title: "unatomo | Laundry Services",
      page_desc:
        "Τεχνικές υπηρεσίες για βιομηχανικά πλυντήρια: έλεγχος, συμβουλευτική και έλεγχος παραγωγικότητας.",
      lang_option_en: "English",
      lang_option_es: "Spanish",
      lang_option_el: "Greek",
      hero_title:
        "Ελεγχος, συμβουλευτικη και τεχνικη υποστηριξη για βιομηχανικα πλυντηρια.",
      hero_lead:
        "Ανεξαρτητες υπηρεσιες για βελτιστοποιηση διαδικασιων, αξιολογηση επενδυσεων και συλλογη χρησιμων δεδομενων για την καθημερινη λειτουργια.",
      card1_title: "Τεχνικος και λειτουργικος ελεγχος",
      card1_p1:
        "Εντοπισμος κρισιμων σημειων για βελτιστοποιηση της αποδοσης της μοναδας. Πραγματοποιουμε ολοκληρωμενη επιθεωρηση για να εντοπισουμε που χανεται αποδοση και πως μπορει να αποτραπει. Εστιαζουμε στη διορθωση σημειων συμφόρησης, επαναλαμβανομενων βλαβων και λειτουργικων αστοχιων που επηρεαζουν την καθημερινη παραγωγη.",
      card1_p2:
        "Παρεχουμε τεχνικη αναφορα ανα τομεα με σαφεις προτεραιοτητες για αμεσες παρεμβασεις, προγραμματισμενες βελτιωσεις και πιο αποδοτικες επενδυσεις.",
      card1_p3:
        "Εστιαζουμε στην αναλυση ροων παραγωγης, στην προληπτικη συντηρηση, στα κρισιμα ανταλλακτικα και στις πρακτικες εργασιας.",
      card1_price: "Απο 1790 EUR/ημερα",
      card1_price_note: "(Η αναφορα περιλαμβανεται στην τιμη)",
      card1_cta: "Αναθεση",
      card2_title: "Ανεξαρτητη συμβουλευτικη εξοπλισμου",
      card2_p1:
        "Τεχνικη αξιολογηση επενδυσεων χωρις συγκρουση συμφεροντων. Παρεχουμε τεχνικη οπτικη πριν την επομενη αγορα σας. Δεν εκπροσωπουμε μαρκες και δεν λαμβανουμε προμηθειες απο κατασκευαστες. Στοχος μας ειναι ο εξοπλισμος να ταιριαζει πραγματικα στη λειτουργια σας.",
      card2_p2:
        "Πραγματοποιουμε πληρη αναλυση καταλληλοτητας, πλεονεκτηματων, περιορισμων και ευελιξιας σε μεσο-μακροπροθεσμο οριζοντα.",
      card2_p3:
        "Αξιολογουμε την υποστηριξη μετα την πωληση και τη συντηρηση: εξαρτηση απο ανταλλακτικα, ευκολια τεχνικης εξυπηρετησης και αναμενομενη διαρκεια ζωης.",
      card2_p4:
        "Υποστηριξη: ελεγχος τεχνικων προδιαγραφων και συγκριση εναλλακτικων πριν την τελικη αποφαση.",
      card2_price: "Απο 1,5% του κοστους επενδυσης",
      card2_cta: "Αιτηση",
      card3_title: "Ελεγχος παραγωγικοτητας και συλλογη δεδομενων",
      card3_p1:
        "Προσαρμοσμενο λογισμικο για συλλογη δεδομενων απο καθε στοιχειο που θεωρειται σημαντικο για την παραγωγη. Υλοποιουμε λυσεις παρακολουθησης που καταγραφουν, μετατρεπουν και παρουσιαζουν τη λειτουργια του πλυντηριου σε χρησιμα δεδομενα για καθημερινο ελεγχο και ληψη αποφασεων.",
      card3_cta: "Συμβουλη",
      card4_title: "Τεχνικη υποστηριξη",
      card4_cta: "Μη διαθεσιμο",
      privacy_link: "Πολιτικη απορρητου και cookies",
      legal_footer: "UNATOMO CORE SL - Με επιφυλαξη παντος δικαιωματος.",
    },
  };

  const normalize = (lang) => (LANGS.includes(lang) ? lang : "es");

  const setLanguage = (lang) => {
    const next = normalize(lang);
    const t = I18N[next];

    document.documentElement.lang = next;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key || typeof t[key] !== "string") return;
      el.textContent = t[key];
    });

    document.title = t.page_title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t.page_desc);

    const label = document.querySelector(".lang-label");
    if (label) {
      const selectorLabelByContent = {
        es: "ES",
        en: "EN",
        el: "EL",
      };
      label.textContent = selectorLabelByContent[next] || "ES";
    }

    try {
      localStorage.setItem("lang", next);
    } catch {}

    document.dispatchEvent(
      new CustomEvent("app:language-change", { detail: { lang: next, dict: t } })
    );
  };

  const getLanguage = () => {
    try {
      const stored = localStorage.getItem("lang");
      if (stored) return normalize(stored);
    } catch {}
    return normalize(document.documentElement.lang || "es");
  };

  window.unatomoI18n = { setLanguage, getLanguage, supported: [...LANGS] };
  setLanguage(getLanguage());
})();
