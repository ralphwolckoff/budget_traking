import { useState } from 'react'
import { authAPI } from '../../storage.ts'

type Panel = 'info' | 'password' | 'username' | 'delete'

// ── UserField ─────────────────────────────────────────────────────────────────
interface UserFieldProps {
  label:    string
  type?:    string
  value:    string
  onChange: (v: string) => void
  hint?:    string
  onEnter?: () => void
}

function UserField({ label, type = 'text', value, onChange, hint, onEnter }: UserFieldProps) {
  const [show, setShow] = useState(false)
  const isPass = type === 'password'
  return (
    <div className="user-field">
      <label className="user-field-label">{label}</label>
      <div className="user-field-wrap">
        <input
          className="user-field-input"
          type={isPass && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
          autoComplete={isPass ? 'new-password' : 'off'}
        />
        {isPass && (
          <button className="login-eye" onClick={() => setShow(v => !v)} type="button">
            {show ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {hint && <div className="user-field-hint">{hint}</div>}
    </div>
  )
}

// ── FeedbackBar ───────────────────────────────────────────────────────────────
interface FeedbackProps { error: string; ok: string }

function FeedbackBar({ error, ok }: FeedbackProps) {
  if (!error && !ok) return null
  return (
    <div className={`user-feedback ${error ? 'error' : 'ok'}`}>
      {error ? `⚠️ ${error}` : `✓ ${ok}`}
    </div>
  )
}

// ── UserModal ─────────────────────────────────────────────────────────────────
interface Props {
  username:          string
  initialPanel?:     Panel
  onClose:           () => void
  onLogout:          () => void
  onUsernameChanged: (newUsername: string) => void
}

export default function UserModal({ username, initialPanel = 'info', onClose, onLogout, onUsernameChanged }: Props) {
  const [panel,   setPanel]   = useState<Panel>(initialPanel)
  const [form,    setForm]    = useState<Record<string, string>>({})
  const [error,   setError]   = useState('')
  const [ok,      setOk]      = useState('')
  const [loading, setLoading] = useState(false)

  const set   = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const reset = (p: Panel) => { setPanel(p); setError(''); setOk(''); setForm({}) }

  const handleChangePassword = async () => {
    setError(''); setOk('')
    if (!form.oldPwd || !form.newPwd || !form.confirmPwd) { setError('Tous les champs sont requis'); return }
    if (form.newPwd !== form.confirmPwd) { setError('Les nouveaux mots de passe ne correspondent pas'); return }
    if (form.newPwd.length < 4) { setError('Minimum 4 caractères'); return }
    setLoading(true)
    const r = await authAPI.changePassword(username, form.oldPwd, form.newPwd)
    setLoading(false)
    if (r.success) { setOk('Mot de passe modifié avec succès ✓'); setForm({}) }
    else setError(r.error ?? 'Erreur')
  }

  const handleChangeUsername = async () => {
    setError(''); setOk('')
    if (!form.newUsername || !form.pwd) { setError('Tous les champs sont requis'); return }
    setLoading(true)
    const r = await authAPI.changeUsername(username, form.pwd, form.newUsername)
    setLoading(false)
    if (r.success) {
      setOk("Nom d'utilisateur modifié. Reconnexion requise…")
      setTimeout(() => onUsernameChanged(r.username!), 1800)
    } else setError(r.error ?? 'Erreur')
  }

  const handleDelete = async () => {
    setError(''); setOk('')
    if (!form.confirmDelete || !form.pwd) { setError('Tous les champs sont requis'); return }
    if (form.confirmDelete !== username) { setError("Tapez exactement votre nom d'utilisateur pour confirmer"); return }
    setLoading(true)
    const r = await authAPI.deleteAccount(username, form.pwd)
    setLoading(false)
    if (r.success) onLogout()
    else setError(r.error ?? 'Erreur')
  }

  const initial = username ? username[0].toUpperCase() : '?'

  const TABS: { id: Panel; icon: string; label: string }[] = [
    { id: 'info',     icon: 'ℹ️', label: 'Informations'      },
    { id: 'password', icon: '🔑', label: 'Mot de passe'      },
    { id: 'username', icon: '✏️', label: 'Nom utilisateur'   },
    { id: 'delete',   icon: '🗑️', label: 'Supprimer compte'  },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal user-modal" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-title">👤 Mon compte</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="user-modal-body">
          <div className="user-modal-profile">
            <div className="user-modal-avatar">{initial}</div>
            <div className="user-modal-info">
              <div className="user-modal-name">{username}</div>
              <div className="user-modal-role">Utilisateur local</div>
            </div>
          </div>

          <div className="user-modal-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`user-modal-tab ${panel === t.id ? 'active' : ''} ${t.id === 'delete' ? 'danger-tab' : ''}`}
                onClick={() => reset(t.id)}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          <div className="user-modal-panel">

            {panel === 'info' && (
              <div className="user-info-rows">
                <div className="user-info-row"><span className="user-info-key">Nom d'utilisateur</span><span className="user-info-val">{username}</span></div>
                <div className="user-info-row"><span className="user-info-key">Stockage des données</span><span className="user-info-val">Documents/BudgetTracker-Data/users/</span></div>
                <div className="user-info-row"><span className="user-info-key">Fichier de données</span><span className="user-info-val">{username}.json</span></div>
                <div className="user-info-row"><span className="user-info-key">Authentification</span><span className="user-info-val">PBKDF2-SHA512 (local)</span></div>
              </div>
            )}

            {panel === 'password' && (
              <div className="user-form">
                <UserField label="Mot de passe actuel"              type="password" value={form.oldPwd     ?? ''} onChange={v => set('oldPwd', v)} />
                <UserField label="Nouveau mot de passe"             type="password" value={form.newPwd     ?? ''} onChange={v => set('newPwd', v)} hint="Minimum 4 caractères" />
                <UserField label="Confirmer le nouveau mot de passe" type="password" value={form.confirmPwd ?? ''} onChange={v => set('confirmPwd', v)} onEnter={handleChangePassword} />
                <FeedbackBar error={error} ok={ok} />
                <button className="btn btn-primary" onClick={handleChangePassword} disabled={loading}>
                  {loading ? '…' : '🔑 Modifier le mot de passe'}
                </button>
              </div>
            )}

            {panel === 'username' && (
              <div className="user-form">
                <div className="user-form-note">⚠️ Changer votre nom d'utilisateur vous déconnectera automatiquement.</div>
                <UserField label="Nouveau nom d'utilisateur"         type="text"     value={form.newUsername ?? ''} onChange={v => set('newUsername', v)} hint="Lettres, chiffres, _ et -" />
                <UserField label="Confirmez avec votre mot de passe"  type="password" value={form.pwd         ?? ''} onChange={v => set('pwd', v)} onEnter={handleChangeUsername} />
                <FeedbackBar error={error} ok={ok} />
                <button className="btn btn-primary" onClick={handleChangeUsername} disabled={loading}>
                  {loading ? '…' : '✏️ Modifier le nom'}
                </button>
              </div>
            )}

            {panel === 'delete' && (
              <div className="user-form">
                <div className="user-form-danger-note">🚨 Cette action est <strong>irréversible</strong>. Toutes vos données seront supprimées.</div>
                <UserField label={`Tapez "${username}" pour confirmer`} type="text"     value={form.confirmDelete ?? ''} onChange={v => set('confirmDelete', v)} />
                <UserField label="Votre mot de passe"                   type="password" value={form.pwd           ?? ''} onChange={v => set('pwd', v)} onEnter={handleDelete} />
                <FeedbackBar error={error} ok={ok} />
                <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>
                  {loading ? '…' : '🗑️ Supprimer définitivement'}
                </button>
              </div>
            )}
          </div>

          <div className="user-modal-footer">
            <button className="btn btn-secondary" onClick={onLogout}>⎋ Se déconnecter</button>
            <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
          </div>
        </div>
      </div>
    </div>
  )
}
