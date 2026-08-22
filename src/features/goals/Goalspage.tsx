import { Section, Badge } from "lucide-react";
import { useState } from "react";
import { remoteAPI } from "../../lib/storage";
import { FinancialGoal, AppData, resolveGoalProgress } from "../../lib/types";
import { KpiGrid, Kpi } from "../../ui/Investmentui";
import { SectionTitle, EmptyState } from "../../ui/Primitives";

const IS_ELECTRON = Boolean((window as any).electronAPI);
const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
const fmtD = (s: string) =>
  new Date(s).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const STATUS_CFG = {
  actif: { label: "🎯 En cours", color: "primary" as const },
  atteint: { label: "🏆 Atteint", color: "success" as const },
  abandonne: { label: "⏸️ Abandonné", color: "muted" as const },
};

/* ── Formulaire ────────────────────────────────────────────────────────────── */
function GoalForm({
  initial,
  investments,
  onSave,
  onCancel,
}: {
  initial?: FinancialGoal;
  investments: { id: string | number; name: string }[];
  onSave: (g: Omit<FinancialGoal, "id" | "createdAt" | "status">) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(
    String(initial?.targetAmount ?? ""),
  );
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [startDate, setStartDate] = useState(
    initial?.startDate ?? new Date().toISOString().slice(0, 10),
  );
  const [linkedIds, setLinkedIds] = useState<Set<string>>(
    new Set((initial?.linkedInvestmentIds ?? []).map(String)),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");

  const toggleLink = (id: string) =>
    setLinkedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSave = () => {
    const amt = parseFloat(targetAmount) || 0;
    if (!name.trim()) {
      setError("Nom requis");
      return;
    }
    if (amt <= 0) {
      setError("Montant cible invalide");
      return;
    }
    if (!targetDate) {
      setError("Date cible requise");
      return;
    }
    setError("");
    onSave({
      name: name.trim(),
      targetAmount: amt,
      targetDate,
      startDate,
      linkedInvestmentIds: Array.from(linkedIds),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Section>
      <SectionTitle icon="🎯">
        {initial ? "Modifier l'objectif" : "Nouvel objectif financier"}
      </SectionTitle>

      <div className="input-group">
        <label className="input-label">Nom de l'objectif</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Usine tapioca à Melon"
        />
      </div>

      <div className="flex gap-3 flex-wrap [&>*]:flex-1 [&>*]:min-w-[180px]">
        <div className="input-group">
          <label className="input-label">Montant cible (F CFA)</label>
          <input
            type="number"
            min="0"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="Ex: 5000000"
          />
        </div>
        <div className="input-group">
          <label className="input-label">Échéance</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
      </div>

      <div className="input-group">
        <label className="input-label">Investissements liés (optionnel)</label>
        {investments.length === 0 ? (
          <div className="text-[0.82rem] text-text-muted py-2">
            Aucun investissement disponible à lier.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {investments.map((inv) => (
              <label
                key={inv.id}
                className={`flex items-center gap-2.5 py-2 px-3 rounded-lg cursor-pointer transition-colors
                  ${linkedIds.has(String(inv.id)) ? "bg-primary/10" : "bg-surface hover:bg-surface-soft"}`}
              >
                <input
                  type="checkbox"
                  checked={linkedIds.has(String(inv.id))}
                  onChange={() => toggleLink(String(inv.id))}
                  className="!w-auto"
                />
                <span className="text-[0.85rem] text-text">{inv.name}</span>
              </label>
            ))}
          </div>
        )}
        <div className="text-[0.72rem] text-text-muted mt-1.5">
          La progression de l'objectif = valeur actuelle des investissements
          liés.
        </div>
      </div>

      <div className="input-group">
        <label className="input-label">Notes (optionnel)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{ width: "100%", resize: "vertical" }}
          placeholder="Stratégie, contexte..."
        />
      </div>

      {error && (
        <div className="form-error-banner">
          <span>⚠️</span> {error}
        </div>
      )}

      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onCancel}>
          Annuler
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          {initial ? "💾 Enregistrer" : "➕ Créer l'objectif"}
        </button>
      </div>
    </Section>
  );
}

/* ── Carte objectif ────────────────────────────────────────────────────────── */
function GoalCard({
  goal,
  appData,
  onEdit,
  onDelete,
  onMarkAtteint,
}: {
  goal: FinancialGoal;
  appData: AppData;
  onEdit: () => void;
  onDelete: () => void;
  onMarkAtteint: () => void;
}) {
  const p = resolveGoalProgress(goal, appData);
  const sc = STATUS_CFG[goal.status];
  const linkedNames = (goal.linkedInvestmentIds ?? [])
    .map((id) => appData.investments?.[String(id)]?.name)
    .filter(Boolean) as string[];

  return (
    <div className="bg-surface-soft rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-text text-[1.02rem] truncate">
            {goal.name}
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            Échéance : {fmtD(goal.targetDate)}
          </div>
        </div>
        <Badge color={sc.color}>{sc.label}</Badge>
      </div>

      <div>
        <div className="flex justify-between text-[0.82rem] mb-1.5">
          <span className="text-text-muted">{fmt(p.currentAmount)} F</span>
          <span className="font-mono font-bold text-text">
            {fmt(goal.targetAmount)} F
          </span>
        </div>
        <div className="h-2.5 bg-surface rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${p.pctComplete >= 100 ? "bg-success" : "bg-gradient-to-r from-primary to-secondary"}`}
            style={{ width: `${p.pctComplete}%` }}
          />
        </div>
        <div className="text-[0.72rem] text-text-muted mt-1">
          {p.pctComplete.toFixed(1)}% atteint
        </div>
      </div>

      {goal.status === "actif" && (
        <div
          className={`flex items-start gap-2 py-2.5 px-3 rounded-lg text-[0.8rem] ${p.onTrack ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}
        >
          <span>{p.onTrack ? "✅" : "⚠️"}</span>
          <div>
            {p.remaining === 0 ? (
              <strong>Objectif atteint !</strong>
            ) : p.onTrack ? (
              <>
                Au rythme actuel ({fmt(p.currentMonthly)} F/mois), atteint dans{" "}
                <strong>{p.projectedMonths} mois</strong>.
              </>
            ) : (
              <>
                Il manque <strong>{fmt(p.gap)} F/mois</strong> pour tenir
                l'échéance ({p.monthsUntilTarget} mois restants, besoin de{" "}
                {fmt(p.requiredMonthly)} F/mois).
              </>
            )}
          </div>
        </div>
      )}

      {linkedNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {linkedNames.map((n, i) => (
            <Badge key={i} color="muted">
              💼 {n}
            </Badge>
          ))}
        </div>
      )}

      {goal.notes && (
        <div className="text-[0.8rem] text-text-muted italic">
          📝 {goal.notes}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {goal.status === "actif" && p.pctComplete >= 100 && (
          <button className="btn btn-secondary btn-sm" onClick={onMarkAtteint}>
            🏆 Marquer atteint
          </button>
        )}
        <button className="btn btn-secondary btn-sm" onClick={onEdit}>
          ✏️ Modifier
        </button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>
          🗑️
        </button>
      </div>
    </div>
  );
}

/* ── Page principale ──────────────────────────────────────────────────────── */
interface Props {
  appData: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  token?: string | null;
}

export default function GoalsPage({ appData, updateData, token }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<FinancialGoal | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const goals = Object.values(appData.goals ?? {}).sort((a, b) =>
    a.targetDate.localeCompare(b.targetDate),
  );
  const activeGoals = goals.filter((g) => g.status === "actif");
  const investmentOptions = Object.values(appData.investments ?? {}).map(
    (i) => ({ id: i.id, name: i.name }),
  );

  const syncGoal = (g: FinancialGoal) => {
    if (IS_ELECTRON || !token) return;
    const { id, createdAt, ...data } = g;
    remoteAPI.saveGoal(token, String(id), data).catch(() => {});
  };

  const handleSave = (
    data: Omit<FinancialGoal, "id" | "createdAt" | "status">,
  ) => {
    let saved: FinancialGoal | null = null;
    updateData((d) => {
      if (!d.goals) d.goals = {};
      if (editTarget) {
        saved = { ...editTarget, ...data };
        d.goals[String(editTarget.id)] = saved;
      } else {
        const id = `goal-${Date.now()}`;
        saved = {
          ...data,
          id,
          status: "actif",
          createdAt: new Date().toISOString(),
        };
        d.goals[id] = saved;
      }
      return d;
    });
    if (saved) syncGoal(saved);
    setShowForm(false);
    setEditTarget(null);
  };

  const handleMarkAtteint = (g: FinancialGoal) => {
    const updated: FinancialGoal = { ...g, status: "atteint" };
    updateData((d) => {
      if (d.goals?.[String(g.id)]) d.goals[String(g.id)] = updated;
      return d;
    });
    syncGoal(updated);
  };

  const handleDelete = (id: string) => {
    updateData((d) => {
      if (d.goals) delete d.goals[id];
      return d;
    });
    if (!IS_ELECTRON && token) remoteAPI.deleteGoal(token, id).catch(() => {});
    setConfirmDel(null);
  };

  if (showForm) {
    return (
      <GoalForm
        initial={editTarget ?? undefined}
        investments={investmentOptions}
        onSave={handleSave}
        onCancel={() => {
          setShowForm(false);
          setEditTarget(null);
        }}
      />
    );
  }

  const totalTarget = activeGoals.reduce((s, g) => s + g.targetAmount, 0);
  const totalCurrent = activeGoals.reduce(
    (s, g) => s + resolveGoalProgress(g, appData).currentAmount,
    0,
  );
  const onTrackCount = activeGoals.filter(
    (g) => resolveGoalProgress(g, appData).onTrack,
  ).length;

  return (
    <div>
      {goals.length > 0 && (
        <div className="mb-5">
          <KpiGrid>
            <Kpi
              label="🎯 Objectifs actifs"
              value={String(activeGoals.length)}
            />
            <Kpi
              label="💰 Total visé"
              value={`${fmt(totalTarget)} F`}
              color="primary"
            />
            <Kpi
              label="📊 Total atteint"
              value={`${fmt(totalCurrent)} F`}
              color="success"
              sub={
                totalTarget > 0
                  ? `${((totalCurrent / totalTarget) * 100).toFixed(1)}%`
                  : undefined
              }
            />
            <Kpi
              label="✅ Dans les temps"
              value={`${onTrackCount}/${activeGoals.length}`}
              color={
                onTrackCount === activeGoals.length ? "success" : "warning"
              }
            />
          </KpiGrid>
        </div>
      )}

      <div className="flex justify-end mb-5">
        <button
          className="btn btn-primary"
          style={{ width: "auto" }}
          onClick={() => {
            setEditTarget(null);
            setShowForm(true);
          }}
        >
          ➕ Nouvel objectif
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="Aucun objectif financier"
          className="pt-16"
        >
          <p className="mb-4">
            Fixez-vous un objectif chiffré avec une échéance — l'app calcule si
            votre rythme d'épargne actuel suffit à l'atteindre.
          </p>
          <button
            className="btn btn-primary"
            style={{ width: "auto" }}
            onClick={() => setShowForm(true)}
          >
            ➕ Créer un objectif
          </button>
        </EmptyState>
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          }}
        >
          {goals.map((g) => (
            <div key={g.id} className="relative">
              <GoalCard
                goal={g}
                appData={appData}
                onEdit={() => {
                  setEditTarget(g);
                  setShowForm(true);
                }}
                onDelete={() => setConfirmDel(String(g.id))}
                onMarkAtteint={() => handleMarkAtteint(g)}
              />
              {confirmDel === String(g.id) && (
                <div className="absolute inset-0 z-[5] bg-[rgba(11,15,25,0.92)] rounded-2xl border border-danger flex flex-col items-center justify-center gap-3 p-4 text-center">
                  <span className="text-[0.85rem] text-text">
                    Supprimer cet objectif ?
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setConfirmDel(null)}
                    >
                      Annuler
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(String(g.id))}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
