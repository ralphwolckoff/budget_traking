import { useState } from "react";
import { CATEGORIES, getMonthKey, getMonthLabel } from "../../lib/constants";
import { SectionTitle, CategoryGrid } from "../../ui/Primitives";

interface Props {
  targetMonth: string;
  onAdd: (expense: {
    amount: number;
    description: string;
    category: string;
    date: string;
  }) => void;
  onOpenSettings: () => void;
  onOpenCatBudgets?: () => void;
  onExport: () => void;
  onNewMonth: () => void;
}

export default function AddExpenseForm({
  targetMonth,
  onAdd,
  onOpenSettings,
  onOpenCatBudgets,
  onExport,
  onNewMonth,
}: Props) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("alimentation");
  const [customDate, setCustomDate] = useState("");
  const [formError, setFormError] = useState("");

  const currentMonthKey = getMonthKey();
  const isPastMonth = targetMonth && targetMonth < currentMonthKey;

  const handleAdd = () => {
    const cleaned = String(amount).replace(/\s/g, "").replace(",", ".");
    const amt = Math.round(parseFloat(cleaned));
    if (!amt || isNaN(amt) || amt <= 0 || !description.trim()) {
      setFormError("Veuillez remplir tous les champs correctement");
      return;
    }
    setFormError("");
    let date = new Date().toISOString();
    if (isPastMonth && customDate) {
      date = new Date(customDate + "T12:00:00").toISOString();
    } else if (isPastMonth) {
      const [y, m] = targetMonth.split("-").map(Number);
      date = new Date(y, m, 0, 12, 0, 0).toISOString();
    }
    onAdd({ amount: amt, description: description.trim(), category, date });
    setAmount("");
    setDescription("");
    setCustomDate("");
    setCategory("alimentation");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  return (
    <>
      <SectionTitle icon="➕">
        {isPastMonth
          ? `Ajouter une dépense oubliée — ${getMonthLabel(targetMonth)}`
          : "Ajouter une Dépense"}
      </SectionTitle>

      {isPastMonth && (
        <div className="flex items-start gap-2.5 bg-secondary/[0.08] border border-secondary/35 rounded-lg py-3 px-3.5 mb-4.5 text-[0.85rem] text-secondary leading-relaxed">
          <span>✏️</span>
          <span>
            Vous ajoutez une dépense dans un <strong>mois passé</strong>. Elle
            sera intégrée au bilan de {getMonthLabel(targetMonth)}.
          </span>
        </div>
      )}

      <div className="input-group">
        <label className="input-label">Catégorie</label>
        <CategoryGrid
          categories={CATEGORIES}
          value={category}
          onChange={setCategory}
        />
      </div>

      <div className="input-group">
        <label className="input-label">Montant (F CFA)</label>
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ex: 1500"
        />
      </div>

      <div className="input-group">
        <label className="input-label">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ex: Petit-déjeuner au maquis"
        />
      </div>

      {isPastMonth && (
        <div className="input-group">
          <label className="input-label">Date (optionnel)</label>
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            max={`${targetMonth.split("-")[0]}-${targetMonth.split("-")[1]}-31`}
            min={`${targetMonth}-01`}
          />
          <div className="text-[0.78rem] text-text-muted mt-1.5">
            Laissez vide pour utiliser le dernier jour du mois
          </div>
        </div>
      )}

      {formError && (
        <div className="form-error-banner">
          <span>⚠️</span> {formError}
        </div>
      )}

      <button className="btn btn-primary" onClick={handleAdd}>
        {isPastMonth ? "➕ Ajouter la dépense oubliée" : "Ajouter la Dépense"}
      </button>

      {!isPastMonth && (
        <div className="flex gap-3 mt-5 flex-wrap [&>button]:flex-1 [&>button]:min-w-[120px]">
          <button className="btn btn-secondary" onClick={onOpenSettings}>
            ⚙️ Paramètres
          </button>
          {onOpenCatBudgets && (
            <button className="btn btn-secondary" onClick={onOpenCatBudgets}>
              🎯 Plafonds
            </button>
          )}
          <button className="btn btn-secondary" onClick={onExport}>
            📥 Exporter
          </button>
          <button className="btn btn-warning" onClick={onNewMonth}>
            🗓️ Nouveau Mois
          </button>
        </div>
      )}

      {isPastMonth && (
        <div className="flex gap-3 mt-5 flex-wrap [&>button]:flex-1 [&>button]:min-w-[120px]">
          <button className="btn btn-secondary" onClick={onExport}>
            📥 Exporter ce mois
          </button>
        </div>
      )}
    </>
  );
}
