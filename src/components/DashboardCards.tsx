interface Props {
  budget:                number
  salary:                number
  savings:               number
  totalSpent:            number
  remaining:             number
  carryOver:             number
  monthInvestments?:     number
  monthInvestmentGains?: number
  isCurrentMonth:        boolean
  onOpenSettings:        () => void
}

const statValueColor: Record<string, string> = {
  primary:   'text-primary',
  secondary: 'text-secondary',
  positive:  'text-success',
  negative:  'text-danger',
  warning:   'text-warning',
}

export default function DashboardCards({
                                         budget, salary, savings, totalSpent, remaining, carryOver,
                                         monthInvestments = 0, monthInvestmentGains = 0,
                                         isCurrentMonth, onOpenSettings,
                                       }: Props) {
  const effectiveBudget = budget + (carryOver || 0)
  const percentSpent    = effectiveBudget > 0 ? (totalSpent / effectiveBudget) * 100 : 0
  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })

  const spentColor     = percentSpent > 90 ? 'negative' : percentSpent > 70 ? 'warning' : 'positive'
  const remainingColor = remaining < 0 ? 'negative' : remaining < effectiveBudget * 0.3 ? 'warning' : 'positive'

  const cardBase =
      'bg-surface-soft border border-border rounded-[20px] p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:border-primary'

  return (
    <>
      <div
        className="grid gap-5 mb-[30px] animate-[fadeIn_0.8s_ease-out_0.2s_both]"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        {/* Budget mensuel — carte large, cliquable */}
        <div className={`${cardBase} cursor-pointer sm:col-span-2`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-text-muted font-medium mb-2.5 uppercase tracking-wider">
                💵 Budget Mensuel
              </div>
              <div className="text-[2.2rem] font-extrabold font-mono tracking-tight text-primary">
                {fmt(effectiveBudget)} F
              </div>
              <div className="text-[0.85rem] text-text-muted mt-2">
                {fmt(salary)} F sal. − {fmt(savings)} F ép.
                {monthInvestments > 0 && ` − ${fmt(monthInvestments)} F inv.`}
                {monthInvestmentGains > 0 &&
                  ` + ${fmt(monthInvestmentGains)} F gains`}
                {carryOver > 0 && (
                  <span className="inline-block bg-success/[0.12] border border-success text-success rounded-lg py-[3px] px-2.5 text-[0.78rem] font-semibold mt-1 ml-2">
                    +{fmt(carryOver)} F reporté
                  </span>
                )}
              </div>
              {(monthInvestments > 0 || monthInvestmentGains > 0) && (
                <div className="mt-1.5 flex flex-col gap-0.5">
                  {monthInvestments > 0 && (
                    <div className="text-[0.78rem] text-warning flex items-center gap-1.5">
                      <span>💼</span>
                      <span>−{fmt(monthInvestments)} F investis ce mois</span>
                    </div>
                  )}
                  {monthInvestmentGains > 0 && (
                    <div className="text-[0.78rem] text-success flex items-center gap-1.5">
                      <span>💰</span>
                      <span>
                        +{fmt(monthInvestmentGains)} F gains encaissés
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div
              className="text-lg opacity-70 flex-shrink-0"
              onClick={onOpenSettings}
            >
              ⚙️
            </div>
          </div>

          <div className="h-2.5 bg-surface rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-[width] duration-500"
              style={{ width: `${Math.min(percentSpent, 100)}%` }}
            />
          </div>
          <div className="text-[0.8rem] text-text-muted mt-2">
            {fmt(totalSpent)} F dépensés · {percentSpent.toFixed(1)}%
          </div>
        </div>

        {/* Dépensé */}
        <div className={cardBase}>
          <div className="text-sm text-text-muted font-medium mb-2.5 uppercase tracking-wider">
            📊 Dépensé
          </div>
          <div
            className={`text-[2.2rem] font-extrabold font-mono tracking-tight ${statValueColor[spentColor]}`}
          >
            {fmt(totalSpent)} F
          </div>
          <div className="text-[0.85rem] text-text-muted mt-2">
            {percentSpent.toFixed(1)}% du budget
          </div>
        </div>

        {/* Restant */}
        <div className={cardBase}>
          <div className="text-sm text-text-muted font-medium mb-2.5 uppercase tracking-wider">
            💎 Restant
          </div>
          <div
            className={`text-[2.2rem] font-extrabold font-mono tracking-tight ${statValueColor[remainingColor]}`}
          >
            {fmt(remaining)} F
          </div>
          <div className="text-[0.85rem] text-text-muted mt-2">
            {effectiveBudget > 0
              ? ((remaining / effectiveBudget) * 100).toFixed(1)
              : 0}
            % disponible
          </div>
        </div>

        {/* Épargne */}
        <div className={`${cardBase} cursor-pointer`}>
          <div className="text-sm text-text-muted font-medium mb-2.5 uppercase tracking-wider">
            🎯 Épargne
          </div>
          <div className="text-[2.2rem] font-extrabold font-mono tracking-tight text-secondary">
            {fmt(savings)} F
          </div>
          <div className="text-[0.85rem] text-text-muted mt-2">
            À mettre de côté
          </div>
        </div>
      </div>

      {remaining < 0 && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-xl mb-5 bg-danger/10 border border-danger text-danger animate-[slideDown_0.5s_ease-out]">
          <span className="text-2xl">🚨</span>
          <div>
            <strong>Budget Dépassé !</strong>
            <br />
            Vous avez dépassé votre budget de {fmt(Math.abs(remaining))} F CFA.
          </div>
        </div>
      )}
      {remaining >= 0 && remaining < effectiveBudget * 0.2 && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-xl mb-5 bg-warning/10 border border-warning text-warning animate-[slideDown_0.5s_ease-out]">
          <span className="text-2xl">⚡</span>
          <div>
            <strong>Attention !</strong>
            <br />
            Il vous reste seulement {fmt(remaining)} F CFA.
          </div>
        </div>
      )}
      {isCurrentMonth && totalSpent === 0 && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-xl mb-5 bg-success/10 border border-success text-success animate-[slideDown_0.5s_ease-out]">
          <span className="text-2xl">🎉</span>
          <div>
            <strong>Nouveau Mois Commencé !</strong>
            <br />
            Budget complet : {fmt(effectiveBudget)} F CFA
            {carryOver > 0 && ` (dont ${fmt(carryOver)} F reportés)`}
          </div>
        </div>
      )}
    </>
  );
}