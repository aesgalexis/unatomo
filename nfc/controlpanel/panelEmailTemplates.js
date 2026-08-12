const createBadge = (label, state) => {
  const badge = document.createElement("span");
  badge.className = "controlpanel-email-badge";
  badge.dataset.state = state;
  badge.textContent = label;
  return badge;
};

const openPreview = (item, text) => {
  const dialog = document.createElement("dialog");
  dialog.className = "controlpanel-email-dialog";

  const header = document.createElement("header");
  header.className = "controlpanel-email-dialog-head";
  const heading = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = item.name || item.id;
  const subject = document.createElement("p");
  subject.textContent = item.preview?.subject || "";
  heading.appendChild(title);
  heading.appendChild(subject);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "controlpanel-btn";
  close.textContent = text.emailTemplatesClose;
  close.addEventListener("click", () => dialog.close());
  header.appendChild(heading);
  header.appendChild(close);

  const tabs = document.createElement("div");
  tabs.className = "controlpanel-email-preview-tabs";
  const frame = document.createElement("iframe");
  frame.className = "controlpanel-email-preview-frame";
  frame.title = text.emailTemplatesPreviewTitle(item.name || item.id);
  frame.srcdoc = item.preview?.html || "";
  const plain = document.createElement("pre");
  plain.className = "controlpanel-email-preview-text";
  plain.textContent = item.preview?.text || "";
  plain.hidden = true;

  const htmlTab = document.createElement("button");
  htmlTab.type = "button";
  htmlTab.className = "controlpanel-btn is-active";
  htmlTab.textContent = "HTML";
  const textTab = document.createElement("button");
  textTab.type = "button";
  textTab.className = "controlpanel-btn";
  textTab.textContent = text.emailTemplatesPlainText;
  const showHtml = () => {
    frame.hidden = false;
    plain.hidden = true;
    htmlTab.classList.add("is-active");
    textTab.classList.remove("is-active");
  };
  const showText = () => {
    frame.hidden = true;
    plain.hidden = false;
    htmlTab.classList.remove("is-active");
    textTab.classList.add("is-active");
  };
  htmlTab.addEventListener("click", showHtml);
  textTab.addEventListener("click", showText);
  tabs.appendChild(htmlTab);
  tabs.appendChild(textTab);

  dialog.appendChild(header);
  dialog.appendChild(tabs);
  dialog.appendChild(frame);
  dialog.appendChild(plain);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => dialog.remove());
  document.body.appendChild(dialog);
  dialog.showModal();
};

export const createEmailTemplatesRenderer = ({text}) => {
  const renderEmailTemplates = (body, items, language, deliveries = {}, handlers = {}) => {
    body.innerHTML = "";
    const note = document.createElement("p");
    note.className = "controlpanel-note controlpanel-note-superadmin";
    note.textContent = text.emailTemplatesHint;
    body.appendChild(note);

    const deliverySection = document.createElement("section");
    deliverySection.className = "controlpanel-email-deliveries";
    const deliveryTitle = document.createElement("h3");
    deliveryTitle.textContent = text.emailDeliveryTitle;
    deliverySection.appendChild(deliveryTitle);
    const deliveryHint = document.createElement("p");
    deliveryHint.className = "controlpanel-email-description";
    deliveryHint.textContent = text.emailDeliveryHint;
    deliverySection.appendChild(deliveryHint);
    if (deliveries.unavailable) {
      const unavailable = document.createElement("p");
      unavailable.className = "controlpanel-state";
      unavailable.dataset.state = "error";
      unavailable.textContent = text.emailDeliveryUnavailable;
      deliverySection.appendChild(unavailable);
      body.appendChild(deliverySection);
    }
    const totals = deliveries.totals || {};
    const summary = document.createElement("div");
    summary.className = "controlpanel-email-summary";
    summary.hidden = deliveries.unavailable === true;
    [[text.emailDeliveryAll, totals.all || 0, "all"],
      [text.emailDeliveryPending, totals.pending || 0, "pending"],
      [text.emailDeliverySent, totals.sent || 0, "sent"],
      [text.emailDeliveryFailed, totals.failed || 0, "failed"]]
      .forEach(([label, count, state]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "controlpanel-email-total";
        button.classList.toggle("is-active", (deliveries.status || "") === (state === "all" ? "" : state));
        button.dataset.state = state;
        const number = document.createElement("strong");
        number.textContent = count;
        const caption = document.createElement("span");
        caption.textContent = label;
        button.appendChild(number);
        button.appendChild(caption);
        button.addEventListener("click", () => handlers.onDeliveryFilter?.(state === "all" ? "" : state));
        summary.appendChild(button);
      });
    deliverySection.appendChild(summary);
    const deliveryItems = Array.isArray(deliveries.items) ? deliveries.items : [];
    if (!deliveryItems.length && !deliveries.unavailable) {
      const empty = document.createElement("p");
      empty.className = "controlpanel-note";
      empty.textContent = text.emailDeliveryEmpty;
      deliverySection.appendChild(empty);
    } else {
      const deliveryWrap = document.createElement("div");
      deliveryWrap.className = "controlpanel-table-wrap";
      const deliveryTable = document.createElement("table");
      deliveryTable.className = "controlpanel-table controlpanel-delivery-table";
      const deliveryHead = document.createElement("thead");
      const deliveryHeadRow = document.createElement("tr");
      [text.emailDeliveryType, text.emailDeliveryRecipient, text.emailTemplatesStatus,
        text.emailDeliveryAttempts, text.emailDeliveryDate, text.emailTemplatesActions]
        .forEach((label) => {
          const cell = document.createElement("th");
          cell.textContent = label;
          deliveryHeadRow.appendChild(cell);
        });
      deliveryHead.appendChild(deliveryHeadRow);
      deliveryTable.appendChild(deliveryHead);
      const deliveryBody = document.createElement("tbody");
      deliveryItems.forEach((item) => {
        const row = document.createElement("tr");
        const date = item.createdAt ? new Intl.DateTimeFormat(language === "en" ? "en-GB" : "es-ES", {
          dateStyle: "short", timeStyle: "short"
        }).format(new Date(item.createdAt)) : "-";
        [item.type, item.recipient, null, item.attemptCount, date].forEach((value, index) => {
          const cell = document.createElement("td");
          if (index === 2) {
            const label = item.status === "sent" ? text.emailDeliverySent :
              item.status === "failed" ? text.emailDeliveryFailed : text.emailDeliveryPending;
            cell.appendChild(createBadge(label, item.status));
            if (item.lastError) {
              const error = document.createElement("span");
              error.className = "controlpanel-email-description";
              error.textContent = item.lastError;
              cell.appendChild(error);
            }
          } else {
            cell.textContent = value ?? "-";
          }
          row.appendChild(cell);
        });
        const actions = document.createElement("td");
        if (item.status === "failed") {
          const retry = document.createElement("button");
          retry.type = "button";
          retry.className = "controlpanel-btn";
          retry.textContent = text.emailDeliveryRetry;
          retry.addEventListener("click", () => handlers.onRetry?.(item, retry));
          actions.appendChild(retry);
        } else {
          actions.textContent = "-";
        }
        row.appendChild(actions);
        deliveryBody.appendChild(row);
      });
      deliveryTable.appendChild(deliveryBody);
      deliveryWrap.appendChild(deliveryTable);
      deliverySection.appendChild(deliveryWrap);
    }
    const deliveryStatus = document.createElement("p");
    deliveryStatus.className = "controlpanel-status";
    deliveryStatus.setAttribute("aria-live", "polite");
    deliverySection.appendChild(deliveryStatus);
    handlers.setDeliveryStatusRef?.((message, state = "") => {
      deliveryStatus.textContent = message;
      deliveryStatus.dataset.state = state;
    });
    if (!deliveries.unavailable) body.appendChild(deliverySection);

    const toolbar = document.createElement("div");
    toolbar.className = "controlpanel-email-toolbar";
    const label = document.createElement("span");
    label.textContent = text.emailTemplatesLanguage;
    toolbar.appendChild(label);
    ["es", "en"].forEach((lang) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "controlpanel-btn";
      button.classList.toggle("is-active", language === lang);
      button.textContent = lang.toUpperCase();
      button.addEventListener("click", () => {
        if (lang !== language && handlers.onLanguageChange) {
          handlers.onLanguageChange(lang);
        }
      });
      toolbar.appendChild(button);
    });
    body.appendChild(toolbar);

    const wrap = document.createElement("div");
    wrap.className = "controlpanel-table-wrap";
    const table = document.createElement("table");
    table.className = "controlpanel-table controlpanel-email-table";
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    [
      text.emailTemplatesName,
      text.emailTemplatesCategory,
      text.emailTemplatesSubject,
      text.emailTemplatesStatus,
      text.emailTemplatesActions,
    ].forEach((value) => {
      const th = document.createElement("th");
      th.textContent = value;
      headRow.appendChild(th);
    });
    head.appendChild(headRow);
    table.appendChild(head);

    const tbody = document.createElement("tbody");
    items.forEach((item) => {
      const row = document.createElement("tr");
      const nameCell = document.createElement("td");
      const strong = document.createElement("strong");
      strong.textContent = item.name || item.id;
      const description = document.createElement("span");
      description.className = "controlpanel-email-description";
      description.textContent = item.description || "";
      nameCell.appendChild(strong);
      nameCell.appendChild(description);

      const category = document.createElement("td");
      category.textContent = text.emailTemplateCategories[item.category] || item.category;
      const subject = document.createElement("td");
      subject.textContent = item.preview?.subject || "-";
      const status = document.createElement("td");
      status.appendChild(createBadge(
        item.integration === "active"
          ? text.emailTemplatesActive
          : text.emailTemplatesReady,
        item.integration,
      ));
      const actions = document.createElement("td");
      const preview = document.createElement("button");
      preview.type = "button";
      preview.className = "controlpanel-btn";
      preview.textContent = text.emailTemplatesPreview;
      preview.addEventListener("click", () => openPreview(item, text));
      actions.appendChild(preview);

      row.appendChild(nameCell);
      row.appendChild(category);
      row.appendChild(subject);
      row.appendChild(status);
      row.appendChild(actions);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    body.appendChild(wrap);
  };
  return {renderEmailTemplates};
};
