import { formatMaybeDate } from "./panelShared.js";

export const createTagsRenderer = ({ text, isEn }) => {
  const renderTags = (body, items) => {
    body.innerHTML = "";
    const note = document.createElement("p");
    note.className = "controlpanel-note";
    note.textContent = text.tagsHint;
    body.appendChild(note);

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "controlpanel-state";
      empty.textContent = text.tagsEmpty;
      body.appendChild(empty);
      return;
    }

    const tableWrap = document.createElement("div");
    tableWrap.className = "controlpanel-table-wrap";

    const table = document.createElement("table");
    table.className = "controlpanel-table";

    const head = document.createElement("thead");
    head.innerHTML = `
      <tr>
        <th>${text.tagIdLabel}</th>
        <th>${text.tagMachineLabel}</th>
        <th>${text.tagUrlLabel}</th>
        <th>${text.tagOwnerLabel}</th>
        <th>${text.tagCreatedByLabel}</th>
        <th>${text.tagAssignedByLabel}</th>
        <th>${text.tagStateLabel}</th>
        <th>${text.tagCreatedAtLabel}</th>
        <th>${text.tagAssignedAtLabel}</th>
      </tr>
    `;
    table.appendChild(head);

    const tbody = document.createElement("tbody");
    items.forEach((item) => {
      const row = document.createElement("tr");
      const tagUrl = `${window.location.origin}${item.urlPath || ""}`;
      row.innerHTML = `
        <td>${item.tagId || text.noData}</td>
        <td>${item.machineTitle || text.noMachine}</td>
        <td></td>
        <td>${item.tenantDisplayName || item.tenantEmail || text.noData}</td>
        <td>${item.createdByDisplayName || item.createdByEmail || text.noData}</td>
        <td>${item.assignedByDisplayName || item.assignedByEmail || text.noData}</td>
        <td>${item.state || text.noData}</td>
        <td>${formatMaybeDate(item.createdAt, isEn, text.noData)}</td>
        <td>${formatMaybeDate(item.assignedAt, isEn, text.noData)}</td>
      `;
      const linkCell = row.children[2];
      const link = document.createElement("a");
      link.href = tagUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = tagUrl;
      linkCell.appendChild(link);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    body.appendChild(tableWrap);
  };

  return { renderTags };
};
