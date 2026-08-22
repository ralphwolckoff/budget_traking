import { useState } from "react";
import { CATEGORIES, getMonthKey, getMonthLabel } from "../../lib/constants";
import type { AppData, RecurringExpense } from "../../lib/types";
import { Section, SectionTitle, EmptyState } from "../../ui/Primitives";
import { Kpi, KpiGrid, Badge, Preview, PreviewRow } from "../../ui/Investmentui";
import { remoteAPI } from "../../lib/storage";

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

function nextOccurrence(r: RecurringExpense): string {
  const currentMonthKey = getMonthKey();
  const targetMonthKey =
    r.lastGeneratedMonth === currentMonthKey
      ? (() => {
          const [y, m] = currentMonthKey.split("-").map(Number);
          const d = new Date(y, m, 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        })()
      : currentMonthKey;
  const [y, m] = targetMonthKey.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const day = Math.min(r.dayOfMonth, daysInMonth);
  return new Date(y, m - 1, day).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ── Formulaire création/édition ────────────────────────────────────────────────
interface FormProps {
  initial?: RecurringExpense;
  onSave: (
    r: Omit<RecurringExpense, "id" | "createdAt" | "lastGeneratedMonth">,
  ) => void;
  onCancel: () => void;
}

function RecurringForm({ initial, onSave, onCancel }: FormProps) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "internet");
  const [amount, setAmount] = useState(String(initial?.amount ?? ""));
  const [dayOfMonth, setDayOfMonth] = useState(
    String(initial?.dayOfMonth ?? "1"),
  );
  const [startMonth, setStartMonth] = useState(
    initial?.startMonth ?? getMonthKey(),
  );
  const [hasEnd, setHasEnd] = useState(!!initial?.endMonth);
  const [endMonth, setEndMonth] = useState(initial?.endMonth ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");

  const amt = parseFloat(amount.replace(",", ".")) || 0;
  const day = parseInt(dayOfMonth) || 1;

  const handleSave = () => {
    if (!description.trim()) {
      setError("Description requise");
      return;
    }
    if (amt <= 0) {
      setError("Montant invalide");
      return;
    }
    if (day < 1 || day > 31) {
      setError("Jour du mois invalide (1-31)");
      return;
    }
    setError("");
    onSave({
      description: description.trim(),
      category,
      amount: amt,
      dayOfMonth: day,
      active: initial?.active ?? true,
      startMonth,
      endMonth: hasEnd && endMonth ? endMonth : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="max-w-[640px]">
      <Section>
        <SectionTitle icon="🔁">
          {initial ? "Modifier la récurrence" : "Nouvelle dépense récurrente"}
        </SectionTitle>

        <div className="input-group">
          <label className="input-label">Catégorie</label>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            }}
          >
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`py-2.5 px-3 rounded-lg text-[0.85rem] font-semibold cursor-pointer transition-all text-center truncate
                    ${active ? "bg-primary text-white" : "bg-surface text-text-muted hover:text-text"}`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Loyer, Netflix, Forfait Orange..."
          />
        </div>

        <div className="flex gap-3 flex-wrap [&>*]:flex-1 [&>*]:min-w-[180px]">
          <div className="input-group">
            <label className="input-label">Montant (F CFA)</label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 30000"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Jour du mois</label>
            <input
              type="number"
              min="1"
              max="31"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              placeholder="Ex: 5"
            />
          </div>
        </div>

        <div className="flex gap-3 flex-wrap [&>*]:flex-1 [&>*]:min-w-[180px]">
          <div className="input-group">
            <label className="input-label">Actif à partir de</label>
            <input
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasEnd}
                onChange={(e) => setHasEnd(e.target.checked)}
                className="!w-auto"
              />
              Date de fin
            </label>
            <input
              type="month"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              disabled={!hasEnd}
              min={startMonth}
              className={!hasEnd ? "opacity-40" : ""}
            />
          </div>
        </div>

        {amt > 0 && day >= 1 && day <= 31 && (
          <div className="mb-5">
            <Preview>
              <PreviewRow
                label="📅 Prochaine génération"
                value={`le ${day} de chaque mois`}
                color="primary"
              />
              <PreviewRow
                label="💰 Impact annuel estimé"
                value={`${fmt(amt * 12)} F / an`}
                color="warning"
              />
            </Preview>
          </div>
        )}

        <div className="input-group">
          <label className="input-label">Notes (optionnel)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Compte bailleur, référence contrat..."
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
            {initial ? "💾 Enregistrer" : "➕ Créer la récurrence"}
          </button>
        </div>
      </Section>
    </div>
  );
}

// ── Carte récurrence ────────────────────────────────────────────────────────────
function RecurringCard({
  r,
  onEdit,
  onToggle,
  onDelete,
}: {
  r: RecurringExpense;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const cat = CATEGORIES.find((c) => c.id === r.category);
  const currentMonthKey = getMonthKey();
  const generatedThisMonth = r.lastGeneratedMonth === currentMonthKey;

  return (
    <div
      className={`bg-surface-soft rounded-2xl p-4 flex flex-col gap-3 transition-opacity ${!r.active ? "opacity-55" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl flex-shrink-0">
          {cat?.label.split(" ")[0] ?? "💳"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-text truncate">{r.description}</div>
          <div className="text-xs text-text-muted">
            {cat?.label.split(" ").slice(1).join(" ")}
          </div>
        </div>
        <div className="font-mono font-extrabold text-primary whitespace-nowrap">
          {fmt(r.amount)} F
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge color="muted">📅 Le {r.dayOfMonth} de chaque mois</Badge>
        {r.active ? (
          generatedThisMonth ? (
            <Badge color="success">✅ Générée ce mois</Badge>
          ) : (
            <Badge color="primary">⏳ Prochaine : {nextOccurrence(r)}</Badge>
          )
        ) : (
          <Badge color="muted">⏸️ En pause</Badge>
        )}
        {r.endMonth && (
          <Badge color="warning">🏁 Fin : {getMonthLabel(r.endMonth)}</Badge>
        )}
      </div>

      {r.notes && (
        <div className="text-[0.82rem] text-text-muted italic">
          📝 {r.notes}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button className="btn btn-secondary btn-sm" onClick={onToggle}>
          {r.active ? "⏸️ Mettre en pause" : "▶️ Réactiver"}
        </button>
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

// ── Page principale ────────────────────────────────────────────────────────────
interface Props {
  appData: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  token?: string | null;
}

const IS_ELECTRON = Boolean((window as any).electronAPI);

export default function RecurringPage({ appData, updateData, token }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<RecurringExpense | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const recurring = Object.values(appData.recurringExpenses ?? {}).sort(
    (a, b) => a.dayOfMonth - b.dayOfMonth,
  );
  const active = recurring.filter((r) => r.active);
  const paused = recurring.filter((r) => !r.active);
  const monthlyTotal = active.reduce((s, r) => s + r.amount, 0);

  // Pousse la récurrence complète vers l'API (upsert whole-object)
  const syncRecurring = (r: RecurringExpense) => {
    if (IS_ELECTRON || !token) return;
    const { id, createdAt, ...data } = r;
    remoteAPI.saveRecurring(token, String(id), data).catch(() => {});
  };

  const handleSave = (
    data: Omit<RecurringExpense, "id" | "createdAt" | "lastGeneratedMonth">,
  ) => {
    let saved: RecurringExpense | null = null;
    updateData((d) => {
      if (!d.recurringExpenses) d.recurringExpenses = {};
      if (editTarget) {
        saved = { ...editTarget, ...data };
        d.recurringExpenses[String(editTarget.id)] = saved;
      } else {
        const id = `rec-${Date.now()}`;
        saved = { ...data, id, createdAt: new Date().toISOString() };
        d.recurringExpenses[id] = saved;
      }
      return d;
    });
    if (saved) syncRecurring(saved);
    setShowForm(false);
    setEditTarget(null);
  };

  const handleToggle = (r: RecurringExpense) => {
    const updated: RecurringExpense = { ...r, active: !r.active };
    updateData((d) => {
      if (d.recurringExpenses?.[String(r.id)])
        d.recurringExpenses[String(r.id)] = updated;
      return d;
    });
    syncRecurring(updated);
  };

  const handleDelete = (id: string) => {
    updateData((d) => {
      if (d.recurringExpenses) delete d.recurringExpenses[id];
      return d;
    });
    if (!IS_ELECTRON && token)
      remoteAPI.deleteRecurring(token, id).catch(() => {});
    setConfirmDel(null);
  };

  if (showForm) {
    return (
      <RecurringForm
        initial={editTarget ?? undefined}
        onSave={handleSave}
        onCancel={() => {
          setShowForm(false);
          setEditTarget(null);
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-5">
        <KpiGrid>
          <Kpi
            label="🔁 Récurrentes actives"
            value={String(active.length)}
            sub={
              paused.length > 0 ? `${paused.length} en pause` : "Toutes actives"
            }
          />
          <Kpi
            label="💸 Total mensuel"
            value={`${fmt(monthlyTotal)} F`}
            color="warning"
            sub="déduit chaque mois automatiquement"
          />
          <Kpi
            label="📅 Impact annuel"
            value={`${fmt(monthlyTotal * 12)} F`}
            color="danger"
            sub="estimation sur 12 mois"
          />
        </KpiGrid>
      </div>

      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <span className="text-[0.82rem] text-text-muted">
          Les dépenses actives sont ajoutées automatiquement chaque mois à la
          date indiquée.
        </span>
        <button
          className="btn btn-primary"
          style={{ width: "auto" }}
          onClick={() => {
            setEditTarget(null);
            setShowForm(true);
          }}
        >
          ➕ Nouvelle récurrence
        </button>
      </div>

      {recurring.length === 0 ? (
        <EmptyState
          icon="🔁"
          title="Aucune dépense récurrente"
          className="pt-12"
        >
          <p className="mb-4">
            Automatisez votre loyer, vos abonnements ou toute dépense fixe
            mensuelle.
          </p>
          <button
            className="btn btn-primary"
            style={{ width: "auto" }}
            onClick={() => setShowForm(true)}
          >
            ➕ Créer une récurrence
          </button>
        </EmptyState>
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          }}
        >
          {recurring.map((r) => (
            <div key={r.id} className="relative">
              <RecurringCard
                r={r}
                onEdit={() => {
                  setEditTarget(r);
                  setShowForm(true);
                }}
                onToggle={() => handleToggle(r)}
                onDelete={() => setConfirmDel(String(r.id))}
              />
              {confirmDel === String(r.id) && (
                <div className="absolute inset-0 z-[5] bg-[rgba(11,15,25,0.92)] rounded-2xl border border-danger flex flex-col items-center justify-center gap-3 p-4 text-center">
                  <span className="text-[0.85rem] text-text">
                    Supprimer cette récurrence ?
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
                      onClick={() => handleDelete(String(r.id))}
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
