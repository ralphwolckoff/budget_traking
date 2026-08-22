import { defaultData } from "./constants";
import type {
  AppData,
  AuthResult,
  Storage,
  Investment,
  ExpenseSearchResult,
  FinancialGoal,
} from "./types";

// ── Config ─────────────────────────────────────────────────────────────────────
const IS_ELECTRON = Boolean(window.electronAPI);
const SERVER_URL = IS_ELECTRON
  ? "http://127.0.0.1:47291"
  : ((import.meta.env.VITE_API_URL as string) ?? "http://localhost:3002/api");

const KEY_TOKEN = "bt-session-token";
const KEY_USERNAME = "bt-session-username";
const KEY_LAST = "bt-last-user";
const KEY_QUEUE = "bt-pending-queue"; // file d'attente persistante
const KEY_DROPPED = "bt-dropped-actions"; // actions définitivement abandonnées (visibles à l'utilisateur)

// ── Bus d'événements minimal — permet à l'UI (SyncStatus) de réagir en direct
// aux changements de la queue sans avoir à sonder localStorage en boucle.
export const queueEvents = new EventTarget();
function notifyQueueChange() {
  queueEvents.dispatchEvent(new Event("change"));
}

// ── Types queue ────────────────────────────────────────────────────────────────
type QueueAction =
  | {
      type: "addExpense";
      monthKey: string;
      tempId: string | number;
      amount: number;
      description: string;
      category: string;
      date: string;
    }
  | { type: "deleteExpense"; id: string }
  | { type: "saveSettings"; salary: number; savings: number }
  | { type: "saveCarryOver"; monthKey: string; amount: number }
  | {
      type: "addForecast";
      monthKey: string;
      tempId: string | number;
      catId: string;
      label: string;
      price: number;
      done: boolean;
    }
  | { type: "deleteForecast"; id: string }
  | {
      type: "saveMonthSettings";
      monthKey: string;
      salary: number | null;
      savings: number | null;
    }
  | { type: "saveCategoryBudgets"; budgets: Record<string, number> }
  | { type: "saveRecurring"; id: string; data: RecurringExpensePayload }
  | { type: "deleteRecurring"; id: string }
  | { type: "saveInvestment"; id: string; data: InvestmentPayload }
  | { type: "deleteInvestment"; id: string }
  | { type: "saveGoal"; id: string; data: GoalPayload }
  | { type: "deleteGoal"; id: string };

// Payloads envoyés au serveur pour Recurring/Investment (upsert whole-object)
export type RecurringExpensePayload = {
  description: string;
  category: string;
  amount: number;
  dayOfMonth: number;
  active: boolean;
  startMonth: string;
  endMonth?: string;
  lastGeneratedMonth?: string;
  notes?: string;
};
export type InvestmentPayload = {
  type: string;
  name: string;
  amount: number;
  startDate: string;
  endDate?: string;
  durationMonths?: number;
  expectedReturn?: number;
  currentValue?: number;
  notes?: string;
  status: string;
  payments?: unknown[];
  gains?: unknown[];
  events?: unknown[];
  valueHistory?: unknown[];
  documents?: unknown[];
};
export type GoalPayload = {
  name: string;
  targetAmount: number;
  targetDate: string;
  startDate: string;
  linkedInvestmentIds?: (string | number)[];
  notes?: string;
  status: string;
};

interface QueueEntry {
  id: string;
  token: string;
  action: QueueAction;
  createdAt: string;
  retries: number;
}

// Description humaine d'une action — utilisée pour les logs d'abandon
// affichés à l'utilisateur (voir droppedActions ci-dessous).
function describeAction(action: QueueAction): string {
  switch (action.type) {
    case "addExpense":
      return `Dépense "${action.description}" (${action.amount} F)`;
    case "deleteExpense":
      return "Suppression d'une dépense";
    case "saveSettings":
      return "Paramètres salaire/épargne";
    case "saveCarryOver":
      return `Report de solde (${action.monthKey})`;
    case "addForecast":
      return `Prévision "${action.label}" (${action.price} F)`;
    case "deleteForecast":
      return "Suppression d'une prévision";
    case "saveMonthSettings":
      return `Paramètres du mois ${action.monthKey}`;
    case "saveCategoryBudgets":
      return "Plafonds par catégorie";
    case "saveRecurring":
      return `Récurrence "${action.data.description}"`;
    case "deleteRecurring":
      return "Suppression d'une récurrence";
    case "saveInvestment":
      return `Investissement "${action.data.name}"`;
    case "deleteInvestment":
      return "Suppression d'un investissement";
    case "saveGoal":
      return `Objectif "${action.data.name}"`;
    case "deleteGoal":
      return "Suppression d'un objectif";
    default:
      return "Action inconnue";
  }
}

// ── Session ────────────────────────────────────────────────────────────────────
export const session = {
  save(username: string, token: string | null) {
    localStorage.setItem(KEY_USERNAME, username);
    token
      ? localStorage.setItem(KEY_TOKEN, token)
      : localStorage.removeItem(KEY_TOKEN);
  },
  load(): { username: string; token: string | null } | null {
    const username = localStorage.getItem(KEY_USERNAME);
    const token = localStorage.getItem(KEY_TOKEN);
    if (!username) return null;
    return { username, token };
  },
  clear() {
    localStorage.removeItem(KEY_USERNAME);
    localStorage.removeItem(KEY_TOKEN);
  },
};

// ── Actions définitivement abandonnées ─────────────────────────────────────────
// Contrairement à la queue (temporaire, en cours de retry), ceci est un journal
// permanent que l'utilisateur peut consulter : "ces N changements n'ont jamais
// pu être synchronisés et ont été abandonnés après 10 tentatives".
export interface DroppedAction {
  id: string;
  description: string;
  droppedAt: string;
}
export const droppedActions = {
  load(): DroppedAction[] {
    try {
      return JSON.parse(localStorage.getItem(KEY_DROPPED) ?? "[]");
    } catch {
      return [];
    }
  },
  push(entry: DroppedAction) {
    const list = this.load();
    list.push(entry);
    localStorage.setItem(KEY_DROPPED, JSON.stringify(list));
    notifyQueueChange();
  },
  clear() {
    localStorage.removeItem(KEY_DROPPED);
    notifyQueueChange();
  },
  count(): number {
    return this.load().length;
  },
};

// ── File d'attente persistante ─────────────────────────────────────────────────
const queue = {
  load(): QueueEntry[] {
    try {
      return JSON.parse(localStorage.getItem(KEY_QUEUE) ?? "[]");
    } catch {
      return [];
    }
  },
  save(entries: QueueEntry[]) {
    localStorage.setItem(KEY_QUEUE, JSON.stringify(entries));
    notifyQueueChange();
  },
  push(token: string, action: QueueAction) {
    const entries = this.load();
    entries.push({
      id: `q-${Date.now()}-${Math.random()}`,
      token,
      action,
      createdAt: new Date().toISOString(),
      retries: 0,
    });
    this.save(entries);
  },
  remove(id: string) {
    this.save(this.load().filter((e) => e.id !== id));
  },
  clear() {
    localStorage.removeItem(KEY_QUEUE);
    notifyQueueChange();
  },
  count(): number {
    return this.load().length;
  },
};

// Exposé pour l'UI (badge "N en attente" dans SyncStatus)
export function pendingQueueCount(): number {
  return queue.count();
}

// ── Check réseau ───────────────────────────────────────────────────────────────
async function isServerOnline(): Promise<boolean> {
  if (IS_ELECTRON) return true;
  try {
    const endpoint = `${SERVER_URL.replace("/api", "")}/health`;
    const r = await fetch(endpoint, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}

// ── Exécuteur d'une action de queue ───────────────────────────────────────────
async function executeAction(
  token: string,
  action: QueueAction,
  onIdRemap?: (tempId: string | number, dbId: string) => void,
): Promise<boolean> {
  const h: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const sig = AbortSignal.timeout(5000);

  try {
    switch (action.type) {
      case "addExpense": {
        const r = await fetch(`${SERVER_URL}/data/expenses`, {
          method: "POST",
          headers: h,
          signal: sig,
          body: JSON.stringify({
            monthKey: action.monthKey,
            amount: action.amount,
            description: action.description,
            category: action.category,
            date: action.date,
          }),
        });
        if (!r.ok) return false;
        const j = await r.json();
        if (j.expense?.id && onIdRemap) onIdRemap(action.tempId, j.expense.id);
        return true;
      }
      case "deleteExpense": {
        const r = await fetch(`${SERVER_URL}/data/expenses/${action.id}`, {
          method: "DELETE",
          headers: h,
          signal: sig,
        });
        return r.ok || r.status === 404; // 404 = déjà supprimé, considéré OK
      }
      case "saveSettings": {
        const r = await fetch(`${SERVER_URL}/data/settings`, {
          method: "PUT",
          headers: h,
          signal: sig,
          body: JSON.stringify({
            salary: action.salary,
            savings: action.savings,
          }),
        });
        return r.ok;
      }
      case "saveCarryOver": {
        const r = await fetch(`${SERVER_URL}/data/carryover`, {
          method: "PUT",
          headers: h,
          signal: sig,
          body: JSON.stringify({
            monthKey: action.monthKey,
            amount: action.amount,
          }),
        });
        return r.ok;
      }
      case "addForecast": {
        const r = await fetch(`${SERVER_URL}/data/forecast`, {
          method: "POST",
          headers: h,
          signal: sig,
          body: JSON.stringify({
            monthKey: action.monthKey,
            catId: action.catId,
            label: action.label,
            price: action.price,
            done: action.done,
          }),
        });
        if (!r.ok) return false;
        const j = await r.json();
        if (j.item?.id && onIdRemap) onIdRemap(action.tempId, j.item.id);
        return true;
      }
      case "deleteForecast": {
        const r = await fetch(`${SERVER_URL}/data/forecast/${action.id}`, {
          method: "DELETE",
          headers: h,
          signal: sig,
        });
        return r.ok || r.status === 404;
      }
      case "saveMonthSettings": {
        const r = await fetch(`${SERVER_URL}/data/month-settings`, {
          method: "PUT",
          headers: h,
          signal: sig,
          body: JSON.stringify({
            monthKey: action.monthKey,
            salary: action.salary,
            savings: action.savings,
          }),
        });
        return r.ok;
      }
      case "saveCategoryBudgets": {
        const r = await fetch(`${SERVER_URL}/data/category-budgets`, {
          method: "PUT",
          headers: h,
          signal: sig,
          body: JSON.stringify({ categoryBudgets: action.budgets }),
        });
        return r.ok;
      }
      case "saveRecurring": {
        const r = await fetch(`${SERVER_URL}/data/recurring/${action.id}`, {
          method: "PUT",
          headers: h,
          signal: sig,
          body: JSON.stringify(action.data),
        });
        return r.ok;
      }
      case "deleteRecurring": {
        const r = await fetch(`${SERVER_URL}/data/recurring/${action.id}`, {
          method: "DELETE",
          headers: h,
          signal: sig,
        });
        return r.ok || r.status === 404;
      }
      case "saveInvestment": {
        const r = await fetch(`${SERVER_URL}/data/investments/${action.id}`, {
          method: "PUT",
          headers: h,
          signal: sig,
          body: JSON.stringify(action.data),
        });
        return r.ok;
      }
      case "deleteInvestment": {
        const r = await fetch(`${SERVER_URL}/data/investments/${action.id}`, {
          method: "DELETE",
          headers: h,
          signal: sig,
        });
        return r.ok || r.status === 404;
      }
      case "saveGoal": {
        const r = await fetch(`${SERVER_URL}/data/goals/${action.id}`, {
          method: "PUT",
          headers: h,
          signal: sig,
          body: JSON.stringify(action.data),
        });
        return r.ok;
      }
      case "deleteGoal": {
        const r = await fetch(`${SERVER_URL}/data/goals/${action.id}`, {
          method: "DELETE",
          headers: h,
          signal: sig,
        });
        return r.ok || r.status === 404;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

// ── Flush de la queue — appeler après reconnexion ou à intervalle ──────────────
let flushing = false;
export async function flushQueue(
  onIdRemap?: (tempId: string | number, dbId: string) => void,
): Promise<number> {
  if (IS_ELECTRON || flushing) return 0;
  const online = await isServerOnline();
  if (!online) return queue.count();

  flushing = true;
  let flushed = 0;
  try {
    const entries = queue.load();
    for (const entry of entries) {
      // Ignorer les actions trop anciennes (> 30 jours) — mais on le trace,
      // ce n'est pas une perte silencieuse.
      const age = Date.now() - new Date(entry.createdAt).getTime();
      if (age > 30 * 24 * 3600 * 1000) {
        droppedActions.push({
          id: entry.id,
          description: describeAction(entry.action),
          droppedAt: new Date().toISOString(),
        });
        queue.remove(entry.id);
        continue;
      }

      const ok = await executeAction(entry.token, entry.action, onIdRemap);
      if (ok) {
        queue.remove(entry.id);
        flushed++;
      } else {
        // Incrémenter les retries — après 10 échecs, abandonner ET tracer
        const entries2 = queue.load();
        const idx = entries2.findIndex((e) => e.id === entry.id);
        if (idx >= 0) {
          entries2[idx].retries++;
          if (entries2[idx].retries >= 10) {
            droppedActions.push({
              id: entries2[idx].id,
              description: describeAction(entries2[idx].action),
              droppedAt: new Date().toISOString(),
            });
            entries2.splice(idx, 1);
          }
          queue.save(entries2);
        }
      }
    }
  } finally {
    flushing = false;
  }
  return flushed;
}

// ── remoteAPI — toujours tenter l'API, sinon mettre en queue ──────────────────
export const remoteAPI = {
  h(token: string): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  },

  async load(token: string): Promise<AppData | null> {
    try {
      const r = await fetch(`${SERVER_URL}/data`, {
        headers: this.h(token),
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) return null;
      const j = await r.json();
      return j.data as AppData;
    } catch {
      return null;
    }
  },

  // Toujours tenter l'appel direct. Si ça échoue → queue
  async addExpense(
    token: string,
    monthKey: string,
    expense: {
      amount: number;
      description: string;
      category: string;
      date: string;
    },
    tempId?: string | number,
  ): Promise<string | null> {
    try {
      const r = await fetch(`${SERVER_URL}/data/expenses`, {
        method: "POST",
        headers: this.h(token),
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({ monthKey, ...expense }),
      });
      if (r.ok) {
        const j = await r.json();
        return j.expense?.id ?? null;
      }
    } catch {
      /* réseau KO */
    }
    // Échec → queue
    queue.push(token, {
      type: "addExpense",
      monthKey,
      tempId: tempId ?? 0,
      ...expense,
    });
    return null;
  },

  async deleteExpense(token: string, id: string): Promise<boolean> {
    try {
      const r = await fetch(`${SERVER_URL}/data/expenses/${id}`, {
        method: "DELETE",
        headers: this.h(token),
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok || r.status === 404) return true;
    } catch {
      /* réseau KO */
    }
    queue.push(token, { type: "deleteExpense", id });
    return false;
  },

  async saveSettings(
    token: string,
    salary: number,
    savings: number,
  ): Promise<boolean> {
    try {
      const r = await fetch(`${SERVER_URL}/data/settings`, {
        method: "PUT",
        headers: this.h(token),
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({ salary, savings }),
      });
      if (r.ok) return true;
    } catch {
      /* réseau KO */
    }
    queue.push(token, { type: "saveSettings", salary, savings });
    return false;
  },

  async saveCarryOver(
    token: string,
    monthKey: string,
    amount: number,
  ): Promise<boolean> {
    try {
      const r = await fetch(`${SERVER_URL}/data/carryover`, {
        method: "PUT",
        headers: this.h(token),
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({ monthKey, amount }),
      });
      if (r.ok) return true;
    } catch {
      /* réseau KO */
    }
    queue.push(token, { type: "saveCarryOver", monthKey, amount });
    return false;
  },

  async addForecast(
    token: string,
    monthKey: string,
    item: { catId: string; label: string; price: number; done: boolean },
    tempId?: string | number,
  ): Promise<string | null> {
    try {
      const r = await fetch(`${SERVER_URL}/data/forecast`, {
        method: "POST",
        headers: this.h(token),
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({ monthKey, ...item }),
      });
      if (r.ok) {
        const j = await r.json();
        return j.item?.id ?? null;
      }
    } catch {
      /* réseau KO */
    }
    queue.push(token, {
      type: "addForecast",
      monthKey,
      tempId: tempId ?? 0,
      ...item,
    });
    return null;
  },

  async saveMonthSettings(
    token: string,
    monthKey: string,
    salary: number | null,
    savings: number | null,
  ): Promise<boolean> {
    try {
      const r = await fetch(`${SERVER_URL}/data/month-settings`, {
        method: "PUT",
        headers: this.h(token),
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({ monthKey, salary, savings }),
      });
      if (r.ok) return true;
    } catch {
      /* réseau KO */
    }
    queue.push(token, { type: "saveMonthSettings", monthKey, salary, savings });
    return false;
  },

  async deleteForecast(token: string, id: string): Promise<boolean> {
    try {
      const r = await fetch(`${SERVER_URL}/data/forecast/${id}`, {
        method: "DELETE",
        headers: this.h(token),
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok || r.status === 404) return true;
    } catch {
      /* réseau KO */
    }
    queue.push(token, { type: "deleteForecast", id });
    return false;
  },

  // ── Plafonds par catégorie — objet complet ──────────────────────────────────
  async saveCategoryBudgets(
    token: string,
    budgets: Record<string, number>,
  ): Promise<boolean> {
    try {
      const r = await fetch(`${SERVER_URL}/data/category-budgets`, {
        method: "PUT",
        headers: this.h(token),
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({ categoryBudgets: budgets }),
      });
      if (r.ok) return true;
    } catch {
      /* réseau KO */
    }
    queue.push(token, { type: "saveCategoryBudgets", budgets });
    return false;
  },

  // ── Récurrentes — upsert whole-object (le client garde l'id source de vérité) ──
  async saveRecurring(
    token: string,
    id: string,
    data: RecurringExpensePayload,
  ): Promise<boolean> {
    try {
      const r = await fetch(`${SERVER_URL}/data/recurring/${id}`, {
        method: "PUT",
        headers: this.h(token),
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify(data),
      });
      if (r.ok) return true;
    } catch {
      /* réseau KO */
    }
    queue.push(token, { type: "saveRecurring", id, data });
    return false;
  },

  async deleteRecurring(token: string, id: string): Promise<boolean> {
    try {
      const r = await fetch(`${SERVER_URL}/data/recurring/${id}`, {
        method: "DELETE",
        headers: this.h(token),
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok || r.status === 404) return true;
    } catch {
      /* réseau KO */
    }
    queue.push(token, { type: "deleteRecurring", id });
    return false;
  },

  // ── Investissements — upsert whole-object ────────────────────────────────────
  async saveInvestment(
    token: string,
    id: string,
    data: InvestmentPayload,
  ): Promise<boolean> {
    try {
      const r = await fetch(`${SERVER_URL}/data/investments/${id}`, {
        method: "PUT",
        headers: this.h(token),
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify(data),
      });
      if (r.ok) return true;
    } catch {
      /* réseau KO */
    }
    queue.push(token, { type: "saveInvestment", id, data });
    return false;
  },

  async deleteInvestment(token: string, id: string): Promise<boolean> {
    try {
      const r = await fetch(`${SERVER_URL}/data/investments/${id}`, {
        method: "DELETE",
        headers: this.h(token),
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok || r.status === 404) return true;
    } catch {
      /* réseau KO */
    }
    queue.push(token, { type: "deleteInvestment", id });
    return false;
  },

  // ── Objectifs financiers — upsert whole-object ───────────────────────────────
  async saveGoal(
    token: string,
    id: string,
    data: GoalPayload,
  ): Promise<boolean> {
    try {
      const r = await fetch(`${SERVER_URL}/data/goals/${id}`, {
        method: "PUT",
        headers: this.h(token),
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify(data),
      });
      if (r.ok) return true;
    } catch {
      /* réseau KO */
    }
    queue.push(token, { type: "saveGoal", id, data });
    return false;
  },

  async deleteGoal(token: string, id: string): Promise<boolean> {
    try {
      const r = await fetch(`${SERVER_URL}/data/goals/${id}`, {
        method: "DELETE",
        headers: this.h(token),
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok || r.status === 404) return true;
    } catch {
      /* réseau KO */
    }
    queue.push(token, { type: "deleteGoal", id });
    return false;
  },

  // ── Rapports exportables (CSV/PDF) ──────────────────────────────────────────
  async downloadReport(
    token: string,
    format: "csv" | "pdf",
    period: { month?: string; year?: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (period.month) params.set("month", period.month);
      if (period.year) params.set("year", period.year);
      const r = await fetch(`${SERVER_URL}/reports/${format}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) return { success: false, error: "Échec du téléchargement" };

      const blob = await r.blob();
      const disposition = r.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `rapport.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    } catch {
      return { success: false, error: "Erreur réseau" };
    }
  },

  // ── Recherche globale ────────────────────────────────────────────────────────
  async searchExpenses(
    token: string,
    params: { q?: string; year?: string; month?: string; category?: string },
  ): Promise<ExpenseSearchResult[]> {
    try {
      const qs = new URLSearchParams();
      if (params.q) qs.set("q", params.q);
      if (params.year) qs.set("year", params.year);
      if (params.month) qs.set("month", params.month);
      if (params.category) qs.set("category", params.category);
      const r = await fetch(`${SERVER_URL}/data/search?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return [];
      const j = await r.json();
      return j.results ?? [];
    } catch {
      return [];
    }
  },
};

// ── authAPI ────────────────────────────────────────────────────────────────────
export const authAPI = {
  async register(username: string, password: string): Promise<AuthResult> {
    if (window.electronAPI)
      return window.electronAPI.authRegister(username, password);
    const r = await fetch(`${SERVER_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return r.json();
  },
  async login(username: string, password: string): Promise<AuthResult> {
    if (window.electronAPI)
      return window.electronAPI.authLogin(username, password);
    const r = await fetch(`${SERVER_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return r.json();
  },
  async listUsers(): Promise<string[]> {
    if (window.electronAPI) return window.electronAPI.authListUsers();
    return [];
  },
  async changePassword(
    username: string,
    oldPwd: string,
    newPwd: string,
    token?: string | null,
  ): Promise<AuthResult> {
    if (window.electronAPI)
      return window.electronAPI.changePassword(username, oldPwd, newPwd);
    const r = await fetch(`${SERVER_URL}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
    });
    return r.json();
  },
  async changeUsername(
    oldUsername: string,
    password: string,
    newUsername: string,
    token?: string | null,
  ): Promise<AuthResult> {
    if (window.electronAPI)
      return window.electronAPI.changeUsername(
        oldUsername,
        password,
        newUsername,
      );
    const r = await fetch(`${SERVER_URL}/auth/change-username`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password, newUsername }),
    });
    return r.json();
  },
  async deleteAccount(
    username: string,
    password: string,
    token?: string | null,
  ): Promise<AuthResult> {
    if (window.electronAPI)
      return window.electronAPI.deleteAccount(username, password);
    const r = await fetch(`${SERVER_URL}/auth/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
    });
    return r.json();
  },
  async getLastUser(): Promise<string | null> {
    if (window.electronAPI) return window.electronAPI.getLastUser();
    return localStorage.getItem(KEY_LAST);
  },
  async setLastUser(username: string): Promise<void> {
    if (window.electronAPI) {
      window.electronAPI.setLastUser(username);
      return;
    }
    localStorage.setItem(KEY_LAST, username);
  },
};

// ── localStorage helpers ───────────────────────────────────────────────────────
function loadLocal(username: string): AppData | null {
  try {
    if (window.electronAPI) return null;
    const raw = localStorage.getItem(`bt-data-${username}`);
    return raw ? (JSON.parse(raw) as AppData) : null;
  } catch {
    return null;
  }
}

function saveLocal(username: string, data: AppData): void {
  try {
    window.electronAPI
      ? window.electronAPI.saveUserData(username, data)
      : localStorage.setItem(`bt-data-${username}`, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

// ── Storage principal ──────────────────────────────────────────────────────────
export function createStorage(username: string, token: string | null): Storage {
  return {
    async load(): Promise<AppData> {
      if (window.electronAPI) {
        const data = await window.electronAPI.loadUserData(username);
        return data ?? defaultData();
      }

      const local = loadLocal(username);
      if (!token) return local ?? defaultData();

      // Charger depuis l'API
      const remote = await remoteAPI.load(token);
      if (!remote) {
        // Pas de réseau → données locales (qui incluent déjà les entrées en queue)
        return local ?? defaultData();
      }

      // Fusionner : appliquer les entrées en queue sur les données API
      // pour ne pas perdre ce qui n'est pas encore synchronisé
      const pending = queue.load();
      if (pending.length === 0) {
        // Comparer les timestamps : si local est plus récent de + de 5s → garder local
        // (cas d'un import récent pas encore poussé vers l'API)
        const localUpdated = local?.updatedAt
          ? new Date(local.updatedAt).getTime()
          : 0;
        const remoteUpdated = remote?.updatedAt
          ? new Date(remote.updatedAt).getTime()
          : 0;
        if (localUpdated > remoteUpdated + 5000) {
          // Local plus récent : re-pusher les données locales en queue
          // pour qu'elles soient synchronisées au prochain flush
          return local!;
        }
        // API est la source de vérité
        saveLocal(username, { ...remote, updatedAt: new Date().toISOString() });
        return remote;
      }

      // Il y a des données en attente → fusionner local + remote
      // On part du remote (source de vérité pour ce qui est synchro)
      // et on réapplique les actions en queue par-dessus
      const merged: AppData = {
        ...remote,
        months: { ...remote.months },
        forecastItems: { ...remote.forecastItems },
        carryOver: { ...remote.carryOver },
        recurringExpenses: { ...(remote.recurringExpenses ?? {}) },
        investments: { ...(remote.investments ?? {}) },
        goals: { ...(remote.goals ?? {}) },
      };

      for (const entry of pending) {
        const a = entry.action;
        if (a.type === "addExpense") {
          if (!merged.months[a.monthKey]) merged.months[a.monthKey] = [];
          // Éviter les doublons (même tempId)
          const already = merged.months[a.monthKey].some(
            (e) => String(e.id) === String(a.tempId),
          );
          if (!already) {
            merged.months[a.monthKey] = [
              {
                id: a.tempId,
                amount: a.amount,
                description: a.description,
                category: a.category,
                date: a.date,
              },
              ...merged.months[a.monthKey],
            ];
          }
        } else if (a.type === "deleteExpense") {
          Object.keys(merged.months).forEach((mk) => {
            merged.months[mk] = merged.months[mk].filter(
              (e) => String(e.id) !== a.id,
            );
          });
        } else if (a.type === "saveSettings") {
          merged.salary = a.salary;
          merged.savings = a.savings;
        } else if (a.type === "saveCategoryBudgets") {
          merged.categoryBudgets = a.budgets;
        } else if (a.type === "saveCarryOver") {
          merged.carryOver[a.monthKey] = a.amount;
        } else if (a.type === "addForecast") {
          if (!merged.forecastItems[a.monthKey])
            merged.forecastItems[a.monthKey] = [];
          const alreadyF = merged.forecastItems[a.monthKey].some(
            (i) => String(i.id) === String(a.tempId),
          );
          if (!alreadyF) {
            merged.forecastItems[a.monthKey].push({
              id: a.tempId,
              catId: a.catId,
              label: a.label,
              price: a.price,
              done: a.done,
            });
          }
        } else if (a.type === "deleteForecast") {
          Object.keys(merged.forecastItems).forEach((mk) => {
            merged.forecastItems[mk] = merged.forecastItems[mk].filter(
              (i) => String(i.id) !== a.id,
            );
          });
        } else if (a.type === "saveMonthSettings") {
          if (!merged.monthOverrides) merged.monthOverrides = {};
          if (a.salary === null && a.savings === null) {
            delete merged.monthOverrides[a.monthKey];
          } else {
            merged.monthOverrides[a.monthKey] = {
              salary: a.salary,
              savings: a.savings,
            };
          }
        } else if (a.type === "saveRecurring") {
          if (!merged.recurringExpenses) merged.recurringExpenses = {};
          merged.recurringExpenses[a.id] = {
            id: a.id,
            ...a.data,
            createdAt:
              merged.recurringExpenses[a.id]?.createdAt ??
              new Date().toISOString(),
          };
        } else if (a.type === "deleteRecurring") {
          if (merged.recurringExpenses) delete merged.recurringExpenses[a.id];
        } else if (a.type === "saveInvestment") {
          if (!merged.investments) merged.investments = {};
          merged.investments[a.id] = { id: a.id, ...a.data } as Investment;
        } else if (a.type === "deleteInvestment") {
          if (merged.investments) delete merged.investments[a.id];
        } else if (a.type === "saveGoal") {
          if (!merged.goals) merged.goals = {};
          merged.goals[a.id] = {
            id: a.id,
            ...a.data,
            createdAt:
              merged.goals[a.id]?.createdAt ?? new Date().toISOString(),
          } as FinancialGoal;
        } else if (a.type === "deleteGoal") {
          if (merged.goals) delete merged.goals[a.id];
        }
      }

      saveLocal(username, { ...merged, updatedAt: new Date().toISOString() });
      return merged;
    },

    // Cache local + déclenche un flush de queue si possible
    async save(data: AppData): Promise<void> {
      saveLocal(username, { ...data, updatedAt: new Date().toISOString() });
      // Tentative de flush silencieux en arrière-plan si queue non vide
      if (!window.electronAPI && token && queue.count() > 0) {
        flushQueue().catch(() => {});
      }
    },

    async sync(): Promise<{
      synced: boolean;
      data?: AppData;
      reason?: string;
    }> {
      if (!token) return { synced: false, reason: "no token" };

      // 1. Flusher la queue en premier avec remap des IDs temporaires → IDs DB
      const localData = loadLocal(username);
      await flushQueue((tempId, dbId) => {
        // Mettre à jour les IDs dans le localStorage directement
        const d = loadLocal(username);
        if (!d) return;
        let changed = false;
        Object.keys(d.months).forEach((mk) => {
          d.months[mk] = d.months[mk].map((e) => {
            if (String(e.id) === String(tempId)) {
              changed = true;
              return { ...e, id: dbId };
            }
            return e;
          });
        });
        if (d.forecastItems) {
          Object.keys(d.forecastItems).forEach((mk) => {
            d.forecastItems[mk] = d.forecastItems[mk].map((i) => {
              if (String(i.id) === String(tempId)) {
                changed = true;
                return { ...i, id: dbId };
              }
              return i;
            });
          });
        }
        if (changed) saveLocal(username, d);
      });

      // 2. Recharger depuis l'API
      const remote = await remoteAPI.load(token);
      if (!remote) return { synced: false, reason: "offline" };

      // 3. S'il reste des entrées en queue après le flush (échecs partiels),
      //    les fusionner avec les données remote pour ne rien perdre
      const pending = queue.load();
      if (pending.length === 0) {
        saveLocal(username, remote);
        return { synced: true, data: remote };
      }

      // Fusionner les entrées en queue restantes sur les données de l'API
      const merged: AppData = {
        ...remote,
        months: { ...remote.months },
        forecastItems: { ...remote.forecastItems },
        carryOver: { ...remote.carryOver },
        recurringExpenses: { ...(remote.recurringExpenses ?? {}) },
        investments: { ...(remote.investments ?? {}) },
        categoryBudgets: { ...(remote.categoryBudgets ?? {}) },
        goals: { ...(remote.goals ?? {}) },
      };
      for (const entry of pending) {
        const a = entry.action;
        if (a.type === "addExpense") {
          if (!merged.months[a.monthKey]) merged.months[a.monthKey] = [];
          const already = merged.months[a.monthKey].some(
            (e) => String(e.id) === String(a.tempId),
          );
          if (!already) {
            merged.months[a.monthKey] = [
              {
                id: a.tempId,
                amount: a.amount,
                description: a.description,
                category: a.category,
                date: a.date,
              },
              ...merged.months[a.monthKey],
            ];
          }
        } else if (a.type === "deleteExpense") {
          Object.keys(merged.months).forEach((mk) => {
            merged.months[mk] = merged.months[mk].filter(
              (e) => String(e.id) !== a.id,
            );
          });
        } else if (a.type === "saveSettings") {
          merged.salary = a.salary;
          merged.savings = a.savings;
        } else if (a.type === "saveCarryOver") {
          merged.carryOver[a.monthKey] = a.amount;
        } else if (a.type === "addForecast") {
          if (!merged.forecastItems[a.monthKey])
            merged.forecastItems[a.monthKey] = [];
          const alreadyF = merged.forecastItems[a.monthKey].some(
            (i) => String(i.id) === String(a.tempId),
          );
          if (!alreadyF) {
            merged.forecastItems[a.monthKey].push({
              id: a.tempId,
              catId: a.catId,
              label: a.label,
              price: a.price,
              done: a.done,
            });
          }
        } else if (a.type === "deleteForecast") {
          Object.keys(merged.forecastItems).forEach((mk) => {
            merged.forecastItems[mk] = merged.forecastItems[mk].filter(
              (i) => String(i.id) !== a.id,
            );
          });
        } else if (a.type === "saveMonthSettings") {
          if (!merged.monthOverrides) merged.monthOverrides = {};
          if (a.salary === null && a.savings === null)
            delete merged.monthOverrides[a.monthKey];
          else
            merged.monthOverrides[a.monthKey] = {
              salary: a.salary,
              savings: a.savings,
            };
        } else if (a.type === "saveCategoryBudgets") {
          merged.categoryBudgets = a.budgets;
        } else if (a.type === "saveRecurring") {
          if (!merged.recurringExpenses) merged.recurringExpenses = {};
          merged.recurringExpenses[a.id] = {
            id: a.id,
            ...a.data,
            createdAt:
              merged.recurringExpenses[a.id]?.createdAt ??
              new Date().toISOString(),
          };
        } else if (a.type === "deleteRecurring") {
          if (merged.recurringExpenses) delete merged.recurringExpenses[a.id];
        } else if (a.type === "saveInvestment") {
          if (!merged.investments) merged.investments = {};
          merged.investments[a.id] = { id: a.id, ...a.data } as Investment;
        } else if (a.type === "deleteInvestment") {
          if (merged.investments) delete merged.investments[a.id];
        } else if (a.type === "saveGoal") {
          if (!merged.goals) merged.goals = {};
          merged.goals[a.id] = {
            id: a.id,
            ...a.data,
            createdAt:
              merged.goals[a.id]?.createdAt ?? new Date().toISOString(),
          } as FinancialGoal;
        } else if (a.type === "deleteGoal") {
          if (merged.goals) delete merged.goals[a.id];
        }
      }
      saveLocal(username, merged);
      return { synced: true, data: merged };
    },
  };
}
