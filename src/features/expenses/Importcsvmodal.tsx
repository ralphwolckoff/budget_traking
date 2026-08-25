import { useState, useRef } from "react";
import { ModalOverlay, ModalBox, ModalHeader } from "../../ui/Primitives";
import { CATEGORIES } from "../../lib/constants";
import { ParsedRow, parseCsv } from "../../lib/Csvimport";

interface Props {
  targetMonth: string;
  onImport: (
    expenses: {
      amount: number;
      description: string;
      category: string;
      date: string;
      tags?: string[];
    }[],
  ) => void;
  onClose: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

export default function ImportCsvModal({ onImport, onClose }: Props) {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [hasTagsColumn, setHasTagsColumn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseCsv(content);
      setRows(result.rows);
      setErrors(result.errors);
      setHasTagsColumn(result.hasTagsColumn);
    };
    reader.readAsText(file, "utf-8");
  };

  const toggleRow = (rowIndex: number) => {
    setRows((prev) =>
      prev
        ? prev.map((r) =>
            r.rowIndex === rowIndex ? { ...r, include: !r.include } : r,
          )
        : prev,
    );
  };

  const updateCategory = (rowIndex: number, category: string) => {
    setRows((prev) =>
      prev
        ? prev.map((r) =>
            r.rowIndex === rowIndex ? { ...r, guessedCategory: category } : r,
          )
        : prev,
    );
  };

  const toggleAll = (value: boolean) => {
    setRows((prev) =>
      prev
        ? prev.map((r) => (r.date && r.amount ? { ...r, include: value } : r))
        : prev,
    );
  };

  const validRows = rows?.filter((r) => r.date && r.amount) ?? [];
  const includedRows = validRows.filter((r) => r.include);
  const totalAmount = includedRows.reduce((s, r) => s + (r.amount ?? 0), 0);

  const handleConfirm = () => {
    const expenses = includedRows.map((r) => ({
      amount: r.amount!,
      description: r.description,
      category: r.guessedCategory,
      date: new Date(`${r.date}T12:00:00`).toISOString(),
      tags: r.tags.length > 0 ? r.tags : undefined,
    }));
    onImport(expenses);
    onClose();
  };

  const catLabel = (id: string) =>
    CATEGORIES.find((c) => c.id === id)
      ?.label.split(" ")
      .slice(1)
      .join(" ") ?? id;

  return (
    <ModalOverlay onClose={onClose}>
      <ModalBox maxWidth={rows ? "780px" : "480px"}>
        <ModalHeader title="📥 Importer un relevé (CSV)" onClose={onClose} />

        {!rows && (
          <div className="flex flex-col gap-4">
            <p className="text-[0.85rem] text-text-muted leading-relaxed">
              Sélectionne un export CSV de ta banque. Colonnes attendues, dans
              cet ordre :{" "}
              <strong className="text-text">date, description, montant</strong>,
              plus optionnellement une 4ᵉ colonne{" "}
              <strong className="text-text">tags</strong> (plusieurs tags dans
              une cellule séparés par{" "}
              <code className="bg-surface px-1 rounded">|</code>, ex:{" "}
              <code className="bg-surface px-1 rounded">
                urgent|remboursable
              </code>
              ). Le fichier peut avoir une ligne d'en-tête ou non — c'est
              détecté automatiquement, tout comme la présence ou non de la
              colonne tags.
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 py-10 px-4 rounded-xl bg-surface text-text-muted cursor-pointer transition-colors hover:bg-surface-soft hover:text-text"
            >
              <span className="text-3xl">📄</span>
              <span className="text-[0.88rem] font-semibold">
                Cliquer pour choisir un fichier .csv
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            <div className="bg-surface rounded-lg py-2.5 px-3.5 text-[0.78rem] text-text-muted">
              💡 Les montants négatifs (débits) sont automatiquement importés en
              valeur absolue — chaque ligne est traitée comme une dépense.
            </div>
          </div>
        )}

        {rows && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-[0.82rem] text-text-muted">
              <span>
                📄 {fileName} — {validRows.length} ligne
                {validRows.length > 1 ? "s" : ""} reconnue
                {validRows.length > 1 ? "s" : ""} sur {rows.length}
                {hasTagsColumn && (
                  <span className="ml-2 text-primary">
                    🏷️ colonne tags détectée
                  </span>
                )}
              </span>
              <button
                onClick={() => {
                  setRows(null);
                  setErrors([]);
                }}
                className="text-primary bg-transparent border-none cursor-pointer underline"
              >
                Changer de fichier
              </button>
            </div>

            {errors.length > 0 && (
              <div className="flex flex-col gap-1.5 bg-warning/10 border border-warning/30 rounded-lg py-2.5 px-3.5">
                {errors.map((e, i) => (
                  <div key={i} className="text-[0.8rem] text-warning">
                    ⚠️ {e}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => toggleAll(true)}
                  className="text-[0.78rem] text-primary bg-transparent border-none cursor-pointer underline"
                >
                  Tout inclure
                </button>
                <span className="text-text-muted">·</span>
                <button
                  onClick={() => toggleAll(false)}
                  className="text-[0.78rem] text-text-muted bg-transparent border-none cursor-pointer underline"
                >
                  Tout exclure
                </button>
              </div>
              <span className="text-[0.82rem] text-text-muted">
                {includedRows.length} sélectionnée
                {includedRows.length > 1 ? "s" : ""} ·{" "}
                <span className="font-mono font-bold text-text">
                  {fmt(totalAmount)} F
                </span>
              </span>
            </div>

            <div className="max-h-[340px] overflow-y-auto flex flex-col gap-1.5 -mr-1 pr-1">
              {rows.map((row) => {
                const invalid = !row.date || !row.amount;
                return (
                  <div
                    key={row.rowIndex}
                    className={`flex items-center gap-2.5 py-2 px-2.5 rounded-lg bg-surface ${invalid ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={row.include}
                      disabled={invalid}
                      onChange={() => toggleRow(row.rowIndex)}
                      className="!w-auto flex-shrink-0"
                    />
                    <span className="text-[0.76rem] text-text-muted w-[80px] flex-shrink-0 font-mono">
                      {row.date ?? "❌ date"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.85rem] text-text truncate">
                        {row.description}
                      </div>
                      {row.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {row.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[0.66rem] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <select
                      value={row.guessedCategory}
                      disabled={invalid}
                      onChange={(e) =>
                        updateCategory(row.rowIndex, e.target.value)
                      }
                      className="!w-auto !py-1 !px-2 text-[0.76rem] flex-shrink-0 max-w-[120px]"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {catLabel(c.id)}
                        </option>
                      ))}
                    </select>
                    <span className="font-mono font-bold text-[0.85rem] text-text w-[80px] text-right flex-shrink-0">
                      {row.amount !== null ? `${fmt(row.amount)} F` : "❌"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                disabled={includedRows.length === 0}
                onClick={handleConfirm}
              >
                Importer {includedRows.length} dépense
                {includedRows.length > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}
      </ModalBox>
    </ModalOverlay>
  );
}
