import { useState } from "react";
import { CATEGORIES } from "../../lib/constants";
import type { AppData } from "../../lib/types";
import { ModalOverlay, ModalBox } from "../../ui/Primitives";

interface Props {
  appData: AppData;
  onSave: (budgets: Record<string, number>) => void;
  onClose: () => void;
}

export default function CategoryBudgetsModal({
  appData,
  onSave,
  onClose,
}: Props) {
  const [budgets, setBudgets] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    CATEGORIES.forEach((cat) => {
      const val = appData.categoryBudgets?.[cat.id] ?? cat.budget;
      init[cat.id] = String(val);
    });
    return init;
  });

  const totalBudget = appData.salary - appData.savings;
  const totalAllocated = Object.values(budgets).reduce(
    (s, v) => s + (parseFloat(v) || 0),
    0,
  );
  const remaining = totalBudget - totalAllocated;
  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  const overBudget = totalAllocated > totalBudget;

  const handleSave = () => {
    const result: Record<string, number> = {};
    CATEGORIES.forEach((cat) => {
      const val = parseFloat(budgets[cat.id]) || 0;
      result[cat.id] = Math.round(val);
    });
    onSave(result);
  };

  const handleReset = () => {
    const reset: Record<string, string> = {};
    CATEGORIES.forEach((cat) => {
      reset[cat.id] = String(cat.budget);
    });
    setBudgets(reset);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <ModalBox maxWidth="500px">
        <h2>🎯 Plafonds par catégorie</h2>
        <p className="text-text-muted text-[0.85rem] mb-4">
          Définissez un plafond de dépenses mensuel pour chaque catégorie.
        </p>

        {/* Résumé budget — plat */}
        <div className="bg-surface rounded-xl py-3 px-3.5 mb-4">
          <div className="flex justify-between items-center text-[0.83rem] mb-1">
            <span>Budget disponible</span>
            <span className="font-mono font-bold text-text">
              {fmt(totalBudget)} F
            </span>
          </div>
          <div className="flex justify-between items-center text-[0.83rem] mb-1">
            <span>Total alloué</span>
            <span
              className={`font-mono font-bold ${overBudget ? "text-danger" : "text-text"}`}
            >
              {fmt(totalAllocated)} F
            </span>
          </div>
          <div className="h-2.5 bg-surface-soft rounded-full overflow-hidden my-2">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${overBudget ? "bg-danger" : totalAllocated > totalBudget * 0.9 ? "bg-warning" : "bg-gradient-to-r from-primary to-secondary"}`}
              style={{
                width: `${Math.min((totalAllocated / totalBudget) * 100, 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between items-center text-[0.83rem]">
            <span
              className={`font-semibold ${remaining < 0 ? "text-danger" : "text-success"}`}
            >
              {remaining >= 0
                ? `✅ ${fmt(remaining)} F non alloués`
                : `⚠️ Dépassement de ${fmt(Math.abs(remaining))} F`}
            </span>
            <span className="text-xs text-text-muted">
              {totalBudget > 0
                ? ((totalAllocated / totalBudget) * 100).toFixed(1)
                : 0}
              %
            </span>
          </div>
        </div>

        {/* Liste catégories — plate */}
        <div className="flex flex-col gap-2 mb-4">
          {CATEGORIES.map((cat) => {
            const val = parseFloat(budgets[cat.id]) || 0;
            const pct = totalBudget > 0 ? (val / totalBudget) * 100 : 0;
            const isOver = val > totalBudget * 0.5;
            return (
              <div key={cat.id} className="py-2.5 px-3 rounded-xl bg-surface">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{cat.label.split(" ")[0]}</span>
                  <span className="flex-1 text-[0.83rem] font-medium text-text">
                    {cat.label.split(" ").slice(1).join(" ")}
                  </span>
                  <span
                    className={`text-xs font-mono ${isOver ? "text-warning" : "text-text-muted"}`}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-surface-soft rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ${isOver ? "bg-warning" : "bg-primary"}`}
                      style={{ width: `${Math.min(pct * 2, 100)}%` }}
                    />
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={budgets[cat.id]}
                    onChange={(e) =>
                      setBudgets((prev) => ({
                        ...prev,
                        [cat.id]: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="!w-24 !py-1.5 !px-2.5 text-right font-mono text-sm"
                  />
                  <span className="text-xs text-text-muted flex-shrink-0">
                    F
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-actions flex-wrap gap-2">
          <button className="btn btn-secondary" onClick={handleReset}>
            ↺ Réinitialiser
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            💾 Enregistrer les plafonds
          </button>
        </div>
      </ModalBox>
    </ModalOverlay>
  );
}
