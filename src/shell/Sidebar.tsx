import { useRef, RefObject } from "react";
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Compass,
  History,
  Briefcase,
  Repeat,
  Target,
  Sun,
  Moon,
  ChevronUp,
  X,
} from "lucide-react";
import { getMonthLabel } from "../lib/constants";
import type { PageId, Storage, CurrentUser } from "../lib/types";
import SyncStatus from "./SyncStatus";
import UserPopup from "./UserPopup";

const NAV: { id: PageId; icon: typeof LayoutDashboard; label: string }[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { id: "depenses", icon: Receipt, label: "Dépenses" },
  { id: "visu", icon: PieChart, label: "Visualisation" },
  { id: "forecast", icon: Compass, label: "Prévisions" },
  { id: "history", icon: History, label: "Historique" },
  { id: "investments", icon: Briefcase, label: "Investissements" },
  { id: "recurring", icon: Repeat, label: "Récurrentes" },
  { id: "goals", icon: Target, label: "Objectifs" },
];

interface Props {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  onClose: () => void;
  isOpen?: boolean; // Ajouté pour contrôler la visibilité sur mobile
  theme: string;
  onToggleTheme: () => void;
  viewMonth: string;
  salary: number;
  savings: number;
  monthInvestments?: number;
  monthInvestmentGains?: number;
  totalSpent: number;
  currentUser: CurrentUser | null;
  storageRef: RefObject<Storage | null>;
  onSyncDone: (data?: any) => void;
  showUserPopup: boolean;
  onToggleUserPopup: () => void;
  onCloseUserPopup: () => void;
  onLogout: () => void;
  onSettings: () => void;
  onSync: () => void;
}

export default function Sidebar({
  activePage,
  onNavigate,
  onClose,
  isOpen = true, // Valeur par défaut si non fournie
  theme,
  onToggleTheme,
  viewMonth,
  salary,
  savings,
  monthInvestments = 0,
  monthInvestmentGains = 0,
  totalSpent,
  currentUser,
  storageRef,
  onSyncDone,
  showUserPopup,
  onToggleUserPopup,
  onCloseUserPopup,
  onLogout,
  onSettings,
  onSync,
}: Props) {
  const userBtnRef = useRef<HTMLDivElement>(null);
  const budget = salary - savings - (monthInvestments - monthInvestmentGains);
  const pct = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;
  const remaining = budget - totalSpent;
  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

  const barColor =
    pct > 90 ? "bg-danger" : pct > 70 ? "bg-warning" : "bg-primary";
  const remainingColor = remaining < 0 ? "text-danger" : "text-success";

  const handleNavigate = (page: PageId) => {
    onNavigate(page);
    onClose();
  };

  return (
    <aside
      className={`md:sticky md:top-0 md:h-screen
        fixed inset-y-0 left-0 z-[100] w-64 h-full bg-surface border-r border-border flex flex-col

        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0

        ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-[18px]">
        <img
          src={`${import.meta.env.BASE_URL}buildstack-logo.svg`}
          alt="BuildStack"
          className="w-10 h-10 flex-shrink-0"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-[0.95rem] font-extrabold text-text tracking-tight whitespace-nowrap">
            BuildStack Budget
          </span>
          <span className="text-[0.68rem] text-text-muted uppercase tracking-wider whitespace-nowrap">
            Gestion financière
          </span>
        </div>
        <button
          className="ml-auto w-7 h-7 flex-shrink-0 rounded-md bg-transparent text-text-muted cursor-pointer transition-colors hover:text-text hover:bg-surface-soft md:hidden flex items-center justify-center"
          onClick={onClose}
          title="Fermer"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Mini carte mois — plate, pas de bordure ── */}
      <div className="mx-3 mt-1 mb-1.5 bg-surface-soft rounded-xl py-3 px-3.5">
        <div className="text-[0.72rem] text-text-muted font-bold uppercase tracking-wider mb-2">
          {getMonthLabel(viewMonth)}
        </div>

        <div className="h-[3px] bg-border rounded-full overflow-hidden mb-[7px]">
          <div
            className={`h-full rounded-full transition-all duration-500 min-w-[2px] ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center gap-[3px] font-mono text-[0.78rem]">
          <span className="text-text font-bold">{fmt(totalSpent)} F</span>
          <span className="text-text-muted">/</span>
          <span className="text-text-muted">{fmt(budget)} F</span>
        </div>

        {monthInvestments > 0 && (
          <div className="text-[0.72rem] text-warning mb-0.5 mt-1">
            💼 −{fmt(monthInvestments)} F inv.
          </div>
        )}
        {monthInvestmentGains > 0 && (
          <div className="text-[0.72rem] text-success mb-[3px]">
            💰 +{fmt(monthInvestmentGains)} F gains
          </div>
        )}

        <div className={`text-[0.72rem] mt-1 font-semibold ${remainingColor}`}>
          {remaining >= 0
            ? `${fmt(remaining)} F restants`
            : `Dépassé de ${fmt(Math.abs(remaining))} F`}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2.5 py-2 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] border-none text-[0.88rem] font-semibold cursor-pointer transition-colors duration-150 text-left w-full relative
                ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "bg-transparent text-text-muted hover:bg-surface-soft hover:text-text"
                }`}
            >
              <Icon size={18} strokeWidth={2} className="flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && (
                <span className="w-[5px] h-[5px] rounded-full bg-primary flex-shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="px-3 pt-2.5 pb-4 flex flex-col gap-1.5">
        <div className="relative group">
          <div
            ref={userBtnRef}
            onClick={onToggleUserPopup}
            title="Mon compte"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] bg-surface-soft cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-[0.85rem] font-extrabold text-white flex-shrink-0">
              {currentUser?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-[0.85rem] font-bold text-text whitespace-nowrap overflow-hidden text-ellipsis block">
                {currentUser?.username}
              </span>
              {storageRef?.current && (
                <SyncStatus
                  storage={storageRef.current}
                  onSyncDone={onSyncDone}
                />
              )}
            </div>
            <ChevronUp
              size={14}
              className="text-text-muted ml-auto flex-shrink-0 transition-colors group-hover:text-text"
            />
          </div>

          {showUserPopup && (
            <UserPopup
              username={currentUser?.username}
              anchorRef={userBtnRef as RefObject<HTMLElement>}
              onClose={onCloseUserPopup}
              onLogout={onLogout}
              onAccount={() => handleNavigate("account")}
              onSettings={onSettings}
              onSync={onSync}
            />
          )}
        </div>

        <button
          onClick={onToggleTheme}
          className="flex items-center gap-2.5 w-full px-3 py-[9px] rounded-[9px] bg-transparent text-text-muted text-[0.83rem] font-semibold cursor-pointer transition-colors hover:bg-surface-soft hover:text-text"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === "dark" ? "Mode clair" : "Mode sombre"}</span>
        </button>

        <div className="flex items-center justify-center gap-1.5 pt-1 text-[0.68rem] text-text-muted">
          <img
            src={`${import.meta.env.BASE_URL}buildstack-logo.svg`}
            alt="BuildStack"
            className="w-3.5 h-3.5 opacity-85"
          />
          <span>by BuildStack</span>
        </div>
      </div>
    </aside>
  );
}
