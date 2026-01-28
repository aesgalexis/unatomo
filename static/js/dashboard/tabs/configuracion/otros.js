export const render = (container, machine, hooks, options = {}) => {
  const canEditConfig = options.canEditConfig !== false;

  const removeLink = document.createElement("a");
  removeLink.className = "mc-remove-machine";
  removeLink.href = "#";
  removeLink.textContent = "Eliminar equipo";
  removeLink.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (hooks.onRemoveMachine) hooks.onRemoveMachine(machine);
  });

  if (!canEditConfig || options.disableConfigActions) {
    removeLink.style.display = "none";
  }

  container.appendChild(removeLink);
};
