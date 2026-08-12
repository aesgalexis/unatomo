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
  const renderEmailTemplates = (body, items, language, handlers = {}) => {
    body.innerHTML = "";
    const note = document.createElement("p");
    note.className = "controlpanel-note controlpanel-note-superadmin";
    note.textContent = text.emailTemplatesHint;
    body.appendChild(note);

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
