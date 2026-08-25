import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getMonthLabel } from "../lib/constants";
import { AppData, resolveMonthTrend } from "../lib/types";

interface Props {
  appData: AppData;
  monthKey: string;
}

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

/**
 * Comparaison "ce mois vs le mois précédent" — se place naturellement à côté
 * du panneau héros du Dashboard. Ne s'affiche pas s'il n'y a rien à comparer
 * (mois précédent vide), pour éviter d'annoncer une variation trompeuse
 * genre "+100% de dépenses" sur une base de zéro.
 */
export default function MonthTrendCard({ appData, monthKey }: Props) {
  const trend = resolveMonthTrend(appData, monthKey);

  if (!trend.hasPreviousData) return null;

  const isUp = trend.delta > 0;
  const isFlat = trend.delta === 0;
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  // Dépenser plus que le mois dernier = signal négatif (danger/warning),
  // dépenser moins = signal positif (success) — inverse d'une courbe boursière.
  const color = isFlat
    ? "text-text-muted"
    : isUp
      ? "text-danger"
      : "text-success";
  const bg = isFlat ? "bg-surface" : isUp ? "bg-danger/10" : "bg-success/10";

  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-surface-soft">
      <span
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${bg} ${color}`}
      >
        <Icon size={17} strokeWidth={2.2} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[0.8rem] text-text-muted">
          vs{" "}
          {getMonthLabel(
            monthKey.replace(/(\d{4})-(\d{2})/, (_, y, m) => {
              const d = new Date(Number(y), Number(m) - 2, 1);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            }),
          )}
        </div>
        <div className={`text-[0.95rem] font-bold font-mono ${color}`}>
          {isFlat
            ? "Identique au mois dernier"
            : `${isUp ? "+" : ""}${fmt(trend.delta)} F ${trend.deltaPct !== null ? `(${isUp ? "+" : ""}${trend.deltaPct.toFixed(1)}%)` : ""}`}
        </div>
      </div>
    </div>
  );
}
