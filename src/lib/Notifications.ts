// ══════════════════════════════════════════════════════════════════════════════
// Centre de notifications — génère des alertes proactives à partir de l'état
// actuel de l'app : plafonds de catégorie approchés/dépassés (tous mois
// confondus, pas seulement le mois en cours), récurrentes dues bientôt,
// objectifs qui décrochent de leur trajectoire.
//
// Design : pur (aucun effet de bord, aucun state). Les IDs générés incluent
// le mois concerné (ex: "budget-loyer-2026-03") donc une alerte "revit"
// naturellement si tu rejettes celle de mars mais que la même catégorie
// dépasse aussi son plafond en avril — sans logique d'expiration à gérer.
// ══════════════════════════════════════════════════════════════════════════════

import { CATEGORIES, getMonthKey, getMonthLabel } from "./constants";
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
  // Mois auquel l'alerte se rapporte (utile pour trier/regrouper côté UI)
  monthKey?: string;
  categoryId?: string;
}

const BUDGET_WARNING_THRESHOLD = 0.8; // 80% du plafond catégorie
const RECURRING_DUE_SOON_DAYS = 3;
// Ne pas remonter d'alertes de plafond sur des mois trop anciens — au-delà,
// c'est de l'historique, pas quelque chose à "traiter" maintenant.
const BUDGET_HISTORY_MONTHS_BACK = 12;

function fmt(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

function monthsAgoKey(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Plafonds de catégorie — scanne tous les mois avec des dépenses ─────────────
// Note : les plafonds (categoryBudgets) ne sont pas historisés — un seul
// jeu de plafonds vit dans appData, appliqué tel quel à tous les mois. Un
// changement de plafond aujourd'hui peut donc faire apparaître ou disparaître
// des alertes sur des mois passés ; c'est un compromis assumé plutôt que
// d'ajouter un système de versioning des plafonds.
function categoryBudgetNotifications(appData: AppData): AppNotification[] {
  const notifs: AppNotification[] = [];
  const oldestAllowed = monthsAgoKey(BUDGET_HISTORY_MONTHS_BACK);

  const monthKeys = Object.keys(appData.months)
    .filter(
      (mk) => mk >= oldestAllowed && (appData.months[mk]?.length ?? 0) > 0,
    )
    .sort((a, b) => b.localeCompare(a)); // plus récent d'abord

  for (const monthKey of monthKeys) {
    const expenses = appData.months[monthKey] ?? [];
    const isCurrent = monthKey === getMonthKey();

    for (const cat of CATEGORIES) {
      const budget = appData.categoryBudgets?.[cat.id] ?? cat.budget;
      if (!budget || budget <= 0) continue;

      const spent = expenses
        .filter((e) => e.category === cat.id)
        .reduce((s, e) => s + Math.round(e.amount), 0);
      if (spent === 0) continue;

      const pct = spent / budget;
      const label = cat.label.split(" ").slice(1).join(" ");
      const monthSuffix = isCurrent ? "" : ` — ${getMonthLabel(monthKey)}`;

      if (pct >= 1) {
        notifs.push({
          id: `budget-over-${cat.id}-${monthKey}`,
          type: "budget_over",
          severity: "danger",
          title: `Plafond "${label}" dépassé${monthSuffix}`,
          message: `${fmt(spent)} F dépensés pour un plafond de ${fmt(budget)} F${isCurrent ? " ce mois-ci" : ` en ${getMonthLabel(monthKey).toLowerCase()}`}.`,
          targetPage: "depenses",
          monthKey,
        });
      } else if (pct >= BUDGET_WARNING_THRESHOLD) {
        notifs.push({
          id: `budget-warn-${cat.id}-${monthKey}`,
          type: "budget_warning",
          severity: "warning",
          title: `Plafond "${label}" bientôt atteint${monthSuffix}`,
          message: `${Math.round(pct * 100)}% du plafond utilisé (${fmt(spent)} / ${fmt(budget)} F).`,
          targetPage: "depenses",
          monthKey,
        });
      }
    }
  }

  return notifs;
}

// ── Récurrentes dues bientôt ─────────────────────────────────────────────────
// Reste volontairement ancré sur "maintenant" — une récurrente "due" n'a de
// sens que pour le futur proche, jamais pour un mois passé.
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
        monthKey,
      });
    }
  }

  return notifs;
}

// ── Objectifs qui décrochent de leur trajectoire ─────────────────────────────
// Basé sur l'état actuel (épargne mensuelle courante), pas d'historique à
// scanner — la notion de "mois passé" ne s'applique pas ici.
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
    ...categoryBudgetNotifications(appData), // scanne tous les mois désormais
    ...recurringDueNotifications(appData, monthKey),
    ...goalOffTrackNotifications(appData),
  ];
}
