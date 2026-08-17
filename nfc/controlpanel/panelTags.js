import { formatMaybeDate } from "./panelShared.js";

export const createTagsRenderer = ({ text, isEn }) => {
  const appendTextCell = (row, value) => {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.appendChild(cell);
    return cell;
  };

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
    const headRow = document.createElement("tr");
    [
      text.tagIdLabel,
      text.tagMachineLabel,
      text.tagUrlLabel,
      text.tagOwnerLabel,
      text.tagCreatedByLabel,
      text.tagAssignedByLabel,
      text.tagStateLabel,
      text.tagCreatedAtLabel,
      text.tagAssignedAtLabel
    ].forEach((label) => {
      const cell = document.createElement("th");
      cell.textContent = label;
      headRow.appendChild(cell);
    });
    head.appendChild(headRow);
    table.appendChild(head);

    const tbody = document.createElement("tbody");
    items.forEach((item) => {
      const row = document.createElement("tr");
      const tagUrl = `${window.location.origin}${item.urlPath || ""}`;
      appendTextCell(row, item.tagId || text.noData);
      appendTextCell(row, item.machineTitle || text.noMachine);
      const linkCell = appendTextCell(row, "");
      const link = document.createElement("a");
      link.href = tagUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = tagUrl;
      linkCell.appendChild(link);
      appendTextCell(row, item.tenantDisplayName || item.tenantEmail || text.noData);
      appendTextCell(row, item.createdByDisplayName || item.createdByEmail || text.noData);
      appendTextCell(row, item.assignedByDisplayName || item.assignedByEmail || text.noData);
      appendTextCell(row, item.state || text.noData);
      appendTextCell(row, formatMaybeDate(item.createdAt, isEn, text.noData));
      appendTextCell(row, formatMaybeDate(item.assignedAt, isEn, text.noData));
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    body.appendChild(tableWrap);
  };

  return { renderTags };
};
