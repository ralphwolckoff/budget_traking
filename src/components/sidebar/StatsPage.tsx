import { CATEGORIES, MONTH_NAMES } from '../../constants.ts'
import type { AppData, Expense } from '../../types.ts'

const COLORS = [
  '#0EA5E9', '#F97316', '#10B981', '#8B5CF6',
  '#F59E0B', '#EF4444', '#06B6D4', '#EC4899',
  '#84CC16', '#6366F1',
]

interface CatData { id: string; label: string; budget: number; spent: number; color?: string }
interface SliceData extends CatData { dash: number; gap: number; offset: number; color: string }

function DonutChart({ data, total }: { data: CatData[]; total: number }) {
  const cx = 110, cy = 110, r = 80, stroke = 32
  const circ = 2 * Math.PI * r

  if (total === 0) {
    return (
      <svg width="220" height="220" viewBox="0 0 220 220">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth={stroke} />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="#94A3B8" fontSize="13" fontFamily="Outfit">Aucune</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94A3B8" fontSize="13" fontFamily="Outfit">dépense</text>
      </svg>
    )
  }

  let offset = 0
  const slices: SliceData[] = data.filter(d => d.spent > 0).map((d, i) => {
    const pct  = d.spent / total
    const dash = pct * circ
    const gap  = circ - dash
    const slice: SliceData = { ...d, dash, gap, offset, color: COLORS[i % COLORS.length] }
    offset += dash
    return slice
  })

  return (
    <svg width="220" height="220" viewBox="0 0 220 220">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1E293B" strokeWidth={stroke} />
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset + circ * 0.25}
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      ))}
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#F8FAFC" fontSize="20" fontWeight="800" fontFamily="JetBrains Mono">
        {Math.round(total / 1000)}k
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#94A3B8" fontSize="11" fontFamily="Outfit">F CFA dépensé</text>
    </svg>
  )
}

function BarChart({ data, budget }: { data: CatData[]; budget: number }) {
  const W = 520, H = 200, padL = 10, padR = 10, padTop = 10, padBot = 30
  const chartW = W - padL - padR, chartH = H - padTop - padBot
  const maxVal = Math.max(...data.map(d => d.spent), 1)
  const barW = chartW / data.length, gap = barW * 0.25, bWidth = barW - gap

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(p => {
        const y = padTop + chartH * (1 - p)
        return (
          <g key={p}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
            <text x={padL - 4} y={y + 4} textAnchor="end" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono">
              {Math.round(maxVal * p / 1000)}k
            </text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const x = padL + i * barW + gap / 2
        const pct = d.spent / maxVal, bH = pct * chartH, y = padTop + chartH - bH
        const color = COLORS[i % COLORS.length]
        const overBudget = d.budget > 0 && d.spent > d.budget
        return (
          <g key={d.id}>
            <rect x={x} y={y} width={bWidth} height={bH} rx="5" ry="5" fill={overBudget ? '#EF4444' : color} opacity="0.85">
              <title>{d.label}: {d.spent.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} F</title>
            </rect>
            {d.budget > 0 && (
              <line x1={x} y1={padTop + chartH - (d.budget / maxVal) * chartH}
                x2={x + bWidth} y2={padTop + chartH - (d.budget / maxVal) * chartH}
                stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="3 2" />
            )}
            <text x={x + bWidth / 2} y={H - 8} textAnchor="middle" fill="#94A3B8" fontSize="11" fontFamily="Outfit">
              {d.label.split(' ')[0]}
            </text>
            {d.spent > 0 && (
              <text x={x + bWidth / 2} y={y - 4} textAnchor="middle" fill={overBudget ? '#EF4444' : color}
                fontSize="9" fontFamily="JetBrains Mono" fontWeight="600">
                {d.spent >= 1000 ? `${(d.spent / 1000).toFixed(1)}k` : d.spent}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

interface MonthPoint { key: string; label: string; total: number; x: number; y: number }

function LineChart({ monthsData }: { monthsData: { key: string; label: string; total: number }[] }) {
  const W = 520, H = 180, padL = 40, padR = 20, padTop = 20, padBot = 30
  const chartW = W - padL - padR, chartH = H - padTop - padBot

  if (monthsData.length < 2) {
    return <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>Ajoutez des dépenses sur plusieurs mois pour voir l'évolution.</div>
  }

  const maxVal = Math.max(...monthsData.map(m => m.total), 1)
  const pts: MonthPoint[] = monthsData.map((m, i) => ({
    ...m,
    x: padL + (i / (monthsData.length - 1)) * chartW,
    y: padTop + chartH - (m.total / maxVal) * chartH,
  }))

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const fillPath = `M${pts[0].x},${padTop + chartH} ` +
    pts.map(p => `L${p.x},${p.y}`).join(' ') +
    ` L${pts[pts.length - 1].x},${padTop + chartH} Z`

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0EA5E9" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map(p => {
        const y = padTop + chartH * (1 - p)
        return (
          <g key={p}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
            <text x={padL - 5} y={y + 4} textAnchor="end" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono">
              {Math.round(maxVal * p / 1000)}k
            </text>
          </g>
        )
      })}
      <path d={fillPath} fill="url(#lineGrad)" />
      <polyline points={polyline} fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="5" fill="#0EA5E9" stroke="#0F172A" strokeWidth="2" />
          <text x={p.x} y={H - 8} textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="Outfit">{p.label}</text>
          <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#0EA5E9" fontSize="9" fontFamily="JetBrains Mono" fontWeight="600">
            {p.total >= 1000 ? `${(p.total / 1000).toFixed(1)}k` : p.total}
          </text>
        </g>
      ))}
    </svg>
  )
}

interface Props {
  appData: AppData
  viewMonth: string
  isCurrentMonth: boolean
}

export default function StatsPage({ appData, viewMonth, isCurrentMonth }: Props) {
  const { months, salary, savings } = appData
  const budget     = salary - savings
  const expenses: Expense[] = months[viewMonth] || []
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)

  const categoryData: CatData[] = CATEGORIES.map((cat, i) => ({
    ...cat,
    spent: expenses.filter(e => e.category === cat.id).reduce((s, e) => s + e.amount, 0),
    color: COLORS[i % COLORS.length],
  }))

  const sortedMonths = Object.keys(months)
    .filter(k => months[k]?.length > 0)
    .sort((a, b) => a.localeCompare(b))
    .slice(-6)

  const monthsData = sortedMonths.map(k => {
    const [, m] = k.split('-')
    return { key: k, label: MONTH_NAMES[parseInt(m) - 1].slice(0, 3), total: (months[k] || []).reduce((s, e) => s + e.amount, 0) }
  })

  const top3 = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3)
  const pctUsed = budget > 0 ? (totalSpent / budget * 100) : 0
  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })

  const sortedByCat = [...categoryData].sort((a, b) => b.spent - a.spent)

  return (
    <div className="stats-page">
      <div className="stats-row-top">
        <div className="section stats-donut-card">
          <div className="section-title"><span className="icon">🍩</span>Répartition</div>
          <div className="donut-wrap">
            <DonutChart data={categoryData} total={totalSpent} />
            <div className="donut-legend">
              {categoryData.filter(d => d.spent > 0).map((d, i) => (
                <div key={d.id} className="legend-item">
                  <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="legend-label">{d.label.split(' ').slice(0, 2).join(' ')}</span>
                  <span className="legend-pct">{totalSpent > 0 ? ((d.spent / totalSpent) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
              {totalSpent === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucune dépense ce mois</p>}
            </div>
          </div>
        </div>

        <div className="stats-kpis">
          <div className="kpi-card">
            <div className="kpi-icon">💸</div>
            <div className="kpi-label">Dépensé</div>
            <div className="kpi-value" style={{ color: pctUsed > 90 ? 'var(--danger)' : pctUsed > 70 ? 'var(--warning)' : 'var(--success)' }}>{fmt(totalSpent)} F</div>
            <div className="kpi-sub">{pctUsed.toFixed(1)}% du budget</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">🔢</div>
            <div className="kpi-label">Transactions</div>
            <div className="kpi-value" style={{ color: 'var(--primary)' }}>{expenses.length}</div>
            <div className="kpi-sub">{expenses.length > 0 ? `Moy. ${fmt(Math.round(totalSpent / expenses.length))} F` : '—'}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">🏆</div>
            <div className="kpi-label">Top catégorie</div>
            <div className="kpi-value" style={{ color: 'var(--secondary)', fontSize: '1.1rem' }}>
              {sortedByCat[0]?.spent > 0 ? sortedByCat[0].label : '—'}
            </div>
            <div className="kpi-sub">{sortedByCat[0]?.spent > 0 ? `${fmt(sortedByCat[0].spent)} F` : 'Aucune dépense'}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">💰</div>
            <div className="kpi-label">Restant</div>
            <div className="kpi-value" style={{ color: (budget - totalSpent) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(budget - totalSpent)} F</div>
            <div className="kpi-sub">{budget > 0 ? `${((budget - totalSpent) / budget * 100).toFixed(1)}% libre` : '—'}</div>
          </div>
        </div>
      </div>

      <div className="section" style={{ marginTop: 24 }}>
        <div className="section-title"><span className="icon">📊</span>Dépenses par Catégorie</div>
        <div className="chart-wrap"><BarChart data={categoryData} budget={budget} /></div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
          ---- ligne pointillée = budget alloué · barre rouge = dépassement
        </div>
      </div>

      <div className="stats-row-bottom">
        <div className="section">
          <div className="section-title"><span className="icon">📈</span>Évolution Mensuelle</div>
          <div className="chart-wrap"><LineChart monthsData={monthsData} /></div>
        </div>

        <div className="section">
          <div className="section-title"><span className="icon">🥇</span>Top 3 Dépenses</div>
          {top3.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 20px' }}><p>Aucune dépense ce mois</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {top3.map((exp, i) => {
                const cat   = CATEGORIES.find(c => c.id === exp.category)
                const medal = ['🥇','🥈','🥉'][i]
                const pct   = totalSpent > 0 ? (exp.amount / totalSpent * 100) : 0
                return (
                  <div key={exp.id} className="top3-item">
                    <span className="top3-medal">{medal}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{exp.description}</span>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--danger)' }}>{fmt(exp.amount)} F</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        <span>{cat?.label || exp.category}</span>
                        <span>{pct.toFixed(1)}% du total</span>
                      </div>
                      <div className="progress-bar" style={{ height: 4, marginTop: 0 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: COLORS[i] }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
