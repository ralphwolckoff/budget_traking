import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import ExpenseDetailModal from "./Expensedetailmodal";
import { getMonthLabel, CATEGORIES } from "../../lib/constants";
import { Expense } from "../../lib/types";
import { EmptyState } from "../../ui/Primitives";

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
  appData?: import("../../lib/types").AppData;
  onDelete: (id: number | string) => void;
  onDeleteMany: (ids: (number | string)[]) => void;
  onPaste: (
    expenses: Expense[],
    sourceMonth: string,
    mode: "copy" | "cut",
  ) => void;
  // ── Mise en évidence depuis la recherche globale ────────────────────────────
  highlightExpenseId?: string | number | null;
  onHighlightConsumed?: () => void;
}

export default function ExpenseList({
  expenses,
  viewMonth,
  allExpenses,
  appData,
  onDelete,
  onDeleteMany,
  onPaste,
  highlightExpenseId,
  onHighlightConsumed,
}: ListProps) {
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [view, setView] = useState<"chrono" | "category">("chrono");
  const [sortId, setSortId] = useState("chrono-desc");
  const [selected, setSelected] = useState<Set<number | string>>(new Set());
  const [clipboard, setClipboard] = useState<ClipboardEntry | null>(
    globalClipboard,
  );
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // ── Surbrillance temporaire d'une dépense (venant d'un clic en recherche) ────
  const [pulseId, setPulseId] = useState<string | number | null>(null);
  const itemRefs = useRef<Map<string | number, HTMLDivElement>>(new Map());
  const registerItemRef = useCallback(
    (id: string | number, el: HTMLDivElement | null) => {
      if (el) itemRefs.current.set(id, el);
      else itemRefs.current.delete(id);
    },
    [],
  );

  useEffect(() => {
    if (highlightExpenseId == null) return;

    // Un filtre de tag actif pourrait masquer la dépense visée — on l'efface.
    setActiveTagFilter(null);

    // Petit délai pour laisser le DOM se remettre à jour (filtre effacé,
    // groupe de catégorie ouvert) avant de chercher l'élément et scroller.
    const t = setTimeout(() => {
      const el = itemRefs.current.get(highlightExpenseId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setPulseId(highlightExpenseId);
        setTimeout(() => {
          setPulseId(null);
          onHighlightConsumed?.();
        }, 2200);
      } else {
        onHighlightConsumed?.();
      }
    }, 120);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightExpenseId]);

  // Tous les tags présents ce mois-ci, triés par fréquence décroissante —
  // les plus utilisés apparaissent en premier dans la barre de filtres.
  const availableTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of expenses) {
      for (const t of e.tags ?? []) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [expenses]);

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

  const tagFiltered = activeTagFilter
    ? expenses.filter((e) => (e.tags ?? []).includes(activeTagFilter))
    : expenses;
  const sorted = sortExpenses(tagFiltered, sortId);
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

      {/* ── Filtre par tag — n'apparaît que s'il existe des tags ce mois-ci ── */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
          <span className="text-[0.78rem] text-text-muted mr-1">🏷️ Tags :</span>
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() =>
                setActiveTagFilter((cur) => (cur === tag ? null : tag))
              }
              className={`py-1 px-2.5 rounded-full text-[0.76rem] font-medium cursor-pointer transition-colors
                ${activeTagFilter === tag ? "bg-primary text-white" : "bg-surface-soft text-text-muted hover:text-text"}`}
            >
              {tag}
            </button>
          ))}
          {activeTagFilter && (
            <button
              onClick={() => setActiveTagFilter(null)}
              className="text-[0.74rem] text-text-muted hover:text-text bg-transparent border-none cursor-pointer underline"
            >
              Effacer
            </button>
          )}
        </div>
      )}

      {/* ── Contrôles vue/tri — pilules plates ── */}
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
                className={`py-1.5 px-4 rounded-lg text-[0.82rem] font-semibold cursor-pointer transition-colors
                  ${view === v.id ? "bg-primary text-white" : "bg-surface-soft text-text-muted hover:text-text"}`}
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
                  className={`py-1.5 px-3.5 rounded-full text-[0.82rem] font-semibold cursor-pointer transition-colors
                    ${sortId === s.id ? "bg-primary/10 text-primary" : "bg-surface-soft text-text-muted hover:text-text"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Liste ── */}
      {sorted.length > 0 ? (
        <div className="max-h-[500px] overflow-y-auto mt-2.5">
          {view === "category" ? (
            <GroupedView
              expenses={sorted}
              selected={selected}
              onDelete={onDelete}
              onToggleSelect={toggleSelect}
              onViewDetail={setDetailExpense}
              pulseId={pulseId}
              registerItemRef={registerItemRef}
              forceOpenExpenseId={highlightExpenseId}
            />
          ) : (
            <ChronoView
              expenses={sorted}
              selected={selected}
              onDelete={onDelete}
              onToggleSelect={toggleSelect}
              onViewDetail={setDetailExpense}
              pulseId={pulseId}
              registerItemRef={registerItemRef}
            />
          )}
        </div>
      ) : activeTagFilter ? (
        <EmptyState
          icon="🏷️"
          title={`Aucune dépense avec le tag "${activeTagFilter}"`}
        />
      ) : null}

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
  pulseId?: string | number | null;
  registerItemRef?: (id: string | number, el: HTMLDivElement | null) => void;
  forceOpenExpenseId?: string | number | null;
}

function ChronoView({
  expenses,
  selected,
  onDelete,
  onToggleSelect,
  onViewDetail,
  pulseId,
  registerItemRef,
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
          isPulsing={pulseId === exp.id}
          registerRef={registerItemRef}
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
  forceOpenExpenseId,
}: InternalListProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Catégorie à forcer ouverte si la dépense mise en évidence s'y trouve
  // (même si l'utilisateur avait replié ce groupe manuellement).
  const forceOpenCatId = useMemo(() => {
    if (forceOpenExpenseId == null) return null;
    return expenses.find((e) => e.id === forceOpenExpenseId)?.category ?? null;
  }, [expenses, forceOpenExpenseId]);

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
            className="flex items-center gap-2.5 bg-surface-light rounded-xl py-3 px-4 cursor-pointer transition-colors select-none hover:bg-surface"
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
  isPulsing?: boolean;
  registerRef?: (id: string | number, el: HTMLDivElement | null) => void;
}

function ExpenseItem({
  exp,
  isSelected,
  onDelete,
  onToggleSelect,
  onViewDetail,
  compact,
  isPulsing,
  registerRef,
}: ItemProps) {
  const cat = CATEGORIES.find((c) => c.id === exp.category);
  return (
    <div
      ref={(el) => registerRef?.(exp.id, el)}
      onClick={() => onViewDetail(exp)}
      className={`flex justify-between items-center gap-3 bg-surface rounded-xl transition-all cursor-pointer hover:translate-x-1 hover:bg-surface-soft
        ${compact ? "p-3 mb-0" : "p-4 mb-3"}
        ${isSelected ? "bg-primary/10" : ""}`}
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
          className={`flex items-center gap-1.5 text-text truncate ${compact ? "text-[0.88rem]" : "text-[0.95rem]"}`}
        >
          {exp.receiptImage && (
            <span title="Reçu photo attaché" className="flex-shrink-0">
              📎
            </span>
          )}
          <span className="truncate">{exp.description}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className="text-xs text-text-muted opacity-70">
            {new Date(exp.date).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {(exp.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="text-[0.68rem] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-medium"
            >
              {tag}
            </span>
          ))}
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
        className="py-1.5 px-2.5 rounded-lg bg-transparent text-text-muted text-sm cursor-pointer transition-colors flex-shrink-0 hover:bg-surface-soft hover:text-primary"
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
