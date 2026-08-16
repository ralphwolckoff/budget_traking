import { useState } from "react";
import type { Investment, InvestmentType } from "../../types.ts";
import { Section, SectionTitle, EmptyState } from "../../ui/Primitives.tsx";
import {
  Kpi,
  KpiGrid,
  PeriodSelector,
  PieLegendRow,
  TopRow,
  EmptySection,
} from "../../ui/Investmentui.tsx";

const TYPE_INFO: Record<
  InvestmentType,
  { label: string; icon: string; color: string }
> = {
  actions: { label: "Actions", icon: "📈", color: "#0EA5E9" },
  immobilier: { label: "Immobilier", icon: "🏠", color: "#10B981" },
  crypto: { label: "Crypto", icon: "₿", color: "#F59E0B" },
  obligations: { label: "Obligations", icon: "📜", color: "#6366F1" },
  epargne: { label: "Épargne", icon: "🏦", color: "#8B5CF6" },
  business: { label: "Business", icon: "🏢", color: "#EC4899" },
  autre: { label: "Autre", icon: "💼", color: "#64748B" },
};

const PERIODS = [
  { id: "3m", label: "3 mois" },
  { id: "6m", label: "6 mois" },
  { id: "1y", label: "1 an" },
  { id: "all", label: "Tout" },
] as const;
type PeriodId = (typeof PERIODS)[number]["id"];

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
const fmtP = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

function filterByPeriod(
  investments: Investment[],
  period: PeriodId,
): Investment[] {
  if (period === "all") return investments;
  const months = period === "3m" ? 3 : period === "6m" ? 6 : 12;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return investments.filter(
    (i) => new Date(i.startDate) >= cutoff || i.status === "actif",
  );
}

// ── Camembert répartition ──────────────────────────────────────────────────────
function PieChart({ investments }: { investments: Investment[] }) {
  const byType = Object.entries(TYPE_INFO)
    .map(([id, ti]) => {
      const invs = investments.filter((i) => i.type === (id as InvestmentType));
      const total = invs.reduce(
        (s, i) =>
          s + i.amount + (i.payments ?? []).reduce((a, p) => a + p.amount, 0),
        0,
      );
      return { id, ...ti, total };
    })
    .filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total);

  const grandTotal = byType.reduce((s, t) => s + t.total, 0);
  if (grandTotal === 0) return <EmptySection>Aucune donnée</EmptySection>;

  const R = 80,
    CX = 100,
    CY = 100;
  let angle = -Math.PI / 2;
  const slices = byType.map((t) => {
    const pct = t.total / grandTotal;
    const a0 = angle;
    const a1 = angle + pct * 2 * Math.PI;
    angle = a1;
    const x0 = CX + R * Math.cos(a0),
      y0 = CY + R * Math.sin(a0);
    const x1 = CX + R * Math.cos(a1),
      y1 = CY + R * Math.sin(a1);
    const large = pct > 0.5 ? 1 : 0;
    return {
      ...t,
      pct,
      path: `M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`,
    };
  });

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg
        viewBox="0 0 200 200"
        style={{ width: 180, height: 180, flexShrink: 0 }}
      >
        {slices.map((s, i) => (
          <path
            key={i}
            d={s.path}
            fill={s.color}
            stroke="var(--dark-soft)"
            strokeWidth="2"
            opacity="0.9"
          />
        ))}
        <circle cx={CX} cy={CY} r={40} fill="var(--dark-soft)" />
        <text
          x={CX}
          y={CY - 6}
          textAnchor="middle"
          fontSize="11"
          fill="var(--text)"
          fontWeight="bold"
        >
          Total
        </text>
        <text
          x={CX}
          y={CY + 10}
          textAnchor="middle"
          fontSize="9"
          fill="var(--text-muted)"
        >
          {fmt(grandTotal)} F
        </text>
      </svg>
      <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
        {slices.map((s, i) => (
          <PieLegendRow
            key={i}
            color={s.color}
            icon={s.icon}
            label={s.label}
            value={`${fmt(s.total)} F`}
            pct={`${(s.pct * 100).toFixed(1)}%`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Graphe prévu vs réel ───────────────────────────────────────────────────────
function ComparisonChart({ investments }: { investments: Investment[] }) {
  const data = investments
    .filter((i) => i.expectedReturn)
    .map((i) => {
      const invested =
        i.amount + (i.payments ?? []).reduce((s, p) => s + p.amount, 0);
      const expected = invested * (i.expectedReturn! / 100);
      const actual = i.currentValue ? i.currentValue - invested : null;
      return { name: i.name.slice(0, 15), expected, actual, invested };
    })
    .sort((a, b) => b.expected - a.expected)
    .slice(0, 6);

  if (data.length === 0)
    return (
      <EmptySection>Aucun investissement avec rendement défini</EmptySection>
    );

  const maxVal = Math.max(...data.flatMap((d) => [d.expected, d.actual ?? 0]));

  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="w-[100px] text-xs text-text-muted truncate flex-shrink-0">
            {d.name}
          </div>
          <div className="flex-1 flex flex-col gap-[3px]">
            <div
              className="flex items-center gap-1.5"
              title={`Prévu: +${fmt(d.expected)} F`}
            >
              <div
                className="h-2 rounded bg-primary/60 min-w-[4px] transition-[width] duration-300"
                style={{ width: `${(d.expected / maxVal) * 100}%` }}
              />
              <span className="text-[0.7rem] font-mono text-text-muted whitespace-nowrap">
                {d.expected > 0 ? "+" : ""}
                {fmt(d.expected)} F
              </span>
            </div>
            {d.actual !== null && (
              <div
                className="flex items-center gap-1.5"
                title={`Réel: ${d.actual >= 0 ? "+" : ""}${fmt(d.actual)} F`}
              >
                <div
                  className={`h-2 rounded min-w-[4px] transition-[width] duration-300 ${d.actual >= 0 ? "bg-success/70" : "bg-danger/70"}`}
                  style={{
                    width: `${Math.min((Math.abs(d.actual) / maxVal) * 100, 100)}%`,
                  }}
                />
                <span
                  className={`text-[0.7rem] font-mono whitespace-nowrap ${d.actual >= 0 ? "text-success" : "text-danger"}`}
                >
                  {d.actual >= 0 ? "+" : ""}
                  {fmt(d.actual)} F
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
      <div className="flex gap-4 text-xs text-text-muted mt-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary/60" />
          Gain prévu
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-success/70" />
          Gain réel
        </span>
      </div>
    </div>
  );
}

// ── Top investissements ────────────────────────────────────────────────────────
function TopInvestments({ investments }: { investments: Investment[] }) {
  const ranked = investments
    .map((i) => {
      const invested =
        i.amount + (i.payments ?? []).reduce((s, p) => s + p.amount, 0);
      const gain = i.currentValue ? i.currentValue - invested : null;
      const gainPct = gain !== null ? (gain / invested) * 100 : null;
      return { ...i, invested, gain, gainPct };
    })
    .filter((i) => i.gainPct !== null)
    .sort((a, b) => (b.gainPct ?? 0) - (a.gainPct ?? 0));

  if (ranked.length === 0)
    return (
      <EmptySection>
        Renseignez la valeur actuelle de vos investissements
      </EmptySection>
    );

  return (
    <div className="flex flex-col gap-1.5">
      {ranked.map((inv, i) => {
        const ti = TYPE_INFO[inv.type];
        return (
          <TopRow
            key={inv.id}
            rank={i}
            icon={ti.icon}
            name={inv.name}
            invested={`${fmt(inv.invested)} F`}
            gain={`${(inv.gain ?? 0) >= 0 ? "+" : ""}${fmt(inv.gain ?? 0)} F`}
            gainPct={fmtP(inv.gainPct ?? 0)}
          />
        );
      })}
    </div>
  );
}

// ── Courbe évolution valeur totale ────────────────────────────────────────────
function GlobalValueCurve({ investments }: { investments: Investment[] }) {
  const allDates = new Set<string>();
  investments.forEach((i) => {
    allDates.add(i.startDate);
    (i.valueHistory ?? []).forEach((p) => allDates.add(p.date));
  });
  const sortedDates = [...allDates].sort();

  if (sortedDates.length < 2)
    return (
      <div className="text-center py-6 text-text-muted text-sm">
        <span className="text-2xl block mb-2">📊</span>
        <p>
          Ajoutez des points de valeur à vos investissements pour voir
          l'évolution globale
        </p>
      </div>
    );

  const points = sortedDates
    .map((date) => {
      let total = 0;
      investments.forEach((i) => {
        if (i.startDate > date) return;
        const history = [
          { date: i.startDate, value: i.amount },
          ...(i.valueHistory ?? []),
        ].sort((a, b) => a.date.localeCompare(b.date));
        const last = history.filter((p) => p.date <= date).pop();
        if (last)
          total +=
            last.value +
            (i.payments ?? [])
              .filter((p) => p.date <= date)
              .reduce((s, p) => s + p.amount, 0);
      });
      return { date, value: total };
    })
    .filter((p) => p.value > 0);

  if (points.length < 2)
    return (
      <div className="text-center py-6 text-text-muted text-sm">
        <span className="text-2xl block mb-2">📊</span>
        <p>Pas assez de données pour afficher la courbe</p>
      </div>
    );

  const values = points.map((p) => p.value);
  const min = Math.min(...values) * 0.94;
  const max = Math.max(...values) * 1.06;
  const W = 600,
    H = 180,
    PX = 40,
    PY = 20;

  const cx = (i: number) => PX + (i / (points.length - 1)) * (W - PX * 2);
  const cy = (v: number) => H - PY - ((v - min) / (max - min)) * (H - PY * 2);
  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${cx(i).toFixed(1)} ${cy(p.value).toFixed(1)}`,
    )
    .join(" ");
  const area = `${path} L ${cx(points.length - 1).toFixed(1)} ${(H - PY).toFixed(1)} L ${PX} ${(H - PY).toFixed(1)} Z`;

  const first = points[0].value;
  const last = points[points.length - 1].value;
  const gPct = ((last - first) / first) * 100;
  const isPos = gPct >= 0;
  const color = isPos ? "var(--success)" : "var(--danger)";

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-[0.82rem] text-text-muted">
          {new Date(points[0].date).toLocaleDateString("fr-FR", {
            month: "short",
            year: "numeric",
          })}{" "}
          →{" "}
          {new Date(points[points.length - 1].date).toLocaleDateString(
            "fr-FR",
            { month: "short", year: "numeric" },
          )}
        </span>
        <span className="font-mono font-bold" style={{ color }}>
          {isPos ? "+" : ""}
          {gPct.toFixed(2)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {[0.25, 0.5, 0.75].map((t) => {
          const v = min + (max - min) * t;
          return (
            <line
              key={t}
              x1={PX}
              y1={cy(v)}
              x2={W - PX}
              y2={cy(v)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          );
        })}
        <path
          d={area}
          fill={isPos ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)"}
        />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={cx(0)}
          cy={cy(points[0].value)}
          r="5"
          fill={color}
          stroke="var(--dark-soft)"
          strokeWidth="2"
        />
        <circle
          cx={cx(points.length - 1)}
          cy={cy(last)}
          r="5"
          fill={color}
          stroke="var(--dark-soft)"
          strokeWidth="2"
        />
        <text
          x={PX}
          y={cy(points[0].value) - 8}
          fontSize="9"
          fill="rgba(255,255,255,0.45)"
          textAnchor="middle"
        >
          {fmt(points[0].value)}
        </text>
        <text
          x={cx(points.length - 1)}
          y={cy(last) - 8}
          fontSize="9"
          fill="rgba(255,255,255,0.45)"
          textAnchor="middle"
        >
          {fmt(last)}
        </text>
      </svg>
      <div className="flex justify-between text-[0.7rem] text-text-muted mt-1">
        <span>{new Date(points[0].date).toLocaleDateString("fr-FR")}</span>
        <span>
          {new Date(points[points.length - 1].date).toLocaleDateString("fr-FR")}
        </span>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
interface Props {
  investments: Investment[];
}

export default function InvestmentAnalytics({ investments }: Props) {
  const [period, setPeriod] = useState<PeriodId>("all");
  const filtered = filterByPeriod(investments, period);

  const totalInvested = filtered.reduce(
    (s, i) =>
      s + i.amount + (i.payments ?? []).reduce((a, p) => a + p.amount, 0),
    0,
  );
  const totalCurrent = filtered
    .filter((i) => i.currentValue)
    .reduce((s, i) => s + (i.currentValue ?? 0), 0);
  const invForCurrent = filtered
    .filter((i) => i.currentValue)
    .reduce(
      (s, i) =>
        s + i.amount + (i.payments ?? []).reduce((a, p) => a + p.amount, 0),
      0,
    );
  const totalGain = totalCurrent - invForCurrent;
  const globalROI =
    invForCurrent > 0 ? (totalGain / invForCurrent) * 100 : null;
  const gainExpected = filtered.reduce((s, i) => {
    if (!i.expectedReturn) return s;
    const inv = i.amount + (i.payments ?? []).reduce((a, p) => a + p.amount, 0);
    return s + (inv * i.expectedReturn) / 100;
  }, 0);
  const nbActifs = filtered.filter((i) => i.status === "actif").length;
  const nbEnAttente = filtered.filter((i) => i.status === "en_attente").length;
  const nbClotures = filtered.filter((i) => i.status === "cloture").length;

  if (investments.length === 0) {
    return (
      <EmptyState icon="📊" title="Aucun investissement" className="pt-16">
        <p>Ajoutez des investissements pour voir les analyses.</p>
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PeriodSelector
        periods={PERIODS as any}
        active={period}
        onChange={setPeriod}
      />

      <KpiGrid>
        <Kpi
          label="💼 Total investi"
          value={`${fmt(totalInvested)} F`}
          sub={`${nbActifs} actifs · ${nbEnAttente} en attente · ${nbClotures} clôturés`}
        />
        {totalCurrent > 0 && (
          <Kpi
            label="📊 Valeur totale actuelle"
            value={`${fmt(totalCurrent)} F`}
            color={totalGain >= 0 ? "success" : "danger"}
            sub={
              globalROI !== null ? `${fmtP(globalROI)} ROI global` : undefined
            }
          />
        )}
        {totalGain !== 0 && (
          <Kpi
            label={totalGain >= 0 ? "📈 Plus-value totale" : "📉 Moins-value"}
            value={`${totalGain >= 0 ? "+" : ""}${fmt(totalGain)} F`}
            color={totalGain >= 0 ? "success" : "danger"}
          />
        )}
        <Kpi
          label="🎯 Gain total prévu"
          value={`+${fmt(gainExpected)} F`}
          color="warning"
          sub={`${filtered.filter((i) => i.expectedReturn).length} avec rendement défini`}
        />
      </KpiGrid>

      <Section>
        <SectionTitle icon="📈">
          Évolution de la valeur totale du portefeuille
        </SectionTitle>
        <GlobalValueCurve investments={filtered} />
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section>
          <SectionTitle icon="🥧">Répartition par type</SectionTitle>
          <PieChart investments={filtered} />
        </Section>
        <Section>
          <SectionTitle icon="📊">Rendement prévu vs réel</SectionTitle>
          <ComparisonChart investments={filtered} />
        </Section>
      </div>

      <Section>
        <SectionTitle icon="🏆">Classement par performance</SectionTitle>
        <TopInvestments investments={filtered} />
      </Section>
    </div>
  );
}
