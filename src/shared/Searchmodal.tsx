import { useState } from "react";
import { remoteAPI } from "../lib/storage";
import { getMonthLabel } from "../lib/constants";
import type { ExpenseSearchResult } from "../lib/types";

interface Props {
  token: string;
  onNavigateToMonth: (monthKey: string) => void;
  onClose: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
const fmtD = (s: string) =>
  new Date(s).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function SearchModal({
  token,
  onNavigateToMonth,
  onClose,
}: Props) {
  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<ExpenseSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    setLoading(true);
    setSearched(true);
    const res = await remoteAPI.searchExpenses(token, {
      q: q.trim() || undefined,
      year: year.trim() || undefined,
      category: category.trim() || undefined,
    });
    setResults(res);
    setLoading(false);
  };

  const totalAmount = (results ?? []).reduce((s, r) => s + r.amount, 0);

  return (
    <div className="fixed inset-0 z-[600] flex items-start justify-center bg-black/60 p-4 pt-[8vh]">
      <div className="bg-surface rounded-2xl w-full max-w-[560px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-lg font-bold text-text">🔍 Recherche globale</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text bg-transparent border-none cursor-pointer text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-3 flex flex-col gap-2.5">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Ex: Orange Money, loyer, essence..."
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Année (ex: 2026)"
              className="flex-1"
            />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Catégorie"
              className="flex-1"
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={runSearch}
            disabled={loading}
          >
            {loading ? "Recherche..." : "Rechercher"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {!searched && (
            <p className="text-sm text-text-muted text-center py-8">
              Cherchez une dépense à travers tous vos mois.
            </p>
          )}
          {searched && !loading && results?.length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">
              Aucun résultat.
            </p>
          )}
          {results && results.length > 0 && (
            <>
              <div className="text-xs text-text-muted mb-2">
                {results.length} résultat{results.length > 1 ? "s" : ""} — total{" "}
                {fmt(totalAmount)} F
              </div>
              <div className="flex flex-col gap-1.5">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      onNavigateToMonth(r.monthKey);
                      onClose();
                    }}
                    className="text-left grid grid-cols-[80px_1fr_auto] items-center gap-2 py-2 px-2.5 bg-surface-soft rounded-lg hover:bg-surface transition-colors cursor-pointer"
                  >
                    <span className="text-[0.7rem] text-text-muted">
                      {fmtD(r.date)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm text-text truncate">
                        {r.description}
                      </span>
                      <span className="block text-[0.7rem] text-text-muted">
                        {r.category} · {getMonthLabel(r.monthKey)}
                      </span>
                    </span>
                    <span className="font-mono font-bold text-sm text-text">
                      {fmt(r.amount)} F
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
