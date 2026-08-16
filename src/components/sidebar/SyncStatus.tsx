import { useState, useEffect, useRef } from "react";
import type { Storage, SyncStatus as SyncStatusType, AppData } from "../../types";
import { ModalOverlay, ModalBox, ModalHeader } from "../../ui/Primitives";

interface Props {
  storage: Storage;
  onSyncDone?: (data?: AppData) => void;
}

const STATUS_CFG: Record<
  SyncStatusType,
  { icon: string; label: string; color: string; spin: boolean }
> = {
  checking: {
    icon: "○",
    label: "Vérification…",
    color: "text-text-muted",
    spin: false,
  },
  online: { icon: "☁", label: "En ligne", color: "text-success", spin: false },
  syncing: { icon: "↻", label: "Sync…", color: "text-primary", spin: true },
  synced: {
    icon: "✓",
    label: "Synchronisé",
    color: "text-success",
    spin: false,
  },
  offline: {
    icon: "⚡",
    label: "Hors ligne",
    color: "text-warning",
    spin: false,
  },
};

export default function SyncStatus({ storage, onSyncDone }: Props) {
  const [status, setStatus] = useState<SyncStatusType>("checking");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const prevOnline = useRef<boolean | null>(null);

  const IS_ELECTRON = Boolean((window as any).electronAPI);

  const checkServer = async (): Promise<boolean> => {
    try {
      const endpoint = IS_ELECTRON
        ? "http://127.0.0.1:47291/auth/users"
        : `${(import.meta.env.VITE_API_URL ?? "http://localhost:3001/api").replace("/api", "")}/health`;
      const r = await fetch(endpoint, {
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      });
      return r.ok;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const online = await checkServer();
      if (cancelled) return;
      if (online && prevOnline.current === false) {
        prevOnline.current = true;
        handleSync();
        return;
      }
      prevOnline.current = online;
      setStatus((prev) =>
        prev === "syncing" ? prev : online ? "online" : "offline",
      );
    };
    run();
    const id = setInterval(run, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const handleSync = async () => {
    if (!storage) return;
    setStatus("syncing");
    try {
      const result = await storage.sync();
      if (result.synced) {
        setStatus("synced");
        setLastSync(new Date());
        onSyncDone?.(result.data);
        setTimeout(() => setStatus("online"), 3000);
      } else {
        setStatus("offline");
      }
    } catch {
      setStatus("offline");
    }
  };

  const c = STATUS_CFG[status];

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        title="Statut de synchronisation"
        className={`flex items-center gap-1 text-[0.72rem] font-semibold bg-transparent border-none cursor-pointer p-0 transition-opacity hover:opacity-80 ${c.color}`}
      >
        <span
          className={`text-[0.75rem] leading-none ${c.spin ? "animate-spin" : ""}`}
        >
          {c.icon}
        </span>
        <span className="opacity-90">{c.label}</span>
      </button>
      {showModal && (
        <SyncModal
          status={status}
          lastSync={lastSync}
          onSync={handleSync}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

interface SyncModalProps {
  status: SyncStatusType;
  lastSync: Date | null;
  onSync: () => void;
  onClose: () => void;
}

const STATUS_DOT: Record<SyncStatusType, string> = {
  online: "bg-success shadow-[0_0_8px_var(--success)]",
  offline: "bg-warning",
  syncing: "bg-primary",
  synced: "bg-success",
  checking: "bg-border",
};
const STATUS_BOX: Record<SyncStatusType, string> = {
  online: "bg-success/[0.06] border-success/25",
  offline: "bg-warning/[0.06] border-warning/25",
  syncing: "bg-primary/[0.06] border-primary/25",
  synced: "bg-success/[0.06] border-success/25",
  checking: "bg-surface border-border",
};

function SyncModal({ status, lastSync, onSync, onClose }: SyncModalProps) {
  const isOffline = status === "offline";
  const isSyncing = status === "syncing";

  const title = {
    online: "Serveur connecté",
    offline: "Serveur inaccessible",
    syncing: "Synchronisation en cours…",
    synced: "Données synchronisées",
    checking: "Vérification…",
  }[status];

  const sub = {
    online: "Vos données sont sauvegardées en temps réel",
    offline: "Les données sont sauvegardées localement uniquement",
    syncing: "Envoi des données locales vers le serveur…",
    synced: lastSync
      ? `Dernière sync : ${lastSync.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
      : "Synchronisé avec succès",
    checking: "Tentative de connexion au serveur…",
  }[status];

  return (
    <ModalOverlay onClose={onClose}>
      <ModalBox maxWidth="420px">
        <ModalHeader title="☁️ Synchronisation" onClose={onClose} />

        <div className="flex flex-col gap-4">
          <div
            className={`flex items-center gap-3.5 py-4 px-4 rounded-xl border-[1.5px] ${STATUS_BOX[status]}`}
          >
            <div
              className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_DOT[status]} ${isSyncing ? "animate-pulse" : ""}`}
            />
            <div>
              <div className="text-[0.9rem] font-bold text-text">{title}</div>
              <div className="text-[0.78rem] text-text-muted mt-0.5">{sub}</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 py-3.5 px-3.5 rounded-xl bg-surface border border-border">
            <div className="flex items-start gap-2.5 text-[0.82rem]">
              <span className="text-base flex-shrink-0 mt-0.5">🔄</span>
              <div>
                <strong className="block text-text font-bold mb-0.5">
                  Synchronisation automatique
                </strong>
                <div className="text-text-muted">
                  Vérification toutes les 8 secondes
                </div>
              </div>
            </div>
            {lastSync && (
              <div className="flex items-start gap-2.5 text-[0.82rem]">
                <span className="text-base flex-shrink-0 mt-0.5">🕐</span>
                <div>
                  <strong className="block text-text font-bold mb-0.5">
                    Dernière synchronisation
                  </strong>
                  <div className="text-text-muted">
                    {lastSync.toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2.5 flex-wrap [&>button]:flex-1 [&>button]:min-w-[120px]">
            <button
              className="btn btn-primary"
              onClick={onSync}
              disabled={isSyncing}
            >
              {isSyncing ? "↻ Synchronisation…" : "🔄 Synchroniser maintenant"}
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </ModalBox>
    </ModalOverlay>
  );
}
