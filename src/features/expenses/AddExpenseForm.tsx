import { useState, useRef } from "react";
import { CATEGORIES, getMonthKey, getMonthLabel } from "../../lib/constants";
import { SectionTitle } from "../../ui/Primitives";
import { compressReceiptImage } from "../../lib/Imagecompress";
import TagInput from "../../ui/Taginput";

interface Props {
  targetMonth: string;
  onAdd: (expense: {
    amount: number;
    description: string;
    category: string;
    date: string;
    tags?: string[];
    receiptImage?: string;
  }) => void;
  onOpenSettings: () => void;
  onOpenCatBudgets?: () => void;
  onOpenImport?: () => void;
  onExport: () => void;
  onNewMonth: () => void;
}

export default function AddExpenseForm({
  targetMonth,
  onAdd,
  onOpenSettings,
  onOpenCatBudgets,
  onOpenImport,
  onExport,
  onNewMonth,
}: Props) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("alimentation");
  const [customDate, setCustomDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMonthKey = getMonthKey();
  const isPastMonth = targetMonth && targetMonth < currentMonthKey;

  const handleReceiptFile = async (file: File) => {
    setReceiptError("");
    setReceiptLoading(true);
    try {
      const result = await compressReceiptImage(file);
      if (result.tooLarge) {
        setReceiptError(
          `Photo trop volumineuse même après compression (${Math.round(result.sizeBytes / 1024)} Ko). Essaie une photo moins détaillée ou recadrée sur le ticket.`,
        );
      } else {
        setReceiptImage(result.dataUrl);
      }
    } catch {
      setReceiptError("Impossible de lire cette image.");
    } finally {
      setReceiptLoading(false);
    }
  };

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
    onAdd({
      amount: amt,
      description: description.trim(),
      category,
      date,
      tags: tags.length > 0 ? tags : undefined,
      receiptImage: receiptImage ?? undefined,
    });
    setAmount("");
    setDescription("");
    setCustomDate("");
    setCategory("alimentation");
    setTags([]);
    setReceiptImage(null);
    setReceiptError("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    // Ne pas déclencher l'ajout sur Entrée si le focus est dans le champ de
    // tags — Entrée y sert à valider un tag, pas à soumettre le formulaire.
    if (
      e.key === "Enter" &&
      (e.target as HTMLElement).dataset.tagInput !== "true"
    ) {
      handleAdd();
    }
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
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full py-2.5 px-3 rounded-lg bg-surface-soft text-text text-[0.9rem] font-medium cursor-pointer outline-none transition-colors focus:ring-2 focus:ring-primary/40"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
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

      <div className="input-group">
        <label className="input-label">
          Tags <span className="text-text-muted font-normal">(optionnel)</span>
        </label>
        <TagInput
          tags={tags}
          onChange={setTags}
          placeholder="Ex: urgent, remboursable…"
        />
      </div>

      <div className="input-group">
        <label className="input-label">
          Reçu / ticket{" "}
          <span className="text-text-muted font-normal">(optionnel)</span>
        </label>
        {!receiptImage ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={receiptLoading}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-surface text-text-muted text-[0.85rem] cursor-pointer transition-colors hover:bg-surface-soft hover:text-text w-full"
          >
            {receiptLoading ? (
              <>⏳ Compression en cours…</>
            ) : (
              <>📷 Ajouter une photo du reçu</>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-3 py-2 px-2.5 rounded-lg bg-surface">
            <img
              src={receiptImage}
              alt="Aperçu du reçu"
              className="w-12 h-12 object-cover rounded-md flex-shrink-0"
            />
            <span className="flex-1 text-[0.8rem] text-text-muted">
              Photo attachée ✓
            </span>
            <button
              type="button"
              onClick={() => setReceiptImage(null)}
              className="text-text-muted hover:text-danger bg-transparent border-none cursor-pointer text-[0.8rem] px-1.5"
            >
              Retirer
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleReceiptFile(file);
            e.target.value = ""; // permet de re-choisir le même fichier après un retrait
          }}
        />
        {receiptError && (
          <div className="text-[0.78rem] text-danger mt-1.5">
            ⚠️ {receiptError}
          </div>
        )}
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
          {onOpenImport && (
            <button className="btn btn-secondary" onClick={onOpenImport}>
              📤 Importer CSV
            </button>
          )}
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
          {onOpenImport && (
            <button className="btn btn-secondary" onClick={onOpenImport}>
              📤 Importer CSV
            </button>
          )}
        </div>
      )}
    </>
  );
}
