export const createUsersRenderer = ({ text }) => {
  const renderUsers = (body, items, handlers = {}) => {
    body.innerHTML = "";
    const note = document.createElement("p");
    note.className = "controlpanel-note";
    note.textContent = text.usersHint;
    body.appendChild(note);

    const status = document.createElement("p");
    status.className = "controlpanel-state";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.hidden = true;
    body.appendChild(status);

    const setStatus = (message = "", state = "") => {
      status.hidden = !message;
      status.textContent = message;
      if (state) status.dataset.state = state;
      else status.removeAttribute("data-state");
    };

    if (handlers.setStatusRef) handlers.setStatusRef(setStatus);

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "controlpanel-state";
      empty.textContent = text.usersEmpty;
      body.appendChild(empty);
      return;
    }

    const list = document.createElement("ul");
    list.className = "controlpanel-list";
    items.forEach((item) => {
      const row = document.createElement("li");
      row.className = "controlpanel-user controlpanel-user--action";

      const identity = document.createElement("div");
      identity.className = "controlpanel-user-copy";

      const name = document.createElement("div");
      name.className = "controlpanel-user-name";
      name.textContent = item.displayName || text.noName;

      const meta = document.createElement("div");
      meta.className = "controlpanel-user-meta";
      meta.textContent = [
        item.accountHandle ? `@${item.accountHandle}` : "",
        item.email || text.noEmail,
        item.company || "",
        item.emailVerified ? text.emailVerified : text.emailVerificationPending
      ].filter(Boolean).join(" · ");

      identity.appendChild(name);
      identity.appendChild(meta);
      row.appendChild(identity);

      const collaboratorLabel = document.createElement("label");
      collaboratorLabel.className = "controlpanel-check";
      const collaborator = document.createElement("input");
      collaborator.type = "checkbox";
      collaborator.checked = item.suggestionsCollaborator === true;
      collaborator.addEventListener("change", () => {
        if (handlers.onToggleCollaborator) {
          handlers.onToggleCollaborator(item, collaborator.checked, collaborator);
        }
      });
      const collaboratorText = document.createElement("span");
      collaboratorText.textContent = text.userCollaborator;
      collaboratorLabel.appendChild(collaborator);
      collaboratorLabel.appendChild(collaboratorText);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "controlpanel-link-danger";
      remove.setAttribute("aria-label", text.deleteUser);
      remove.textContent = "x";
      remove.addEventListener("click", () => {
        if (handlers.onDeleteUser) handlers.onDeleteUser(item);
      });

      row.appendChild(collaboratorLabel);
      row.appendChild(remove);
      list.appendChild(row);
    });
    body.appendChild(list);
  };

  return { renderUsers };
};
