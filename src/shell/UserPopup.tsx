import { useEffect, useRef, type RefObject } from "react";

interface Props {
  username?: string;
  anchorRef: RefObject<HTMLElement>;
  onClose: () => void;
  onLogout: () => void;
  onAccount: () => void;
  onSettings: () => void;
  onSync: () => void;
}

export default function UserPopup({
  username,
  onClose,
  onLogout,
  onAccount,
  onSettings,
  onSync,
}: Props) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Fermer au clic à l'extérieur
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node))
        onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const initial = username?.[0]?.toUpperCase() ?? "?";

  return (
    <div
      ref={popupRef}
      className="fixed left-[268px] bottom-6 w-[230px] bg-surface-soft border border-border rounded-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)] z-[300] overflow-hidden backdrop-blur-md animate-[modalIn_0.18s_ease-out]"
    >
      {/* Flèche pointant vers la sidebar */}
      <div className="absolute left-[-6px] top-[22px] w-3 h-3 bg-surface-soft border-l border-b border-border rotate-45" />

      {/* Profil */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3.5">
        <div className="w-[38px] h-[38px] rounded-[10px] bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-base font-extrabold text-white flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
          {initial}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[0.9rem] font-bold text-text truncate">
            {username}
          </span>
          <span className="text-[0.72rem] text-text-muted mt-0.5">
            Compte local
          </span>
        </div>
      </div>

      <div className="h-px bg-border my-0.5" />

      {/* Menu */}
      <div className="p-1.5 flex flex-col gap-0.5">
        <button
          onClick={onAccount}
          className="flex items-center gap-2.5 w-full py-2.5 px-3 rounded-lg border-none bg-transparent text-text text-[0.875rem] font-medium cursor-pointer transition-colors text-left hover:bg-surface"
        >
          <span className="text-base w-5 text-center opacity-80">👤</span> Mon
          compte
        </button>
        <button
          onClick={onSettings}
          className="flex items-center gap-2.5 w-full py-2.5 px-3 rounded-lg border-none bg-transparent text-text text-[0.875rem] font-medium cursor-pointer transition-colors text-left hover:bg-surface"
        >
          <span className="text-base w-5 text-center opacity-80">⚙️</span>{" "}
          Paramètres
        </button>
        <button
          onClick={onSync}
          className="flex items-center gap-2.5 w-full py-2.5 px-3 rounded-lg border-none bg-transparent text-text text-[0.875rem] font-medium cursor-pointer transition-colors text-left hover:bg-surface"
        >
          <span className="text-base w-5 text-center opacity-80">🔄</span>{" "}
          Synchroniser
        </button>

        <div className="h-px bg-border my-0.5" />

        <button
          onClick={onLogout}
          className="flex items-center gap-2.5 w-full py-2.5 px-3 rounded-lg border-none bg-transparent text-danger text-[0.875rem] font-medium cursor-pointer transition-colors text-left hover:bg-danger/[0.08]"
        >
          <span className="text-base w-5 text-center opacity-80">🚪</span>{" "}
          Déconnexion
        </button>
      </div>
    </div>
  );
}
