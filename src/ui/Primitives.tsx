import type { ReactNode } from "react";

/**
 * Primitives Tailwind partagées — remplacent les anciennes classes CSS
 * génériques (.section, .section-title, .empty-state, .btn-link) qui
 * revenaient dans presque toutes les pages. Un seul endroit à connaître
 * au lieu de creuser index.css pour comprendre leur style.
 */

// ── Section (remplace .section) ──────────────────────────────────────────────
// Style plat par défaut : pas de bordure, juste un fond légèrement surélevé.
// Passer bordered pour retrouver l'ancien contour (rare — cas où la section
// doit vraiment se détacher d'un fond déjà surface-soft, ex. carte dans une carte).
export function Section({
  children,
  className = "",
  bordered = false,
}: {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={`bg-none rounded-[20px] p-[30px]  ${className}`}
    >
      {children}
    </div>
  );
}

// ── Titre de section avec icône + action optionnelle à droite (remplace .section-title) ──
export function SectionTitle({
  icon,
  children,
  action,
}: {
  icon?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 text-[1.15rem] font-bold mb-6 text-text">
      {icon && <span className="text-[1.4rem]">{icon}</span>}
      <span className="flex-1">{children}</span>
      {action}
    </div>
  );
}

// ── État vide (remplace .empty-state) ────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  children,
  className = "",
}: {
  icon: string;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-center py-[60px] px-5 text-text-muted ${className}`}>
      <span className="text-[4rem] opacity-30 mb-5 block">{icon}</span>
      <h3 className="text-[1.3rem] mb-2.5 text-text font-semibold">{title}</h3>
      {children}
    </div>
  );
}

// ── Modale (remplace .modal-overlay / .modal) ────────────────────────────────────
export function ModalOverlay({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center backdrop-blur-sm p-4"
    >
      {children}
    </div>
  );
}

export function ModalBox({
  children,
  className = "",
  maxWidth = "480px",
}: {
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ maxWidth }}
      className={`bg-surface-soft border border-border rounded-3xl p-8 w-full animate-[modalIn_0.3s_ease-out] shadow-[0_30px_60px_rgba(0,0,0,0.5)] max-h-[90dvh] overflow-y-auto ${className}`}
    >
      {children}
    </div>
  );
}

// ── Barre d'outils de sélection multiple (copier/couper/coller/supprimer) ────────
// Utilisée pour les listes de dépenses et de prévisions.
interface SelectionToolbarProps {
  totalCount: number;
  selectedCount: number;
  itemLabel?: string; // "dépense", "prévision"... par défaut "élément"
  onSelectAll: () => void;
  onClear: () => void;
  onCopy: () => void;
  onCut: () => void;
  onDeleteSelected: () => void;
  paste?: {
    count: number;
    mode: "copy" | "cut";
    sourceLabel?: string;
    highlight?: boolean;
    onPaste: () => void;
  };
}

export function SelectionToolbar({
  totalCount,
  selectedCount,
  itemLabel = "élément",
  onSelectAll,
  onClear,
  onCopy,
  onCut,
  onDeleteSelected,
  paste,
}: SelectionToolbarProps) {
  const hasSelection = selectedCount > 0;
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
      <div className="flex items-center gap-2.5 flex-wrap">
        {totalCount > 0 && (
          <>
            <button
              onClick={allSelected ? onClear : onSelectAll}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border text-[0.82rem] font-semibold cursor-pointer transition-colors
                  ${allSelected ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-text-muted hover:border-primary hover:text-text"}`}
            >
              {allSelected ? "☑" : "☐"} Tout
            </button>
            {hasSelection && (
              <span className="text-[0.78rem] text-text-muted font-medium">
                {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
              </span>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {hasSelection && (
          <>
            <button
              onClick={onCopy}
              title="Copier la sélection"
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-primary/40 bg-primary/10 text-primary text-[0.82rem] font-semibold cursor-pointer transition-colors hover:bg-primary/20"
            >
              📋 Copier
            </button>
            <button
              onClick={onCut}
              title="Couper la sélection"
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-warning/40 bg-warning/10 text-warning text-[0.82rem] font-semibold cursor-pointer transition-colors hover:bg-warning/20"
            >
              ✂️ Couper
            </button>
            <button
              onClick={onDeleteSelected}
              title="Supprimer la sélection"
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-danger/40 bg-danger/10 text-danger text-[0.82rem] font-semibold cursor-pointer transition-colors hover:bg-danger/20"
            >
              🗑️ Supprimer ({selectedCount})
            </button>
          </>
        )}

        {paste && (
          <button
            onClick={paste.onPaste}
            title={
              paste.sourceLabel
                ? `Coller depuis ${paste.sourceLabel} (${paste.mode === "cut" ? "déplacer" : "copier"})`
                : undefined
            }
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-success/40 bg-success/10 text-success text-[0.82rem] font-semibold cursor-pointer transition-colors hover:bg-success/20 whitespace-nowrap
                ${paste.highlight ? "shadow-[0_0_0_2px_rgba(16,185,129,0.35)]" : ""}`}
          >
            📌 Coller {paste.count} {itemLabel}
            {paste.count > 1 ? "s" : ""}
            {paste.mode === "cut" && (
              <span className="text-[0.62rem] bg-warning/25 text-warning rounded px-1.5 py-0.5 ml-1 uppercase font-bold tracking-wide">
                couper
              </span>
            )}
            {paste.sourceLabel && (
              <span className="text-[0.68rem] opacity-70 ml-1.5 font-normal">
                depuis {paste.sourceLabel}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Case à cocher de sélection (remplace .expense-checkbox) ─────────────────────
export function SelectCheckbox({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors flex-shrink-0 text-white hover:border-primary
          ${checked ? "bg-primary border-primary" : "border-border"}`}
    >
      {checked ? "✓" : ""}
    </div>
  );
}

// ── En-tête de modale avec titre + bouton fermer (remplace .modal-header) ───────
export function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="text-[1.15rem] font-bold text-text">{title}</div>
      <button
        onClick={onClose}
        className="w-8 h-8 flex-shrink-0 rounded-lg border border-border bg-transparent text-text-muted cursor-pointer transition-colors hover:text-text hover:border-primary"
      >
        ✕
      </button>
    </div>
  );
}

export function BtnLink({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-transparent border-none text-primary text-[0.82rem] font-semibold cursor-pointer py-0.5 px-1.5 rounded-md transition-colors hover:bg-primary/[0.08] ${className}`}
    >
      {children}
    </button>
  );
}

// ── Grille de sélection de catégorie (remplace .category-grid/.category-btn) ────
export function CategoryGrid<T extends string>({
  categories,
  value,
  onChange,
}: {
  categories: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    newFunction()
  );

  function newFunction() {
    return <div
      className="grid gap-2"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}
    >
      {categories.map((cat) => {
        const active = value === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className={`py-2.5 px-3 rounded-lg border-2 text-[0.85rem] font-semibold cursor-pointer transition-all text-center truncate
                ${active ? "bg-primary border-primary text-white" : "bg-surface border-border text-text-muted hover:border-primary hover:text-text"}`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>;
  }
}
