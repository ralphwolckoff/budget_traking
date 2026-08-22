// ══════════════════════════════════════════════════════════════════════════════
// Centre de notifications — génère des alertes proactives à partir de l'état
// actuel de l'app : plafonds de catégorie approchés/dépassés, récurrentes
// dues bientôt, objectifs qui décrochent de leur trajectoire.
//
// Design : pur (aucun effet de bord, aucun state). Les IDs générés incluent
// le mois concerné (ex: "budget-loyer-2026-03") donc une alerte "revit"
// naturellement chaque mois sans logique d'expiration à gérer — si tu la
// rejettes en mars, elle réapparaît en avril si la situation se reproduit.
// ══════════════════════════════════════════════════════════════════════════════

import { CATEGORIES, getMonthKey } from "./constants";
import { resolveGoalProgress } from "./types";
import type { AppData } from "./types";

export type NotificationSeverity = "info" | "warning" | "danger";
export type NotificationType =
  | "budget_warning"
  | "budget_over"
  | "recurring_due"
  | "goal_off_track";

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  // Pour permettre un clic → navigation directe vers la page concernée
  targetPage?: "depenses" | "recurring" | "goals";
}

const BUDGET_WARNING_THRESHOLD = 0.8; // 80% du plafond catégorie
const RECURRING_DUE_SOON_DAYS = 3;

function fmt(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

// ── Plafonds de catégorie ────────────────────────────────────────────────────
function categoryBudgetNotifications(
  appData: AppData,
  monthKey: string,
): AppNotification[] {
  const expenses = appData.months[monthKey] ?? [];
  const notifs: AppNotification[] = [];

  for (const cat of CATEGORIES) {
    const budget = appData.categoryBudgets?.[cat.id] ?? cat.budget;
    if (!budget || budget <= 0) continue;

    const spent = expenses
      .filter((e) => e.category === cat.id)
      .reduce((s, e) => s + Math.round(e.amount), 0);
    if (spent === 0) continue;

    const pct = spent / budget;
    const label = cat.label.split(" ").slice(1).join(" ");

    if (pct >= 1) {
      notifs.push({
        id: `budget-over-${cat.id}-${monthKey}`,
        type: "budget_over",
        severity: "danger",
        title: `Plafond "${label}" dépassé`,
        message: `${fmt(spent)} F dépensés pour un plafond de ${fmt(budget)} F ce mois-ci.`,
        targetPage: "depenses",
      });
    } else if (pct >= BUDGET_WARNING_THRESHOLD) {
      notifs.push({
        id: `budget-warn-${cat.id}-${monthKey}`,
        type: "budget_warning",
        severity: "warning",
        title: `Plafond "${label}" bientôt atteint`,
        message: `${Math.round(pct * 100)}% du plafond utilisé (${fmt(spent)} / ${fmt(budget)} F).`,
        targetPage: "depenses",
      });
    }
  }

  return notifs;
}

// ── Récurrentes dues bientôt ─────────────────────────────────────────────────
function recurringDueNotifications(
  appData: AppData,
  monthKey: string,
): AppNotification[] {
  const notifs: AppNotification[] = [];
  const recurring = Object.values(appData.recurringExpenses ?? {});
  const today = new Date();

  for (const r of recurring) {
    if (!r.active) continue;
    if (r.startMonth > monthKey) continue;
    if (r.endMonth && r.endMonth < monthKey) continue;
    if (r.lastGeneratedMonth === monthKey) continue; // déjà générée ce mois

    const [y, m] = monthKey.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const day = Math.min(r.dayOfMonth, daysInMonth);
    const dueDate = new Date(y, m - 1, day);
    const daysUntil = Math.ceil(
      (dueDate.getTime() - today.getTime()) / 86400000,
    );

    if (daysUntil >= 0 && daysUntil <= RECURRING_DUE_SOON_DAYS) {
      notifs.push({
        id: `recurring-due-${r.id}-${monthKey}`,
        type: "recurring_due",
        severity: "info",
        title: `"${r.description}" bientôt prélevée`,
        message:
          daysUntil === 0
            ? `${fmt(r.amount)} F prévus aujourd'hui.`
            : `${fmt(r.amount)} F prévus dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""}.`,
        targetPage: "recurring",
      });
    }
  }

  return notifs;
}

// ── Objectifs qui décrochent de leur trajectoire ─────────────────────────────
function goalOffTrackNotifications(appData: AppData): AppNotification[] {
  const notifs: AppNotification[] = [];
  const goals = Object.values(appData.goals ?? {}).filter(
    (g) => g.status === "actif",
  );

  for (const g of goals) {
    const p = resolveGoalProgress(g, appData);
    if (p.remaining === 0 || p.onTrack) continue;

    notifs.push({
      id: `goal-offtrack-${g.id}-${getMonthKey()}`,
      type: "goal_off_track",
      severity: "warning",
      title: `Objectif "${g.name}" ralenti`,
      message: `Il manque ${fmt(p.gap)} F/mois pour tenir l'échéance (${p.monthsUntilTarget} mois restants).`,
      targetPage: "goals",
    });
  }

  return notifs;
}

// ── Point d'entrée ────────────────────────────────────────────────────────────
export function generateNotifications(
  appData: AppData,
  monthKey: string = getMonthKey(),
): AppNotification[] {
  return [
    ...categoryBudgetNotifications(appData, monthKey),
    ...recurringDueNotifications(appData, monthKey),
    ...goalOffTrackNotifications(appData),
  ];
}
