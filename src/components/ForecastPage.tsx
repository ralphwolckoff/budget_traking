import { useState, useCallback } from "react";
import { CATEGORIES, getMonthLabel, getMonthKey } from "../constants";
import type { AppData, ForecastItem } from "../types";
import {
  Section,
  SectionTitle,
  EmptyState,
  CategoryGrid,
  SelectionToolbar,
  SelectCheckbox,
} from "../ui/Primitives";
import { Kpi, KpiGrid } from "../ui/Investmentui";

// ── Clipboard global prévisions ────────────────────────────────────────────────
type ForecastClip = {
  items: ForecastItem[];
  mode: "copy" | "cut";
  sourceMonth: string;
};
let globalForecastClip: ForecastClip | null = null;

function nextMonthKeyFrom(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function getUpcomingMonths(from: string, n = 3): string[] {
  const r = [from];
  let k = from;
  for (let i = 0; i < n; i++) {
    k = nextMonthKeyFrom(k);
    r.push(k);
  }
  return r;
}

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

/* ── Formulaire d'ajout ───────────────────────────────────────────────────── */
function AddItemForm({
  onAdd,
  existingItems,
}: {
  onAdd: (item: {
    id: number;
    catId: string;
    label: string;
    price: number;
  }) => void;
  existingItems: ForecastItem[];
}) {
  const [catId, setCatId] = useState(CATEGORIES[0].id);
  const [label, setLabel] = useState("");
  const [price, setPrice] = useState("");

  const cat = CATEGORIES.find((c) => c.id === catId);
  const catItems = existingItems.filter((i) => i.catId === catId);
  const catTotal = catItems.reduce((s, i) => s + i.price, 0);
  const catBudget = cat?.budget || 0;
  const catRemaining = catBudget - catTotal;
  const pct = catBudget > 0 ? Math.min((catTotal / catBudget) * 100, 100) : 0;
  const overBudget = catBudget > 0 && catTotal > catBudget;

  const handleAdd = () => {
    const p = Math.round(
      parseFloat(String(price).replace(/\s/g, "").replace(",", ".")),
    );
    if (!label.trim() || !p || p <= 0) return;
    onAdd({ id: Date.now(), catId, label: label.trim(), price: p });
    setLabel("");
    setPrice("");
  };

  return (
    <div>
      <SectionTitle icon="➕">Ajouter un élément prévu</SectionTitle>
      <div className="input-group">
        <label className="input-label">Catégorie</label>
        <CategoryGrid
          categories={CATEGORIES}
          value={catId}
          onChange={setCatId}
        />
      </div>
      {catBudget > 0 && (
        <div className="bg-surface rounded-lg py-3 px-3.5 mb-4 border border-border">
          <div className="flex justify-between items-center text-[0.82rem] flex-wrap gap-1.5 text-text-muted">
            <span>{cat?.label}</span>
            <span
              className={`font-mono font-bold ${overBudget ? "text-danger" : "text-text-muted"}`}
            >
              {fmt(catTotal)} / {fmt(catBudget)} F
              {catRemaining > 0 ? (
                <span className="text-success ml-2">
                  (-{fmt(catRemaining)} F restants)
                </span>
              ) : (
                <span className="text-danger ml-2">
                  (+{fmt(Math.abs(catRemaining))} F dépassé)
                </span>
              )}
            </span>
          </div>
          <div className="h-1.5 bg-surface-light rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${overBudget ? "bg-danger" : pct > 80 ? "bg-warning" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="input-group !mb-0 flex-1 min-w-[180px]">
          <label className="input-label">Élément à acheter</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Ex: Courses du marché"
          />
        </div>
        <div className="input-group !mb-0 w-[160px]">
          <label className="input-label">Prix estimatif (F)</label>
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Ex: 3500"
          />
        </div>
        <button
          className="btn btn-primary flex-shrink-0"
          style={{ width: "auto", padding: "14px 22px" }}
          onClick={handleAdd}
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}

/* ── Groupe catégorie avec sélection ──────────────────────────────────────── */
function CategoryGroup({
  cat,
  items,
  selected,
  onDelete,
  onToggleDone,
  onToggleSelect,
}: {
  cat: { id: string; label: string; budget: number };
  items: ForecastItem[];
  selected: Set<number | string>;
  onDelete: (id: number | string) => void;
  onToggleDone: (id: number | string) => void;
  onToggleSelect: (id: number | string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const total = items.reduce((s, i) => s + i.price, 0);
  const budget = cat.budget || 0;
  const pct = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;
  const over = budget > 0 && total > budget;
  const doneCount = items.filter((i) => i.done).length;
  const selCount = items.filter((i) => selected.has(i.id)).length;

  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-colors ${over ? "border-danger/50" : "border-border hover:border-primary"}`}
    >
      <div
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2.5 py-3.5 px-4 bg-surface-light cursor-pointer select-none transition-colors"
      >
        <span className="text-xl flex-shrink-0">{cat.label.split(" ")[0]}</span>
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="font-bold text-[0.95rem]">
            {cat.label.split(" ").slice(1).join(" ")}
          </span>
          <div className="text-xs text-text-muted mt-0.5">
            {items.length} élément{items.length > 1 ? "s" : ""}
            {doneCount > 0 && (
              <span className="text-success"> · {doneCount} ✓</span>
            )}
            {selCount > 0 && (
              <span className="text-primary">
                {" "}
                · {selCount} sélectionné{selCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        {budget > 0 && (
          <div className="flex items-center gap-1.5 min-w-[100px]">
            <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${over ? "bg-danger" : pct > 80 ? "bg-warning" : "bg-primary"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span
              className={`text-xs font-mono font-semibold w-8 text-right ${over ? "text-danger" : "text-text-muted"}`}
            >
              {pct.toFixed(0)}%
            </span>
          </div>
        )}
        <div
          className={`font-mono font-extrabold text-[0.95rem] whitespace-nowrap ${over ? "text-danger" : "text-primary"}`}
        >
          {fmt(total)} F
          {budget > 0 && (
            <span className="text-xs text-text-muted font-medium">
              /{fmt(budget)} F
            </span>
          )}
        </div>
        {over && (
          <span className="text-[0.72rem] bg-danger/15 text-danger border border-danger rounded-md py-0.5 px-1.5 font-semibold flex-shrink-0">
            ⚠️ Dépassé
          </span>
        )}
        <span className="text-[0.65rem] text-text-muted flex-shrink-0">
          {collapsed ? "▶" : "▼"}
        </span>
      </div>

      {!collapsed && (
        <div className="bg-surface-soft flex flex-col">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => onToggleSelect(item.id)}
              className={`flex items-center gap-3 py-2.5 px-4 border-t border-border transition-colors cursor-pointer hover:bg-surface-light
                ${item.done ? "opacity-55" : ""} ${selected.has(item.id) ? "bg-primary/5" : ""}`}
            >
              <SelectCheckbox
                checked={selected.has(item.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(item.id);
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDone(item.id);
                }}
                title={item.done ? "Marquer non-fait" : "Marquer fait"}
                className={`w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center text-[0.8rem] font-extrabold cursor-pointer transition-colors flex-shrink-0 text-white
                  ${item.done ? "bg-success border-success" : "border-border hover:border-success"}`}
              >
                {item.done ? "✓" : ""}
              </button>
              <span
                className={`flex-1 text-[0.92rem] ${item.done ? "line-through text-text-muted" : "text-text"}`}
              >
                {item.label}
              </span>
              <span className="font-mono font-bold text-[0.9rem] text-primary whitespace-nowrap">
                {fmt(item.price)} F
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                title="Supprimer"
                className="bg-transparent border-none cursor-pointer text-base opacity-40 transition-opacity hover:opacity-100 py-0.5 px-1 flex-shrink-0"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Page principale ──────────────────────────────────────────────────────── */
export default function ForecastPage({
  appData,
  updateData,
  currentMonthKey: currentMonthKeyProp,
  onToggleDone,
}: {
  appData: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  currentMonthKey?: string;
  onToggleDone?: (
    id: number | string,
    monthKey: string,
    item: { catId: string; label: string; price: number; done: boolean },
  ) => void;
}) {
  const currentMonthKey = currentMonthKeyProp ?? getMonthKey();
  const upcomingMonths = getUpcomingMonths(currentMonthKey);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selected, setSelected] = useState<Set<number | string>>(new Set());
  const [clip, setClip] = useState<ForecastClip | null>(globalForecastClip);

  // Budget : TOUJOURS basé sur le mois en cours (currentMonthKey)
  const currentExpenses = appData.months?.[currentMonthKey] ?? [];
  const totalSpentCurrent = currentExpenses.reduce(
    (s, e) => s + Math.round(e.amount),
    0,
  );
  const currentOverride = appData.monthOverrides?.[currentMonthKey];
  const currentSalary = currentOverride?.salary ?? appData.salary;
  const currentSavings = currentOverride?.savings ?? appData.savings;
  const currentCarryOver = appData.carryOver?.[currentMonthKey] || 0;
  const currentInvImpact = Object.values(appData.investments ?? {}).reduce(
    (acc, inv) => {
      if (inv.status === "cloture") return acc;
      if (inv.startDate.startsWith(currentMonthKey)) acc.cost += inv.amount;
      for (const p of inv.payments ?? []) {
        if (p.date.startsWith(currentMonthKey)) acc.cost += p.amount;
      }
      for (const g of inv.gains ?? []) {
        if (g.monthKey === currentMonthKey) acc.gains += g.amount;
      }
      return acc;
    },
    { cost: 0, gains: 0 },
  );
  const currentBudget =
    currentSalary -
    currentSavings -
    (currentInvImpact.cost - currentInvImpact.gains) +
    currentCarryOver;
  const remainingBudget = Math.max(0, currentBudget - totalSpentCurrent);

  const isCurrentSelected = selectedMonth === currentMonthKey;
  const budget = remainingBudget;

  const items = appData.forecastItems?.[selectedMonth] || [];
  const totalForecast = items.reduce((s, i) => s + i.price, 0);
  const totalDone = items
    .filter((i) => i.done)
    .reduce((s, i) => s + i.price, 0);
  const forecastRemaining = budget - totalForecast;
  const pctTotal = budget > 0 ? (totalForecast / budget) * 100 : 0;

  const groups = CATEGORIES.map((cat) => ({
    cat,
    items: items.filter((i) => i.catId === cat.id),
  })).filter((g) => g.items.length > 0);

  const toggleSelect = useCallback((id: number | string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => setSelected(new Set(items.map((i) => i.id)));
  const clearSelection = () => setSelected(new Set());

  /* ── Handlers ── */
  const addItem = (item: Omit<ForecastItem, "done">) => {
    updateData((d) => {
      if (!d.forecastItems) d.forecastItems = {};
      if (!d.forecastItems[selectedMonth]) d.forecastItems[selectedMonth] = [];
      d.forecastItems[selectedMonth].push({ ...item, done: false });
      return d;
    });
  };

  const deleteItem = (id: number | string) => {
    updateData((d) => {
      if (d.forecastItems?.[selectedMonth])
        d.forecastItems[selectedMonth] = d.forecastItems[selectedMonth].filter(
          (i) => i.id !== id,
        );
      return d;
    });
  };

  const deleteSelected = () => {
    updateData((d) => {
      if (d.forecastItems?.[selectedMonth])
        d.forecastItems[selectedMonth] = d.forecastItems[selectedMonth].filter(
          (i) => !selected.has(i.id),
        );
      return d;
    });
    clearSelection();
  };

  const toggleDone = (id: number | string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (onToggleDone) {
      onToggleDone(id, selectedMonth, {
        catId: item.catId,
        label: item.label,
        price: item.price,
        done: item.done,
      });
    } else {
      updateData((d) => {
        if (d.forecastItems?.[selectedMonth])
          d.forecastItems[selectedMonth] = d.forecastItems[selectedMonth].map(
            (i) => (i.id === id ? { ...i, done: !i.done } : i),
          );
        return d;
      });
    }
  };

  const clearAll = () => {
    updateData((d) => {
      if (d.forecastItems) delete d.forecastItems[selectedMonth];
      return d;
    });
  };

  const handleCopy = () => {
    const copied = items.filter((i) => selected.has(i.id));
    const entry: ForecastClip = {
      items: copied,
      mode: "copy",
      sourceMonth: selectedMonth,
    };
    globalForecastClip = entry;
    setClip(entry);
    clearSelection();
  };

  const handleCut = () => {
    const cut = items.filter((i) => selected.has(i.id));
    const entry: ForecastClip = {
      items: cut,
      mode: "cut",
      sourceMonth: selectedMonth,
    };
    globalForecastClip = entry;
    setClip(entry);
    clearSelection();
  };

  const handlePaste = () => {
    const cbc = clip ?? globalForecastClip;
    if (!cbc) return;
    updateData((d) => {
      if (!d.forecastItems) d.forecastItems = {};
      if (!d.forecastItems[selectedMonth]) d.forecastItems[selectedMonth] = [];
      const newItems = cbc.items.map((i) => ({
        ...i,
        id: Date.now() + Math.random(),
        done: false,
      }));
      d.forecastItems[selectedMonth] = [
        ...d.forecastItems[selectedMonth],
        ...newItems,
      ];
      if (cbc.mode === "cut" && d.forecastItems[cbc.sourceMonth]) {
        const cutIds = new Set(cbc.items.map((i) => i.id));
        d.forecastItems[cbc.sourceMonth] = d.forecastItems[
          cbc.sourceMonth
        ].filter((i) => !cutIds.has(i.id));
      }
      return d;
    });
    if (cbc.mode === "cut") {
      globalForecastClip = null;
      setClip(null);
    }
  };

  const activeClip = clip ?? globalForecastClip;

  return (
    <div className="flex flex-col gap-5">
      {/* Sélecteur de mois */}
      <div className="flex gap-2.5 flex-wrap">
        {upcomingMonths.map((mk) => {
          const active = selectedMonth === mk;
          const isCurrent = mk === currentMonthKey;
          return (
            <button
              key={mk}
              onClick={() => {
                setSelectedMonth(mk);
                clearSelection();
              }}
              className={`inline-flex items-center gap-1.5 py-2.5 px-[22px] rounded-full border-[1.5px] text-[0.95rem] font-semibold cursor-pointer transition-colors
                ${active ? "bg-gradient-to-br from-primary to-primary-dark border-primary text-white shadow-glow" : "border-border bg-surface-soft text-text-muted hover:border-primary hover:text-text"}
                ${isCurrent && !active ? "!border-success" : ""}`}
            >
              {getMonthLabel(mk)}
              {isCurrent && (
                <span
                  className={`text-[0.63rem] font-bold uppercase tracking-wide rounded-md py-0.5 px-1.5 ${active ? "bg-white/20 text-white" : "bg-success/15 text-success"}`}
                >
                  En cours
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Barre de sélection */}
      <SelectionToolbar
        totalCount={items.length}
        selectedCount={selected.size}
        itemLabel="prévision"
        onSelectAll={selectAll}
        onClear={clearSelection}
        onCopy={handleCopy}
        onCut={handleCut}
        onDeleteSelected={deleteSelected}
        paste={
          activeClip
            ? {
                count: activeClip.items.length,
                mode: activeClip.mode,
                sourceLabel:
                  activeClip.sourceMonth !== selectedMonth
                    ? getMonthLabel(activeClip.sourceMonth)
                    : undefined,
                highlight: activeClip.sourceMonth !== selectedMonth,
                onPaste: handlePaste,
              }
            : undefined
        }
      />

      {/* KPIs */}
      <KpiGrid>
        <Kpi
          label="💳 Reste à dépenser ce mois"
          value={`${fmt(budget)} F`}
          color="primary"
          sub={`${getMonthLabel(currentMonthKey)} · ${fmt(currentBudget)} F − ${fmt(totalSpentCurrent)} F dépensés`}
        />
        <Kpi
          label="📋 Total estimé"
          value={`${fmt(totalForecast)} F`}
          color={
            pctTotal > 100 ? "danger" : pctTotal > 80 ? "warning" : "success"
          }
          sub={`${pctTotal.toFixed(1)}% du budget · ${items.length} élément${items.length > 1 ? "s" : ""}`}
        />
        <Kpi
          label="💎 Marge prévue"
          value={`${fmt(forecastRemaining)} F`}
          color={
            forecastRemaining < 0
              ? "danger"
              : forecastRemaining < budget * 0.2
                ? "warning"
                : "success"
          }
          sub={`${groups.length} catégorie${groups.length > 1 ? "s" : ""} planifiée${groups.length > 1 ? "s" : ""}`}
        />
        <Kpi
          label="✅ Déjà fait"
          value={`${fmt(totalDone)} F`}
          color="success"
          sub={`${items.filter((i) => i.done).length} / ${items.length} élément${items.length > 1 ? "s" : ""}`}
        />
      </KpiGrid>

      {/* Barre globale */}
      {totalForecast > 0 && (
        <div className="bg-surface-soft border border-border rounded-2xl py-4 px-5">
          <div className="flex justify-between mb-1.5 text-[0.85rem] text-text-muted">
            <span>
              {isCurrentSelected
                ? "Prévisions vs reste à dépenser"
                : "Utilisation du budget"}
            </span>
            <span
              className={`font-mono font-bold ${pctTotal > 100 ? "text-danger" : "text-text"}`}
            >
              {fmt(totalForecast)} / {fmt(budget)} F
            </span>
          </div>
          <div className="h-2.5 bg-surface rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${pctTotal > 100 ? "bg-danger" : pctTotal > 80 ? "bg-warning" : "bg-gradient-to-r from-primary to-secondary"}`}
              style={{ width: `${Math.min(pctTotal, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Section>
          <AddItemForm onAdd={addItem} existingItems={items} />
          {items.length > 0 && (
            <button
              className="btn btn-secondary btn-sm mt-4 w-full"
              onClick={clearAll}
            >
              🗑️ Tout effacer pour ce mois
            </button>
          )}
        </Section>
        <Section className="max-h-[680px] overflow-y-auto">
          <SectionTitle
            icon="🗂️"
            action={
              items.length > 0 && (
                <span className="text-[0.85rem] font-normal text-text-muted">
                  {items.filter((i) => i.done).length}/{items.length} ✓
                </span>
              )
            }
          >
            Liste des prévisions — {getMonthLabel(selectedMonth)}
          </SectionTitle>
          {groups.length === 0 ? (
            <EmptyState
              icon="🔮"
              title="Aucun élément prévu"
              className="py-[50px]"
            >
              <p>
                Ajoutez des éléments à gauche pour planifier vos dépenses de{" "}
                {getMonthLabel(selectedMonth)}.
              </p>
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {groups.map(({ cat, items: catItems }) => (
                <CategoryGroup
                  key={cat.id}
                  cat={cat}
                  items={catItems}
                  selected={selected}
                  onDelete={deleteItem}
                  onToggleDone={toggleDone}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Alertes */}
      {totalForecast > budget && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-xl bg-danger/10 border border-danger text-danger">
          <span className="text-2xl">🚨</span>
          <div>
            <strong>Budget dépassé dans vos prévisions !</strong>
            <br />
            Vous prévoyez <strong>
              {fmt(totalForecast - budget)} F CFA
            </strong>{" "}
            de plus que votre budget mensuel.
          </div>
        </div>
      )}
      {totalForecast > 0 && forecastRemaining >= 0 && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-xl bg-success/10 border border-success text-success">
          <span className="text-2xl">✅</span>
          <div>
            <strong>Prévisions équilibrées !</strong>
            <br />
            Marge restante : <strong>
              {fmt(forecastRemaining)} F CFA
            </strong>{" "}
            pour {getMonthLabel(selectedMonth)}.
          </div>
        </div>
      )}
    </div>
  );
}
