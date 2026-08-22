import { useState } from "react";
import type { AppData } from "../lib/types.ts";
import { ModalOverlay, ModalBox, ModalHeader } from "../ui/Primitives.tsx";

function encode(data: AppData): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}
function decode(str: string): AppData {
  return JSON.parse(decodeURIComponent(escape(atob(str)))) as AppData;
}

interface Props {
  appData: AppData;
  onImport: (data: AppData) => void;
  onClose: () => void;
}

export default function SyncModal({ appData, onImport, onClose }: Props) {
  const [tab, setTab] = useState<"export" | "import">("export");
  const [importCode, setImportCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);

  const exportCode = encode(appData);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(exportCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      (
        document.getElementById(
          "export-code-area",
        ) as HTMLTextAreaElement | null
      )?.select();
    }
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(appData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCode = () => {
    setError("");
    try {
      const data = decode(importCode.trim());
      if (!data.salary || !data.months) throw new Error("Format invalide");
      onImport(data);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch {
      setError("Code invalide ou corrompu. Vérifiez que vous avez tout copié.");
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as AppData;
        if (!data.salary || !data.months) throw new Error("Format invalide");
        onImport(data);
        setSuccess(true);
        setTimeout(onClose, 1500);
      } catch {
        setError("Fichier JSON invalide ou corrompu.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <ModalBox maxWidth="520px">
        <ModalHeader title="🔄 Synchroniser les données" onClose={onClose} />

        {success ? (
          <div className="py-10 px-5 text-center">
            <div className="text-5xl mb-3">✅</div>
            <div className="text-[1.1rem] font-bold text-success">
              Données importées avec succès !
            </div>
          </div>
        ) : (
          <>
            {/* Toggle export/import — plat */}
            <div className="flex gap-2 mb-6">
              {[
                { id: "export" as const, label: "📤 Exporter (ce appareil)" },
                {
                  id: "import" as const,
                  label: "📥 Importer (autre appareil)",
                },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-[0.82rem] font-semibold cursor-pointer transition-colors
                    ${tab === t.id ? "bg-primary text-white" : "bg-surface-soft text-text-muted hover:text-text"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "export" && (
              <div className="flex flex-col gap-4">
                <p className="text-text-muted text-[0.88rem] leading-relaxed">
                  Copiez ce code sur votre autre appareil, ou téléchargez le
                  fichier de sauvegarde JSON.
                </p>
                <div className="input-group !mb-0">
                  <label className="input-label">Code de synchronisation</label>
                  <textarea
                    id="export-code-area"
                    readOnly
                    value={exportCode}
                    className="w-full h-[100px] bg-surface rounded-[10px] py-2.5 px-3 text-text-muted font-mono text-[0.72rem] resize-none"
                    style={{ lineBreak: "anywhere" }}
                  />
                </div>
                <div className="flex gap-2.5">
                  <button
                    className="btn btn-primary flex-1"
                    onClick={handleCopyCode}
                  >
                    {copied ? "✅ Copié !" : "📋 Copier le code"}
                  </button>
                  <button
                    className="btn btn-secondary flex-1"
                    onClick={handleDownloadJSON}
                  >
                    💾 Télécharger .json
                  </button>
                </div>
              </div>
            )}

            {tab === "import" && (
              <div className="flex flex-col gap-4">
                <p className="text-text-muted text-[0.88rem] leading-relaxed">
                  Collez le code copié depuis l'autre appareil, ou importez un
                  fichier .json.
                </p>
                <div className="input-group !mb-0">
                  <label className="input-label">Coller le code ici</label>
                  <textarea
                    value={importCode}
                    onChange={(e) => {
                      setImportCode(e.target.value);
                      setError("");
                    }}
                    placeholder="Collez le code de synchronisation…"
                    className={`w-full h-[100px] bg-surface rounded-[10px] py-2.5 px-3 text-text font-mono text-[0.72rem] resize-none outline-none border-[1.5px] transition-colors
                      ${error ? "border-danger" : "border-transparent focus:border-primary"}`}
                    style={{ lineBreak: "anywhere" }}
                  />
                  {error && (
                    <div className="text-danger text-[0.82rem] mt-1.5">
                      ⚠️ {error}
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleImportCode}
                  disabled={!importCode.trim()}
                  style={{ opacity: importCode.trim() ? 1 : 0.5 }}
                >
                  📥 Importer depuis le code
                </button>
                <div className="flex items-center gap-2.5 text-text-muted text-[0.82rem]">
                  <div className="flex-1 h-px bg-border" />
                  ou
                  <div className="flex-1 h-px bg-border" />
                </div>
                <label className="btn btn-secondary text-center cursor-pointer block">
                  📂 Importer un fichier .json
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                </label>
                {/* Avertissement — reste bordé, c'est un signal important */}
                <div className="bg-danger/[0.06] border border-danger/20 rounded-[10px] py-2.5 px-3.5 text-[0.8rem] text-text-muted">
                  ⚠️ L'import <strong className="text-text">remplace</strong>{" "}
                  toutes les données actuelles de cet appareil.
                </div>
              </div>
            )}
          </>
        )}
      </ModalBox>
    </ModalOverlay>
  );
}
