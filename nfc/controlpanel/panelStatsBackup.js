import {
  appendBackupMeta,
  formatBackupAge,
  formatBytes,
  formatMaybeDate,
  getBackupStatusText
} from "./panelShared.js";

export const createStatsBackupRenderer = ({ text, isEn }) => {
  const renderCodeStats = (body, stats) => {
    body.innerHTML = "";
    const note = document.createElement("p");
    note.className = "controlpanel-note";
    note.textContent = text.codeStatsHint;
    body.appendChild(note);

    const totalLines = Number(stats?.totalLines || 0);
    const formatted = new Intl.NumberFormat(isEn ? "en" : "es").format(totalLines);
    const metric = document.createElement("div");
    metric.className = "controlpanel-metric";

    const value = document.createElement("div");
    value.className = "controlpanel-metric-value";
    value.textContent = formatted;

    const label = document.createElement("div");
    label.className = "controlpanel-metric-label";
    label.textContent = text.codeStatsLines(formatted);

    metric.appendChild(value);
    metric.appendChild(label);
    body.appendChild(metric);
  };

  const renderBackupItem = (item, label, type) => {
    const status = item?.status || "pending";
    const card = document.createElement("article");
    card.className = "controlpanel-backup-item";
    card.dataset.state = status;

    const header = document.createElement("div");
    header.className = "controlpanel-backup-header";

    const title = document.createElement("h3");
    title.textContent = label;

    const badge = document.createElement("span");
    badge.className = "controlpanel-backup-badge";
    badge.textContent = getBackupStatusText(status, text);

    header.appendChild(title);
    header.appendChild(badge);
    card.appendChild(header);

    if (status === "ok") {
      appendBackupMeta(card, text.backupCompleted, formatMaybeDate(item.completedAt, isEn, text.noData));
      appendBackupMeta(card, text.backupFile, item.file);
      appendBackupMeta(card, text.backupProject, item.projectId);
      if (type === "firestore") {
        appendBackupMeta(card, text.backupCollections, item.collectionCount);
        appendBackupMeta(card, text.backupDocuments, item.documentCount);
      } else if (type === "storage") {
        appendBackupMeta(card, text.backupBucket, item.bucket);
        appendBackupMeta(card, text.backupFiles, item.fileCount);
        appendBackupMeta(card, text.backupSize, formatBytes(item.totalBytes, isEn));
        appendBackupMeta(card, text.backupFolder, item.downloadDir);
      } else if (type === "auth") {
        appendBackupMeta(card, text.backupUsers, item.userCount);
        appendBackupMeta(card, text.backupSize, formatBytes(item.size, isEn));
      }
    } else if (status === "error") {
      appendBackupMeta(card, text.backupAttempted, formatMaybeDate(item.attemptedAt, isEn, text.noData));
      appendBackupMeta(card, text.backupCause, item.error);
    }

    return card;
  };

  const renderOverallBackup = (item = {}) => {
    const status = item.status || "pending";
    const card = document.createElement("article");
    card.className = "controlpanel-backup-item controlpanel-backup-overall";
    card.dataset.state = status;
    const header = document.createElement("div");
    header.className = "controlpanel-backup-header";
    const title = document.createElement("h3");
    title.textContent = text.backupOverall;
    const badge = document.createElement("span");
    badge.className = "controlpanel-backup-badge";
    badge.textContent = getBackupStatusText(status, text);
    header.appendChild(title);
    header.appendChild(badge);
    card.appendChild(header);

    const completedAt = item.completedAt || item.attemptedAt || item.startedAt;
    appendBackupMeta(card, text.backupCompleted, formatMaybeDate(completedAt, isEn, text.noData));
    appendBackupMeta(card, text.backupAge, formatBackupAge(completedAt, text.noData));
    appendBackupMeta(card, text.backupProject, item.projectId);
    appendBackupMeta(card, text.backupManifest, item.manifestFile);
    const collectionCount = Number.isFinite(Number(item.firestoreCollectionCount))
      ? Number(item.firestoreCollectionCount)
      : Array.isArray(item.firestoreCollections)
        ? item.firestoreCollections.length
        : 0;
    const prefixCount = Number.isFinite(Number(item.storagePrefixCount))
      ? Number(item.storagePrefixCount)
      : Array.isArray(item.storagePrefixes)
        ? item.storagePrefixes.length
        : 0;
    if (collectionCount || prefixCount) {
      const authCoverage = item.firebaseAuth ? " · Authentication" : "";
      appendBackupMeta(
        card,
        text.backupCoverage,
        `${collectionCount} Firestore · ${prefixCount} Storage${authCoverage}`,
      );
    }
    const pending = (item.pendingScopes || [])
      .map((key) => text.backupScopeNames[key] || key)
      .join(", ");
    appendBackupMeta(card, text.backupPendingCoverage, pending);
    if (item.error) appendBackupMeta(card, text.backupCause, item.error);
    return card;
  };

  const renderBackupStatus = (body, status) => {
    body.innerHTML = "";
    const note = document.createElement("p");
    note.className = "controlpanel-note";
    note.textContent = text.backupHint;
    body.appendChild(note);

    const list = document.createElement("div");
    list.className = "controlpanel-backup-list";
    list.appendChild(renderOverallBackup(status?.overall || {}));
    list.appendChild(
      renderBackupItem(status?.firestore || {}, text.backupFirestore, "firestore"),
    );
    list.appendChild(
      renderBackupItem(status?.storage || {}, text.backupStorage, "storage"),
    );
    list.appendChild(
      renderBackupItem(status?.auth || {}, text.backupAuth, "auth"),
    );
    body.appendChild(list);
  };

  return { renderCodeStats, renderBackupStatus };
};
