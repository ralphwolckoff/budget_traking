// ══════════════════════════════════════════════════════════════════════════════
// Types globaux — Budget Tracker
// ══════════════════════════════════════════════════════════════════════════════

export interface Category {
  id: string;
  label: string;
  budget: number;
}

export interface Expense {
  id: string | number;
  amount: number;
  description: string;
  category: string;
  date: string;
  recurringId?: string; // si présent, cette dépense a été générée automatiquement
  tags?: string[]; // libellés libres — filtrage/analyse, aucune contrainte de format
  receiptImage?: string; // data URL JPEG compressée (photo de reçu/ticket), voir imageCompress.ts
}

export interface ForecastItem {
  id: string | number;
  catId: string;
  label: string;
  price: number;
  done: boolean;
}

export interface CarryOver {
  [monthKey: string]: number;
}

export interface ForecastItems {
  [monthKey: string]: ForecastItem[];
}

export interface MonthData {
  [monthKey: string]: Expense[];
}

// Override de salary/savings pour un mois donné
// null = pas d'override → utilise la valeur globale

export type InvestmentType =
  | "actions"
  | "immobilier"
  | "crypto"
  | "obligations"
  | "epargne"
  | "business"
  | "autre";

export interface InvestmentDocument {
  id: string;
  name: string; // nom du fichier ou du document
  type: string; // 'contrat' | 'recu' | 'rapport' | 'autre'
  addedAt: string; // date d'ajout
  notes?: string;
}

export interface InvestmentPayment {
  id: string;
  date: string;
  amount: number;
  note?: string;
}

// Gain encaissé sur un mois donné (distribué mensuellement)
export interface InvestmentGainEntry {
  id: string;
  monthKey: string; // "2026-03" — mois d'encaissement
  amount: number; // montant encaissé
  note?: string;
}

export interface InvestmentEvent {
  id: string;
  date: string;
  type: "note" | "valeur" | "statut" | "versement";
  content: string;
  value?: number; // pour type='valeur' : nouvelle valeur
}

export interface InvestmentValuePoint {
  date: string;
  value: number;
}

export interface Investment {
  id: string | number;
  type: InvestmentType;
  name: string;
  amount: number; // capital initial
  startDate: string;
  endDate?: string;
  durationMonths?: number;
  expectedReturn?: number; // % indicatif seulement — aucun calcul automatique
  currentValue?: number; // valeur actuelle (saisie manuelle)
  notes?: string;
  status: "actif" | "cloture" | "en_attente";
  // Enrichissements
  payments?: InvestmentPayment[]; // versements supplémentaires (réduisent budget)
  gains?: InvestmentGainEntry[]; // gains encaissés par mois (augmentent budget)
  events?: InvestmentEvent[]; // journal horodaté
  valueHistory?: InvestmentValuePoint[]; // historique valeur pour graphe
  documents?: InvestmentDocument[]; // pièces jointes (nom seulement)
}

export interface Investments {
  [id: string]: Investment;
}

// ── Dépenses récurrentes ──────────────────────────────────────────────────────
export interface RecurringExpense {
  id: string;
  description: string;
  category: string;
  amount: number;
  dayOfMonth: number; // 1-31, jour de génération (ajusté si mois plus court)
  active: boolean; // false = en pause, ne génère plus
  startMonth: string; // "2026-03" — premier mois d'application
  endMonth?: string; // dernier mois d'application (optionnel)
  lastGeneratedMonth?: string; // dernier mois où la dépense a été générée (anti-doublon)
  createdAt: string;
  notes?: string;
}

export interface RecurringExpenses {
  [id: string]: RecurringExpense;
}

// Génère les dépenses récurrentes dues pour un mois donné.
// Retourne les nouvelles données + le nombre de dépenses ajoutées.
// Idempotent : ne génère jamais deux fois pour le même mois (lastGeneratedMonth).
// Génère les dépenses récurrentes dues, en rattrapant tous les mois manquants
// entre le dernier mois généré (ou startMonth si jamais généré) et le mois cible.
// Permet de backfill automatiquement si une récurrente est créée avec une
// date de début dans le passé.
export function generateRecurringExpenses(
  appData: AppData,
  monthKey: string,
): {
  data: AppData;
  addedCount: number;
  addedLabels: string[];
  addedExpenses: { monthKey: string; expense: Expense }[];
} {
  const recurring = appData.recurringExpenses ?? {};
  const ids = Object.keys(recurring);
  if (ids.length === 0)
    return { data: appData, addedCount: 0, addedLabels: [], addedExpenses: [] };

  const nextKey = (mk: string): string => {
    const [y, m] = mk.split("-").map(Number);
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  };

  let addedCount = 0;
  const addedLabels: string[] = [];
  const addedExpenses: { monthKey: string; expense: Expense }[] = [];
  const newMonths = { ...appData.months };
  const newRecurring = { ...recurring };

  for (const id of ids) {
    const r = recurring[id];
    if (!r.active) continue;
    if (r.startMonth > monthKey) continue;

    let cursor = r.lastGeneratedMonth
      ? nextKey(r.lastGeneratedMonth)
      : r.startMonth;
    let lastGenerated = r.lastGeneratedMonth;

    while (cursor <= monthKey) {
      if (r.endMonth && r.endMonth < cursor) break;

      const [y, m] = cursor.split("-").map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      const day = Math.min(r.dayOfMonth, daysInMonth);
      const date = new Date(y, m - 1, day, 12, 0, 0).toISOString();

      const expense: Expense = {
        id: `rec-${id}-${cursor}`,
        amount: r.amount,
        description: r.description,
        category: r.category,
        date,
        recurringId: id,
      };

      newMonths[cursor] = [...(newMonths[cursor] ?? []), expense];
      addedExpenses.push({ monthKey: cursor, expense });
      lastGenerated = cursor;
      addedCount++;
      addedLabels.push(`${r.description} (${cursor})`);

      cursor = nextKey(cursor);
    }

    if (lastGenerated !== r.lastGeneratedMonth) {
      newRecurring[id] = { ...r, lastGeneratedMonth: lastGenerated };
    }
  }

  if (addedCount === 0)
    return { data: appData, addedCount: 0, addedLabels: [], addedExpenses: [] };

  return {
    data: { ...appData, months: newMonths, recurringExpenses: newRecurring },
    addedCount,
    addedLabels,
    addedExpenses,
  };
}

// ── Résultats de recherche globale ────────────────────────────────────────────
export interface ExpenseSearchResult {
  id: string;
  monthKey: string;
  amount: number;
  description: string;
  category: string;
  date: string;
}

// ── Objectifs financiers ──────────────────────────────────────────────────────
export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string; // "YYYY-MM-DD"
  startDate: string; // "YYYY-MM-DD" — début du suivi
  linkedInvestmentIds?: (string | number)[];
  notes?: string;
  status: "actif" | "atteint" | "abandonne";
  createdAt: string;
}

export interface FinancialGoals {
  [id: string]: FinancialGoal;
}

export interface GoalProgress {
  currentAmount: number; // somme des investissements liés
  remaining: number; // ce qu'il reste à atteindre
  monthsUntilTarget: number; // mois restants avant l'échéance (min 0)
  requiredMonthly: number; // épargne mensuelle nécessaire pour tenir l'échéance
  currentMonthly: number; // épargne mensuelle actuelle (globale)
  onTrack: boolean; // épargne actuelle suffit-elle ?
  gap: number; // manque mensuel (0 si onTrack)
  projectedMonths: number | null; // mois nécessaires au rythme actuel (null si épargne = 0)
  pctComplete: number; // 0-100
}

// Calcule la progression d'un objectif à partir des investissements liés
// et de l'épargne mensuelle globale actuelle (pas de contribution manuelle).
export function resolveGoalProgress(
  goal: FinancialGoal,
  appData: AppData,
): GoalProgress {
  const linkedIds = new Set((goal.linkedInvestmentIds ?? []).map(String));
  const linkedInvestments = Object.values(appData.investments ?? {}).filter(
    (inv) => linkedIds.has(String(inv.id)),
  );

  const currentAmount = linkedInvestments.reduce((s, inv) => {
    const invested =
      inv.amount + (inv.payments ?? []).reduce((a, p) => a + p.amount, 0);
    return s + (inv.currentValue ?? invested);
  }, 0);

  const remaining = Math.max(0, goal.targetAmount - currentAmount);

  const today = new Date();
  const target = new Date(goal.targetDate);
  const monthsUntilTarget = Math.max(
    0,
    Math.round(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
    ),
  );

  const currentMonthly = appData.savings;

  const requiredMonthly =
    monthsUntilTarget > 0
      ? remaining / monthsUntilTarget
      : remaining > 0
        ? remaining
        : 0;
  const onTrack = remaining === 0 || currentMonthly >= requiredMonthly;
  const gap = onTrack ? 0 : requiredMonthly - currentMonthly;

  const projectedMonths =
    currentMonthly > 0
      ? Math.ceil(remaining / currentMonthly)
      : remaining === 0
        ? 0
        : null;

  const pctComplete =
    goal.targetAmount > 0
      ? Math.min(100, (currentAmount / goal.targetAmount) * 100)
      : 0;

  return {
    currentAmount,
    remaining,
    monthsUntilTarget,
    requiredMonthly,
    currentMonthly,
    onTrack,
    gap,
    projectedMonths,
    pctComplete,
  };
}
export interface MonthOverride {
  salary: number | null;
  savings: number | null;
}

export interface MonthOverrides {
  [monthKey: string]: MonthOverride;
}

export interface AppData {
  salary: number; // valeur globale (défaut)
  savings: number; // valeur globale (défaut)
  months: MonthData;
  carryOver: CarryOver;
  forecastItems: ForecastItems;
  monthOverrides?: MonthOverrides; // overrides par mois (optionnel, rétrocompatible)
  investments?: Investments; // portefeuille d'investissements
  categoryBudgets?: Record<string, number>; // plafonds personnalisés par catégorie
  recurringExpenses?: RecurringExpenses; // dépenses récurrentes (loyer, abonnements...)
  updatedAt?: string;
  goals?: FinancialGoals;
}

// Helper : résout salary/savings effectifs pour un mois donné
export function resolveMonthSettings(
  appData: AppData,
  monthKey: string,
): { salary: number; savings: number } {
  const override = appData.monthOverrides?.[monthKey];
  return {
    salary: override?.salary ?? appData.salary,
    savings: override?.savings ?? appData.savings,
  };
}

// Calcule l'impact net des investissements sur le budget d'un mois :
// - montant initial si startDate commence par monthKey → réduit budget
// - versements supplémentaires datés de ce mois → réduisent budget
// - gains encaissés ce mois → augmentent budget (valeur négative = revenu)
// Retourne : { cost: number, gains: number, net: number }
export function resolveMonthInvestments(
  appData: AppData,
  monthKey: string,
): { cost: number; gains: number; net: number } {
  let cost = 0;
  let gains = 0;

  for (const inv of Object.values(appData.investments ?? {})) {
    if (inv.status === "cloture") continue;

    // Capital initial
    if (inv.startDate.startsWith(monthKey)) cost += inv.amount;

    // Versements supplémentaires
    for (const p of inv.payments ?? []) {
      if (p.date.startsWith(monthKey)) cost += p.amount;
    }

    // Gains encaissés ce mois
    for (const g of inv.gains ?? []) {
      if (g.monthKey === monthKey) gains += g.amount;
    }
  }

  return { cost, gains, net: cost - gains };
}

// ── Tendance mois vs mois précédent ──────────────────────────────────────────
export interface MonthTrend {
  currentTotal: number;
  previousTotal: number;
  delta: number; // currentTotal - previousTotal (positif = dépensé plus)
  deltaPct: number | null; // % variation, null si previousTotal = 0 (rien à comparer)
  hasPreviousData: boolean; // le mois précédent a-t-il des dépenses enregistrées ?
}

// Compare le total dépensé d'un mois à celui du mois précédent (calendaire,
// pas juste "le mois avec le plus de données avant" — comparaison honnête).
export function resolveMonthTrend(
  appData: AppData,
  monthKey: string,
): MonthTrend {
  const [y, m] = monthKey.split("-").map(Number);
  const prevDate = new Date(y, m - 2, 1); // m est 1-indexé ; m-2 = mois précédent en JS (0-indexé)
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const currentTotal = (appData.months[monthKey] ?? []).reduce(
    (s, e) => s + Math.round(e.amount),
    0,
  );
  const previousExpenses = appData.months[prevKey] ?? [];
  const previousTotal = previousExpenses.reduce(
    (s, e) => s + Math.round(e.amount),
    0,
  );
  const hasPreviousData = previousExpenses.length > 0;

  const delta = currentTotal - previousTotal;
  const deltaPct = previousTotal > 0 ? (delta / previousTotal) * 100 : null;

  return { currentTotal, previousTotal, delta, deltaPct, hasPreviousData };
}

export interface CurrentUser {
  username: string;
  token: string | null;
}

export type SyncStatus =
  | "checking"
  | "online"
  | "syncing"
  | "synced"
  | "offline";

export type PageId =
  | "dashboard"
  | "depenses"
  | "visu"
  | "forecast"
  | "history"
  | "investments"
  | "recurring"
  | "account"
  | "goals";

export interface Storage {
  load: () => Promise<AppData>;
  save: (data: AppData) => Promise<void>;
  sync: () => Promise<{ synced: boolean; data?: AppData; reason?: string }>;
  token?: string | null;
  username?: string;
}

export interface AuthResult {
  success: boolean;
  username?: string;
  token?: string;
  error?: string;
}

// ── Electron IPC ──────────────────────────────────────────────────────────────
export interface ElectronAPI {
  authRegister: (username: string, password: string) => Promise<AuthResult>;
  authLogin: (username: string, password: string) => Promise<AuthResult>;
  authListUsers: () => Promise<string[]>;
  changePassword: (
    username: string,
    oldPwd: string,
    newPwd: string,
  ) => Promise<AuthResult>;
  changeUsername: (
    oldUsername: string,
    password: string,
    newUsername: string,
  ) => Promise<AuthResult>;
  deleteAccount: (username: string, password: string) => Promise<AuthResult>;
  loadUserData: (username: string) => Promise<AppData | null>;
  saveUserData: (username: string, data: AppData) => Promise<void>;
  getLastUser: () => Promise<string | null>;
  setLastUser: (username: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
