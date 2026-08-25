import { useState, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import { AppNotification, generateNotifications } from "../lib/Notifications";
import { AppData, PageId } from "../lib/types";

interface Props {
  appData: AppData;
  monthKey: string;
  username: string;
  onNavigate: (
    page: PageId,
    opts?: { monthKey?: string; categoryId?: string },
  ) => void;
}

const SEVERITY_STYLE: Record<
  AppNotification["severity"],
  { border: string; icon: string }
> = {
  danger: { border: "border-l-danger", icon: "🚨" },
  warning: { border: "border-l-warning", icon: "⚠️" },
  info: { border: "border-l-primary", icon: "ℹ️" },
};

function dismissedKey(username: string) {
  return `bt-dismissed-notifs-${username}`;
}

function loadDismissed(username: string): Set<string> {
  try {
    const raw = localStorage.getItem(dismissedKey(username));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(username: string, ids: Set<string>) {
  localStorage.setItem(dismissedKey(username), JSON.stringify([...ids]));
}

export default function NotificationCenter({
  appData,
  monthKey,
  username,
  onNavigate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() =>
    loadDismissed(username),
  );
  const panelRef = useRef<HTMLDivElement>(null);

  const all = generateNotifications(appData, monthKey);
  const visible = all.filter((n) => !dismissed.has(n.id));

  // Ferme le panneau au clic extérieur
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(username, next);
  };

  const dismissAll = () => {
    const next = new Set(dismissed);
    visible.forEach((n) => next.add(n.id));
    setDismissed(next);
    saveDismissed(username, next);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        className="relative w-[34px] h-[34px] flex-shrink-0 rounded-[9px] bg-surface text-text-muted cursor-pointer transition-colors hover:text-primary flex items-center justify-center"
      >
        <Bell size={16} />
        {visible.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[0.62rem] font-bold flex items-center justify-center leading-none">
            {visible.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[42px] z-[200] w-[340px] max-h-[70vh] overflow-y-auto bg-surface-soft rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.35)] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3.5 sticky top-0 bg-surface-soft">
            <span className="text-[0.95rem] font-bold text-text">
              Notifications
            </span>
            {visible.length > 0 && (
              <button
                onClick={dismissAll}
                className="text-[0.72rem] text-text-muted hover:text-text bg-transparent border-none cursor-pointer underline"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <div className="text-center py-10 px-4 text-text-muted">
              <span className="text-3xl block mb-2 opacity-40">🔔</span>
              <p className="text-[0.85rem]">
                Aucune notification pour le moment
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 p-3 pt-0">
              {visible.map((n) => {
                const s = SEVERITY_STYLE[n.severity];
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-2.5 py-2.5 px-3 bg-surface rounded-lg border-l-[3px] ${s.border}`}
                  >
                    <span className="text-base flex-shrink-0 mt-0.5">
                      {s.icon}
                    </span>
                    <div
                      className={`flex-1 min-w-0 ${n.targetPage ? "cursor-pointer" : ""}`}
                      onClick={() => {
                        if (n.targetPage) {
                          onNavigate(n.targetPage, {
                            monthKey: n.monthKey,
                            categoryId: n.categoryId,
                          });
                          setOpen(false);
                        }
                      }}
                    >
                      <div className="text-[0.82rem] font-semibold text-text">
                        {n.title}
                      </div>
                      <div className="text-[0.76rem] text-text-muted mt-0.5">
                        {n.message}
                      </div>
                    </div>
                    <button
                      onClick={() => dismiss(n.id)}
                      title="Ignorer"
                      className="text-text-muted hover:text-text bg-transparent border-none cursor-pointer flex-shrink-0 p-0.5"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
