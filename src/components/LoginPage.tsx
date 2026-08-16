import { useState, useEffect } from "react";
import { authAPI } from "../storage";

interface Props {
  onLogin: (username: string, token: string | null) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [users, setUsers] = useState<string[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authAPI
      .listUsers()
      .then(setUsers)
      .catch(() => {});
    authAPI
      .getLastUser()
      .then((last) => {
        if (last) setUsername(last);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    if (mode === "register" && password.length < 4) {
      setError("Le mot de passe doit contenir au moins 4 caractères");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await authAPI.login(username.trim(), password)
          : await authAPI.register(username.trim(), password);
      if (result.success && result.username) {
        await authAPI.setLastUser(result.username);
        onLogin(result.username, result.token ?? null);
      } else {
        setError(
          result.error ||
            (mode === "login"
              ? "Identifiants incorrects"
              : "Impossible de créer le compte"),
        );
      }
    } catch {
      setError("Connexion au serveur impossible");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-surface">
      {/* ── Panneau gauche : formulaire ── */}
      <div className="flex-none w-full md:w-[520px] flex items-center justify-center p-8 md:p-14 bg-white dark:bg-surface">
        <div className="w-full max-w-[380px]">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <img
              src="/buildstack-logo.svg"
              alt="BuildStack"
              className="w-11 h-11"
            />
            <div className="flex flex-col">
              <span className="text-[1.1rem] font-extrabold text-[#0F172A] dark:text-text tracking-tight">
                BuildStack Budget
              </span>
              <span className="text-[0.68rem] text-[#94A3B8] dark:text-text-muted font-medium">
                Gestion financière
              </span>
            </div>
          </div>

          <h1 className="text-[1.35rem] font-extrabold text-[#0F172A] dark:text-text mb-6 tracking-tight leading-snug">
            {mode === "login"
              ? "Contenu heureux de vous revoir"
              : "Créez votre compte"}
          </h1>

          {/* Comptes existants */}
          {users.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {users.map((u) => (
                <button
                  key={u}
                  onClick={() => setUsername(u)}
                  className={`flex items-center gap-1.5 py-1.5 pl-1.5 pr-3 rounded-full border-[1.5px] text-[0.82rem] font-semibold cursor-pointer transition-all
                    ${
                      username === u
                        ? "border-primary text-primary bg-primary/[0.06]"
                        : "border-[#E2E8F0] dark:border-border bg-[#F8FAFC] dark:bg-surface text-[#475569] dark:text-text-muted hover:border-primary hover:text-primary"
                    }`}
                >
                  <span className="w-[22px] h-[22px] rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[0.72rem] font-extrabold text-white">
                    {u[0]?.toUpperCase()}
                  </span>
                  {u}
                </button>
              ))}
            </div>
          )}

          {/* Champs */}
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-semibold text-[#374151] dark:text-text-muted">
                Nom d'utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKey}
                placeholder="Ex: audrey"
                className="w-full py-[11px] px-3.5 rounded-lg border-[1.5px] border-[#D1D5DB] dark:border-border text-[0.92rem] text-[#0F172A] dark:text-text bg-white dark:bg-surface transition-colors outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-semibold text-[#374151] dark:text-text-muted">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyDown={handleKey}
                  placeholder="••••••••"
                  className="w-full py-[11px] pl-3.5 pr-11 rounded-lg border-[1.5px] border-[#D1D5DB] dark:border-border text-[0.92rem] text-[#0F172A] dark:text-text bg-white dark:bg-surface transition-colors outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-base opacity-50 hover:opacity-100 p-1"
                >
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
              {mode === "register" && (
                <span className="text-[0.72rem] text-[#9CA3AF] dark:text-text-muted">
                  Au moins 4 caractères
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 py-2.5 px-3.5 mb-3.5 rounded-lg bg-[#FEF2F2] dark:bg-danger/10 border border-[#FECACA] dark:border-danger/25 text-[#DC2626] dark:text-danger text-[0.83rem] font-semibold">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-[13px] bg-[#0F172A] dark:bg-primary hover:bg-[#1E293B] dark:hover:bg-primary-dark border-none rounded-lg text-white text-[0.95rem] font-bold cursor-pointer transition-colors flex items-center justify-center min-h-[48px] mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-[18px] h-[18px] border-[2.5px] border-white/30 border-t-white rounded-full animate-spin inline-block" />
            ) : mode === "login" ? (
              "Se connecter"
            ) : (
              "Créer le compte"
            )}
          </button>

          <div className="text-center text-[0.85rem] text-[#6B7280] dark:text-text-muted mb-6">
            {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <button
              onClick={() => {
                setMode((m) => (m === "login" ? "register" : "login"));
                setError("");
              }}
              className="bg-transparent border-none text-primary font-semibold cursor-pointer p-0 text-[0.85rem] hover:underline"
            >
              {mode === "login" ? "Créer un compte" : "Se connecter"}
            </button>
          </div>

          <div className="text-center text-[0.75rem] text-[#9CA3AF] dark:text-text-muted leading-relaxed">
            Vos données sont stockées localement et synchronisées de façon
            sécurisée.
          </div>
        </div>
      </div>

      {/* ── Panneau droit : illustration (masqué sur mobile) ── */}
      <div className="hidden md:flex flex-1 relative overflow-hidden items-center justify-center bg-gradient-to-br from-bs-navy via-bs-navy-mid to-bs-navy">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(0,0,0,0.18) 0%, transparent 50%)",
          }}
        />

        <div className="relative z-10 p-10 text-center max-w-[480px]">
          <div className="relative mb-8 bg-white/[0.08] rounded-2xl p-6 border border-white/15 backdrop-blur-sm shadow-[0_16px_48px_rgba(0,0,0,0.25)]">
            <img
              src="/buildstack-logo.svg"
              alt=""
              className="w-24 h-24 mx-auto"
            />
          </div>
          <h2 className="text-[1.6rem] font-extrabold text-white leading-snug mb-3 [text-shadow:0_2px_12px_rgba(0,0,0,0.2)]">
            Gardez le contrôle de votre budget
          </h2>
          <p className="text-[0.9rem] text-white/85 leading-relaxed mb-6">
            Suivi des dépenses, prévisions, investissements et dépenses
            récurrentes — tout au même endroit, avec vos données protégées.
          </p>
        </div>
      </div>
    </div>
  );
}
