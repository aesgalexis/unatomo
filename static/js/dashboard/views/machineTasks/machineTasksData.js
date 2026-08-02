import { t } from "/static/js/dashboard/i18n.js";
import { getTaskTiming } from "/static/js/dashboard/tabs/tasks/tasksTime.js";

export const MACHINE_TASKS_PAGE_SIZE = 50;

const toTime = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

const looksLikeInternalUserId = (value) => {
  const label = String(value || "").trim();
  if (!label) return false;
  return (
    /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(label) ||
    /^[A-Za-z0-9_-]{28}$/.test(label)
  );
};

const getReadableAuthor = (value) => {
  if (value && typeof value === "object") {
    return getReadableAuthor(
      value.username || value.displayName || value.name || value.email || ""
    );
  }
  const label = String(value || "").trim();
  return label && !looksLikeInternalUserId(label) ? label : "";
};

const findTaskAttachmentLog = (logs, taskId, attachment) => {
  const attachmentId = String(attachment?.id || attachment?.documentId || "").trim();
  const documentId = String(attachment?.documentId || "").trim();
  const storagePath = String(attachment?.storagePath || "").trim();
  const url = String(attachment?.url || "").trim();
  return logs.find((log) => {
    if (
      log?.type !== "task_attachment_added" ||
      log?.taskId !== taskId
    ) {
      return false;
    }
    return (
      (attachmentId && (log.attachmentId === attachmentId || log.documentId === attachmentId)) ||
      (documentId && (log.documentId === documentId || log.attachmentId === documentId)) ||
      (storagePath && log.storagePath === storagePath) ||
      (url && log.attachmentUrl === url)
    );
  }) || null;
};

const getTaskAttachmentAuthor = (attachment, attachmentLog = null) =>
  getReadableAuthor(attachmentLog?.user) || getReadableAuthor(attachment?.uploadedBy);

const enrichTaskAttachmentAuthors = (task, logs = []) => ({
  ...task,
  attachments: (Array.isArray(task?.attachments) ? task.attachments : []).map((attachment) => {
    const attachmentLog = findTaskAttachmentLog(logs, task?.id, attachment);
    const author = getTaskAttachmentAuthor(attachment, attachmentLog);
    return author ? { ...attachment, _globalAuthor: author } : attachment;
  })
});

export const machineLabel = (machine) =>
  String(machine?.title || machine?.name || machine?.machineName || machine?.id || "").trim();

const isActiveTaskPending = (task, timing = getTaskTiming(task)) =>
  !task?.lastCompletedAt || timing.pending;

export const flattenTasks = (machines = []) => machines.flatMap((machine) => {
  const pending = (Array.isArray(machine?.tasks) ? machine.tasks : [])
    .map((task) => ({
      machine,
      task: enrichTaskAttachmentAuthors(task, machine?.logs),
      timing: getTaskTiming(task),
      completed: false
    }))
    .filter((entry) => isActiveTaskPending(entry.task, entry.timing));
  const logs = Array.isArray(machine?.logs) ? machine.logs : [];
  const completed = logs
    .filter((log) => log?.type === "task")
    .map((log, index) => ({
      machine,
      completed: true,
      completionIndex: index,
      task: {
        id: log.taskId || `completed_${index}`,
        title: log.title || t("tasks.task", "Tarea"),
        description: log.description || "",
        assignedTo: log.assignedTo || null,
        createdAt: log.ts || "",
        lastCompletedAt: log.ts || "",
        notes: logs
          .filter((item) => item?.taskId === log.taskId && item?.type === "task_note_added")
          .map((item, noteIndex) => ({
            id: item.id || `completed_note_${index}_${noteIndex}`,
            text: item.note || "",
            createdAt: item.ts || "",
            createdBy: item.user || null
          }))
          .filter((note) => note.text),
        attachments: logs
          .filter((item) => item?.taskId === log.taskId && item?.type === "task_attachment_added")
          .map((item, attachmentIndex) => ({
            id: item.attachmentId || item.documentId || `completed_attachment_${index}_${attachmentIndex}`,
            name: item.attachmentName || t("tasks.image", "Imagen"),
            url: item.attachmentUrl || "",
            contentType: item.contentType || "",
            uploadedAt: item.ts || "",
            _globalAuthor: getReadableAuthor(item.user)
          }))
          .filter((attachment) => attachment.url)
      },
      timing: { pending: false, nextDue: new Date(log.ts || 0).getTime(), label: "" }
    }));
  return [...pending, ...completed];
});

export const matchesTaskQuery = (entry, query) => {
  const term = String(query || "").trim().toLowerCase();
  if (!term) return true;
  const { machine, task, timing, completed } = entry;
  return [
    task?.title,
    task?.description,
    ...(Array.isArray(task?.notes) ? task.notes.map((note) => note?.text) : []),
    ...(Array.isArray(task?.attachments) ? task.attachments.map((attachment) => attachment?.name) : []),
    task?.assignedTo?.username,
    timing?.label,
    completed ? "completed completada" : "pending pendiente",
    machineLabel(machine),
    machine?.location,
    machine?.ownerEmail,
    machine?.adminEmail,
    task?.source === "status-out-of-service" ? "reactivation reactivación" : "normal"
  ].join(" ").toLowerCase().includes(term);
};

export const getTaskRelatedItems = (task = {}) => [
  ...(Array.isArray(task.notes) ? task.notes : []).map((note) => ({
    type: "note",
    time: note.createdAt || "",
    text: note.text || "",
    user: note.createdBy?.username || note.createdBy || ""
  })),
  ...(Array.isArray(task.attachments) ? task.attachments : []).map((attachment) => ({
    type: "attachment",
    time: attachment.uploadedAt || attachment.createdAt || "",
    name: attachment.name || t("tasks.image", "Imagen"),
    url: attachment.url || "",
    contentType: attachment.contentType || "",
    user: getReadableAuthor(attachment._globalAuthor || attachment.uploadedBy)
  }))
].filter((item) => item.type === "note" ? item.text : item.url)
  .sort((left, right) => toTime(left.time) - toTime(right.time));

const taskSortTime = (entry, includeRelated = false) => {
  const values = [entry.task?.createdAt, entry.task?.lastCompletedAt];
  if (includeRelated) {
    getTaskRelatedItems(entry.task).forEach((item) => values.push(item.time));
  }
  return values.reduce((max, value) => Math.max(max, toTime(value)), 0);
};

export const prepareMachineTaskEntries = (machines = [], options = {}) => {
  const allEntries = flattenTasks(machines);
  const searchedEntries = allEntries
    .filter((entry) => matchesTaskQuery(entry, options.query));
  const statusFilter = ["visible", "pending", "completed", "all"].includes(options.statusFilter)
    ? options.statusFilter
    : "visible";
  const entries = searchedEntries
    .filter(({ completed }) => {
      if (statusFilter === "pending") return !completed;
      if (statusFilter === "completed") return completed;
      if (statusFilter === "visible") return options.showCompleted || !completed;
      return true;
    })
    .sort((a, b) => {
      const order = options.sort || "created-desc";
      if (order === "created-asc") return taskSortTime(a) - taskSortTime(b);
      if (order === "machine-asc") {
        return machineLabel(a.machine).localeCompare(
          machineLabel(b.machine),
          undefined,
          { sensitivity: "base" }
        );
      }
      if (order === "title-asc") {
        return String(a.task?.title || "").localeCompare(
          String(b.task?.title || ""),
          undefined,
          { sensitivity: "base" }
        );
      }
      return taskSortTime(b) - taskSortTime(a);
    });
  const pageCount = Math.max(1, Math.ceil(entries.length / MACHINE_TASKS_PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number(options.page || 1)));
  const visible = entries.slice(
    (page - 1) * MACHINE_TASKS_PAGE_SIZE,
    page * MACHINE_TASKS_PAGE_SIZE
  );
  return { allEntries, searchedEntries, entries, pageCount, page, visible };
};
