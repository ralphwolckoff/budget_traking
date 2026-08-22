import { useState } from "react";
import { remoteAPI } from "../lib/storage";

interface Props {
  viewMonth: string;
  token: string;
  onClose: () => void;
}

type Scope = "single" | "multi" | "year";

export default function ReportsModal({ viewMonth, token, onClose }: Props) {
  const currentYear = viewMonth.split("-")[0];
  const [scope, setScope] = useState<Scope>("single");
  const [singleMonth, setSingleMonth] = useState(viewMonth);
  const [multiMonths, setMultiMonths] = useState<string[]>([viewMonth]);
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState<"csv" | "pdf" | null>(null);
  const [error, setError] = useState("");

  const addMonthField = () => {
    if (multiMonths.length >= 3) return;
    setMultiMonths((m) => [...m, viewMonth]);
  };
  const removeMonthField = (idx: number) => {
    setMultiMonths((m) => m.filter((_, i) => i !== idx));
  };
  const updateMonthField = (idx: number, value: string) => {
    setMultiMonths((m) => m.map((mo, i) => (i === idx ? value : mo)));
  };

  const handleExport = async (format: "csv" | "pdf") => {
    setError("");

    let period: { month?: string; year?: string; months?: string };
    if (scope === "single") {
      period = { month: singleMonth };
    } else if (scope === "multi") {
      const cleaned = Array.from(new Set(multiMonths.filter(Boolean))).sort();
      if (cleaned.length === 0) {
        setError("Sélectionne au moins un mois");
        return;
      }
      period = { months: cleaned.join(",") };
    } else {
      period = { year };
    }

    setLoading(format);
    const res = await remoteAPI.downloadReport(token, format, period);
    setLoading(null);
    if (!res.success) setError(res.error ?? "Erreur inconnue");
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-[480px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">
            📤 Rapports exportables
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text bg-transparent border-none cursor-pointer text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setScope("single")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              scope === "single"
                ? "bg-primary text-white border-primary"
                : "bg-surface-soft text-text-muted border-border"
            }`}
          >
            📅 Un mois
          </button>
          <button
            onClick={() => setScope("multi")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              scope === "multi"
                ? "bg-primary text-white border-primary"
                : "bg-surface-soft text-text-muted border-border"
            }`}
          >
            🗂️ Plusieurs mois
          </button>
          <button
            onClick={() => setScope("year")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              scope === "year"
                ? "bg-primary text-white border-primary"
                : "bg-surface-soft text-text-muted border-border"
            }`}
          >
            🗓️ Année
          </button>
        </div>

        {scope === "single" && (
          <div className="input-group">
            <label className="input-label">Mois</label>
            <input
              type="month"
              value={singleMonth}
              onChange={(e) => setSingleMonth(e.target.value)}
            />
          </div>
        )}

        {scope === "multi" && (
          <div className="flex flex-col gap-2 mb-3">
            {multiMonths.map((mo, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="month"
                  value={mo}
                  onChange={(e) => updateMonthField(idx, e.target.value)}
                  className="flex-1"
                />
                {multiMonths.length > 1 && (
                  <button
                    onClick={() => removeMonthField(idx)}
                    className="text-text-muted hover:text-danger bg-transparent border-none cursor-pointer text-lg px-1"
                    title="Retirer ce mois"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {multiMonths.length < 3 && (
              <button
                onClick={addMonthField}
                className="btn btn-secondary btn-sm self-start"
              >
                + Ajouter un mois
              </button>
            )}
            <p className="text-[0.72rem] text-text-muted">
              Jusqu'à 3 mois — leurs dépenses sont combinées dans un seul
              fichier.
            </p>
          </div>
        )}

        {scope === "year" && (
          <div className="input-group">
            <label className="input-label">Année</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min="2020"
              max="2100"
            />
          </div>
        )}

        {error && (
          <div className="form-error-banner mb-3">
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <button
            className="btn btn-secondary flex-1"
            disabled={loading !== null}
            onClick={() => handleExport("csv")}
          >
            {loading === "csv" ? "..." : "📊 CSV"}
          </button>
          <button
            className="btn btn-primary flex-1"
            disabled={loading !== null}
            onClick={() => handleExport("pdf")}
          >
            {loading === "pdf" ? "..." : "📄 PDF"}
          </button>
        </div>

        <p className="text-[0.72rem] text-text-muted mt-3">
          Le fichier se télécharge directement dans votre navigateur.
        </p>
      </div>
    </div>
  );
}
