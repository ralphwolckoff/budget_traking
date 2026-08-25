import { CATEGORIES } from "../../lib/constants";
import { AppData, Expense, PageId } from "../../lib/types";
import MonthTrendCard from "../../ui/Monthtrendcard";
import { SectionTitle, EmptyState, BtnLink } from "../../ui/Primitives";
import DashboardCards from "./DashboardCards";


interface Props {
  appData: AppData;
  salary: number;
  savings: number;
  totalSpent: number;
  remaining: number;
  carryOver: number;
  monthInvestments?: number;
  monthInvestmentGains?: number;
  monthExpenses: Expense[];
  viewMonth: string;
  isCurrentMonth: boolean;
  onNavigate: (page: PageId) => void;
  onOpenSettings: () => void;
}

// Cycle de couleurs pour les badges de catégorie — dérivé de l'id pour rester stable
// entre les rendus, sans dépendre d'un champ couleur dans CATEGORIES.
const CAT_BADGE_COLORS = [
  "bg-primary/15 text-primary",
  "bg-success/15 text-success",
  "bg-secondary/15 text-secondary",
  "bg-warning/15 text-warning",
  "bg-danger/15 text-danger",
];
function catColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return CAT_BADGE_COLORS[hash % CAT_BADGE_COLORS.length];
}

export default function DashboardPage({
  appData,
  salary,
  savings,
  totalSpent,
  remaining,
  carryOver,
  monthInvestments = 0,
  monthInvestmentGains = 0,
  monthExpenses,
  viewMonth,
  isCurrentMonth,
  onNavigate,
  onOpenSettings,
}: Props) {
  const budget = salary - savings - monthInvestments;
  const effectiveBudget = budget + (carryOver || 0);

  // Top 3 catégories
  const catTotals = CATEGORIES.map((cat) => ({
    cat,
    total: monthExpenses
      .filter((e) => e.category === cat.id)
      .reduce((s, e) => s + e.amount, 0),
  }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  // 5 dernières dépenses
  const recent = [...monthExpenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

  return (
    <div className="flex flex-col gap-8 pt-1">
      {/* KPI — panneau plat, voir DashboardCards */}
      <DashboardCards
        budget={budget}
        salary={salary}
        savings={savings}
        totalSpent={totalSpent}
        remaining={remaining}
        carryOver={carryOver}
        monthInvestments={monthInvestments}
        monthInvestmentGains={monthInvestmentGains}
        isCurrentMonth={isCurrentMonth}
        onOpenSettings={onOpenSettings}
      />

      {/* Tendance vs mois précédent — masqué si rien à comparer */}
      <MonthTrendCard appData={appData} monthKey={viewMonth} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
        {/* Top catégories — plus de carte bordée, juste le contenu */}
        <div>
          <SectionTitle icon="🏆">Top catégories</SectionTitle>
          {catTotals.length === 0 ? (
            <EmptyState icon="📊" title="" className="py-10">
              <p>Aucune dépense ce mois</p>
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-5">
              {catTotals.map(({ cat, total }) => {
                const pct =
                  effectiveBudget > 0 ? (total / effectiveBudget) * 100 : 0;
                return (
                  <div key={cat.id} className="flex items-center gap-3">
                    <span
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${catColor(cat.id)}`}
                    >
                      {cat.label.split(" ")[0]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.85rem] font-semibold text-text mb-1.5">
                        {cat.label.split(" ").slice(1).join(" ")}
                      </div>
                      <div className="h-1.5 bg-surface-soft rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-[width] duration-500 min-w-[2px]"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[0.9rem] font-bold text-text font-mono whitespace-nowrap">
                      {fmt(total)} F
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dernières dépenses */}
        <div>
          <SectionTitle
            icon="🕐"
            action={
              <BtnLink onClick={() => onNavigate("depenses")}>
                Voir tout →
              </BtnLink>
            }
          >
            Dernières dépenses
          </SectionTitle>
          {recent.length === 0 ? (
            <EmptyState icon="💸" title="" className="py-10">
              <p>Aucune dépense enregistrée</p>
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((e) => {
                const cat = CATEGORIES.find((c) => c.id === e.category);
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 py-2 px-2 rounded-lg transition-colors hover:bg-surface-soft"
                  >
                    <span
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${cat ? catColor(cat.id) : "bg-surface-soft text-text-muted"}`}
                    >
                      {cat?.label.split(" ")[0] ?? "💳"}
                    </span>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-[0.86rem] font-semibold text-text whitespace-nowrap overflow-hidden text-ellipsis">
                        {e.description}
                      </span>
                      <span className="text-[0.72rem] text-text-muted">
                        {cat?.label.split(" ").slice(1).join(" ")}
                      </span>
                    </div>
                    <span className="text-[0.9rem] font-bold text-primary font-mono whitespace-nowrap">
                      {fmt(e.amount)} F
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => onNavigate("depenses")}
          className="flex items-center gap-2 py-3 px-5 rounded-xl border-none bg-primary text-white text-[0.88rem] font-bold cursor-pointer transition-all hover:opacity-90"
        >
          <span>＋</span> Ajouter une dépense
        </button>
        {[
          { icon: "◎", label: "Voir les statistiques", page: "visu" as PageId },
          { icon: "◈", label: "Planifier le mois", page: "forecast" as PageId },
          {
            icon: "💼",
            label: "Investissements",
            page: "investments" as PageId,
          },
        ].map((a) => (
          <button
            key={a.page}
            onClick={() => onNavigate(a.page)}
            className="flex items-center gap-2 py-3 px-5 rounded-xl bg-surface-soft text-text text-[0.88rem] font-bold cursor-pointer transition-all hover:text-primary"
          >
            <span>{a.icon}</span> {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
