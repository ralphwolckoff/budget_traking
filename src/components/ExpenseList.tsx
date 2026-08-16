import { useState, useCallback } from "react";
import { CATEGORIES, getMonthLabel } from "../constants";
import type { Expense } from "../types";
import { EmptyState } from "../ui/Primitives";
import ExpenseDetailModal from "./Expensedetailmodal";

// ── Clipboard global partagé entre onglets ─────────────────────────────────────
type ClipboardEntry = {
  expenses: Expense[];
  mode: "copy" | "cut";
  sourceMonth: string;
};
let globalClipboard: ClipboardEntry | null = null;

const SORT_OPTIONS = [
  { id: "chrono-desc", label: "🕐 Récent" },
  { id: "chrono-asc", label: "🕐 Ancien" },
  { id: "price-desc", label: "💰 Prix ↓" },
  { id: "price-asc", label: "💰 Prix ↑" },
];

function sortExpenses(expenses: Expense[], sortId: string): Expense[] {
  const arr = [...expenses];
  switch (sortId) {
    case "chrono-desc":
      return arr.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    case "chrono-asc":
      return arr.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    case "price-desc":
      return arr.sort((a, b) => b.amount - a.amount);
    case "price-asc":
      return arr.sort((a, b) => a.amount - b.amount);
    default:
      return arr;
  }
}

interface ListProps {
  expenses: Expense[];
  viewMonth: string;
  allExpenses: Expense[];
  appData?: import("../types").AppData;
  onDelete: (id: number | string) => void;
  onDeleteMany: (ids: (number | string)[]) => void;
  onPaste: (
    expenses: Expense[],
    sourceMonth: string,
    mode: "copy" | "cut",
  ) => void;
}

export default function ExpenseList({
  expenses,
  viewMonth,
  allExpenses,
  appData,
  onDelete,
  onDeleteMany,
  onPaste,
}: ListProps) {
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [view, setView] = useState<"chrono" | "category">("chrono");
  const [sortId, setSortId] = useState("chrono-desc");
  const [selected, setSelected] = useState<Set<number | string>>(new Set());
  const [clipboard, setClipboard] = useState<ClipboardEntry | null>(
    globalClipboard,
  );

  const toggleSelect = useCallback((id: number | string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => setSelected(new Set(expenses.map((e) => e.id)));
  const clearSelection = () => setSelected(new Set());

  const handleDeleteSelected = () => {
    onDeleteMany(Array.from(selected));
    clearSelection();
  };

  const handleCopy = () => {
    const copied = expenses.filter((e) => selected.has(e.id));
    const entry: ClipboardEntry = {
      expenses: copied,
      mode: "copy",
      sourceMonth: viewMonth,
    };
    globalClipboard = entry;
    setClipboard(entry);
    clearSelection();
  };

  const handleCut = () => {
    const cut = expenses.filter((e) => selected.has(e.id));
    const entry: ClipboardEntry = {
      expenses: cut,
      mode: "cut",
      sourceMonth: viewMonth,
    };
    globalClipboard = entry;
    setClipboard(entry);
    clearSelection();
  };

  const handlePaste = () => {
    const cb = clipboard ?? globalClipboard;
    if (!cb) return;
    onPaste(cb.expenses, cb.sourceMonth, cb.mode);
    if (cb.mode === "cut") {
      globalClipboard = null;
      setClipboard(null);
    }
  };

  const sorted = sortExpenses(expenses, sortId);
  const hasSelection = selected.size > 0;
  const cb = clipboard ?? globalClipboard;
  const isPasteFromOtherMonth = cb && cb.sourceMonth !== viewMonth;

  if (expenses.length === 0 && !cb) {
    return (
      <EmptyState icon="📭" title="Aucune dépense enregistrée">
        <p>Commencez à suivre vos dépenses</p>
      </EmptyState>
    );
  }

  return (
    <>
      {detailExpense && (
        <ExpenseDetailModal
          expense={detailExpense}
          allExpenses={allExpenses}
          appData={appData}
          onClose={() => setDetailExpense(null)}
          onDelete={(id) => {
            onDelete(id);
            setDetailExpense(null);
          }}
        />
      )}

      {/* ── Barre de sélection / actions ── */}
      <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          {expenses.length > 0 && (
            <>
              <button
                onClick={
                  selected.size === expenses.length ? clearSelection : selectAll
                }
                title="Tout sélectionner"
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border text-[0.82rem] font-semibold cursor-pointer transition-colors
                  ${selected.size === expenses.length ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-text-muted hover:border-primary hover:text-text"}`}
              >
                {selected.size === expenses.length ? "☑" : "☐"} Tout
              </button>
              {hasSelection && (
                <span className="text-[0.78rem] text-text-muted font-medium">
                  {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {hasSelection && (
            <>
              <button
                onClick={handleCopy}
                title="Copier la sélection"
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-primary/40 bg-primary/10 text-primary text-[0.82rem] font-semibold cursor-pointer transition-colors hover:bg-primary/20"
              >
                📋 Copier
              </button>
              <button
                onClick={handleCut}
                title="Couper la sélection"
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-warning/40 bg-warning/10 text-warning text-[0.82rem] font-semibold cursor-pointer transition-colors hover:bg-warning/20"
              >
                ✂️ Couper
              </button>
              <button
                onClick={handleDeleteSelected}
                title="Supprimer la sélection"
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-danger/40 bg-danger/10 text-danger text-[0.82rem] font-semibold cursor-pointer transition-colors hover:bg-danger/20"
              >
                🗑️ Supprimer ({selected.size})
              </button>
            </>
          )}

          {cb && (
            <button
              onClick={handlePaste}
              title={`Coller depuis ${getMonthLabel(cb.sourceMonth)} (${cb.mode === "cut" ? "déplacer" : "copier"})`}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-success/40 bg-success/10 text-success text-[0.82rem] font-semibold cursor-pointer transition-colors hover:bg-success/20 whitespace-nowrap
                ${isPasteFromOtherMonth ? "shadow-[0_0_0_2px_rgba(16,185,129,0.35)]" : ""}`}
            >
              📌 Coller {cb.expenses.length} dépense
              {cb.expenses.length > 1 ? "s" : ""}
              {cb.mode === "cut" && (
                <span className="text-[0.62rem] bg-warning/25 text-warning rounded px-1.5 py-0.5 ml-1 uppercase font-bold tracking-wide">
                  couper
                </span>
              )}
              {isPasteFromOtherMonth && (
                <span className="text-[0.68rem] opacity-70 ml-1.5 font-normal">
                  depuis {getMonthLabel(cb.sourceMonth)}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Contrôles vue/tri ── */}
      {expenses.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
          <div className="flex gap-2">
            {[
              { id: "chrono" as const, label: "🕐 Chrono" },
              { id: "category" as const, label: "🗂️ Catégorie" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`py-1.5 px-4 rounded-lg border-[1.5px] text-[0.82rem] font-semibold cursor-pointer transition-colors
                  ${view === v.id ? "bg-gradient-to-br from-primary to-primary-dark border-primary text-white" : "border-border bg-surface text-text-muted hover:border-primary hover:text-text"}`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {view === "chrono" && (
            <div className="flex flex-wrap gap-1.5">
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSortId(s.id)}
                  className={`py-1.5 px-3.5 rounded-full border-[1.5px] text-[0.82rem] font-semibold cursor-pointer transition-colors
                    ${sortId === s.id ? "bg-surface-light border-primary text-primary" : "border-border bg-surface text-text-muted hover:border-primary hover:text-text"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Liste ── */}
      {expenses.length > 0 && (
        <div className="max-h-[500px] overflow-y-auto mt-2.5">
          {view === "category" ? (
            <GroupedView
              expenses={sorted}
              selected={selected}
              onDelete={onDelete}
              onToggleSelect={toggleSelect}
              onViewDetail={setDetailExpense}
            />
          ) : (
            <ChronoView
              expenses={sorted}
              selected={selected}
              onDelete={onDelete}
              onToggleSelect={toggleSelect}
              onViewDetail={setDetailExpense}
            />
          )}
        </div>
      )}

      {expenses.length === 0 && cb && (
        <EmptyState icon="📋" title="Aucune dépense ce mois-ci">
          <p>
            Vous avez {cb.expenses.length} dépense
            {cb.expenses.length > 1 ? "s" : ""} prête
            {cb.expenses.length > 1 ? "s" : ""} à coller depuis{" "}
            {getMonthLabel(cb.sourceMonth)}
          </p>
        </EmptyState>
      )}
    </>
  );
}

// ── Vues ───────────────────────────────────────────────────────────────────────
interface InternalListProps {
  expenses: Expense[];
  selected: Set<number | string>;
  onDelete: (id: number | string) => void;
  onToggleSelect: (id: number | string) => void;
  onViewDetail: (exp: Expense) => void;
}

function ChronoView({
  expenses,
  selected,
  onDelete,
  onToggleSelect,
  onViewDetail,
}: InternalListProps) {
  return (
    <>
      {expenses.map((exp) => (
        <ExpenseItem
          key={exp.id}
          exp={exp}
          isSelected={selected.has(exp.id)}
          onDelete={onDelete}
          onToggleSelect={onToggleSelect}
          onViewDetail={onViewDetail}
        />
      ))}
    </>
  );
}

function GroupedView({
  expenses,
  selected,
  onDelete,
  onToggleSelect,
  onViewDetail,
}: InternalListProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = CATEGORIES.map((cat) => ({
    cat,
    items: expenses.filter((e) => e.category === cat.id),
    total: expenses
      .filter((e) => e.category === cat.id)
      .reduce((s, e) => s + Math.round(e.amount), 0),
  }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => {
      const nameA = a.cat.label.split(" ").slice(1).join(" ");
      const nameB = b.cat.label.split(" ").slice(1).join(" ");
      return nameA.localeCompare(nameB, "fr");
    });

  const toggle = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  return (
    <>
      {groups.map(({ cat, items, total }) => (
        <div key={cat.id} className="mb-2">
          <div
            onClick={() => toggle(cat.id)}
            className="flex items-center gap-2.5 bg-surface-light border border-border rounded-xl py-3 px-4 cursor-pointer transition-colors select-none hover:border-primary"
          >
            <span className="text-xl">{cat.label.split(" ")[0]}</span>
            <span className="font-semibold text-[0.95rem] flex-1">
              {cat.label.split(" ").slice(1).join(" ")}
            </span>
            <span className="text-xs text-text-muted bg-surface py-0.5 px-2 rounded-full">
              {items.length} entrée{items.length > 1 ? "s" : ""}
            </span>
            <span className="font-mono font-bold text-danger text-[0.95rem]">
              {total.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} F
            </span>
            <span className="text-[0.7rem] text-text-muted ml-1">
              {collapsed[cat.id] ? "▶" : "▼"}
            </span>
          </div>
          {!collapsed[cat.id] && (
            <div className="pl-4 mt-1.5 flex flex-col gap-1.5">
              {items.map((exp) => (
                <ExpenseItem
                  key={exp.id}
                  exp={exp}
                  compact
                  isSelected={selected.has(exp.id)}
                  onDelete={onDelete}
                  onToggleSelect={onToggleSelect}
                  onViewDetail={onViewDetail}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

interface ItemProps {
  exp: Expense;
  isSelected: boolean;
  onDelete: (id: number | string) => void;
  onToggleSelect: (id: number | string) => void;
  onViewDetail: (exp: Expense) => void;
  compact?: boolean;
}

function ExpenseItem({
  exp,
  isSelected,
  onDelete,
  onToggleSelect,
  onViewDetail,
  compact,
}: ItemProps) {
  const cat = CATEGORIES.find((c) => c.id === exp.category);
  return (
    <div
      onClick={() => onViewDetail(exp)}
      className={`flex justify-between items-center gap-3 bg-surface border rounded-xl transition-all cursor-pointer hover:translate-x-1 hover:border-primary
        ${compact ? "p-3 mb-0" : "p-4 mb-3"}
        ${isSelected ? "border-primary bg-primary/5" : "border-border"}`}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(exp.id);
        }}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors flex-shrink-0 text-white hover:border-primary
          ${isSelected ? "bg-primary border-primary" : "border-border"}`}
      >
        {isSelected ? "✓" : ""}
      </div>

      <div className="flex-1 min-w-0">
        {!compact && (
          <div className="text-[0.82rem] text-primary font-semibold uppercase tracking-wide mb-1">
            {cat?.label || exp.category}
          </div>
        )}
        <div
          className={`text-text truncate ${compact ? "text-[0.88rem]" : "text-[0.95rem]"}`}
        >
          {exp.description}
        </div>
        <div className="text-xs text-text-muted mt-0.5 opacity-70">
          {new Date(exp.date).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
      <div className="text-xl font-bold font-mono text-danger mr-1 whitespace-nowrap flex-shrink-0">
        {Math.round(exp.amount).toLocaleString("fr-FR", {
          maximumFractionDigits: 0,
        })}{" "}
        F
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onViewDetail(exp);
        }}
        title="Voir les détails"
        className="py-1.5 px-2.5 rounded-lg border border-border bg-transparent text-text-muted text-sm cursor-pointer transition-colors flex-shrink-0 hover:border-primary hover:text-primary"
      >
        ℹ️
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(exp.id);
        }}
        className="btn btn-danger flex-shrink-0"
      >
        🗑️
      </button>
    </div>
  );
}
