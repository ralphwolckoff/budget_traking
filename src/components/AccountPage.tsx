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
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.83rem] font-bold text-text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          className="w-full py-2.5 px-3.5 bg-surface border-[1.5px] border-border rounded-[9px] text-text text-[0.9rem] transition-colors outline-none focus:border-primary"
          type={isPass && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          autoComplete={isPass ? "new-password" : "off"}
        />
        {isPass && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-base opacity-50 hover:opacity-100 p-1"
          >
            {show ? "🙈" : "👁️"}
          </button>
        )}
      </div>
      {hint && <div className="text-[0.72rem] text-text-muted">{hint}</div>}
    </div>
  );
}

function Feedback({ error, ok }: { error: string; ok: string }) {
  if (!error && !ok) return null;
  return (
    <div
      className={`py-2.5 px-3.5 rounded-lg text-[0.83rem] font-semibold ${error ? "bg-danger/10 border border-danger/25 text-danger" : "bg-success/10 border border-success/25 text-success"}`}
    >
      {error ? `⚠️ ${error}` : `✓ ${ok}`}
    </div>
  );
}

interface Props {
  username: string;
  currentUser: CurrentUser;
  onLogout: () => void;
  onUsernameChanged: (newUsername: string) => void;
}

const SECTIONS = [
  { id: "info", icon: "⊙", label: "Informations" },
  { id: "password", icon: "🔑", label: "Mot de passe" },
  { id: "username", icon: "✏️", label: "Nom d'utilisateur" },
  { id: "delete", icon: "🗑️", label: "Supprimer le compte" },
];

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

  return (
    <div className="max-w-[860px]">
      <div className="flex items-center gap-[18px] py-6 px-7 rounded-2xl bg-surface-soft border border-border mb-6 flex-wrap">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-[1.4rem] font-extrabold text-white flex-shrink-0 shadow-[0_4px_14px_rgba(0,0,0,0.2)]"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}aa)`,
          }}
        >
          {initial}
        </div>
        <div className="flex-1">
          <h1 className="text-[1.25rem] font-extrabold text-text mb-[3px]">
            {username}
          </h1>
          <span className="text-[0.8rem] text-text-muted">
            Compte · BuildStack Budget
          </span>
        </div>
        <button className="btn btn-secondary flex-shrink-0" onClick={onLogout}>
          ⎋ Se déconnecter
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5">
        <nav className="flex flex-col gap-[3px]">
          {SECTIONS.map((s) => {
            const active = section === s.id;
            const danger = s.id === "delete";
            return (
              <button
                key={s.id}
                onClick={() => reset(s.id)}
                className={`flex items-center gap-[9px] py-2.5 px-3 rounded-[10px] border-none text-[0.87rem] font-semibold cursor-pointer transition-all text-left w-full
                  ${
                    danger
                      ? active
                        ? "bg-danger/10 text-danger"
                        : "text-danger hover:bg-danger/[0.08]"
                      : active
                        ? "bg-gradient-to-br from-primary/[0.12] to-primary/[0.04] text-primary"
                        : "bg-transparent text-text-muted hover:bg-surface-soft hover:text-text"
                  }`}
              >
                <span className="text-base w-5 text-center">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>

        <div>
          {section === "info" && (
            <div>
              <h2 className="text-[1.05rem] font-extrabold text-text mb-5 pb-3.5 border-b border-border">
                Informations du compte
              </h2>
              <div className="flex flex-col">
                {[
                  { key: "Nom d'utilisateur", val: username },
                  {
                    key: "Mode",
                    val: currentUser.token
                      ? "Connecté (API)"
                      : "Local (Electron)",
                  },
                  { key: "Authentification", val: "PBKDF2-SHA512" },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-baseline gap-4 py-3.5 border-b border-border last:border-b-0"
                  >
                    <span className="text-[0.85rem] text-text-muted font-medium flex-shrink-0">
                      {row.key}
                    </span>
                    <span className="text-[0.85rem] text-text font-semibold text-right font-mono break-all">
                      {row.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === "password" && (
            <div>
              <h2 className="text-[1.05rem] font-extrabold text-text mb-5 pb-3.5 border-b border-border">
                Modifier le mot de passe
              </h2>
              <div className="flex flex-col gap-4 max-w-[420px]">
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
            <div>
              <h2 className="text-[1.05rem] font-extrabold text-text mb-5 pb-3.5 border-b border-border">
                Modifier le nom d'utilisateur
              </h2>
              <div className="flex flex-col gap-4 max-w-[420px]">
                <div className="py-2.5 px-3.5 rounded-[9px] bg-warning/10 border border-warning/25 text-warning text-[0.83rem] font-semibold">
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
            <div>
              <h2 className="text-[1.05rem] font-extrabold text-danger mb-5 pb-3.5 border-b border-border">
                Supprimer le compte
              </h2>
              <div className="flex flex-col gap-4 max-w-[420px]">
                <div className="py-2.5 px-3.5 rounded-[9px] bg-danger/10 border border-danger/25 text-danger text-[0.83rem] font-semibold">
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
