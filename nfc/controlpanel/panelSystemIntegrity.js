import { formatMaybeDate } from "./panelShared.js";

export const createSystemIntegrityRenderer = ({ text, isEn }) => {
  const appendSystemStatusRow = (wrap, label, status) => {
    const row = document.createElement("div");
    row.className = "controlpanel-system-status";
    row.dataset.state = status === "ok" ? "ok" : "warning";
    const name = document.createElement("span");
    name.textContent = label;
    const value = document.createElement("strong");
    value.textContent = status === "ok" ? text.systemHealthy : text.systemWarning;
    row.appendChild(name);
    row.appendChild(value);
    wrap.appendChild(row);
  };

  const appendSystemMetric = (wrap, value, label) => {
    const metric = document.createElement("div");
    metric.className = "controlpanel-system-metric";
    const amount = document.createElement("strong");
    amount.textContent = new Intl.NumberFormat(isEn ? "en" : "es").format(
      Number(value || 0)
    );
    const name = document.createElement("span");
    name.textContent = label;
    metric.appendChild(amount);
    metric.appendChild(name);
    wrap.appendChild(metric);
  };

  const renderSystemStatus = (body, data = {}) => {
    body.innerHTML = "";
    const note = document.createElement("p");
    note.className = "controlpanel-note";
    note.textContent = text.systemHint;
    body.appendChild(note);

    const statuses = document.createElement("div");
    statuses.className = "controlpanel-system-statuses";
    appendSystemStatusRow(statuses, text.systemFunctions, data.services?.functions);
    appendSystemStatusRow(statuses, text.systemFirestore, data.services?.firestore);
    appendSystemStatusRow(
      statuses,
      text.systemAuthentication,
      data.services?.authentication
    );
    appendSystemStatusRow(
      statuses,
      text.systemIntegrity,
      data.integrity?.status
    );
    body.appendChild(statuses);

    const summary = data.summary || {};
    const metrics = document.createElement("div");
    metrics.className = "controlpanel-system-metrics";
    appendSystemMetric(metrics, summary.users, text.systemUsers);
    appendSystemMetric(
      metrics,
      summary.accountHandles,
      text.systemAccountHandles
    );
    appendSystemMetric(metrics, summary.machines, text.systemMachines);
    appendSystemMetric(metrics, summary.operationalMachines, text.systemOperational);
    appendSystemMetric(
      metrics,
      summary.outOfServiceMachines,
      text.systemOutOfService
    );
    appendSystemMetric(metrics, summary.tags, text.systemTags);
    appendSystemMetric(metrics, summary.pendingTasks, text.systemPendingTasks);
    appendSystemMetric(metrics, summary.pendingTodos, text.systemPendingTodos);
    appendSystemMetric(
      metrics,
      summary.openSuggestions,
      text.systemOpenSuggestions
    );
    appendSystemMetric(
      metrics,
      summary.pendingInvites,
      text.systemPendingInvites
    );
    appendSystemMetric(
      metrics,
      summary.pendingTransfers,
      text.systemPendingTransfers
    );
    body.appendChild(metrics);

    const checked = document.createElement("p");
    checked.className = "controlpanel-note controlpanel-system-checked";
    checked.textContent =
      text.systemChecked + ": " + formatMaybeDate(data.generatedAt, isEn, text.noData);
    body.appendChild(checked);
  };

  const renderIntegrityStatus = (body, integrity = {}) => {
    body.innerHTML = "";
    const note = document.createElement("p");
    note.className = "controlpanel-note";
    note.textContent = text.integrityHint;
    body.appendChild(note);

    const summary = document.createElement("div");
    summary.className = "controlpanel-integrity-summary";
    summary.dataset.state = integrity.status === "ok" ? "ok" : "warning";
    const count = Number(integrity.issueCount || 0);
    summary.textContent = count
      ? text.integrityIssues + ": " + count
      : text.integrityOk;
    body.appendChild(summary);

    const issues = Array.isArray(integrity.issues) ? integrity.issues : [];
    if (issues.length) {
      const list = document.createElement("div");
      list.className = "controlpanel-integrity-list";
      issues.forEach((issue) => {
        const row = document.createElement("article");
        row.className = "controlpanel-integrity-item";
        const header = document.createElement("div");
        header.className = "controlpanel-integrity-header";
        const title = document.createElement("strong");
        title.textContent =
          text.integrityIssueLabels[issue.code] || String(issue.code || "");
        const badge = document.createElement("span");
        badge.textContent = String(issue.count || 0);
        header.appendChild(title);
        header.appendChild(badge);
        row.appendChild(header);
        const samples = Array.isArray(issue.samples) ? issue.samples : [];
        if (samples.length) {
          const examples = document.createElement("p");
          examples.textContent =
            text.integritySamples + ": " + samples.join(", ");
          row.appendChild(examples);
        }
        list.appendChild(row);
      });
      body.appendChild(list);
    }

    const storage = document.createElement("p");
    storage.className = "controlpanel-note controlpanel-integrity-scope";
    storage.textContent = text.integrityStoragePending;
    body.appendChild(storage);
    if (integrity.scopeLimited) {
      const limited = document.createElement("p");
      limited.className =
        "controlpanel-note controlpanel-integrity-scope is-warning";
      limited.textContent = text.integrityScopeLimited;
      body.appendChild(limited);
    }
  };

  return { renderSystemStatus, renderIntegrityStatus };
};
