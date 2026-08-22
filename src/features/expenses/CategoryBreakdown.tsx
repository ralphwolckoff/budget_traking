import { CATEGORIES } from '../../lib/constants'
import type { Expense } from '../../lib/types'

interface Props {
  expenses: Expense[]
  isCurrentMonth: boolean
}

export default function CategoryBreakdown({ expenses, isCurrentMonth }: Props) {
  const categorySpending = CATEGORIES.map(cat => ({
    ...cat,
    spent: expenses.filter(e => e.category === cat.id).reduce((s, e) => s + e.amount, 0),
  }))

  const visible = isCurrentMonth ? categorySpending : categorySpending.filter(c => c.spent > 0)

  if (!isCurrentMonth && visible.length === 0) {
    return <div className="empty-state" style={{ padding: '30px 20px' }}><p>Aucune dépense par catégorie ce mois-ci</p></div>
  }

  return (
    <div className="budget-breakdown">
      {visible.map(cat => {
        const pct = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0
        return (
          <div key={cat.id} className="budget-item">
            <div className="budget-item-label">{cat.label}</div>
            <div style={{ flex: 1, marginLeft: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 5 }}>
                <span>{cat.spent.toLocaleString()} F dépensé</span>
                {cat.budget > 0 && <span>Budget : {cat.budget.toLocaleString()} F</span>}
              </div>
              {cat.budget > 0 && (
                <div className="progress-bar" style={{ height: 6, marginTop: 0 }}>
                  <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 100 ? 'var(--danger)' : pct > 80 ? 'var(--warning)' : undefined }} />
                </div>
              )}
            </div>
            <div className="budget-item-value">{cat.budget > 0 ? `${pct.toFixed(0)}%` : '—'}</div>
          </div>
        )
      })}
    </div>
  )
}
