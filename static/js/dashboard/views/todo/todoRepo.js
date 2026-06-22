import { functions } from "/static/js/firebase/firebaseApp.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";

const listTodosCallable = httpsCallable(functions, "listDashboardTodos");
const listCollaboratorsCallable = httpsCallable(
  functions,
  "listDashboardTodoCollaborators"
);
const createTodoCallable = httpsCallable(functions, "createDashboardTodo");
const updateTodoCallable = httpsCallable(functions, "updateDashboardTodo");
const deleteTodoCallable = httpsCallable(functions, "deleteDashboardTodo");

const normalizeTodoPerson = (person = {}) => ({
  uid: (person.uid || "").toString(),
  email: (person.email || "").toString(),
  displayName: (person.displayName || "").toString(),
  mention: (person.mention || "").toString()
});

const normalizeTodo = (item = {}) => ({
  id: (item.id || "").toString(),
  text: (item.text || "").toString(),
  ownerUid: (item.ownerUid || "").toString(),
  canDelete: item.canDelete === true,
  isShared: item.isShared === true,
  sharedWith: Array.isArray(item.sharedWith)
    ? item.sharedWith.map(normalizeTodoPerson).filter((person) => person.uid)
    : [],
  completed: item.completed === true,
  createdAt: (item.createdAt || "").toString(),
  updatedAt: (item.updatedAt || "").toString(),
  completedAt: (item.completedAt || "").toString()
});

export const fetchDashboardTodos = async (limit = 254) => {
  const response = await listTodosCallable({ limit });
  const data = response?.data || {};
  return {
    canTodo: data.canTodo === true,
    isSuperadmin: data.isSuperadmin === true,
    items: Array.isArray(data.items)
      ? data.items.map(normalizeTodo).filter((item) => item.id)
      : []
  };
};

export const fetchDashboardTodoCollaborators = async () => {
  const response = await listCollaboratorsCallable();
  const data = response?.data || {};
  return Array.isArray(data.items)
    ? data.items.map(normalizeTodoPerson).filter((person) => person.uid)
    : [];
};

export const createDashboardTodo = async (text) => {
  const response = await createTodoCallable({ text });
  return response?.data || {};
};

export const updateDashboardTodo = async (todoId, completed) => {
  const response = await updateTodoCallable({
    todoId,
    completed: completed === true
  });
  return response?.data || {};
};

export const deleteDashboardTodo = async (todoId) => {
  const response = await deleteTodoCallable({ todoId });
  return response?.data || {};
};
