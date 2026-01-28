export const render = (container, machine, hooks, options = {}) => {
  const notifications = machine.notifications || {
    enabled: false,
    email: "",
    events: {
      statusChanged: false,
      taskOverdue: false,
      taskLateCompleted: false,
      tagDisconnected: false
    }
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

  const makeEvent = (key, label) => {
    const row = document.createElement("label");
    row.className = "mc-notif-event";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!notifications.events[key];
    input.disabled = !notifications.enabled;
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("change", (event) => {
      event.stopPropagation();
      if (hooks.onUpdateNotifications) {
        hooks.onUpdateNotifications(machine.id, {
          ...notifications,
          events: { ...notifications.events, [key]: !!input.checked }
        });
      }
    });
    const span = document.createElement("span");
    span.textContent = label;
    row.appendChild(input);
    row.appendChild(span);
    return row;
  };

  eventsWrap.appendChild(makeEvent("statusChanged", "Cambio de estado"));
  eventsWrap.appendChild(makeEvent("taskOverdue", "Tarea pendiente"));
  eventsWrap.appendChild(makeEvent("taskLateCompleted", "Tarea completada fuera de plazo"));
  eventsWrap.appendChild(makeEvent("tagDisconnected", "Tag desconectado"));

  const notifBtn = document.createElement("button");
  notifBtn.type = "button";
  notifBtn.className = "mc-notif-test";
  notifBtn.textContent = "Probar notificacin";
  notifBtn.disabled = !notifications.enabled;
  notifBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (hooks.onTestNotification) hooks.onTestNotification(machine);
  });

  container.appendChild(notifToggleRow);
  container.appendChild(notifEmailRow);
  container.appendChild(eventsWrap);
  container.appendChild(notifBtn);
};
