// ══════════════════════════════════════════════════════════════════════════════
// Types globaux — Budget Tracker
// ══════════════════════════════════════════════════════════════════════════════

export interface Category {
  id:     string
  label:  string
  budget: number
}

export interface Expense {
  id:          string | number
  amount:      number
  description: string
  category:    string
  date:        string
  recurringId?: string   // si présent, cette dépense a été générée automatiquement
}

export interface ForecastItem {
  id:    string | number
  catId: string
  label: string
  price: number
  done:  boolean
}

export interface CarryOver {
  [monthKey: string]: number
}

export interface ForecastItems {
  [monthKey: string]: ForecastItem[]
}

export interface MonthData {
  [monthKey: string]: Expense[]
}

// Override de salary/savings pour un mois donné
// null = pas d'override → utilise la valeur globale

export type InvestmentType =
    | 'actions'
    | 'immobilier'
    | 'crypto'
    | 'obligations'
    | 'epargne'
    | 'business'
    | 'autre'

export interface InvestmentDocument {
  id:       string
  name:     string      // nom du fichier ou du document
  type:     string      // 'contrat' | 'recu' | 'rapport' | 'autre'
  addedAt:  string      // date d'ajout
  notes?:   string
}

export interface InvestmentPayment {
  id:     string
  date:   string
  amount: number
  note?:  string
}

// Gain encaissé sur un mois donné (distribué mensuellement)
export interface InvestmentGainEntry {
  id:       string
  monthKey: string   // "2026-03" — mois d'encaissement
  amount:   number   // montant encaissé
  note?:    string
}

export interface InvestmentEvent {
  id:      string
  date:    string
  type:    'note' | 'valeur' | 'statut' | 'versement'
  content: string
  value?:  number   // pour type='valeur' : nouvelle valeur
}

export interface InvestmentValuePoint {
  date:  string
  value: number
}

export interface Investment {
  id:             string | number
  type:           InvestmentType
  name:           string
  amount:         number          // capital initial
  startDate:      string
  endDate?:       string
  durationMonths?: number
  expectedReturn?: number         // % indicatif seulement — aucun calcul automatique
  currentValue?:  number          // valeur actuelle (saisie manuelle)
  notes?:         string
  status:         'actif' | 'cloture' | 'en_attente'
  // Enrichissements
  payments?:      InvestmentPayment[]    // versements supplémentaires (réduisent budget)
  gains?:         InvestmentGainEntry[]  // gains encaissés par mois (augmentent budget)
  events?:        InvestmentEvent[]      // journal horodaté
  valueHistory?:  InvestmentValuePoint[] // historique valeur pour graphe
  documents?:     InvestmentDocument[]   // pièces jointes (nom seulement)
}

export interface Investments {
  [id: string]: Investment
}

// ── Dépenses récurrentes ──────────────────────────────────────────────────────
export interface RecurringExpense {
  id:                  string
  description:         string
  category:            string
  amount:              number
  dayOfMonth:          number    // 1-31, jour de génération (ajusté si mois plus court)
  active:               boolean   // false = en pause, ne génère plus
  startMonth:          string    // "2026-03" — premier mois d'application
  endMonth?:           string    // dernier mois d'application (optionnel)
  lastGeneratedMonth?: string    // dernier mois où la dépense a été générée (anti-doublon)
  createdAt:           string
  notes?:              string
}

export interface RecurringExpenses {
  [id: string]: RecurringExpense
}

// Génère les dépenses récurrentes dues pour un mois donné.
// Retourne les nouvelles données + le nombre de dépenses ajoutées.
// Idempotent : ne génère jamais deux fois pour le même mois (lastGeneratedMonth).
export function generateRecurringExpenses(
    appData: AppData,
    monthKey: string,
): { data: AppData; addedCount: number; addedLabels: string[] } {
  const recurring = appData.recurringExpenses ?? {}
  const ids = Object.keys(recurring)
  if (ids.length === 0) return { data: appData, addedCount: 0, addedLabels: [] }

  let addedCount = 0
  const addedLabels: string[] = []
  const newMonths = { ...appData.months }
  const newRecurring = { ...recurring }

  for (const id of ids) {
    const r = recurring[id]
    if (!r.active) continue
    if (r.startMonth > monthKey) continue
    if (r.endMonth && r.endMonth < monthKey) continue
    if (r.lastGeneratedMonth === monthKey) continue // déjà généré ce mois

    // Construire la date : clamp le jour au nombre de jours du mois
    const [y, m] = monthKey.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    const day = Math.min(r.dayOfMonth, daysInMonth)
    const date = new Date(y, m - 1, day, 12, 0, 0).toISOString()

    const expense = {
      id: `rec-${id}-${monthKey}`,
      amount: r.amount,
      description: r.description,
      category: r.category,
      date,
      recurringId: id,
    }

    newMonths[monthKey] = [...(newMonths[monthKey] ?? []), expense]
    newRecurring[id] = { ...r, lastGeneratedMonth: monthKey }
    addedCount++
    addedLabels.push(r.description)
  }

  if (addedCount === 0) return { data: appData, addedCount: 0, addedLabels: [] }

  return {
    data: { ...appData, months: newMonths, recurringExpenses: newRecurring },
    addedCount,
    addedLabels,
  }
}

export interface MonthOverride {
  salary:  number | null
  savings: number | null
}

export interface MonthOverrides {
  [monthKey: string]: MonthOverride
}

export interface AppData {
  salary:         number           // valeur globale (défaut)
  savings:        number           // valeur globale (défaut)
  months:         MonthData
  carryOver:      CarryOver
  forecastItems:  ForecastItems
  monthOverrides?: MonthOverrides  // overrides par mois (optionnel, rétrocompatible)
  investments?:    Investments             // portefeuille d'investissements
  categoryBudgets?: Record<string, number> // plafonds personnalisés par catégorie
  recurringExpenses?: RecurringExpenses    // dépenses récurrentes (loyer, abonnements...)
  updatedAt?:     string
}

// Helper : résout salary/savings effectifs pour un mois donné
export function resolveMonthSettings(appData: AppData, monthKey: string): { salary: number; savings: number } {
  const override = appData.monthOverrides?.[monthKey]
  return {
    salary:  override?.salary  ?? appData.salary,
    savings: override?.savings ?? appData.savings,
  }
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
  let cost  = 0
  let gains = 0

  for (const inv of Object.values(appData.investments ?? {})) {
    if (inv.status === 'cloture') continue

    // Capital initial
    if (inv.startDate.startsWith(monthKey)) cost += inv.amount

    // Versements supplémentaires
    for (const p of inv.payments ?? []) {
      if (p.date.startsWith(monthKey)) cost += p.amount
    }

    // Gains encaissés ce mois
    for (const g of inv.gains ?? []) {
      if (g.monthKey === monthKey) gains += g.amount
    }
  }

  return { cost, gains, net: cost - gains }
}

export interface CurrentUser {
  username: string
  token:    string | null
}

export type SyncStatus = 'checking' | 'online' | 'syncing' | 'synced' | 'offline'

export type PageId =
    | 'dashboard'
    | 'depenses'
    | 'visu'
    | 'forecast'
    | 'history'
    | 'investments'
    | 'recurring'
    | 'account'

export interface Storage {
  load:      () => Promise<AppData>
  save:      (data: AppData) => Promise<void>
  sync:      () => Promise<{ synced: boolean; data?: AppData; reason?: string }>
  token?:    string | null
  username?: string
}

export interface AuthResult {
  success:   boolean
  username?: string
  token?:    string
  error?:    string
}

// ── Electron IPC ──────────────────────────────────────────────────────────────
export interface ElectronAPI {
  authRegister:   (username: string, password: string) => Promise<AuthResult>
  authLogin:      (username: string, password: string) => Promise<AuthResult>
  authListUsers:  () => Promise<string[]>
  changePassword: (username: string, oldPwd: string, newPwd: string) => Promise<AuthResult>
  changeUsername: (oldUsername: string, password: string, newUsername: string) => Promise<AuthResult>
  deleteAccount:  (username: string, password: string) => Promise<AuthResult>
  loadUserData:   (username: string) => Promise<AppData | null>
  saveUserData:   (username: string, data: AppData) => Promise<void>
  getLastUser:    () => Promise<string | null>
  setLastUser:    (username: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}