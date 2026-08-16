import { useState } from "react";
import { authAPI } from "../storage";
import type { CurrentUser } from "../types";

/* ── Field ─────────────────────────────────────────────────────────────────── */
interface FieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  onEnter?: () => void;
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  hint,
  onEnter,
}: FieldProps) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  return (
    <div className="acc-field">
      <label className="acc-field-label">{label}</label>
      <div className="acc-field-wrap">
        <input
          className="acc-field-input"
          type={isPass && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          autoComplete={isPass ? "new-password" : "off"}
        />
        {isPass && (
          <button
            className="login-eye"
            onClick={() => setShow((v) => !v)}
            type="button"
          >
            {show ? "🙈" : "👁️"}
          </button>
        )}
      </div>
      {hint && <div className="acc-field-hint">{hint}</div>}
    </div>
  );
}

function Feedback({ error, ok }: { error: string; ok: string }) {
  if (!error && !ok) return null;
  return (
    <div className={`acc-feedback ${error ? "error" : "ok"}`}>
      {error ? `⚠️ ${error}` : `✓ ${ok}`}
    </div>
  );
}

interface Props {
  username: string;
  currentUser: CurrentUser; // ← ajout pour accéder au token JWT
  onLogout: () => void;
  onUsernameChanged: (newUsername: string) => void;
}

export default function AccountPage({
  username,
  currentUser,
  onLogout,
  onUsernameChanged,
}: Props) {
  const [section, setSection] = useState("info");
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const reset = (s: string) => {
    setSection(s);
    setError("");
    setOk("");
    setForm({});
  };

  const initial = username?.[0]?.toUpperCase() ?? "?";
  const colors = [
    "#0EA5E9",
    "#6366F1",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
  ];
  const color = colors[username?.charCodeAt(0) % colors.length];

  const handleChangePassword = async () => {
    setError("");
    setOk("");
    if (!form.oldPwd || !form.newPwd || !form.confirmPwd) {
      setError("Tous les champs sont requis");
      return;
    }
    if (form.newPwd !== form.confirmPwd) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (form.newPwd.length < 4) {
      setError("Minimum 4 caractères");
      return;
    }
    setLoading(true);
    const r = await authAPI.changePassword(
      username,
      form.oldPwd,
      form.newPwd,
      currentUser.token,
    );
    setLoading(false);
    if (r.success) {
      setOk("Mot de passe modifié avec succès");
      setForm({});
    } else setError(r.error ?? "Erreur inconnue");
  };

  const handleChangeUsername = async () => {
    setError("");
    setOk("");
    if (!form.newUsername || !form.pwd) {
      setError("Tous les champs sont requis");
      return;
    }
    setLoading(true);
    const r = await authAPI.changeUsername(
      username,
      form.pwd,
      form.newUsername,
      currentUser.token,
    );
    setLoading(false);
    if (r.success && r.username) {
      setOk("Nom modifié. Reconnexion dans 2s…");
      setTimeout(() => onUsernameChanged(r.username!), 2000);
    } else setError(r.error ?? "Erreur inconnue");
  };

  const handleDelete = async () => {
    setError("");
    setOk("");
    if (!form.confirmDelete || !form.pwd) {
      setError("Tous les champs sont requis");
      return;
    }
    if (form.confirmDelete !== username) {
      setError("Tapez exactement votre nom d'utilisateur");
      return;
    }
    setLoading(true);
    const r = await authAPI.deleteAccount(
      username,
      form.pwd,
      currentUser.token,
    );
    setLoading(false);
    if (r.success) onLogout();
    else setError(r.error ?? "Erreur inconnue");
  };

  const SECTIONS = [
    { id: "info", icon: "⊙", label: "Informations" },
    { id: "password", icon: "🔑", label: "Mot de passe" },
    { id: "username", icon: "✏️", label: "Nom d'utilisateur" },
    { id: "delete", icon: "🗑️", label: "Supprimer le compte" },
  ];

  return (
    <div className="acc-page">
      <div className="acc-hero">
        <div
          className="acc-avatar-big"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}aa)`,
          }}
        >
          {initial}
        </div>
        <div className="acc-hero-info">
          <h1 className="acc-hero-name">{username}</h1>
          <span className="acc-hero-role">Compte · Budget Tracker</span>
        </div>
        <button className="btn btn-secondary acc-logout-btn" onClick={onLogout}>
          ⎋ Se déconnecter
        </button>
      </div>

      <div className="acc-layout">
        <nav className="acc-nav">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`acc-nav-item ${section === s.id ? "active" : ""} ${s.id === "delete" ? "danger" : ""}`}
              onClick={() => reset(s.id)}
            >
              <span className="acc-nav-icon">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        <div className="acc-content">
          {section === "info" && (
            <div className="acc-section">
              <h2 className="acc-section-title">Informations du compte</h2>
              <div className="acc-info-grid">
                <div className="acc-info-row">
                  <span className="acc-info-key">Nom d'utilisateur</span>
                  <span className="acc-info-val">{username}</span>
                </div>
                <div className="acc-info-row">
                  <span className="acc-info-key">Mode</span>
                  <span className="acc-info-val">
                    {currentUser.token ? "Connecté (API)" : "Local (Electron)"}
                  </span>
                </div>
                <div className="acc-info-row">
                  <span className="acc-info-key">Authentification</span>
                  <span className="acc-info-val">PBKDF2-SHA512</span>
                </div>
              </div>
            </div>
          )}

          {section === "password" && (
            <div className="acc-section">
              <h2 className="acc-section-title">Modifier le mot de passe</h2>
              <div className="acc-form">
                <Field
                  label="Mot de passe actuel"
                  type="password"
                  value={form.oldPwd || ""}
                  onChange={(v) => set("oldPwd", v)}
                />
                <Field
                  label="Nouveau mot de passe"
                  type="password"
                  value={form.newPwd || ""}
                  onChange={(v) => set("newPwd", v)}
                  hint="Minimum 4 caractères"
                />
                <Field
                  label="Confirmer le nouveau mot de passe"
                  type="password"
                  value={form.confirmPwd || ""}
                  onChange={(v) => set("confirmPwd", v)}
                  onEnter={handleChangePassword}
                />
                <Feedback error={error} ok={ok} />
                <button
                  className="btn btn-primary"
                  onClick={handleChangePassword}
                  disabled={loading}
                >
                  {loading ? "…" : "🔑 Modifier le mot de passe"}
                </button>
              </div>
            </div>
          )}

          {section === "username" && (
            <div className="acc-section">
              <h2 className="acc-section-title">
                Modifier le nom d'utilisateur
              </h2>
              <div className="acc-form">
                <div className="acc-warning">
                  ⚠️ Vous serez déconnecté automatiquement après la
                  modification.
                </div>
                <Field
                  label="Nouveau nom d'utilisateur"
                  type="text"
                  value={form.newUsername || ""}
                  onChange={(v) => set("newUsername", v)}
                  hint="Lettres, chiffres, _ et -"
                />
                <Field
                  label="Confirmez avec votre mot de passe"
                  type="password"
                  value={form.pwd || ""}
                  onChange={(v) => set("pwd", v)}
                  onEnter={handleChangeUsername}
                />
                <Feedback error={error} ok={ok} />
                <button
                  className="btn btn-primary"
                  onClick={handleChangeUsername}
                  disabled={loading}
                >
                  {loading ? "…" : "✏️ Modifier le nom"}
                </button>
              </div>
            </div>
          )}

          {section === "delete" && (
            <div className="acc-section">
              <h2
                className="acc-section-title"
                style={{ color: "var(--danger)" }}
              >
                Supprimer le compte
              </h2>
              <div className="acc-form">
                <div className="acc-danger-note">
                  🚨 Cette action est <strong>irréversible</strong>. Toutes vos
                  données seront supprimées définitivement.
                </div>
                <Field
                  label={`Tapez "${username}" pour confirmer`}
                  type="text"
                  value={form.confirmDelete || ""}
                  onChange={(v) => set("confirmDelete", v)}
                />
                <Field
                  label="Votre mot de passe"
                  type="password"
                  value={form.pwd || ""}
                  onChange={(v) => set("pwd", v)}
                  onEnter={handleDelete}
                />
                <Feedback error={error} ok={ok} />
                <button
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? "…" : "🗑️ Supprimer définitivement"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
