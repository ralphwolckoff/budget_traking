import { Wallet, BarChart3, Gem, PiggyBank, Settings } from "lucide-react";

interface Props {
  budget: number;
  salary: number;
  savings: number;
  totalSpent: number;
  remaining: number;
  carryOver: number;
  monthInvestments?: number;
  monthInvestmentGains?: number;
  isCurrentMonth: boolean;
  onOpenSettings: () => void;
}

// Palette de badges d'icônes — cycle entre les tokens de thème existants
// (pas de couleurs Tailwind arbitraires, tout reste cohérent avec le thème clair/sombre)
const badgeColor: Record<string, string> = {
  primary: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  secondary: "bg-secondary/15 text-secondary",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
};

const statValueColor: Record<string, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  positive: "text-success",
  negative: "text-danger",
  warning: "text-warning",
};

export default function DashboardCards({
  budget,
  salary,
  savings,
  totalSpent,
  remaining,
  carryOver,
  monthInvestments = 0,
  monthInvestmentGains = 0,
  isCurrentMonth,
  onOpenSettings,
}: Props) {
  const effectiveBudget = budget + (carryOver || 0);
  const percentSpent =
    effectiveBudget > 0 ? (totalSpent / effectiveBudget) * 100 : 0;
  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

  const spentColor =
    percentSpent > 90 ? "negative" : percentSpent > 70 ? "warning" : "positive";
  const remainingColor =
    remaining < 0
      ? "negative"
      : remaining < effectiveBudget * 0.3
        ? "warning"
        : "positive";

  return (
    <>
      {/* Pas de carte bordée — juste un panneau plat, l'icône + la couleur créent la hiérarchie */}
      <div className="mb-8 animate-[fadeIn_0.8s_ease-out_0.2s_both]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8">
          {/* Budget mensuel */}
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${badgeColor.primary}`}
                >
                  <Wallet size={18} strokeWidth={2} />
                </span>
                <span className="text-[0.9rem] font-medium text-text-muted">
                  Budget mensuel
                </span>
              </div>
              <button
                onClick={onOpenSettings}
                aria-label="Modifier les paramètres du budget"
                className="w-7 h-7 flex-shrink-0 rounded-md flex items-center justify-center text-text-muted transition-colors hover:bg-surface-soft hover:text-primary"
              >
                <Settings size={15} />
              </button>
            </div>
            <div className="text-[2rem] font-extrabold font-mono tracking-tight text-text leading-none">
              {fmt(effectiveBudget)} F
            </div>
            <div className="text-[0.8rem] text-text-muted mt-2 leading-relaxed">
              {fmt(salary)} F sal. − {fmt(savings)} F ép.
              {monthInvestments > 0 && ` − ${fmt(monthInvestments)} F inv.`}
              {monthInvestmentGains > 0 &&
                ` + ${fmt(monthInvestmentGains)} F gains`}
              {carryOver > 0 && (
                <span className="inline-block bg-success/[0.12] text-success rounded-md py-[2px] px-2 text-[0.72rem] font-semibold mt-1 ml-1 align-middle">
                  +{fmt(carryOver)} F reporté
                </span>
              )}
            </div>
            <div className="h-1.5 bg-surface-soft rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-primary rounded-full transition-[width] duration-500 min-w-[2px]"
                style={{ width: `${Math.min(percentSpent, 100)}%` }}
              />
            </div>
            <div className="text-[0.75rem] text-text-muted mt-2">
              {fmt(totalSpent)} F dépensés · {percentSpent.toFixed(1)}%
            </div>
          </div>

          {/* Dépensé */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${badgeColor.success}`}
              >
                <BarChart3 size={18} strokeWidth={2} />
              </span>
              <span className="text-[0.9rem] font-medium text-text-muted">
                Dépensé
              </span>
            </div>
            <div
              className={`text-[2rem] font-extrabold font-mono tracking-tight leading-none ${statValueColor[spentColor]}`}
            >
              {fmt(totalSpent)} F
            </div>
            <div className="text-[0.8rem] text-text-muted mt-2">
              {percentSpent.toFixed(1)}% du budget
            </div>
          </div>

          {/* Restant */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${badgeColor.secondary}`}
              >
                <Gem size={18} strokeWidth={2} />
              </span>
              <span className="text-[0.9rem] font-medium text-text-muted">
                Restant
              </span>
            </div>
            <div
              className={`text-[2rem] font-extrabold font-mono tracking-tight leading-none ${statValueColor[remainingColor]}`}
            >
              {fmt(remaining)} F
            </div>
            <div className="text-[0.8rem] text-text-muted mt-2">
              {effectiveBudget > 0
                ? ((remaining / effectiveBudget) * 100).toFixed(1)
                : 0}
              % disponible
            </div>
          </div>

          {/* Épargne */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${badgeColor.warning}`}
              >
                <PiggyBank size={18} strokeWidth={2} />
              </span>
              <span className="text-[0.9rem] font-medium text-text-muted">
                Épargne
              </span>
            </div>
            <div className="text-[2rem] font-extrabold font-mono tracking-tight text-text leading-none">
              {fmt(savings)} F
            </div>
            <div className="text-[0.8rem] text-text-muted mt-2">
              À mettre de côté
            </div>
          </div>
        </div>

        {(monthInvestments > 0 || monthInvestmentGains > 0) && (
          <div className="mt-6 pt-6 border-t border-border flex flex-col gap-1">
            {monthInvestments > 0 && (
              <div className="text-[0.8rem] text-warning flex items-center gap-1.5">
                <span>💼</span>
                <span>−{fmt(monthInvestments)} F investis ce mois</span>
              </div>
            )}
            {monthInvestmentGains > 0 && (
              <div className="text-[0.8rem] text-success flex items-center gap-1.5">
                <span>💰</span>
                <span>+{fmt(monthInvestmentGains)} F gains encaissés</span>
              </div>
            )}
          </div>
        )}
      </div>

      {remaining < 0 && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-xl mb-5 bg-danger/10 border-none border-danger text-danger animate-[slideDown_0.5s_ease-out]">
          <span className="text-2xl">🚨</span>
          <div>
            <strong>Budget dépassé !</strong>
            <br />
            Vous avez dépassé votre budget de {fmt(Math.abs(remaining))} F CFA.
          </div>
        </div>
      )}
      {remaining >= 0 && remaining < effectiveBudget * 0.2 && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-xl mb-5 bg-warning/10 border-none border-warning text-warning animate-[slideDown_0.5s_ease-out]">
          <span className="text-2xl">⚡</span>
          <div>
            <strong>Attention !</strong>
            <br />
            Il vous reste seulement {fmt(remaining)} F CFA.
          </div>
        </div>
      )}
      {isCurrentMonth && totalSpent === 0 && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-xl mb-5 bg-success/10 border-none border-success text-success animate-[slideDown_0.5s_ease-out]">
          <span className="text-2xl">🎉</span>
          <div>
            <strong>Nouveau mois commencé !</strong>
            <br />
            Budget complet : {fmt(effectiveBudget)} F CFA
            {carryOver > 0 && ` (dont ${fmt(carryOver)} F reportés)`}
          </div>
        </div>
      )}
    </>
  );
}
