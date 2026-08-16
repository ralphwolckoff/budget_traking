import { useState } from 'react'
import type { AppData } from '../../types.ts'

function encode(data: AppData): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))))
}
function decode(str: string): AppData {
  return JSON.parse(decodeURIComponent(escape(atob(str)))) as AppData
}

interface Props {
  appData: AppData
  onImport: (data: AppData) => void
  onClose: () => void
}

export default function SyncModal({ appData, onImport, onClose }: Props) {
  const [tab,        setTab]        = useState<'export' | 'import'>('export')
  const [importCode, setImportCode] = useState('')
  const [error,      setError]      = useState('')
  const [copied,     setCopied]     = useState(false)
  const [success,    setSuccess]    = useState(false)

  const exportCode = encode(appData)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(exportCode)
      setCopied(true); setTimeout(() => setCopied(false), 2500)
    } catch {
      (document.getElementById('export-code-area') as HTMLTextAreaElement | null)?.select()
    }
  }

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `budget-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  const handleImportCode = () => {
    setError('')
    try {
      const data = decode(importCode.trim())
      if (!data.salary || !data.months) throw new Error('Format invalide')
      onImport(data); setSuccess(true); setTimeout(onClose, 1500)
    } catch { setError('Code invalide ou corrompu. Vérifiez que vous avez tout copié.') }
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as AppData
        if (!data.salary || !data.months) throw new Error('Format invalide')
        onImport(data); setSuccess(true); setTimeout(onClose, 1500)
      } catch { setError('Fichier JSON invalide ou corrompu.') }
    }
    reader.readAsText(file)
  }

  const textareaStyle: React.CSSProperties = {
    width: '100%', height: 100, background: 'var(--dark)',
    border: '1.5px solid var(--border)', borderRadius: 10,
    padding: '10px 12px', color: 'var(--text-muted)',
    fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem',
    resize: 'none', lineBreak: 'anywhere' as const,
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔄 Synchroniser les données</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {success ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>Données importées avec succès !</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {[
                { id: 'export' as const, label: '📤 Exporter (ce appareil)' },
                { id: 'import' as const, label: '📥 Importer (autre appareil)' },
              ].map(t => (
                <button key={t.id} className={`toggle-btn ${tab === t.id ? 'active' : ''}`}
                  style={{ flex: 1, fontSize: '0.82rem' }} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'export' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                  Copiez ce code sur votre autre appareil, ou téléchargez le fichier de sauvegarde JSON.
                </p>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Code de synchronisation</label>
                  <textarea id="export-code-area" readOnly value={exportCode} style={textareaStyle} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary"   style={{ flex: 1 }} onClick={handleCopyCode}>{copied ? '✅ Copié !' : '📋 Copier le code'}</button>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleDownloadJSON}>💾 Télécharger .json</button>
                </div>
              </div>
            )}

            {tab === 'import' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                  Collez le code copié depuis l'autre appareil, ou importez un fichier .json.
                </p>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Coller le code ici</label>
                  <textarea
                    value={importCode}
                    onChange={e => { setImportCode(e.target.value); setError('') }}
                    placeholder="Collez le code de synchronisation…"
                    style={{ ...textareaStyle, color: 'var(--text)', border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border)'}` }}
                  />
                  {error && <div style={{ color: 'var(--danger)', fontSize: '0.82rem', marginTop: 6 }}>⚠️ {error}</div>}
                </div>
                <button className="btn btn-primary" onClick={handleImportCode} disabled={!importCode.trim()} style={{ opacity: importCode.trim() ? 1 : 0.5 }}>
                  📥 Importer depuis le code
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />ou<div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>
                <label className="btn btn-secondary" style={{ textAlign: 'center', cursor: 'pointer', display: 'block' }}>
                  📂 Importer un fichier .json
                  <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
                </label>
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ⚠️ L'import <strong>remplace</strong> toutes les données actuelles de cet appareil.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
