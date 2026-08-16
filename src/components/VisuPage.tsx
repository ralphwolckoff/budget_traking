import { useState } from "react";
import { CATEGORIES } from "../constants";
import type { AppData, Expense } from "../types";
import { EmptyState } from "../ui/Primitives";
import { Kpi, KpiGrid, PieLegendRow } from "../ui/Investmentui";
import ExpenseDetailModal from "./Expensedetailmodal";

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

const CAT_COLORS = [
  "#0EA5E9",
  "#F97316",
  "#10B981",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#6366F1",
  "#14B8A6",
  "#EF4444",
  "#84CC16",
];

// ── Donut chart des dépenses par catégorie ──────────────────────────────────────
function ExpenseDonut({ expenses }: { expenses: Expense[] }) {
  const byCat = CATEGORIES.map((cat, i) => ({
    ...cat,
    color: CAT_COLORS[i % CAT_COLORS.length],
    total: expenses
      .filter((e) => e.category === cat.id)
      .reduce((s, e) => s + e.amount, 0),
  }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const grandTotal = byCat.reduce((s, c) => s + c.total, 0);
  if (grandTotal === 0)
    return (
      <EmptyState icon="📊" title="Aucune dépense ce mois" className="py-10" />
    );

  const R = 70,
    CX = 90,
    CY = 90,
    STROKE = 24;
  let angle = -Math.PI / 2;
  const slices = byCat.map((c) => {
    const pct = c.total / grandTotal;
    const a0 = angle;
    const a1 = angle + pct * 2 * Math.PI;
    angle = a1;
    const x0 = CX + R * Math.cos(a0),
      y0 = CY + R * Math.sin(a0);
    const x1 = CX + R * Math.cos(a1),
      y1 = CY + R * Math.sin(a1);
    const large = pct > 0.5 ? 1 : 0;
    return {
      ...c,
      pct,
      path: `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}`,
    };
  });

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg
        viewBox="0 0 180 180"
        style={{ width: 170, height: 170, flexShrink: 0 }}
      >
        {slices.map((s, i) => (
          <path
            key={i}
            d={s.path}
            fill="none"
            stroke={s.color}
            strokeWidth={STROKE}
            strokeLinecap="butt"
            opacity="0.92"
          />
        ))}
        <text
          x={CX}
          y={CY - 6}
          textAnchor="middle"
          fontSize="12"
          fill="var(--text)"
          fontWeight="bold"
        >
          {fmt(grandTotal)}
        </text>
        <text
          x={CX}
          y={CY + 10}
          textAnchor="middle"
          fontSize="9"
          fill="var(--text-muted)"
        >
          F CFA
        </text>
      </svg>
      <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
        {slices.slice(0, 8).map((s, i) => (
          <PieLegendRow
            key={i}
            color={s.color}
            icon={s.label.split(" ")[0]}
            label={s.label.split(" ").slice(1).join(" ")}
            value={`${fmt(s.total)} F`}
            pct={`${(s.pct * 100).toFixed(1)}%`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Top 3 plus grosses dépenses ──────────────────────────────────────────────────
function Top3({ expenses }: { expenses: Expense[] }) {
  const top = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
  if (top.length === 0) return null;
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="flex flex-col gap-2.5">
      {top.map((e, i) => {
        const cat = CATEGORIES.find((c) => c.id === e.category);
        return (
          <div
            key={e.id}
            className="flex items-start gap-3 bg-surface border border-border rounded-xl py-3.5 px-4 transition-colors hover:border-primary"
          >
            <span className="text-2xl leading-none mt-0.5">{medals[i]}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[0.92rem] font-semibold text-text truncate">
                {e.description}
              </div>
              <div className="text-xs text-text-muted mt-0.5">
                {cat?.label ?? e.category}
              </div>
            </div>
            <div className="font-mono font-bold text-danger whitespace-nowrap">
              {fmt(e.amount)} F
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Onglet Statistiques ───────────────────────────────────────────────────────
function StatsTab({ expenses }: { expenses: Expense[] }) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const count = expenses.length;
  const avg = count > 0 ? total / count : 0;
  const biggest =
    expenses.length > 0 ? Math.max(...expenses.map((e) => e.amount)) : 0;

  return (
    <div className="flex flex-col gap-5">
      <KpiGrid>
        <Kpi
          label="💸 Total dépensé"
          value={`${fmt(total)} F`}
          color="danger"
        />
        <Kpi label="🧾 Transactions" value={String(count)} />
        <Kpi
          label="📊 Moyenne / dépense"
          value={`${fmt(Math.round(avg))} F`}
          color="primary"
        />
        <Kpi
          label="🔺 Plus grosse dépense"
          value={`${fmt(biggest)} F`}
          color="warning"
        />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-surface-soft border border-border rounded-2xl p-6">
          <div className="text-[1.1rem] font-bold text-text mb-4">
            🥧 Répartition par catégorie
          </div>
          <ExpenseDonut expenses={expenses} />
        </div>
        <div className="bg-surface-soft border border-border rounded-2xl p-6">
          <div className="text-[1.1rem] font-bold text-text mb-4">
            🏆 Plus grosses dépenses
          </div>
          {expenses.length === 0 ? (
            <EmptyState icon="🧾" title="Aucune dépense" className="py-6" />
          ) : (
            <Top3 expenses={expenses} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Onglet Liste complète (simple, sans multi-sélection) ─────────────────────────
function SimpleListTab({
  expenses,
  appData,
  onDelete,
}: {
  expenses: Expense[];
  appData: AppData;
  onDelete: (id: number | string) => void;
}) {
  const [detail, setDetail] = useState<Expense | null>(null);
  const sorted = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <EmptyState icon="📭" title="Aucune dépense ce mois">
        <p>Ajoutez des dépenses pour les voir apparaître ici.</p>
      </EmptyState>
    );
  }

  return (
    <div className="bg-surface-soft border border-border rounded-2xl p-6">
      {detail && (
        <ExpenseDetailModal
          expense={detail}
          allExpenses={expenses}
          appData={appData}
          onClose={() => setDetail(null)}
          onDelete={(id) => {
            onDelete(id);
            setDetail(null);
          }}
        />
      )}
      <div className="flex flex-col gap-2.5 max-h-[560px] overflow-y-auto">
        {sorted.map((exp) => {
          const cat = CATEGORIES.find((c) => c.id === exp.category);
          return (
            <div
              key={exp.id}
              onClick={() => setDetail(exp)}
              className="flex items-center gap-3 bg-surface border border-border rounded-xl p-4 cursor-pointer transition-all hover:translate-x-1 hover:border-primary"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[0.82rem] text-primary font-semibold uppercase tracking-wide mb-1">
                  {cat?.label ?? exp.category}
                </div>
                <div className="text-[0.95rem] text-text truncate">
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
              <div className="text-xl font-bold font-mono text-danger whitespace-nowrap flex-shrink-0">
                {fmt(exp.amount)} F
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
interface Props {
  appData: AppData;
  viewMonth: string;
  isCurrentMonth: boolean;
  monthExpenses: Expense[];
  onDelete: (id: number | string) => void;
}

export default function VisuPage({ appData, monthExpenses, onDelete }: Props) {
  const [subtab, setSubtab] = useState<"stats" | "list">("stats");

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {[
          { id: "stats" as const, label: "📈 Statistiques" },
          { id: "list" as const, label: "📋 Liste complète" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubtab(t.id)}
            className={`py-2 px-[18px] rounded-lg border-[1.5px] text-[0.88rem] font-semibold cursor-pointer transition-all
              ${subtab === t.id ? "bg-gradient-to-br from-primary to-primary-dark border-primary text-white shadow-glow" : "border-border bg-surface-soft text-text-muted hover:border-primary hover:text-text"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subtab === "stats" && <StatsTab expenses={monthExpenses} />}
      {subtab === "list" && (
        <SimpleListTab
          expenses={monthExpenses}
          appData={appData}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
