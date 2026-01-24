import { loadMachines, addMachine, saveMachines } from "./machineStore.js";
import { createMachineCard } from "./machineCardTemplate.js";

const COLLAPSED_HEIGHT = 96;
const EXPAND_FACTOR = 2.5;

const mount = document.getElementById("dashboard-mount");

if (mount) {
  const state = {
    machines: loadMachines()
  };

  const addBar = document.createElement("div");
  addBar.className = "add-bar";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.id = "addMachineBtn";
  addBtn.className = "btn-add";
  addBtn.textContent = "Añadir";

  addBar.appendChild(addBtn);

  const list = document.createElement("div");
  list.id = "machineList";

  mount.appendChild(addBar);
  mount.appendChild(list);

  const renderPlaceholder = () => {
    list.innerHTML = "";
    const placeholder = document.createElement("div");
    placeholder.className = "machine-placeholder";
    placeholder.textContent = "Todavía no hay máquinas. Pulsa ‘Añadir’ para crear la primera.";
    list.appendChild(placeholder);
  };

  const recalcHeight = (card) => {
    const header = card.querySelector(".mc-header");
    const expand = card.querySelector(".mc-expand");
    const headerH = header.offsetHeight;
    const contentH = expand.scrollHeight;
    const minH = COLLAPSED_HEIGHT * EXPAND_FACTOR;
    const target = Math.max(minH, headerH + contentH);
    card.style.maxHeight = `${target}px`;
  };

  const collapseCard = (card) => {
    card.dataset.expanded = "false";
    card.style.maxHeight = `${COLLAPSED_HEIGHT}px`;
  };

  const expandCard = (card) => {
    card.dataset.expanded = "true";
    recalcHeight(card);
  };

  const renderCards = () => {
    list.innerHTML = "";
    if (!state.machines.length) {
      renderPlaceholder();
      return;
    }

    state.machines.forEach((machine) => {
      const { card, hooks } = createMachineCard(machine);
      card.style.maxHeight = `${COLLAPSED_HEIGHT}px`;

      hooks.onToggleExpand = (node) => {
        const isExpanded = node.dataset.expanded === "true";
        if (isExpanded) {
          collapseCard(node);
        } else {
          expandCard(node);
        }
      };

      hooks.onSelectTab = (node) => {
        if (node.dataset.expanded === "true") {
          recalcHeight(node);
        }
      };

      list.appendChild(card);
    });
  };

  addBtn.addEventListener("click", () => {
    const result = addMachine(state.machines);
    state.machines = result.list;
    renderCards();
  });

  renderCards();
}
