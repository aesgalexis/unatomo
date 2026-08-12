export const createAccessRequestsRenderer = ({ text }) => ({
  renderAccessRequests(body, items, handlers = {}) {
    body.innerHTML = "";
    const note = document.createElement("p");
    note.className = "controlpanel-note";
    note.textContent = text.accessRequestsHint;
    body.appendChild(note);
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "controlpanel-state";
      empty.textContent = text.accessRequestsEmpty;
      body.appendChild(empty);
      return;
    }
    const list = document.createElement("ul");
    list.className = "controlpanel-list";
    items.forEach((item) => {
      const row = document.createElement("li");
      row.className = "controlpanel-user controlpanel-user--action";
      const info = document.createElement("div");
      const title = document.createElement("div");
      title.className = "controlpanel-user-name";
      title.textContent = `${item.displayName || "-"} · ${item.email || "-"}`;
      const detail = document.createElement("div");
      detail.className = "controlpanel-user-meta";
      detail.textContent = [
        text.accessRequestStatus(item.status),
        item.language?.toUpperCase(),
        item.reason,
        item.registrationCode ? `${text.accessRequestCode}: ${item.registrationCode}` : ""
      ].filter(Boolean).join(" · ");
      info.append(title, detail);
      row.appendChild(info);
      if (item.status === "pending") {
        const actions = document.createElement("div");
        actions.className = "controlpanel-actions";
        const approve = document.createElement("button");
        approve.type = "button";
        approve.className = "controlpanel-btn";
        approve.textContent = text.accessRequestApprove;
        approve.addEventListener("click", () => handlers.onReview?.(item, "approved"));
        const reject = document.createElement("button");
        reject.type = "button";
        reject.className = "controlpanel-link-danger";
        reject.textContent = text.accessRequestReject;
        reject.addEventListener("click", () => handlers.onReview?.(item, "rejected"));
        actions.append(approve, reject);
        row.appendChild(actions);
      }
      list.appendChild(row);
    });
    body.appendChild(list);
  }
});
