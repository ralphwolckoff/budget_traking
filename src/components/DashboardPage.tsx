import { CATEGORIES } from '../constants'
import type { AppData, Expense, PageId } from '../types'
import DashboardCards from './DashboardCards'
import {BtnLink, EmptyState, Section, SectionTitle} from "../ui/Primitives.tsx";

interface Props {
  salary:                number
  savings:               number
  totalSpent:            number
  remaining:              number
  carryOver:              number
  monthInvestments?:      number
  monthInvestmentGains?:  number
  monthExpenses:          Expense[]
  viewMonth:              string
  isCurrentMonth:         boolean
  onNavigate:             (page: PageId) => void
  onOpenSettings:         () => void
}

export default function DashboardPage({
                                        salary, savings, totalSpent, remaining, carryOver,
                                        monthInvestments = 0,
                                        monthInvestmentGains = 0,
                                        monthExpenses, isCurrentMonth,
                                        onNavigate, onOpenSettings,
                                      }: Props) {
  const budget          = salary - savings - monthInvestments
  const effectiveBudget = budget + (carryOver || 0)

  // Top 3 catégories
  const catTotals = CATEGORIES.map(cat => ({
    cat,
    total: monthExpenses.filter(e => e.category === cat.id).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 3)

  // 5 dernières dépenses
  const recent = [...monthExpenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)

  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })

  return (
      <div className="flex flex-col gap-5">

        {/* KPI Cards */}
        <DashboardCards
            budget={budget} salary={salary} savings={savings}
            totalSpent={totalSpent} remaining={remaining}
            carryOver={carryOver} monthInvestments={monthInvestments}
            monthInvestmentGains={monthInvestmentGains}
            isCurrentMonth={isCurrentMonth} onOpenSettings={onOpenSettings}
        />

        {/* Bande investissements si actifs ce mois */}
        {(monthInvestments > 0 || monthInvestmentGains > 0) && (
            <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-warning/[0.08] border border-warning/25 flex-wrap">
              <span className="text-[1.4rem] flex-shrink-0">💼</span>
              <div className="flex-1 text-[0.85rem] text-text">
                {monthInvestments > 0 && <div><strong className="text-warning">−{fmt(monthInvestments)} F</strong> investis ce mois</div>}
                {monthInvestmentGains > 0 && <div><strong className="text-success">+{fmt(monthInvestmentGains)} F</strong> gains encaissés</div>}
              </div>
              <div className="text-[0.75rem] text-text-muted w-full -mt-1.5">
                {fmt(salary)} F sal. − {fmt(savings)} F ép.
                {monthInvestments > 0 && ` − ${fmt(monthInvestments)} F inv.`}
                {monthInvestmentGains > 0 && ` + ${fmt(monthInvestmentGains)} F gains`}
                {' = '}<strong className="text-primary">{fmt(budget)} F</strong>
              </div>
              <BtnLink onClick={() => onNavigate('investments')}>Voir →</BtnLink>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Top catégories */}
          <Section>
            <SectionTitle icon="🏆">Top catégories</SectionTitle>
            {catTotals.length === 0 ? (
                <EmptyState icon="📊" title="" className="py-[30px]">
                  <p>Aucune dépense ce mois</p>
                </EmptyState>
            ) : (
                <div className="flex flex-col gap-3">
                  {catTotals.map(({ cat, total }) => {
                    const pct = effectiveBudget > 0 ? (total / effectiveBudget) * 100 : 0
                    return (
                        <div key={cat.id} className="flex items-center gap-2.5">
                          <span className="text-xl w-7 text-center flex-shrink-0">{cat.label.split(' ')[0]}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[0.82rem] font-semibold text-text-muted mb-1">{cat.label.split(' ').slice(1).join(' ')}</div>
                            <div className="h-1 bg-border rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-[width] duration-500 min-w-[2px]"
                                   style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </div>
                          <span className="text-[0.88rem] font-bold text-text font-mono whitespace-nowrap">{fmt(total)} F</span>
                        </div>
                    )
                  })}
                </div>
            )}
          </Section>

          {/* Dernières dépenses */}
          <Section>
            <SectionTitle icon="🕐" action={<BtnLink onClick={() => onNavigate('depenses')}>Voir tout →</BtnLink>}>
              Dernières dépenses
            </SectionTitle>
            {recent.length === 0 ? (
                <EmptyState icon="💸" title="" className="py-[30px]">
                  <p>Aucune dépense enregistrée</p>
                </EmptyState>
            ) : (
                <div className="flex flex-col gap-2">
                  {recent.map(e => {
                    const cat = CATEGORIES.find(c => c.id === e.category)
                    return (
                        <div key={e.id} className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg bg-surface transition-colors hover:bg-surface-soft">
                          <span className="text-lg flex-shrink-0">{cat?.label.split(' ')[0] ?? '💳'}</span>
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                            <span className="text-[0.85rem] font-semibold text-text whitespace-nowrap overflow-hidden text-ellipsis">{e.description}</span>
                            <span className="text-[0.72rem] text-text-muted">{cat?.label.split(' ').slice(1).join(' ')}</span>
                          </div>
                          <span className="text-[0.88rem] font-bold text-primary font-mono whitespace-nowrap">{fmt(e.amount)} F</span>
                        </div>
                    )
                  })}
                </div>
            )}
          </Section>
        </div>

        {/* Actions rapides */}
        <div className="flex gap-3 flex-wrap">
          <button
              onClick={() => onNavigate('depenses')}
              className="flex items-center gap-2 py-[11px] px-5 rounded-[11px] border-none bg-gradient-to-br from-primary to-primary-dark text-white text-[0.88rem] font-bold cursor-pointer transition-all shadow-[0_3px_10px_var(--glow)] hover:-translate-y-0.5 hover:shadow-[0_6px_18px_var(--glow)]"
          >
            <span>＋</span> Ajouter une dépense
          </button>
          {[
            { icon: '◎', label: 'Voir les statistiques', page: 'visu' as PageId },
            { icon: '◈', label: 'Planifier le mois',      page: 'forecast' as PageId },
            { icon: '💼', label: 'Investissements',        page: 'investments' as PageId },
          ].map(a => (
              <button
                  key={a.page}
                  onClick={() => onNavigate(a.page)}
                  className="flex items-center gap-2 py-[11px] px-5 rounded-[11px] border border-border bg-surface-soft text-text text-[0.88rem] font-bold cursor-pointer transition-all hover:border-primary hover:text-primary"
              >
                <span>{a.icon}</span> {a.label}
              </button>
          ))}
        </div>
      </div>
  )
}