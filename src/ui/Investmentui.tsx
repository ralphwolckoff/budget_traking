import { useState, type ReactNode } from "react";

/**
 * Primitives Tailwind spécifiques au module Investissements.
 * Remplacent les anciennes classes .inv-kpi, .inv-badge, .inv-sub-tab,
 * .inv-type-btn, .inv-preview qui n'étaient plus définies dans le CSS
 * (bug préexistant — ces éléments n'étaient plus stylés du tout).
 */

// ── KPI ────────────────────────────────────────────────────────────────────────
type KpiColor = "primary" | "success" | "danger" | "warning";
const kpiColor: Record<KpiColor, string> = {
  primary: "text-primary",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
};

export function Kpi({
  label,
  value,
  sub,
  color = "primary",
  size = "md",
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  color?: KpiColor;
  size?: "md" | "sm";
}) {
  const isSm = size === "sm";
  return (
    <div
      className={`bg-surface-soft border border-border rounded-2xl ${isSm ? "p-3" : "p-4"}`}
    >
      <div
        className={`uppercase tracking-wide text-text-muted ${isSm ? "text-[0.68rem] mb-1" : "text-xs mb-1.5"}`}
      >
        {label}
      </div>
      <div
        className={`font-extrabold font-mono ${isSm ? "text-lg" : "text-2xl"} ${kpiColor[color]}`}
      >
        {value}
      </div>
      {sub && (
        <div
          className={`text-text-muted mt-1 ${isSm ? "text-[0.65rem]" : "text-xs"}`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid gap-3.5 mb-4"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
    >
      {children}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeColor = "primary" | "success" | "danger" | "warning" | "muted";
const badgeCfg: Record<BadgeColor, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
  muted: "bg-surface text-text-muted",
};

export function Badge({
  children,
  color = "muted",
}: {
  children: ReactNode;
  color?: BadgeColor;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${badgeCfg[color]}`}
    >
      {children}
    </span>
  );
}

// ── Sous-onglets (portefeuille / ajouter / suivi / historique) ─────────────────
export function SubTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: {
    id: T;
    label: string;
    icon: string;
    count?: number;
    countMuted?: boolean;
  }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-1 bg-surface rounded-2xl p-1 mb-5">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold cursor-pointer transition-all
              ${isActive ? "bg-primary text-white shadow-[0_3px_10px_var(--glow)]" : "text-text-muted hover:bg-surface-soft hover:text-text"}`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {!!tab.count && (
              <span
                className={`text-[0.7rem] font-bold rounded-full px-1.5 py-0.5 ${isActive ? "bg-white/25" : tab.countMuted ? "bg-border text-text-muted" : "bg-primary/15 text-primary"}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Grille de sélection de type d'investissement ───────────────────────────────
export function TypeGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; icon: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}
    >
      {options.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all
              ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-text-muted hover:border-primary hover:text-text"}`}
          >
            <span className="text-xl">{t.icon}</span>
            <span className="text-center leading-tight">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Bloc preview de calcul (aperçu gain/valeur finale...) ───────────────────────
export function Preview({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-surface border border-border">
      {children}
    </div>
  );
}

export function PreviewRow({
  label,
  value,
  color = "primary",
}: {
  label: string;
  value: string;
  color?: KpiColor;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-text-muted">{label}</span>
      <span className={`font-mono font-bold ${kpiColor[color]}`}>{value}</span>
    </div>
  );
}

// ── Sélecteur de période (3m/6m/1y/tout) ────────────────────────────────────────
export function PeriodSelector<T extends string>({
  periods,
  active,
  onChange,
}: {
  periods: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-[0.82rem] text-text-muted font-medium">
        Période :
      </span>
      <div className="flex gap-1.5">
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`py-1.5 px-3.5 rounded-lg text-[0.82rem] font-semibold cursor-pointer transition-all
              ${active === p.id ? "bg-primary text-white" : "bg-surface text-text-muted hover:text-text hover:bg-surface-light"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Ligne de légende camembert ───────────────────────────────────────────────────
export function PieLegendRow({
  color,
  icon,
  label,
  value,
  pct,
}: {
  color: string;
  icon: string;
  label: string;
  value: string;
  pct: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ background: color }}
      />
      <span className="text-sm">{icon}</span>
      <span className="flex-1 text-text-muted">{label}</span>
      <span className="font-mono font-semibold text-text text-[0.78rem]">
        {value}
      </span>
      <span className="text-[0.72rem] text-text-muted w-[38px] text-right">
        {pct}
      </span>
    </div>
  );
}

// ── Ligne du classement top performances ─────────────────────────────────────────
const rankColor: Record<number, string> = {
  0: "text-warning",
  1: "text-text-muted",
  2: "text-[#B45309]",
};

export function TopRow({
  rank,
  icon,
  name,
  invested,
  gain,
  gainPct,
}: {
  rank: number;
  icon: string;
  name: string;
  invested: string;
  gain: string;
  gainPct: string;
}) {
  const positive = !gain.startsWith("-");
  return (
    <div className="grid grid-cols-[32px_28px_1fr_90px_90px_70px] items-center gap-2 py-2.5 px-3 bg-surface rounded-xl border border-border text-sm">
      <div
        className={`font-extrabold text-sm text-center ${rankColor[rank] ?? "text-text-muted"}`}
      >
        #{rank + 1}
      </div>
      <div className="text-lg text-center">{icon}</div>
      <div className="font-semibold text-text truncate">{name}</div>
      <div className="font-mono text-xs text-text-muted hidden sm:block">
        {invested}
      </div>
      <div
        className={`font-mono font-bold text-xs ${positive ? "text-success" : "text-danger"}`}
      >
        {gain}
      </div>
      <div
        className={`font-mono font-bold text-xs ${positive ? "text-success" : "text-danger"}`}
      >
        {gainPct}
      </div>
    </div>
  );
}

// ── Select stylé (remplace .inv-select) ─────────────────────────────────────────
export function InvSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  const { className = "", ...rest } = props;
  return (
    <select
      {...rest}
      className={`py-2 px-3 rounded-lg border border-border bg-surface-soft text-text text-sm font-medium cursor-pointer outline-none transition-colors focus:border-primary ${className}`}
    />
  );
}

// ── Édition inline (cliquer pour éditer) ────────────────────────────────────────
interface InlineCellProps {
  value: string;
  onSave: (v: string) => void;
  type?: "text" | "number" | "date";
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
}
export function InlineCell({
  value,
  onSave,
  type = "text",
  placeholder = "—",
  prefix,
  suffix,
  className = "",
}: InlineCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const start = () => {
    setDraft(value);
    setEditing(true);
  };
  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };
  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };
  if (editing)
    return (
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        className="bg-surface-soft border-[1.5px] border-primary text-text rounded-md py-1 px-2 text-[0.88rem] outline-none min-w-[80px] max-w-[240px]"
      />
    );
  return (
    <span
      onClick={start}
      title="Cliquer pour modifier"
      className={`group inline-flex items-center gap-1.5 cursor-pointer py-0.5 px-1.5 rounded-md border border-transparent transition-colors hover:bg-primary/[0.08] hover:border-primary/25 ${className}`}
    >
      {prefix}
      {value ? (
        <>
          {value}
          {suffix}
        </>
      ) : (
        <span className="text-text-muted italic">{placeholder}</span>
      )}
      <span className="text-[0.7rem] opacity-0 transition-opacity group-hover:opacity-70">
        ✏️
      </span>
    </span>
  );
}

export function InlineSelect<T extends string>({
  value,
  options,
  onSave,
}: {
  value: T;
  options: { value: T; label: string }[];
  onSave: (v: T) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing)
    return (
      <select
        autoFocus
        value={value}
        onChange={(e) => {
          onSave(e.target.value as T);
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
        className="bg-surface-soft border-[1.5px] border-primary text-text rounded-md py-1 px-2 text-[0.85rem] outline-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  return (
    <span
      onClick={() => setEditing(true)}
      title="Cliquer pour modifier"
      className="group inline-flex items-center gap-1.5 cursor-pointer py-0.5 px-1.5 rounded-md border border-transparent transition-colors hover:bg-primary/[0.08] hover:border-primary/25"
    >
      {options.find((o) => o.value === value)?.label ?? value}
      <span className="text-[0.7rem] opacity-0 transition-opacity group-hover:opacity-70">
        ✏️
      </span>
    </span>
  );
}

// ── Bouton suppression discret (×) ───────────────────────────────────────────────
export function DeleteX({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-transparent border-none text-text-muted cursor-pointer text-base px-1.5 rounded transition-colors hover:bg-danger/15 hover:text-danger flex-shrink-0"
    >
      ×
    </button>
  );
}

// ── Ligne de liste générique (versements, gains) ─────────────────────────────────
export function ListRow({
  date,
  note,
  amount,
  dateColor,
  amountColor = "text-primary",
  onDelete,
}: {
  date: string;
  note?: ReactNode;
  amount: string;
  dateColor?: string;
  amountColor?: string;
  onDelete: () => void;
}) {
  return (
    <div className="grid grid-cols-[90px_1fr_auto_auto] items-center gap-2 py-1.5 px-2.5 bg-surface rounded-lg text-sm">
      <div className={`text-xs ${dateColor ?? "text-text-muted"}`}>{date}</div>
      <div className="text-text truncate">
        {note ?? <span className="text-text-muted italic">—</span>}
      </div>
      <div className={`font-mono font-bold whitespace-nowrap ${amountColor}`}>
        {amount}
      </div>
      <DeleteX onClick={onDelete} />
    </div>
  );
}

export function ListTotal({
  label,
  value,
  color = "text-primary",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between py-2 px-2.5 border-t border-border mt-1 text-[0.82rem] text-text-muted">
      <span>{label}</span>
      <span className={`font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

// ── Panneau d'ajout repliable (formulaires courts) ───────────────────────────────
export function AddPanel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2.5 p-3.5 rounded-xl bg-surface border border-border flex flex-col gap-2.5">
      {children}
    </div>
  );
}

export function EmptySection({ children }: { children: ReactNode }) {
  return (
    <div className="text-center py-4 text-text-muted text-[0.82rem]">
      {children}
    </div>
  );
}

// ── Ligne d'événement du journal ─────────────────────────────────────────────────
const eventBorder: Record<string, string> = {
  versement: "border-primary",
  valeur: "border-success",
  statut: "border-warning",
  note: "border-border",
};
export function EventRow({
  icon,
  content,
  date,
  onDelete,
  type = "note",
}: {
  icon: string;
  content: string;
  date: string;
  onDelete: () => void;
  type?: string;
}) {
  return (
    <div
      className={`flex items-start gap-2.5 py-2 px-2.5 bg-surface rounded-lg border-l-[3px] ${eventBorder[type] ?? "border-border"}`}
    >
      <div className="text-base flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[0.82rem] text-text">{content}</div>
        <div className="text-[0.72rem] text-text-muted mt-0.5">{date}</div>
      </div>
      <DeleteX onClick={onDelete} />
    </div>
  );
}

// ── Ligne document ────────────────────────────────────────────────────────────
export function DocRow({
  name,
  meta,
  onDelete,
}: {
  name: string;
  meta: string;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 py-2 px-2.5 bg-surface rounded-lg border border-border">
      <span className="text-lg flex-shrink-0">📄</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-text truncate">{name}</div>
        <div className="text-[0.72rem] text-text-muted mt-0.5">{meta}</div>
      </div>
      <DeleteX onClick={onDelete} />
    </div>
  );
}
