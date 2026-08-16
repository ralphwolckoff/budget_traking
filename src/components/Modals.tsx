import { useState, useEffect } from "react";
import { getMonthLabel } from "../constants";
import { ModalOverlay, ModalBox } from "../ui/Primitives";

/* ── EditSettingsModal ─────────────────────────────────────────────────────── */
interface EditSettingsProps {
  salary: number;
  savings: number;
  viewMonth: string;
  hasOverride: boolean;
  onSave: (salary: number, savings: number, monthOnly: boolean) => void;
  onClose: () => void;
}

export function EditSettingsModal({
  salary,
  savings,
  viewMonth,
  hasOverride,
  onSave,
  onClose,
}: EditSettingsProps) {
  const [newSalary, setNewSalary] = useState(String(salary));
  const [newSavings, setNewSavings] = useState(String(savings));
  const [monthOnly, setMonthOnly] = useState(hasOverride);
  const [dataPath, setDataPath] = useState("");

  const monthLabel = getMonthLabel(viewMonth);
  const preview = (parseFloat(newSalary) || 0) - (parseFloat(newSavings) || 0);

  useEffect(() => {
    if ((window as any).electronAPI?.getDataPath) {
      (window as any).electronAPI
        .getDataPath()
        .then((p: string) => setDataPath(p || ""));
    }
  }, []);

  const handleSave = () => {
    const s = parseFloat(newSalary);
    const sv = parseFloat(newSavings);
    if (!s || s <= 0) {
      alert("Salaire invalide");
      return;
    }
    if (sv < 0 || sv >= s) {
      alert("Épargne invalide (doit être < salaire)");
      return;
    }
    onSave(s, sv, monthOnly);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <ModalBox>
        <h2>⚙️ Paramètres du Budget</h2>

        {/* Toggle mois / global */}
        <div className="flex bg-surface rounded-xl p-1 gap-1 mb-3">
          <button
            onClick={() => setMonthOnly(false)}
            className={`flex-1 py-2 px-3 rounded-lg text-[0.82rem] font-semibold cursor-pointer transition-all
              ${!monthOnly ? "bg-gradient-to-br from-primary to-primary-dark text-white shadow-glow" : "bg-transparent text-text-muted hover:text-text"}`}
          >
            🌐 Tous les mois
          </button>
          <button
            onClick={() => setMonthOnly(true)}
            className={`flex-1 py-2 px-3 rounded-lg text-[0.82rem] font-semibold cursor-pointer transition-all
              ${monthOnly ? "bg-gradient-to-br from-primary to-primary-dark text-white shadow-glow" : "bg-transparent text-text-muted hover:text-text"}`}
          >
            📅 {monthLabel} uniquement
          </button>
        </div>

        <p className="text-[0.82rem] text-text-muted mb-4 leading-relaxed">
          {monthOnly ? (
            <>
              Ces valeurs s'appliqueront{" "}
              <strong className="text-text">uniquement à {monthLabel}</strong>.
              Les autres mois garderont leurs paramètres.
            </>
          ) : hasOverride ? (
            <>
              Ces valeurs s'appliqueront à{" "}
              <strong className="text-text">tous les mois sans override</strong>
              . L'override de {monthLabel} sera supprimé.
            </>
          ) : (
            <>
              Ces valeurs s'appliqueront à{" "}
              <strong className="text-text">tous les mois</strong> par défaut.
            </>
          )}
        </p>

        <div className="input-group">
          <label className="input-label">💵 Salaire Mensuel (F CFA)</label>
          <input
            type="number"
            min="0"
            value={newSalary}
            onChange={(e) => setNewSalary(e.target.value)}
            placeholder="Ex: 50000"
          />
        </div>
        <div className="input-group">
          <label className="input-label">🎯 Épargne Mensuelle (F CFA)</label>
          <input
            type="number"
            min="0"
            value={newSavings}
            onChange={(e) => setNewSavings(e.target.value)}
            placeholder="Ex: 20000"
          />
        </div>

        <div className="flex justify-between items-center bg-surface rounded-xl py-3.5 px-[18px] mb-1 text-[0.95rem] text-text-muted">
          <span>Budget disponible :</span>
          <span
            className={`font-mono font-bold text-[1.05rem] ${preview >= 0 ? "text-success" : "text-danger"}`}
          >
            {preview.toLocaleString()} F CFA
          </span>
        </div>

        {hasOverride && (
          <div className="flex items-center gap-2 flex-wrap mt-3 py-2.5 px-3.5 rounded-lg bg-warning/10 border border-warning/30 text-[0.82rem] text-warning">
            <span>⚡</span>
            <span>{monthLabel} a un paramètre personnalisé actif</span>
            {!monthOnly && (
              <span className="text-text-muted">
                {" "}
                — sera supprimé en sauvegardant en mode global
              </span>
            )}
          </div>
        )}

        {dataPath && (
          <div className="mt-3 py-2.5 px-3.5 bg-surface rounded-[10px] border border-border text-[0.78rem] text-text-muted break-all">
            <span className="text-success font-bold">💾 Sauvegarde ici :</span>
            <br />
            <span className="font-mono">{dataPath}</span>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {monthOnly
              ? `Enregistrer pour ${monthLabel}`
              : "Enregistrer pour tous les mois"}
          </button>
        </div>
      </ModalBox>
    </ModalOverlay>
  );
}

/* ── ConfirmModal ─────────────────────────────────────────────────────────── */
interface ConfirmProps {
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({ message, onConfirm, onClose }: ConfirmProps) {
  return (
    <ModalOverlay onClose={onClose}>
      <ModalBox>
        <h2>⚠️ Confirmation</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Confirmer
          </button>
        </div>
      </ModalBox>
    </ModalOverlay>
  );
}

/* ── NewMonthModal ────────────────────────────────────────────────────────── */
interface NewMonthProps {
  currentMonthLabel: string;
  nextMonthLabel: string;
  remaining: number;
  onConfirm: () => void;
  onClose: () => void;
}

export function NewMonthModal({
  currentMonthLabel,
  nextMonthLabel,
  remaining,
  onConfirm,
  onClose,
}: NewMonthProps) {
  const willCarry = remaining > 0;
  return (
    <ModalOverlay onClose={onClose}>
      <ModalBox>
        <h2>🗓️ Nouveau Mois</h2>
        <p>
          Clôturer <strong>{currentMonthLabel}</strong> et démarrer{" "}
          <strong>{nextMonthLabel}</strong>.
        </p>

        <div className="bg-surface rounded-xl p-4 mb-4 flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-[0.95rem]">
            <span>Solde restant ce mois</span>
            <span
              className={`font-mono font-bold ${remaining >= 0 ? "text-success" : "text-danger"}`}
            >
              {remaining.toLocaleString()} F CFA
            </span>
          </div>
          {willCarry && (
            <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-success/[0.08] border border-success/25 text-success">
              <span>✅ Report vers {nextMonthLabel}</span>
              <span className="font-mono font-bold">
                +{remaining.toLocaleString()} F CFA
              </span>
            </div>
          )}
          {!willCarry && remaining < 0 && (
            <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-danger/[0.08] border border-danger/25 text-danger">
              <span>⚠️ Budget dépassé — pas de report</span>
              <span>0 F</span>
            </div>
          )}
        </div>

        <p className="text-[0.85rem] text-text-muted mt-0 mb-5">
          {willCarry
            ? `Le solde de ${remaining.toLocaleString()} F sera ajouté à votre budget de ${nextMonthLabel}.`
            : `Aucun solde à reporter. Votre budget de ${nextMonthLabel} sera le budget mensuel standard.`}
        </p>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            Confirmer →
          </button>
        </div>
      </ModalBox>
    </ModalOverlay>
  );
}
