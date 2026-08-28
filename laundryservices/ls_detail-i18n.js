(() => {
  const EN = {
    investment: {
      page_title: "UNATOMO | Investments and projects for laundries",
      hero_title: "Investment decisions based on technical judgement and a plant-wide view",
      hero_lead: "We analyse needs, proposals and equipment before purchase so that every investment matches real production, integrates into the process and retains its value throughout its service life.",
      hero_cta: "Review an investment",
      positioning_kicker: "Before committing the budget",
      positioning_title: "The best machine is not always the best solution",
      positioning_body_1: "An investment must fit volumes, product mix, shifts, staffing, utilities and the equipment already in place. A technical data sheet alone cannot explain that fit.",
      positioning_body_2: "We provide an independent assessment, without representing brands or receiving manufacturer commissions. We start with the laundry's needs and the result the project must deliver.",
      services_kicker: "What we review",
      services_title: "From the need to a viable project",
      services_intro: "We compare the commercial proposal with real operations to identify hidden costs, dependencies and decisions that should be settled before signing.",
      service_1_title: "Need, capacity and sizing",
      service_1_body: "We define the problem the investment must solve and the useful capacity the plant needs, avoiding both bottlenecks and oversizing.",
      service_1_point_1: "Hourly output, peaks, shifts and expected growth",
      service_1_point_2: "Compatibility with upstream and downstream processes",
      service_1_point_3: "Flexibility for changes in customers, formats or linen types",
      service_2_title: "Technical comparison of proposals",
      service_2_body: "We organise bids using comparable criteria and review performance, scope, exclusions, warranties and service commitments.",
      service_2_point_1: "Expected output, quality, automation and consumption",
      service_2_point_2: "Maintenance, spare parts, support and expected service life",
      service_2_point_3: "Installation, testing and acceptance conditions",
      service_3_title: "Integration and project costs",
      service_3_body: "A purchase rarely ends with the machine itself. We review building work, utilities, internal transport, safety, data and the changes required to put it into production.",
      service_3_point_1: "Electricity, steam, air, water, extraction and available space",
      service_3_point_2: "Ancillary work, access, flows and adaptation of other equipment",
      service_3_point_3: "Total implementation, operating and maintenance cost",
      service_4_title: "Commissioning and verification",
      service_4_body: "We can support installation and verify that the equipment delivers what was agreed under real conditions, with defined responsibilities, measurements and acceptance criteria.",
      signals_kicker: "When to involve us",
      signals_title: "Before a decision that is difficult to reverse is final",
      signal_1: "There are several bids and comparing them on equal terms is difficult.",
      signal_2: "The promised capacity has not been checked against the actual production mix.",
      signal_3: "The project may require changes to utilities, flows or existing equipment.",
      signal_4: "There are questions about after-sales service, spare parts or maintenance cost.",
      signal_5: "The investment is strategic and an independent second opinion is needed.",
      approach_kicker: "How we add value",
      approach_title: "A recommendation that can be explained and verified",
      approach_1_title: "Clear criteria",
      approach_1_body: "We document assumptions, risks, comparisons and open points so the decision does not depend only on impressions or sales arguments.",
      approach_2_title: "A tailored scope",
      approach_2_body: "We can review one proposal, compare alternatives or support the project from defining needs through final acceptance.",
      cta_kicker: "Your next investment",
      cta_title: "Validate the project before making the commitment",
      cta_body: "Tell us what you need to solve and which proposals you are considering. We will define a review suited to the size and stage of the investment.",
      cta_button: "Discuss my project",
    },
    automation: {
      page_title: "UNATOMO | Counters and automation for laundries",
      hero_title: "Counters and automation to understand and improve production",
      hero_lead: "We capture data where work happens, connect equipment and turn scattered signals into useful information for production, maintenance and management.",
      hero_cta: "Explore a solution",
      positioning_kicker: "Data connected to reality",
      positioning_title: "Measuring only creates value when it helps decisions",
      positioning_body_1: "An isolated counter provides a number. A well-designed solution explains what was produced, when, on which line, for which customer and under what conditions.",
      positioning_body_2: "We design systems around the existing process, from one specific measurement to the integration of several machines. We prioritise reliable data, simple use and compatibility with the plant's current tools.",
      services_kicker: "What we can develop",
      services_title: "Useful information without imposing a closed system",
      services_intro: "We start with the operational question to be answered and select the right capture points, logic and presentation.",
      service_1_title: "Piece and production counters",
      service_1_body: "We record units at folders, ironing lines and other process points, distinguishing the information each operation actually needs.",
      service_1_point_1: "Counting by linen type, customer, program, line or shift",
      service_1_point_2: "Reading existing sensors or installing capture points",
      service_1_point_3: "Correction, validation and traceability of records",
      service_2_title: "Data capture and integration",
      service_2_body: "We collect signals from machines, PLCs, sensors or workstations and connect them to new or existing databases.",
      service_2_point_1: "States, times, stops, alarms and production rates",
      service_2_point_2: "Data exchange between equipment from different brands",
      service_2_point_3: "Integration through agreed interfaces and formats",
      service_3_title: "Visualisation and monitoring",
      service_3_body: "We present information so each role can act: shift visibility for production, incidents for maintenance and historical data for management.",
      service_3_point_1: "Production, performance and availability indicators",
      service_3_point_2: "Dashboards, reports and alerts tailored to each need",
      service_3_point_3: "Exportable data and clearly defined information ownership",
      service_4_title: "Operations automation",
      service_4_body: "We automate repetitive tasks, information exchanges and simple responses when the operational benefit is clear and process control remains protected.",
      signals_kicker: "When it adds value",
      signals_title: "When reliable data is missing to explain the working day",
      signal_1: "Manual counts take time or produce discrepancies.",
      signal_2: "The daily total is known, but not where capacity or minutes are lost.",
      signal_3: "Each machine stores information separately or in different formats.",
      signal_4: "Production and maintenance need a common reference for stops and performance.",
      signal_5: "A repetitive task can be automated without redesigning the whole plant.",
      approach_kicker: "How we approach it",
      approach_title: "Start with a specific need and grow with purpose",
      approach_1_title: "First, a reliable measurement",
      approach_1_body: "We observe the process, define the data and check its quality under real conditions before expanding the solution or automating decisions.",
      approach_2_title: "Then, sustainable integration",
      approach_2_body: "We document signals, connections and operation so the system can be maintained, extended and used alongside future equipment.",
      cta_kicker: "First use case",
      cta_title: "What do you need to count, connect or automate?",
      cta_body: "Tell us which information is missing and how work is done today. We will assess the capture point and the smallest scope that can deliver a useful result.",
      cta_button: "Tell us about the process",
    },
  };

  const page = document.body.dataset.detailPage;
  const elements = Array.from(document.querySelectorAll("[data-detail-i18n]"));
  const spanish = Object.fromEntries(elements.map((element) => [element.dataset.detailI18n, element.textContent]));
  const spanishTitle = document.title;

  const apply = (lang) => {
    const copy = lang === "en" ? EN[page] : spanish;
    if (!copy) return;
    elements.forEach((element) => {
      const value = copy[element.dataset.detailI18n];
      if (typeof value === "string") element.textContent = value;
    });
    document.title = lang === "en" && EN[page] ? EN[page].page_title : spanishTitle;
  };

  const currentLanguage = () => window.unatomoI18n?.getLanguage?.() || document.documentElement.lang || "es";
  apply(currentLanguage());
  document.addEventListener("app:language-change", (event) => apply(event.detail?.lang || currentLanguage()));
})();
