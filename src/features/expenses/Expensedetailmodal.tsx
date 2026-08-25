import { CATEGORIES, getCategoryBudget } from "../../lib/constants";
import type { Expense } from "../../lib/types";
import { ModalOverlay, ModalBox } from "../../ui/Primitives";
import { Badge } from "../../ui/Investmentui";

interface Props {
  expense: Expense;
  allExpenses?: Expense[];
  appData?: import("../../lib/types").AppData;
  onClose: () => void;
  onDelete: (id: number | string) => void;
}

export default function ExpenseDetailModal({
  expense,
  allExpenses = [],
  appData,
  onClose,
  onDelete,
}: Props) {
  const cat = CATEGORIES.find((c) => c.id === expense.category);
  const budget = getCategoryBudget(expense.category, appData);

  const catTotal = allExpenses
    .filter((e) => e.category === expense.category)
    .reduce((s, e) => s + Math.round(e.amount), 0);

  const pctOfBudget =
    budget > 0 ? (Math.round(expense.amount) / budget) * 100 : 0;
  const pctCatUsed = budget > 0 ? Math.min((catTotal / budget) * 100, 100) : 0;
  const catRemaining = budget - catTotal;
  const overBudget = budget > 0 && catTotal > budget;

  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  const dateObj = new Date(expense.date);
  const dateStr = dateObj.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const infoRows = [
    { label: "📅 Date", value: dateStr },
    { label: "🕐 Heure", value: timeStr },
    { label: "🗂️ Catégorie", value: cat?.label ?? expense.category },
    ...(budget > 0
      ? [
          {
            label: "🎯 Plafond catégorie",
            value: `${fmt(budget)} F CFA`,
            mono: true,
          },
        ]
      : []),
    {
      label: "🆔 Identifiant",
      value: `${String(expense.id).slice(0, 16)}${String(expense.id).length > 16 ? "…" : ""}`,
      mono: true,
      muted: true,
    },
  ];

  return (
    <ModalOverlay onClose={onClose}>
      <ModalBox>
        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="text-4xl flex-shrink-0">
            {cat?.label.split(" ")[0] ?? "📦"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-text truncate">
              {expense.description}
            </div>
            <div className="text-[0.82rem] text-text-muted">
              {cat?.label.split(" ").slice(1).join(" ") ?? expense.category}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex-shrink-0 rounded-lg bg-transparent text-text-muted cursor-pointer transition-colors hover:bg-surface-soft hover:text-text"
          >
            ✕
          </button>
        </div>

        {/* Montant — les filets haut/bas restent, ce sont des séparateurs de section */}
        <div className="text-center py-5 mb-5 border-y border-border">
          <div className="text-[2.4rem] font-extrabold font-mono text-text">
            {fmt(Math.round(expense.amount))}{" "}
            <span className="text-base font-semibold text-text-muted">
              F CFA
            </span>
          </div>
          {budget > 0 && (
            <div className="mt-2 inline-block">
              <Badge color={pctOfBudget > 50 ? "danger" : "success"}>
                {pctOfBudget.toFixed(1)}% du budget catégorie
              </Badge>
            </div>
          )}
        </div>

        {/* Tags — lecture seule pour l'instant (édition à venir avec le
            formulaire d'ajout) */}
        {(expense.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5 -mt-2">
            {expense.tags!.map((tag) => (
              <span
                key={tag}
                className="text-[0.76rem] bg-primary/10 text-primary rounded-full px-2.5 py-1 font-medium"
              >
                🏷️ {tag}
              </span>
            ))}
          </div>
        )}

        {/* Infos */}
        <div className="flex flex-col mb-5">
          {infoRows.map((row, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-b-0 text-sm"
            >
              <span className="text-text-muted">{row.label}</span>
              <span
                className={`text-right ${row.mono ? "font-mono font-bold" : "font-semibold"} ${row.muted ? "text-text-muted text-xs" : "text-text"}`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Barre budget catégorie */}
        {budget > 0 && (
          <div className="mb-5">
            <div className="flex justify-between items-center">
              <span className="text-[0.82rem] text-text-muted">
                Budget {cat?.label.split(" ").slice(1).join(" ")} ce mois
              </span>
              <span
                className={`font-mono font-bold text-[0.82rem] ${overBudget ? "text-danger" : "text-text"}`}
              >
                {fmt(catTotal)} / {fmt(budget)} F
              </span>
            </div>
            <div className="h-2.5 bg-surface rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${overBudget ? "bg-danger" : pctCatUsed > 80 ? "bg-warning" : "bg-gradient-to-r from-primary to-secondary"}`}
                style={{ width: `${pctCatUsed}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-text-muted">
              <span>{pctCatUsed.toFixed(1)}% utilisé</span>
              <span
                className={`font-semibold ${overBudget ? "text-danger" : "text-success"}`}
              >
                {overBudget
                  ? `Dépassé de ${fmt(Math.abs(catRemaining))} F`
                  : `${fmt(catRemaining)} F restants`}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              onDelete(expense.id);
              onClose();
            }}
          >
            🗑️ Supprimer
          </button>
        </div>
      </ModalBox>
    </ModalOverlay>
  );
}
