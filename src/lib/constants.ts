import type { Category, AppData } from "./types";

// Résout le plafond d'une catégorie : override AppData si défini, sinon défaut
export function getCategoryBudget(catId: string, appData?: AppData): number {
  const override = appData?.categoryBudgets?.[catId];
  if (override !== undefined) return override;
  return CATEGORIES.find((c) => c.id === catId)?.budget ?? 0;
}

export const CATEGORIES: Category[] = [
  { id: "alimentation", label: "🍽️ Alimentation", budget: 15000 },
  { id: "sante", label: "🏥 Santé", budget: 5000 },
  { id: "internet", label: "📱 Internet/Téléphone", budget: 8000 },
  { id: "electricite", label: "⚡ Électricité", budget: 5000 },
  { id: "transport", label: "🚶 Transport", budget: 3000 },
  { id: "hygiene", label: "🧼 Hygiène", budget: 3000 },
  { id: "apparence", label: "💇 Apparence", budget: 2000 },
  { id: "sorties", label: "🎭 Sorties Sociales", budget: 3000 },
  { id: "developpement", label: "📚 Développement", budget: 2000 },
  { id: "urgences", label: "🆘 Urgences", budget: 2000 },
  { id: "autre", label: "📦 Autre", budget: 0 },
];

export const MONTH_NAMES: string[] = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
}

export function nextMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month, 1);
  return getMonthKey(d);
}

export function defaultData(): AppData {
  return {
    salary: 50000,
    savings: 20000,
    months: {},
    investments: {},
    carryOver: {},
    forecastItems: {},
  };
}
