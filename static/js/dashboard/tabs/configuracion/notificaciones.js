export const render = (container, machine, hooks, options = {}) => {
  container.classList.add("is-inactive-section");
  const notifications = {
    enabled: false,
    email: "",
    events: {
      statusChanged: false
    },
    ...(machine.notifications || {})
  };
  notifications.events = {
    statusChanged: false,
    ...(notifications.events || {})
  };

  const notifToggleRow = document.createElement("div");
  notifToggleRow.className = "mc-config-row";
  const notifLabel = document.createElement("span");
  notifLabel.className = "mc-config-label";
  notifLabel.textContent = "Activar notificaciones";
  const notifToggle = document.createElement("input");
  notifToggle.type = "checkbox";
  notifToggle.checked = !!notifications.enabled;
  notifToggle.addEventListener("click", (event) => event.stopPropagation());
  notifToggle.addEventListener("change", (event) => {
    event.stopPropagation();
    if (hooks.onUpdateNotifications) {
      hooks.onUpdateNotifications(machine.id, {
        ...notifications,
        enabled: !!notifToggle.checked
      });
    }
  });
  notifToggleRow.appendChild(notifLabel);
  notifToggleRow.appendChild(notifToggle);

  const notifEmailRow = document.createElement("div");
  notifEmailRow.className = "mc-config-row";
  const notifEmailLabel = document.createElement("span");
  notifEmailLabel.className = "mc-config-label";
  notifEmailLabel.textContent = "Email destino";
  const notifEmail = document.createElement("input");
  notifEmail.type = "email";
  notifEmail.className = "mc-notif-email";
  notifEmail.value = notifications.email || "";
  notifEmail.disabled = !notifications.enabled;
  notifEmail.addEventListener("click", (event) => event.stopPropagation());
  notifEmail.addEventListener("blur", (event) => {
    event.stopPropagation();
    if (hooks.onUpdateNotifications) {
      hooks.onUpdateNotifications(machine.id, {
        ...notifications,
        email: notifEmail.value.trim()
      });
    }
  });
  notifEmailRow.appendChild(notifEmailLabel);
  notifEmailRow.appendChild(notifEmail);

  const eventsWrap = document.createElement("div");
  eventsWrap.className = "mc-notif-events";

  const row = document.createElement("label");
  row.className = "mc-notif-event";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = !!notifications.events.statusChanged;
  input.disabled = !notifications.enabled;
  input.addEventListener("click", (event) => event.stopPropagation());
  input.addEventListener("change", (event) => {
    event.stopPropagation();
    if (hooks.onUpdateNotifications) {
      hooks.onUpdateNotifications(machine.id, {
        ...notifications,
        events: { statusChanged: !!input.checked }
      });
    }
  });
  const span = document.createElement("span");
  span.textContent = "Cambio de estado";
  row.appendChild(input);
  row.appendChild(span);
  eventsWrap.appendChild(row);

  container.appendChild(notifToggleRow);
  container.appendChild(notifEmailRow);
  container.appendChild(eventsWrap);
};
