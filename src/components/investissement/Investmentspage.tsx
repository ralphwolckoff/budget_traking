import { useState } from "react";
import type { AppData, Investment, InvestmentType } from "../../types";
import { Section, SectionTitle, EmptyState } from "../../ui/Primitives";
import {
  Kpi,
  KpiGrid,
  Badge,
  SubTabs,
  TypeGrid,
  Preview,
  PreviewRow,
  InvSelect,
} from "../../ui/Investmentui";
import { remoteAPI } from "../../storage";
import InvestmentAnalytics from "./Investmentanalytics";
import InvestmentDetailPage from "./Investmentdetailpage";

const TYPE_LABELS: Record<InvestmentType, { label: string; icon: string }> = {
  actions: { label: "Actions / Bourse", icon: "📈" },
  immobilier: { label: "Immobilier", icon: "🏠" },
  crypto: { label: "Crypto-monnaies", icon: "₿" },
  obligations: { label: "Obligations", icon: "📜" },
  epargne: { label: "Épargne", icon: "🏦" },
  business: { label: "Business / PME", icon: "🏢" },
  autre: { label: "Autre", icon: "💼" },
};
const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([id, t]) => ({
  id: id as InvestmentType,
  ...t,
}));

type InvTab = "portfolio" | "new" | "analytics" | "historique";

const TABS: { id: InvTab; label: string; icon: string }[] = [
  { id: "portfolio", label: "Portefeuille", icon: "📊" },
  { id: "new", label: "Ajouter", icon: "➕" },
  { id: "analytics", label: "Suivi global", icon: "📈" },
  { id: "historique", label: "Historique", icon: "📋" },
];

const STATUS_CFG = {
  actif: { label: "✅ Actif", color: "success" as const },
  en_attente: { label: "⏳ En attente", color: "warning" as const },
  cloture: { label: "🔒 Clôturé", color: "muted" as const },
};

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

// ── Formulaire création ────────────────────────────────────────────────────────
function NewInvestmentForm({
  onSave,
}: {
  onSave: (inv: Omit<Investment, "id">) => void;
}) {
  const [type, setType] = useState<InvestmentType>("epargne");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Investment["status"]>("actif");
  const [error, setError] = useState("");

  const amt = parseFloat(amount.replace(",", ".")) || 0;
  const ret = parseFloat(expectedReturn.replace(",", ".")) || 0;
  const dur = parseInt(durationMonths) || 0;

  const handleSave = () => {
    if (!name.trim()) {
      setError("Nom requis");
      return;
    }
    if (amt <= 0) {
      setError("Montant invalide");
      return;
    }
    setError("");
    const curVal = parseFloat(currentValue.replace(",", ".")) || 0;
    onSave({
      type,
      name: name.trim(),
      amount: amt,
      startDate,
      status,
      endDate: endDate || undefined,
      durationMonths: dur || undefined,
      expectedReturn: ret || undefined,
      currentValue: curVal || undefined,
      notes: notes.trim() || undefined,
    });
    setName("");
    setAmount("");
    setExpectedReturn("");
    setCurrentValue("");
    setDurationMonths("");
    setEndDate("");
    setNotes("");
  };

  return (
    <div className="max-w-[680px]">
      <Section>
        <SectionTitle icon="➕">Créer un nouvel investissement</SectionTitle>

        <div className="input-group">
          <label className="input-label">Type d'investissement</label>
          <TypeGrid options={TYPE_OPTIONS} value={type} onChange={setType} />
        </div>

        <div className="flex gap-3 flex-wrap [&>*]:flex-1 [&>*]:min-w-[180px]">
          <div className="input-group !flex-[2]">
            <label className="input-label">Nom / Description *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Terrain à Douala, BTC, Orange actions..."
            />
          </div>
          <div className="input-group">
            <label className="input-label">Statut initial</label>
            <InvSelect
              className="w-full"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as Investment["status"])
              }
            >
              <option value="actif">✅ Actif</option>
              <option value="en_attente">⏳ En attente</option>
            </InvSelect>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap [&>*]:flex-1 [&>*]:min-w-[180px]">
          <div className="input-group">
            <label className="input-label">💰 Somme investie (F CFA) *</label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 500000"
            />
          </div>
          <div className="input-group">
            <label className="input-label">📈 Valeur actuelle (F CFA)</label>
            <input
              type="number"
              min="0"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              placeholder="Optionnel"
            />
          </div>
        </div>

        <div className="flex gap-3 flex-wrap [&>*]:flex-1 [&>*]:min-w-[180px]">
          <div className="input-group">
            <label className="input-label">📅 Date de début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">📅 Date de fin prévue</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
            />
          </div>
        </div>

        <div className="flex gap-3 flex-wrap [&>*]:flex-1 [&>*]:min-w-[180px]">
          <div className="input-group">
            <label className="input-label">⏱️ Durée (mois)</label>
            <input
              type="number"
              min="1"
              value={durationMonths}
              onChange={(e) => setDurationMonths(e.target.value)}
              placeholder="Ex: 12"
            />
          </div>
          <div className="input-group">
            <label className="input-label">🎯 Rendement attendu (%)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(e.target.value)}
              placeholder="Ex: 15"
            />
          </div>
        </div>

        {amt > 0 && ret > 0 && (
          <div className="mb-5">
            <Preview>
              <PreviewRow
                label="📊 Gain prévu"
                value={`+${fmt(Math.round((amt * ret) / 100))} F (${ret}%)`}
                color="success"
              />
              <PreviewRow
                label="💎 Valeur finale"
                value={`${fmt(Math.round(amt * (1 + ret / 100)))} F`}
                color="primary"
              />
              {dur > 0 && (
                <PreviewRow
                  label="📅 Rendement annualisé"
                  value={`${((ret / dur) * 12).toFixed(1)}% / an`}
                  color="primary"
                />
              )}
            </Preview>
          </div>
        )}

        <div className="input-group">
          <label className="input-label">📝 Notes / Stratégie</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Broker, conditions, stratégie de sortie..."
            rows={3}
            style={{ resize: "vertical", width: "100%" }}
          />
        </div>

        {error && (
          <div className="form-error-banner">
            <span>⚠️</span> {error}
          </div>
        )}

        <button className="btn btn-primary mt-2 w-full" onClick={handleSave}>
          ➕ Créer l'investissement
        </button>
      </Section>
    </div>
  );
}

// ── Barre de progression vs objectif ────────────────────────────────────────────
function GoalProgress({
  current,
  invested,
  expectedReturn,
}: {
  current: number;
  invested: number;
  expectedReturn: number;
}) {
  const pct = Math.min(
    Math.max(
      ((current - invested) / ((invested * expectedReturn) / 100)) * 100,
      0,
    ),
    100,
  );
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[0.72rem] text-text-muted mb-1">
        <span>Progression vs objectif</span>
        <span>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Card résumé ────────────────────────────────────────────────────────────────
function InvestmentCard({
  inv,
  onClick,
}: {
  inv: Investment;
  onClick: () => void;
}) {
  const ti = TYPE_LABELS[inv.type];
  const sc = STATUS_CFG[inv.status];
  const totalInv =
    inv.amount + (inv.payments ?? []).reduce((s, p) => s + p.amount, 0);
  const gain = inv.currentValue ? inv.currentValue - totalInv : null;
  const roi = gain !== null ? (gain / totalInv) * 100 : null;
  const gainExp = inv.expectedReturn
    ? (totalInv * inv.expectedReturn) / 100
    : null;
  const days = inv.endDate
    ? Math.ceil((new Date(inv.endDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div
      onClick={onClick}
      className="bg-surface-soft border border-border rounded-2xl p-4 cursor-pointer transition-all hover:border-primary hover:-translate-y-0.5 flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl flex-shrink-0">{ti.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-text truncate">{inv.name}</div>
          <div className="text-xs text-text-muted">{ti.label}</div>
        </div>
        <Badge color={sc.color}>{sc.label}</Badge>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div>
          <div className="text-[0.7rem] text-text-muted mb-0.5">Investi</div>
          <div className="font-mono font-bold text-text">{fmt(totalInv)} F</div>
        </div>
        {inv.currentValue !== undefined && inv.currentValue !== null && (
          <div>
            <div className="text-[0.7rem] text-text-muted mb-0.5">
              Valeur actuelle
            </div>
            <div
              className={`font-mono font-bold ${(roi ?? 0) >= 0 ? "text-success" : "text-danger"}`}
            >
              {fmt(inv.currentValue)} F
            </div>
          </div>
        )}
        {gainExp !== null && !inv.currentValue && (
          <div>
            <div className="text-[0.7rem] text-text-muted mb-0.5">
              Gain prévu
            </div>
            <div className="font-mono font-bold text-warning">
              +{fmt(gainExp)} F
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {inv.expectedReturn && (
          <Badge color="primary">🎯 {inv.expectedReturn}%</Badge>
        )}
        {roi !== null && (
          <Badge color={roi >= 0 ? "success" : "danger"}>
            {roi >= 0 ? "📈" : "📉"} {roi.toFixed(2)}% réel
          </Badge>
        )}
        {days !== null && (
          <Badge color={days < 0 ? "danger" : days < 30 ? "warning" : "muted"}>
            {days > 0 ? `⏳ ${days}j` : "⚠️ Échu"}
          </Badge>
        )}
        {(inv.payments ?? []).length > 0 && (
          <Badge color="muted">
            💸 {(inv.payments ?? []).length} versement
            {(inv.payments ?? []).length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {inv.currentValue && inv.expectedReturn && (
        <GoalProgress
          current={inv.currentValue}
          invested={totalInv}
          expectedReturn={inv.expectedReturn}
        />
      )}

      <div className="text-[0.78rem] text-primary text-right">
        Voir le détail →
      </div>
    </div>
  );
}

// ── KPIs par onglet ───────────────────────────────────────────────────────────
function PortfolioKPIs({ investments }: { investments: Investment[] }) {
  const total = investments.reduce(
    (s, i) =>
      s + i.amount + (i.payments ?? []).reduce((a, p) => a + p.amount, 0),
    0,
  );
  const cur = investments
    .filter((i) => i.currentValue)
    .reduce((s, i) => s + (i.currentValue ?? 0), 0);
  const invCur = investments
    .filter((i) => i.currentValue)
    .reduce(
      (s, i) =>
        s + i.amount + (i.payments ?? []).reduce((a, p) => a + p.amount, 0),
      0,
    );
  const roi = invCur > 0 ? ((cur - invCur) / invCur) * 100 : null;
  const gainExp = investments.reduce((s, i) => {
    if (!i.expectedReturn) return s;
    return (
      s +
      ((i.amount + (i.payments ?? []).reduce((a, p) => a + p.amount, 0)) *
        i.expectedReturn) /
        100
    );
  }, 0);
  return (
    <KpiGrid>
      <Kpi
        label="💼 Total investi"
        value={`${fmt(total)} F`}
        sub={`${investments.filter((i) => i.status === "actif").length} actifs · ${investments.filter((i) => i.status === "en_attente").length} en attente`}
      />
      {cur > 0 && (
        <Kpi
          label="📊 Valeur actuelle"
          value={`${fmt(cur)} F`}
          color={cur >= invCur ? "success" : "danger"}
          sub={
            roi !== null
              ? `${roi >= 0 ? "+" : ""}${roi.toFixed(2)}% ROI`
              : undefined
          }
        />
      )}
      <Kpi label="🎯 Gain prévu" value={`+${fmt(gainExp)} F`} color="warning" />
    </KpiGrid>
  );
}

function HistoriqueKPIs({ investments }: { investments: Investment[] }) {
  const total = investments.reduce(
    (s, i) =>
      s + i.amount + (i.payments ?? []).reduce((a, p) => a + p.amount, 0),
    0,
  );
  const cur = investments
    .filter((i) => i.currentValue)
    .reduce((s, i) => s + (i.currentValue ?? 0), 0);
  const invCur = investments
    .filter((i) => i.currentValue)
    .reduce(
      (s, i) =>
        s + i.amount + (i.payments ?? []).reduce((a, p) => a + p.amount, 0),
      0,
    );
  const gain = cur - invCur;
  const roi = invCur > 0 ? (gain / invCur) * 100 : null;
  return (
    <KpiGrid>
      <Kpi label="📋 Clôturés" value={String(investments.length)} />
      <Kpi label="💸 Total investi" value={`${fmt(total)} F`} />
      {cur > 0 && (
        <Kpi
          label="💎 Valeur finale"
          value={`${fmt(cur)} F`}
          color={gain >= 0 ? "success" : "danger"}
          sub={
            roi !== null
              ? `${roi >= 0 ? "+" : ""}${roi.toFixed(2)}% ROI`
              : undefined
          }
        />
      )}
      {gain !== 0 && (
        <Kpi
          label={gain >= 0 ? "📈 Gain" : "📉 Perte"}
          value={`${gain >= 0 ? "+" : ""}${fmt(gain)} F`}
          color={gain >= 0 ? "success" : "danger"}
        />
      )}
    </KpiGrid>
  );
}

// ── Liste portefeuille / historique ────────────────────────────────────────────
function InvestmentList({
  investments,
  onOpen,
}: {
  investments: Investment[];
  onOpen: (id: string) => void;
}) {
  const [filterType, setFilterType] = useState<InvestmentType | "all">("all");
  const filtered = investments
    .filter((i) => filterType === "all" || i.type === filterType)
    .sort((a, b) => b.amount - a.amount);

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <InvSelect
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
        >
          <option value="all">Tous les types</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.icon} {t.label}
            </option>
          ))}
        </InvSelect>
        <span className="text-[0.82rem] text-text-muted">
          {filtered.length} investissement{filtered.length > 1 ? "s" : ""}
        </span>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon="💼" title="Aucun résultat" className="pt-10" />
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          }}
        >
          {filtered.map((inv) => (
            <InvestmentCard
              key={inv.id}
              inv={inv}
              onClick={() => onOpen(String(inv.id))}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
const IS_ELECTRON = Boolean((window as any).electronAPI);

interface Props {
  appData: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  token?: string | null;
}

export default function InvestmentsPage({ appData, updateData, token }: Props) {
  const [activeTab, setActiveTab] = useState<InvTab>("portfolio");
  const [detailId, setDetailId] = useState<string | null>(null);

  const investments = Object.values(appData.investments ?? {});
  const actifs = investments.filter((i) => i.status !== "cloture");
  const clotures = investments.filter((i) => i.status === "cloture");
  const selected = detailId
    ? ((appData.investments ?? {})[detailId] ?? null)
    : null;

  // Pousse l'investissement complet vers l'API (upsert whole-object)
  const syncInvestment = (inv: Investment) => {
    if (IS_ELECTRON || !token) return;
    const { id, ...data } = inv;
    remoteAPI.saveInvestment(token, String(id), data as any).catch(() => {});
  };

  const handleCreate = (data: Omit<Investment, "id">) => {
    const id = `inv-${Date.now()}`;
    const full: Investment = { ...data, id };
    updateData((d) => {
      if (!d.investments) d.investments = {};
      d.investments[id] = full;
      return d;
    });
    syncInvestment(full);
    setDetailId(id);
    setActiveTab("portfolio");
  };

  const handleUpdate = (id: string, partial: Partial<Investment>) => {
    let updated: Investment | null = null;
    updateData((d) => {
      if (!d.investments?.[id]) return d;
      updated = { ...d.investments[id], ...partial };
      d.investments[id] = updated;
      return d;
    });
    if (updated) syncInvestment(updated);
  };

  const handleDelete = (id: string) => {
    updateData((d) => {
      if (d.investments) delete d.investments[id];
      return d;
    });
    if (!IS_ELECTRON && token)
      remoteAPI.deleteInvestment(token, id).catch(() => {});
    setDetailId(null);
  };

  if (selected) {
    return (
      <InvestmentDetailPage
        inv={selected}
        onUpdate={(partial) => handleUpdate(String(selected.id), partial)}
        onDelete={() => handleDelete(String(selected.id))}
        onBack={() => setDetailId(null)}
      />
    );
  }

  return (
    <div>
      <SubTabs
        tabs={TABS.map((t) => ({
          ...t,
          count:
            t.id === "portfolio"
              ? actifs.length
              : t.id === "historique"
                ? clotures.length
                : undefined,
          countMuted: t.id === "historique",
        }))}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "portfolio" && (
        <div>
          {actifs.length === 0 ? (
            <EmptyState
              icon="💼"
              title="Aucun investissement actif"
              className="pt-16"
            >
              <p className="mb-4">
                Créez votre premier investissement pour commencer à suivre votre
                portefeuille.
              </p>
              <button
                className="btn btn-primary"
                style={{ width: "auto" }}
                onClick={() => setActiveTab("new")}
              >
                ➕ Créer un investissement
              </button>
            </EmptyState>
          ) : (
            <>
              <PortfolioKPIs investments={actifs} />
              <InvestmentList investments={actifs} onOpen={setDetailId} />
            </>
          )}
        </div>
      )}

      {activeTab === "new" && <NewInvestmentForm onSave={handleCreate} />}

      {activeTab === "analytics" && (
        <InvestmentAnalytics investments={investments} />
      )}

      {activeTab === "historique" && (
        <div>
          {clotures.length === 0 ? (
            <EmptyState
              icon="📋"
              title="Aucun investissement clôturé"
              className="pt-16"
            >
              <p>Les investissements marqués clôturés apparaîtront ici.</p>
            </EmptyState>
          ) : (
            <>
              <HistoriqueKPIs investments={clotures} />
              <InvestmentList investments={clotures} onOpen={setDetailId} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
