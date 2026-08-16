import { getMonthLabel, getMonthKey } from "../constants";

interface Props {
  viewMonth: string;
  onChangeMonth: (key: string) => void;
  monthsWithData: string[];
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MonthPaginator({
  viewMonth,
  onChangeMonth,
  monthsWithData,
}: Props) {
  const todayKey = getMonthKey();
  const isCurrent = viewMonth === todayKey;
  const isPast = viewMonth < todayKey;
  const nextDisabled = viewMonth >= todayKey;

  return (
    <div className="flex items-center gap-2.5 bg-surface-soft border border-border rounded-2xl py-1.5 px-3">
      <button
        onClick={() => onChangeMonth(shiftMonth(viewMonth, -1))}
        className="w-10 h-10 rounded-[10px] border-[1.5px] border-border bg-surface text-text text-[1.6rem] leading-none cursor-pointer transition-all flex items-center justify-center font-sans hover:border-primary hover:bg-surface-light hover:text-primary hover:scale-[1.08]"
      >
        ‹
      </button>

      <div className="flex flex-col items-center min-w-[150px]">
        <span className="text-[0.95rem] font-bold text-text tracking-[0.01em]">
          {getMonthLabel(viewMonth)}
        </span>
        {isCurrent && (
          <span className="text-[0.72rem] font-semibold py-0.5 px-2.5 rounded-full mt-1 tracking-[0.03em] bg-primary/15 text-primary border border-primary/40">
            Mois en cours
          </span>
        )}
        {isPast && !isCurrent && (
          <span className="text-[0.72rem] font-semibold py-0.5 px-2.5 rounded-full mt-1 tracking-[0.03em] bg-secondary/[0.12] text-secondary border border-secondary/35">
            Mois passé
          </span>
        )}
        {!isPast && !isCurrent && (
          <span className="text-[0.72rem] font-semibold py-0.5 px-2.5 rounded-full mt-1 tracking-[0.03em] bg-warning/[0.12] text-warning border border-warning/35">
            À venir
          </span>
        )}
      </div>

      <button
        onClick={() => !nextDisabled && onChangeMonth(shiftMonth(viewMonth, 1))}
        disabled={nextDisabled}
        className="w-10 h-10 rounded-[10px] border-[1.5px] border-border bg-surface text-text text-[1.6rem] leading-none cursor-pointer transition-all flex items-center justify-center font-sans
          hover:border-primary hover:bg-surface-light hover:text-primary hover:scale-[1.08]
          disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
      >
        ›
      </button>

      {!isCurrent && (
        <button
          onClick={() => onChangeMonth(todayKey)}
          className="py-[7px] px-4 rounded-[10px] border-[1.5px] border-primary bg-primary/10 text-primary text-[0.85rem] font-semibold cursor-pointer transition-all whitespace-nowrap hover:bg-primary hover:text-white"
        >
          Aujourd'hui
        </button>
      )}

      {monthsWithData.length > 0 && (
        <span className="hidden lg:inline text-[0.72rem] text-text-muted ml-1">
          {monthsWithData.length} mois avec données
        </span>
      )}
    </div>
  );
}
