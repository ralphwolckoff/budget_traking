import { useState } from "react";
import { getMonthLabel, CATEGORIES } from "../constants";
import type { Expense, MonthOverrides } from "../types";
import { EmptyState } from "../ui/Primitives";
import { Kpi, KpiGrid, Badge } from "../ui/Investmentui";

function getMonthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const PERIODS = [
  { id: "3m", label: "3 mois", icon: "📆" },
  { id: "6m", label: "6 mois", icon: "📅" },
  { id: "1y", label: "1 an", icon: "🗓️" },
  { id: "all", label: "Tout", icon: "∞" },
] as const;
type PeriodId = (typeof PERIODS)[number]["id"];

function filterKeysByPeriod(keys: string[], period: PeriodId): string[] {
  if (period === "all") return keys;
  const n = period === "3m" ? 3 : period === "6m" ? 6 : 12;
  const cutoff = getMonthsAgo(n);
  return keys.filter((k) => k >= cutoff);
}

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

// ── MonthCard ─────────────────────────────────────────────────────────────────
interface MonthCardProps {
  monthKey: string;
  expenses: Expense[];
  salary: number;
  savings: number;
  carryOver: number;
  onView: (key: string) => void;
}
function MonthCard({
  monthKey,
  expenses,
  salary,
  savings,
  carryOver,
  onView,
}: MonthCardProps) {
  const budget = salary - savings;
  const effectiveBudget = budget + (carryOver || 0);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = effectiveBudget - total;
  const pct =
    effectiveBudget > 0 ? Math.min((total / effectiveBudget) * 100, 100) : 0;
  const topCat = CATEGORIES.map((cat) => ({
    ...cat,
    spent: expenses
      .filter((e) => e.category === cat.id)
      .reduce((s, e) => s + e.amount, 0),
  })).sort((a, b) => b.spent - a.spent)[0];

  return (
    <div
      onClick={() => onView(monthKey)}
      className="bg-surface-soft border border-border rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:border-primary"
    >
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-bold text-text">
          {getMonthLabel(monthKey)}
        </div>
        <Badge color={remaining >= 0 ? "success" : "danger"}>
          {remaining >= 0 ? "✅ Respecté" : "❌ Dépassé"}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-1">
        <div className="bg-surface rounded-lg p-2.5">
          <div className="text-[0.72rem] text-text-muted uppercase tracking-wide mb-1">
            Dépensé
          </div>
          <div className="text-base font-bold font-mono text-danger">
            {fmt(total)} F
          </div>
        </div>
        <div className="bg-surface rounded-lg p-2.5">
          <div className="text-[0.72rem] text-text-muted uppercase tracking-wide mb-1">
            Restant
          </div>
          <div
            className={`text-base font-bold font-mono ${remaining >= 0 ? "text-success" : "text-danger"}`}
          >
            {fmt(remaining)} F
          </div>
        </div>
        <div className="bg-surface rounded-lg p-2.5">
          <div className="text-[0.72rem] text-text-muted uppercase tracking-wide mb-1">
            Épargne
          </div>
          <div className="text-base font-bold font-mono text-primary">
            {fmt(savings)} F
          </div>
        </div>
        <div className="bg-surface rounded-lg p-2.5">
          <div className="text-[0.72rem] text-text-muted uppercase tracking-wide mb-1">
            Top cat.
          </div>
          <div className="text-[0.85rem] font-bold text-primary truncate">
            {topCat?.spent > 0
              ? topCat.label.split(" ").slice(0, 2).join(" ")
              : "—"}
          </div>
        </div>
      </div>
      {carryOver > 0 && (
        <div className="mt-2.5 py-1.5 px-3 bg-success/10 border border-success/30 rounded-lg text-[0.8rem] text-success font-semibold">
          ↩️ +{fmt(carryOver)} F reporté
        </div>
      )}
      <div className="h-2.5 bg-surface rounded-full overflow-hidden mt-2.5">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${pct >= 100 ? "bg-danger" : pct > 80 ? "bg-warning" : "bg-gradient-to-r from-primary to-secondary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[0.78rem] text-text-muted mt-1.5">
        {pct.toFixed(1)}% · sal. {fmt(salary)} F · ép. {fmt(savings)} F
      </div>
      <div className="text-[0.85rem] text-primary font-semibold text-right opacity-70 mt-3">
        Voir le détail →
      </div>
    </div>
  );
}

// ── PeriodStats ───────────────────────────────────────────────────────────────
interface PeriodStatsProps {
  keys: string[];
  months: Record<string, Expense[]>;
  globalSalary: number;
  globalSavings: number;
  monthOverrides: MonthOverrides;
  carryOvers: Record<string, number>;
  period: PeriodId;
}
function PeriodStats({
  keys,
  months,
  globalSalary,
  globalSavings,
  monthOverrides,
  carryOvers,
  period,
}: PeriodStatsProps) {
  if (keys.length === 0) return null;
  const allExp = keys.flatMap((k) => months[k] ?? []);
  const grandTotal = allExp.reduce((s, e) => s + e.amount, 0);
  const avgPerMonth = keys.length > 0 ? grandTotal / keys.length : 0;
  const totalSavings = keys.reduce(
    (sum, mk) => sum + (monthOverrides[mk]?.savings ?? globalSavings),
    0,
  );
  const monthsOnBudget = keys.filter((mk) => {
    const salary = monthOverrides[mk]?.salary ?? globalSalary;
    const savings = monthOverrides[mk]?.savings ?? globalSavings;
    const budget = salary - savings + (carryOvers[mk] || 0);
    return (months[mk] ?? []).reduce((s, e) => s + e.amount, 0) <= budget;
  }).length;
  const catTotals = CATEGORIES.map((cat) => ({
    ...cat,
    total: allExp
      .filter((e) => e.category === cat.id)
      .reduce((s, e) => s + e.amount, 0),
  })).sort((a, b) => b.total - a.total);
  const topCat = catTotals[0];
  const mid = Math.floor(keys.length / 2);
  const firstHalf = keys
    .slice(mid)
    .flatMap((k) => months[k] ?? [])
    .reduce((s, e) => s + e.amount, 0);
  const secondHalf = keys
    .slice(0, mid)
    .flatMap((k) => months[k] ?? [])
    .reduce((s, e) => s + e.amount, 0);
  const trend = keys.length >= 2 ? secondHalf - firstHalf : null;
  const trendPct =
    firstHalf > 0 && trend !== null ? (trend / firstHalf) * 100 : null;
  const savingsRate =
    grandTotal > 0 ? (totalSavings / (totalSavings + grandTotal)) * 100 : 0;
  const periodLabel =
    period === "3m"
      ? "3 derniers mois"
      : period === "6m"
        ? "6 derniers mois"
        : period === "1y"
          ? "12 derniers mois"
          : `${keys.length} mois au total`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="text-[1.1rem] font-bold text-text">
          📊 Analyse — {periodLabel}
        </div>
        {trendPct !== null && (
          <div
            className={`flex items-center gap-1.5 text-sm font-bold rounded-lg py-1 px-3 ${trend! > 0 ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}
          >
            {trend! > 0 ? "↗" : "↘"} {Math.abs(trendPct).toFixed(1)}%
            <span className="text-[0.7rem] font-normal opacity-80 ml-1">
              {trend! > 0 ? "tendance hausse" : "tendance baisse"}
            </span>
          </div>
        )}
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
      >
        {[
          {
            icon: "💸",
            label: "Total dépensé",
            value: `${fmt(grandTotal)} F`,
            sub: `${fmt(Math.round(avgPerMonth))} F/mois`,
            color: "text-danger",
          },
          {
            icon: "🏦",
            label: "Total épargné",
            value: `${fmt(totalSavings)} F`,
            sub: `${fmt(Math.round(totalSavings / keys.length))} F/mois`,
            color: "text-success",
          },
          {
            icon: "✅",
            label: "Budgets respectés",
            value: `${monthsOnBudget}/${keys.length}`,
            sub: `${Math.round((monthsOnBudget / keys.length) * 100)}% du temps`,
            color:
              monthsOnBudget === keys.length
                ? "text-success"
                : monthsOnBudget > keys.length / 2
                  ? "text-warning"
                  : "text-danger",
          },
          {
            icon: "🧾",
            label: "Transactions",
            value: String(allExp.length),
            sub: `${Math.round(allExp.length / keys.length)}/mois`,
            color: "text-primary",
          },
          {
            icon: topCat?.total > 0 ? topCat.label.split(" ")[0] : "📦",
            label: "Top catégorie",
            value:
              topCat?.total > 0
                ? topCat.label.split(" ").slice(1).join(" ")
                : "—",
            sub: topCat?.total > 0 ? `${fmt(topCat.total)} F` : "",
            color: "text-primary",
          },
          {
            icon: "📈",
            label: "Taux d'épargne",
            value: `${savingsRate.toFixed(1)}%`,
            sub: "ép. / (ép. + dép.)",
            color:
              savingsRate >= 20
                ? "text-success"
                : savingsRate >= 10
                  ? "text-warning"
                  : "text-danger",
          },
        ].map((k, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 bg-surface-soft border border-border rounded-xl p-3.5"
          >
            <div className="text-xl flex-shrink-0">{k.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.7rem] text-text-muted uppercase tracking-wide mb-1">
                {k.label}
              </div>
              <div
                className={`text-lg font-extrabold font-mono truncate ${k.color}`}
              >
                {k.value}
              </div>
              <div className="text-[0.68rem] text-text-muted mt-0.5">
                {k.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {allExp.length > 0 && (
        <div className="mt-2">
          <div className="text-[0.88rem] font-bold text-text mb-3">
            Répartition par catégorie
          </div>
          <div className="flex flex-col gap-2">
            {catTotals
              .filter((c) => c.total > 0)
              .slice(0, 6)
              .map((cat) => (
                <div
                  key={cat.id}
                  className="grid items-center gap-2.5 text-sm"
                  style={{ gridTemplateColumns: "120px 1fr 70px 45px" }}
                >
                  <div className="flex items-center gap-1.5 text-text-muted text-xs truncate">
                    <span>{cat.label.split(" ")[0]}</span>
                    <span className="truncate">
                      {cat.label.split(" ").slice(1).join(" ")}
                    </span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-[width] duration-500"
                      style={{
                        width: `${(cat.total / catTotals[0].total) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="font-mono font-bold text-text text-right text-xs">
                    {fmt(cat.total)} F
                  </div>
                  <div className="text-text-muted text-[0.7rem] text-right">
                    {grandTotal > 0
                      ? ((cat.total / grandTotal) * 100).toFixed(1)
                      : 0}
                    %
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
interface Props {
  months: Record<string, Expense[]>;
  globalSalary: number;
  globalSavings: number;
  monthOverrides: MonthOverrides;
  carryOvers?: Record<string, number>;
  onViewMonth: (key: string) => void;
}
export default function HistoryPage({
  months,
  globalSalary,
  globalSavings,
  monthOverrides,
  carryOvers = {},
  onViewMonth,
}: Props) {
  const [period, setPeriod] = useState<PeriodId>("3m");
  const [showGrid, setShowGrid] = useState(true);
  const allKeys = Object.keys(months)
    .filter((k) => months[k]?.length > 0)
    .sort((a, b) => b.localeCompare(a));
  const filteredKeys = filterKeysByPeriod(allKeys, period);

  if (allKeys.length === 0) {
    return (
      <EmptyState
        icon="📂"
        title="Aucun historique disponible"
        className="pt-20"
      >
        <p>
          Vos mois passés apparaîtront ici une fois que vous aurez enregistré
          des dépenses.
        </p>
      </EmptyState>
    );
  }

  const allExp = allKeys.flatMap((k) => months[k]);
  const totalSavingsAll = allKeys.reduce(
    (s, mk) => s + (monthOverrides[mk]?.savings ?? globalSavings),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Bandeau global */}
      <KpiGrid>
        <Kpi label="📅 Mois" value={String(allKeys.length)} />
        <Kpi
          label="💸 Total dépensé"
          value={`${fmt(allExp.reduce((s, e) => s + e.amount, 0))} F`}
          color="danger"
        />
        <Kpi
          label="🏦 Total épargné"
          value={`${fmt(totalSavingsAll)} F`}
          color="success"
          sub={`${fmt(Math.round(totalSavingsAll / allKeys.length))} F/mois`}
        />
        <Kpi label="🧾 Transactions" value={String(allExp.length)} />
      </KpiGrid>

      {/* Sélecteur de période */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[0.82rem] text-text-muted font-medium">
          Analyser sur :
        </span>
        <div className="flex gap-2">
          {PERIODS.map((p) => {
            const n = filterKeysByPeriod(allKeys, p.id).length;
            const active = period === p.id;
            const disabled = n === 0;
            return (
              <button
                key={p.id}
                onClick={() => n > 0 && setPeriod(p.id)}
                title={n === 0 ? "Pas de données" : `${n} mois`}
                disabled={disabled}
                className={`flex flex-col items-center gap-0.5 py-2.5 px-4 rounded-xl border-[1.5px] cursor-pointer transition-all
                  ${
                    active
                      ? "bg-gradient-to-br from-primary to-primary-dark border-primary text-white shadow-glow"
                      : disabled
                        ? "opacity-40 cursor-not-allowed border-border bg-surface-soft text-text-muted"
                        : "border-border bg-surface-soft text-text-muted hover:border-primary hover:text-text"
                  }`}
              >
                <span className="text-base">{p.icon}</span>
                <span className="text-[0.78rem] font-semibold">{p.label}</span>
                <span className="text-[0.65rem] opacity-70 font-mono">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats période */}
      <PeriodStats
        keys={filteredKeys}
        months={months}
        globalSalary={globalSalary}
        globalSavings={globalSavings}
        monthOverrides={monthOverrides}
        carryOvers={carryOvers}
        period={period}
      />

      {/* Toggle grille */}
      {filteredKeys.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowGrid((v) => !v)}
            className={`flex items-center gap-2 py-2 px-4 rounded-lg border text-[0.85rem] font-semibold cursor-pointer transition-colors
              ${showGrid ? "border-primary text-primary bg-primary/5" : "border-border bg-surface-soft text-text-muted hover:border-primary hover:text-text"}`}
          >
            {showGrid
              ? "🗂️ Masquer les cartes"
              : "🗂️ Voir les cartes détaillées"}
            <span className="text-xs bg-surface py-0.5 px-2 rounded-full">
              {filteredKeys.length} mois
            </span>
          </button>
        </div>
      )}

      {/* Grille des cartes */}
      {showGrid && filteredKeys.length > 0 && (
        <div
          className="grid gap-5"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          }}
        >
          {filteredKeys.map((mk) => (
            <MonthCard
              key={mk}
              monthKey={mk}
              expenses={months[mk]}
              salary={monthOverrides[mk]?.salary ?? globalSalary}
              savings={monthOverrides[mk]?.savings ?? globalSavings}
              carryOver={carryOvers[mk] || 0}
              onView={onViewMonth}
            />
          ))}
        </div>
      )}

      {filteredKeys.length === 0 && (
        <EmptyState
          icon="📭"
          title="Aucune donnée sur cette période"
          className="py-10"
        >
          <p>Essayez une période plus longue.</p>
        </EmptyState>
      )}
    </div>
  );
}
