import { useState, useEffect, useCallback, useRef } from "react";
import {
  resolveMonthSettings,
  resolveMonthInvestments,
  generateRecurringExpenses,
  AppData,
  CurrentUser,
  Expense,
  PageId,
} from "./lib/types";

import DashboardPage from "./features/dashboard/DashboardPage";
import DepensesPage from "./features/expenses/DepensesPage";
import VisuPage from "./features/visualization/VisuPage";
import MonthPaginator from "./shell/MonthPaginator";

import {
  EditSettingsModal,
  ConfirmModal,
  NewMonthModal,
} from "./shared/Modals";
import InstallBanner from "./shell/InstallBanner";
import CategoryBudgetsModal from "./features/expenses/Categorybudgetsmodal";
import PageHeader from "./shell/Pageheader";
import Sidebar from "./shell/Sidebar";
import ReportsModal from "./shared/Reportsmodal";
import SearchModal from "./shared/Searchmodal";
import BottomNav from "./shell/BottomNav";
import AccountPage from "./features/account/AccountPage";
import LoginPage from "./features/account/LoginPage";
import ForecastPage from "./features/forecast/ForecastPage";
import GoalsPage from "./features/goals/Goalspage";
import HistoryPage from "./features/history/HistoryPage";
import InvestmentsPage from "./features/investments/Investmentspage";
import RecurringPage from "./features/recurring/Recurringpage";
import { getMonthKey, nextMonthKey, getMonthLabel } from "./lib/constants";
import {
  remoteAPI,
  flushQueue,
  createStorage,
  session,
  authEvents,
} from "./lib/storage";
import SyncModal from "./shell/SidebarSyncModal";
import SplashScreen from "./shell/SplashScreen";
import NotificationCenter from "./shell/Notificationcenter";
import ImportCsvModal from "./features/expenses/Importcsvmodal";

const IS_ELECTRON = Boolean(window.electronAPI);
// BottomNav visible uniquement sur mobile (écran < 768px) et hors Electron
const IS_MOBILE = !IS_ELECTRON && window.innerWidth < 768;

interface ConfirmAction {
  message: string;
  onConfirm: () => void;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [appData, setAppData] = useState<AppData | null>(null);
  const storageRef = useRef<ReturnType<typeof createStorage> | null>(null);

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [pageHistory, setPageHistory] = useState<PageId[]>([]);
  const [viewMonth, setViewMonth] = useState(getMonthKey());
  const [highlightedExpenseId, setHighlightedExpenseId] = useState<
    number | string | null
  >(null);
  const [sidebarOpen, setSidebarOpen] = useState(!IS_MOBILE); // fermé par défaut sur mobile
  const [theme, setTheme] = useState(
    () => localStorage.getItem("bt-theme") ?? "dark",
  );
  const [isMobile, setIsMobile] = useState(
    !IS_ELECTRON && window.innerWidth < 768,
  );

  // ── Popup / Modales ───────────────────────────────────────────────────────
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showNewMonth, setShowNewMonth] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const [recurringNotice, setRecurringNotice] = useState<string | null>(null);
  const recurringCheckedRef = useRef(false);
  const [showCatBudgets, setShowCatBudgets] = useState<boolean>(false);
  const currentMonthKey = getMonthKey();
  const isCurrentMonth = viewMonth === currentMonthKey;
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const [showImportCsv, setShowImportCsv] = useState(false);

  useEffect(() => {
    const handler = () => setSessionExpiredNotice(true);
    authEvents.addEventListener("expired", handler);
    return () => authEvents.removeEventListener("expired", handler);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("bt-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (IS_ELECTRON) return;
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // ── Génération automatique des dépenses récurrentes pour le mois en cours ──
  // Se déclenche une fois par session, dès que appData est chargé.
  useEffect(() => {
    if (!appData || recurringCheckedRef.current) return;
    recurringCheckedRef.current = true;

    const result = generateRecurringExpenses(appData, currentMonthKey);
    if (result.addedCount > 0) {
      setAppData(result.data);
      const label =
        result.addedCount === 1
          ? `1 dépense récurrente ajoutée : ${result.addedLabels[0]}`
          : `${result.addedCount} dépenses récurrentes ajoutées`;
      setRecurringNotice(label);
      setTimeout(() => setRecurringNotice(null), 6000);

      if (!IS_ELECTRON && currentUser?.token) {
        const token = currentUser.token;

        // Pousse chaque dépense générée (potentiellement sur plusieurs mois)
        for (const { monthKey, expense } of result.addedExpenses) {
          remoteAPI
            .addExpense(token, monthKey, {
              amount: expense.amount,
              description: expense.description,
              category: expense.category,
              date: expense.date,
            })
            .catch(() => {});
        }

        // Persiste lastGeneratedMonth pour chaque récurrente touchée —
        // sinon les dépenses sont régénérées à chaque rechargement
        const touchedIds = new Set(
          result.addedExpenses.map((a) => a.expense.recurringId),
        );
        for (const id of touchedIds) {
          const r = result.data.recurringExpenses?.[id as string];
          if (r) {
            remoteAPI
              .saveRecurring(token, id as string, {
                description: r.description,
                category: r.category,
                amount: r.amount,
                dayOfMonth: r.dayOfMonth,
                active: r.active,
                startMonth: r.startMonth,
                endMonth: r.endMonth,
                lastGeneratedMonth: r.lastGeneratedMonth,
                notes: r.notes,
              })
              .catch(() => {});
          }
        }
      }
    }
  }, [appData, currentMonthKey, currentUser]);

  // ── Flush queue au login et toutes les 60s ──────────────────────────────────
  useEffect(() => {
    if (IS_ELECTRON || !currentUser?.token) return;
    const remap = (tempId: string | number, dbId: string) => {
      setAppData((prev) => {
        if (!prev) return prev;
        const d = JSON.parse(JSON.stringify(prev)) as typeof prev;
        Object.keys(d.months).forEach((mk) => {
          d.months[mk] = d.months[mk].map((e: any) =>
            String(e.id) === String(tempId) ? { ...e, id: dbId } : e,
          );
        });
        return d;
      });
    };
    flushQueue(remap);
    const iv = setInterval(() => flushQueue(remap), 60_000);
    return () => clearInterval(iv);
  }, [currentUser?.token]);

  // ── Login / Logout ────────────────────────────────────────────────────────
  const handleLogin = useCallback(
    async (username: string, token: string | null) => {
      const s = createStorage(username, token);
      storageRef.current = s;
      setCurrentUser({ username, token });
      setSessionExpiredNotice(false);
      if (!IS_ELECTRON) session.save(username, token); // ← persiste la session
      const data = await s.load();
      if (!data.carryOver) data.carryOver = {};
      if (!data.forecastItems) data.forecastItems = {};
      setAppData(data);
    },
    [],
  );

  // const handleImportCsvExpenses = (
  //   expenses: {
  //     amount: number;
  //     description: string;
  //     category: string;
  //     date: string;
  //   }[],
  // ) => {
  //   updateData((d) => {
  //     for (const exp of expenses) {
  //       const mk = exp.date.slice(0, 7); // "YYYY-MM"
  //       if (!d.months[mk]) d.months[mk] = [];
  //       d.months[mk].unshift({ id: Date.now() + Math.random(), ...exp });
  //     }
  //     return d;
  //   });

  //   if (!IS_ELECTRON && currentUser?.token) {
  //     const token = currentUser.token;
  //     expenses.forEach((exp) => {
  //       const mk = exp.date.slice(0, 7);
  //       remoteAPI.addExpense(token, mk, exp).catch(() => {});
  //     });
  //   }
  // };

  const navigateTo = useCallback((page: PageId) => {
    setActivePage((prev) => {
      if (prev !== page) setPageHistory((h) => [...h.slice(-9), prev]);
      return page;
    });
    setShowUserPopup(false);
  }, []);

  const navigateBack = useCallback(() => {
    setPageHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setActivePage(prev);
      return h.slice(0, -1);
    });
  }, []);

  const handleLogout = useCallback(() => {
    if (!IS_ELECTRON) session.clear(); // ← efface la session persistée
    setCurrentUser(null);
    setAppData(null);
    storageRef.current = null;
    setActivePage("dashboard");
    setPageHistory([]);
    setShowUserPopup(false);
    recurringCheckedRef.current = false;
  }, []);

  // ── Sauvegarde auto ───────────────────────────────────────────────────────
  useEffect(() => {
    if (appData && storageRef.current) storageRef.current.save(appData);
  }, [appData]);

  const updateData = useCallback((updater: (d: AppData) => AppData) => {
    setAppData((prev) =>
      prev ? updater(JSON.parse(JSON.stringify(prev))) : prev,
    );
  }, []);

  // ── Import depuis SyncModal (code/JSON) → push vers l'API ─────────────────
  const handleImportData = useCallback(
    async (data: AppData) => {
      // 1. Mettre à jour le state et le localStorage immédiatement
      const cleaned: AppData = {
        ...data,
        carryOver: data.carryOver ?? {},
        forecastItems: data.forecastItems ?? {},
        monthOverrides: data.monthOverrides ?? {},
      };
      updateData(() => cleaned);
      setShowSync(false);

      // 2. Pousser toutes les données vers l'API si connecté (PWA)
      if (!IS_ELECTRON && currentUser?.token) {
        const token = currentUser.token;

        // Paramètres globaux
        await remoteAPI
          .saveSettings(token, cleaned.salary, cleaned.savings)
          .catch(() => {});

        // Settings mensuels
        if (cleaned.monthOverrides) {
          for (const [mk, ov] of Object.entries(cleaned.monthOverrides)) {
            await remoteAPI
              .saveMonthSettings(token, mk, ov.salary, ov.savings)
              .catch(() => {});
          }
        }

        // CarryOvers
        for (const [mk, amount] of Object.entries(cleaned.carryOver)) {
          await remoteAPI.saveCarryOver(token, mk, amount).catch(() => {});
        }

        // Dépenses — charger d'abord ce qui existe déjà en DB pour éviter les doublons
        const remote = await remoteAPI.load(token).catch(() => null);
        const existingIds = new Set<string>();
        if (remote?.months) {
          Object.values(remote.months)
            .flat()
            .forEach((e) => existingIds.add(String(e.id)));
        }

        for (const [mk, expenses] of Object.entries(cleaned.months)) {
          for (const expense of expenses) {
            // Skipper les dépenses déjà en DB (IDs cuid)
            if (
              typeof expense.id === "string" &&
              expense.id.length > 10 &&
              existingIds.has(expense.id)
            )
              continue;
            await remoteAPI
              .addExpense(token, mk, {
                amount: Math.round(expense.amount),
                description: expense.description,
                category: expense.category,
                date: expense.date,
              })
              .catch(() => {});
          }
        }

        // Prévisions
        const existingForecastIds = new Set<string>();
        if (remote?.forecastItems) {
          Object.values(remote.forecastItems)
            .flat()
            .forEach((i) => existingForecastIds.add(String(i.id)));
        }
        for (const [mk, items] of Object.entries(cleaned.forecastItems ?? {})) {
          for (const item of items) {
            if (
              typeof item.id === "string" &&
              item.id.length > 10 &&
              existingForecastIds.has(item.id)
            )
              continue;
            await remoteAPI
              .addForecast(token, mk, {
                catId: item.catId,
                label: item.label,
                price: item.price,
                done: item.done,
              })
              .catch(() => {});
          }
        }
      }
    },
    [currentUser, updateData],
  );

  const handleSyncDone = useCallback((merged?: AppData) => {
    if (merged) {
      if (!merged.carryOver) merged.carryOver = {};
      if (!merged.forecastItems) merged.forecastItems = {};
      setAppData(merged);
    }
  }, []);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (showSplash)
    return (
      <SplashScreen
        onDone={() => {
          setShowSplash(false);
          // Restaurer la session APRÈS la fin du splash (pas avant)
          if (!IS_ELECTRON) {
            const saved = session.load();
            if (saved) handleLogin(saved.username, saved.token);
          }
        }}
      />
    );
  if (!currentUser || !appData) return <LoginPage onLogin={handleLogin} />;

  // ── Données dérivées ──────────────────────────────────────────────────────
  // Résolution salary/savings : override mensuel si défini, sinon valeur globale
  const { salary, savings } = resolveMonthSettings(appData, viewMonth);
  const invImpact = resolveMonthInvestments(appData, viewMonth);
  const monthInvestments = invImpact.cost; // total sorti ce mois
  const monthInvestmentGains = invImpact.gains; // total encaissé ce mois
  const monthInvestmentNet = invImpact.net; // impact net sur budget
  const budget = salary - savings - invImpact.net;
  const carryOver = appData.carryOver?.[viewMonth] ?? 0;
  const effectiveBudget = budget + carryOver;
  const monthExpenses = appData.months[viewMonth] ?? [];
  const totalSpent = monthExpenses.reduce(
    (s, e) => s + Math.round(e.amount),
    0,
  );
  const remaining = effectiveBudget - totalSpent;
  const monthsWithData = Object.keys(appData.months).filter(
    (k) => appData.months[k]?.length > 0,
  );
  const nextKey = nextMonthKey(currentMonthKey);

  // ── Handlers dépenses ─────────────────────────────────────────────────────
  const handleAddExpense = async ({
    amount,
    description,
    category,
    date,
  }: {
    amount: number;
    description: string;
    category: string;
    date: string;
  }) => {
    const finalDate = date || new Date().toISOString();
    const tempId = Date.now(); // ID temporaire local

    // 1. Mise à jour locale immédiate (UX réactive)
    updateData((d) => {
      if (!d.months[viewMonth]) d.months[viewMonth] = [];
      d.months[viewMonth].unshift({
        id: tempId,
        amount: Math.round(amount),
        description,
        category,
        date: finalDate,
      });
      return d;
    });

    // 2. Envoi API direct (queue automatique si hors ligne)
    if (!IS_ELECTRON && currentUser.token) {
      const dbId = await remoteAPI.addExpense(
        currentUser.token,
        viewMonth,
        {
          amount: Math.round(amount),
          description,
          category,
          date: finalDate,
        },
        tempId,
      );
      if (dbId) {
        updateData((d) => {
          if (d.months[viewMonth])
            d.months[viewMonth] = d.months[viewMonth].map((e) =>
              e.id === tempId ? { ...e, id: dbId } : e,
            );
          return d;
        });
      }
    }
  };

  const handleImportCsvExpenses = (
    expenses: {
      amount: number;
      description: string;
      category: string;
      date: string;
    }[],
  ) => {
    updateData((d) => {
      for (const exp of expenses) {
        const mk = exp.date.slice(0, 7); // "YYYY-MM" — chaque dépense va dans SON mois
        if (!d.months[mk]) d.months[mk] = [];
        d.months[mk].unshift({ id: Date.now() + Math.random(), ...exp });
      }
      return d;
    });

    if (!IS_ELECTRON && currentUser.token) {
      const token = currentUser.token;
      expenses.forEach((exp) => {
        const mk = exp.date.slice(0, 7);
        remoteAPI.addExpense(token, mk, exp).catch(() => {});
      });
    }
  };

  const handleDeleteExpense = (id: number | string) => {
    setConfirmAction({
      message: "Supprimer cette dépense ?",
      onConfirm: async () => {
        // 1. Suppression locale immédiate
        updateData((d) => {
          d.months[viewMonth] = (d.months[viewMonth] || []).filter(
            (e) => e.id !== id,
          );
          return d;
        });
        setConfirmAction(null);

        // 2. Suppression en DB si l'ID est un cuid (vient de l'API)
        if (
          !IS_ELECTRON &&
          currentUser.token &&
          typeof id === "string" &&
          id.length > 10
        ) {
          await remoteAPI.deleteExpense(currentUser.token, id).catch(() => {});
        }
      },
    });
  };

  const handleDeleteMany = (ids: (number | string)[]) => {
    updateData((d) => {
      d.months[viewMonth] = (d.months[viewMonth] || []).filter(
        (e) => !ids.includes(e.id),
      );
      return d;
    });
    // Supprimer en DB (uniquement les IDs cuid)
    if (!IS_ELECTRON && currentUser.token) {
      ids.forEach((id) => {
        if (typeof id === "string" && id.length > 10) {
          remoteAPI.deleteExpense(currentUser!.token!, id).catch(() => {});
        }
      });
    }
  };

  const handlePasteExpenses = (
    expenses: Expense[],
    sourceMonth: string,
    mode: "copy" | "cut",
  ) => {
    const now = new Date().toISOString();
    updateData((d) => {
      if (!d.months[viewMonth]) d.months[viewMonth] = [];
      const pasted = expenses.map((e) => ({
        ...e,
        id: Date.now() + Math.random(),
        date: now,
      }));
      d.months[viewMonth] = [...pasted, ...d.months[viewMonth]];
      // Si couper, supprimer du mois source
      if (mode === "cut" && d.months[sourceMonth]) {
        const cutIds = new Set(expenses.map((e) => e.id));
        d.months[sourceMonth] = d.months[sourceMonth].filter(
          (e) => !cutIds.has(e.id),
        );
      }
      return d;
    });

    // Envoyer les nouvelles dépenses à l'API
    if (!IS_ELECTRON && currentUser.token) {
      const token = currentUser.token;
      expenses.forEach(async (e) => {
        const now2 = new Date().toISOString();
        await remoteAPI
          .addExpense(token, viewMonth, {
            amount: e.amount,
            description: e.description,
            category: e.category,
            date: now2,
          })
          .catch(() => {});
        // Si couper, supprimer les originaux en DB
        if (mode === "cut" && typeof e.id === "string" && e.id.length > 10) {
          await remoteAPI.deleteExpense(token, String(e.id)).catch(() => {});
        }
      });
    }
  };

  // ── Prévision cochée → dépense automatique ─────────────────────────────────
  const handleToggleForecastDone = async (
    itemId: number | string,
    monthKey: string,
    item: { catId: string; label: string; price: number; done: boolean },
  ) => {
    const nowDone = !item.done;
    const FORECAST_PREFIX = "forecast-";

    // 1. Mettre à jour l'état done de l'item
    updateData((d) => {
      if (d.forecastItems?.[monthKey]) {
        d.forecastItems[monthKey] = d.forecastItems[monthKey].map((i) =>
          i.id === itemId ? { ...i, done: nowDone } : i,
        );
      }
      return d;
    });

    if (nowDone) {
      // 2. Coché → ajouter automatiquement comme dépense
      const date = new Date().toISOString();
      const tempId = `${FORECAST_PREFIX}${itemId}`;

      updateData((d) => {
        if (!d.months[monthKey]) d.months[monthKey] = [];
        // Éviter les doublons si déjà présent
        const already = d.months[monthKey].some((e) =>
          String(e.id).startsWith(FORECAST_PREFIX + String(itemId)),
        );
        if (!already) {
          d.months[monthKey].unshift({
            id: tempId,
            amount: item.price,
            description: item.label,
            category: item.catId,
            date,
          });
        }
        return d;
      });

      // 3. Envoi API direct (queue automatique si hors ligne)
      if (!IS_ELECTRON && currentUser.token) {
        const dbId = await remoteAPI.addExpense(
          currentUser.token,
          monthKey,
          {
            amount: item.price,
            description: item.label,
            category: item.catId,
            date: new Date().toISOString(),
          },
          tempId,
        );
        if (dbId) {
          updateData((d) => {
            if (d.months[monthKey])
              d.months[monthKey] = d.months[monthKey].map((e) =>
                e.id === tempId ? { ...e, id: dbId } : e,
              );
            return d;
          });
        }
      }
    } else {
      // 4. Décoché → supprimer la dépense liée
      updateData((d) => {
        if (d.months[monthKey]) {
          // Cherche l'expense avec l'ID forecast ou la description correspondante
          const toDelete = d.months[monthKey].find(
            (e) =>
              String(e.id).startsWith(FORECAST_PREFIX + String(itemId)) ||
              (e.description === item.label &&
                e.amount === item.price &&
                e.category === item.catId),
          );
          if (toDelete) {
            d.months[monthKey] = d.months[monthKey].filter(
              (e) => e.id !== toDelete.id,
            );
            // Supprimer en DB si ID cuid
            if (
              !IS_ELECTRON &&
              currentUser.token &&
              typeof toDelete.id === "string" &&
              toDelete.id.length > 10 &&
              !String(toDelete.id).startsWith(FORECAST_PREFIX)
            ) {
              remoteAPI
                .deleteExpense(currentUser.token, String(toDelete.id))
                .catch(() => {});
            }
          }
        }
        return d;
      });
    }
  };

  const handleConfirmNewMonth = () => {
    const nk = nextMonthKey(currentMonthKey);
    const rep = Math.max(0, remaining);
    updateData((d) => {
      if (!d.months[nk]) d.months[nk] = [];
      if (!d.carryOver) d.carryOver = {};
      if (rep > 0) d.carryOver[nk] = (d.carryOver[nk] || 0) + rep;
      return d;
    });
    setShowNewMonth(false);
    setViewMonth(nk);
  };

  const handleExport = () => {
    const data = {
      mois: getMonthLabel(viewMonth),
      salary,
      savings,
      budget,
      carryOver,
      totalSpent,
      remaining,
      depenses: monthExpenses,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `budget-${viewMonth}.json`;
    a.click();
  };

  const showPaginator = (
    ["dashboard", "depenses", "visu"] as PageId[]
  ).includes(activePage);

  const PAGE_TITLES: Record<PageId, string> = {
    dashboard: "Tableau de bord",
    depenses: "Dépenses",
    visu: "Visualisation",
    forecast: "Prévisions",
    investments: "Investissements",
    recurring: "Récurrences",
    history: "Historique",
    account: "Mon compte",
    goals: "Objectifs financiers",
  };

  return (
    <div
      className={`app-shell ${sidebarOpen ? "sidebar-open" : "sidebar-collapsed"} ${IS_ELECTRON ? "is-electron" : "is-pwa"}`}
    >
      {/* Bannière d'installation PWA (Android/iOS) */}
      {!IS_ELECTRON && <InstallBanner />}

      {/* Notification discrète : dépenses récurrentes générées */}
      {recurringNotice && (
        <div
          onClick={() => setRecurringNotice(null)}
          className="fixed z-[500] flex items-center gap-2.5 py-2.5 px-4 rounded-xl bg-surface-soft border border-primary shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-[0.85rem] text-text cursor-pointer bottom-[76px] left-3 right-3 md:top-4 md:left-1/2 md:right-auto md:bottom-auto md:-translate-x-1/2 md:w-auto animate-[slideDown_0.3s_ease-out]"
        >
          <span className="text-[1.1rem]">🔁</span>
          <span>{recurringNotice}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRecurringNotice(null);
            }}
            className="bg-transparent border-none text-text-muted cursor-pointer text-[0.85rem] px-1 ml-1 hover:text-text"
          >
            ✕
          </button>
        </div>
      )}

      {sessionExpiredNotice && (
        <div className="fixed z-[500] flex items-center gap-2.5 py-2.5 px-4 rounded-xl bg-surface-soft border border-danger shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-[0.85rem] text-text cursor-pointer bottom-[76px] left-3 right-3 md:top-4 md:left-1/2 md:right-auto md:bottom-auto md:-translate-x-1/2 md:w-auto animate-[slideDown_0.3s_ease-out]">
          <span className="text-[1.1rem]">🔒</span>
          <span>
            Session expirée — vos changements ne se synchronisent plus.
            Reconnectez-vous.
          </span>
          <button
            onClick={handleLogout}
            className="bg-danger text-white rounded-md py-1 px-2.5 text-[0.78rem] font-semibold ml-2"
          >
            Se reconnecter
          </button>
        </div>
      )}
      {/* Fond assombri derrière le tiroir sidebar sur mobile — clic pour fermer */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] animate-[fadeIn_0.2s_ease-out]"
        />
      )}

      {/* ═══ SIDEBAR ═══ */}
      <Sidebar
        activePage={activePage}
        onNavigate={navigateTo}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        viewMonth={viewMonth}
        salary={salary}
        savings={savings}
        monthInvestments={monthInvestments}
        monthInvestmentGains={monthInvestmentGains}
        totalSpent={totalSpent}
        currentUser={currentUser}
        storageRef={storageRef}
        onSyncDone={handleSyncDone}
        showUserPopup={showUserPopup}
        onToggleUserPopup={() => setShowUserPopup((v) => !v)}
        onCloseUserPopup={() => setShowUserPopup(false)}
        onLogout={handleLogout}
        onSettings={() => setShowSettings(true)}
        onSync={() => setShowSync(true)}
      />

      {/* ═══ MAIN ═══ */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Topbar */}
        <div className="fixed flex items-center gap-3.5 px-6 py-3.5 bg-surface-soft border-b border-border sticky top-0 z-50 min-h-[60px]">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="w-[34px] h-[34px] flex-shrink-0 rounded-[9px] border-none border-border bg-surface text-text-muted text-[0.8rem] cursor-pointer transition-colors hover:text-primary hover:border-primary"
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
          <div className="flex items-center gap-2.5 flex-1">
            {pageHistory.length > 0 && (
              <button
                onClick={navigateBack}
                title="Retour"
                className="flex items-center justify-center w-8 h-8 flex-shrink-0 rounded-[9px] border-none border-border bg-surface-soft text-text text-base leading-none cursor-pointer transition-all hover:bg-surface hover:border-primary hover:text-primary hover:-translate-x-0.5"
              >
                ←
              </button>
            )}
            <div className="text-[1.05rem] font-bold text-text">
              {PAGE_TITLES[activePage]}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <NotificationCenter
              appData={appData}
              monthKey={currentMonthKey}
              username={currentUser.username}
              onNavigate={navigateTo}
            />
            {currentUser.token && (
              <>
                <button
                  onClick={() => setShowSearch(true)}
                  title="Recherche globale"
                  className="w-[34px] h-[34px] flex-shrink-0 rounded-[9px] border-none border-border bg-surface text-text-muted cursor-pointer transition-colors hover:text-primary hover:border-primary"
                >
                  🔍
                </button>
                <button
                  onClick={() => setShowReports(true)}
                  title="Exporter un rapport"
                  className="w-[34px] h-[34px] flex-shrink-0 rounded-[9px] border-none border-border bg-surface text-text-muted cursor-pointer transition-colors hover:text-primary hover:border-primary"
                >
                  📤
                </button>
              </>
            )}
            {showPaginator && (
              <MonthPaginator
                viewMonth={viewMonth}
                onChangeMonth={setViewMonth}
                monthsWithData={monthsWithData}
              />
            )}
          </div>
        </div>
        {/* Pages */}
        <div className="flex-1 px-7 py-6 max-w-[1300px] w-full mx-auto box-border">
          {activePage === "dashboard" && (
            <DashboardPage
              appData={appData}
              salary={salary}
              savings={savings}
              totalSpent={totalSpent}
              remaining={remaining}
              carryOver={carryOver}
              monthInvestments={monthInvestments}
              monthInvestmentGains={monthInvestmentGains}
              monthExpenses={monthExpenses}
              viewMonth={viewMonth}
              isCurrentMonth={isCurrentMonth}
              onNavigate={navigateTo}
              onOpenSettings={() => setShowSettings(true)}
            />
          )}

          {activePage === "depenses" && (
            <DepensesPage
              viewMonth={viewMonth}
              monthExpenses={monthExpenses}
              isCurrentMonth={isCurrentMonth}
              onAdd={handleAddExpense}
              onDelete={handleDeleteExpense}
              allMonthExpenses={monthExpenses}
              appData={appData}
              onDeleteMany={handleDeleteMany}
              onPaste={handlePasteExpenses}
              onImportCsv={handleImportCsvExpenses}
              highlightExpenseId={highlightedExpenseId}
              onOpenSettings={() => setShowSettings(true)}
              onOpenCatBudgets={() => setShowCatBudgets(true)}
              onExport={handleExport}
              onNewMonth={() => setShowNewMonth(true)}
            />
          )}

          {activePage === "visu" && (
            <VisuPage
              appData={appData}
              viewMonth={viewMonth}
              isCurrentMonth={isCurrentMonth}
              monthExpenses={monthExpenses}
              onDelete={handleDeleteExpense}
            />
          )}

          {activePage === "forecast" && (
            <div className="">
              <PageHeader
                title="Prévisions"
                subtitle={getMonthLabel(viewMonth)}
              />
              <ForecastPage
                appData={appData}
                updateData={updateData}
                currentMonthKey={currentMonthKey}
                onToggleDone={handleToggleForecastDone}
              />
            </div>
          )}

          {activePage === "history" && (
            <div className="">
              <PageHeader title="Historique" subtitle="Tous vos mois passés" />
              <HistoryPage
                months={appData.months}
                globalSalary={appData.salary}
                globalSavings={appData.savings}
                monthOverrides={appData.monthOverrides ?? {}}
                carryOvers={appData.carryOver ?? {}}
                onViewMonth={(k) => {
                  setViewMonth(k);
                  navigateTo("depenses");
                }}
              />
            </div>
          )}

          {activePage === "account" && (
            <AccountPage
              username={currentUser.username}
              currentUser={currentUser}
              onLogout={handleLogout}
              onUsernameChanged={handleLogout}
            />
          )}

          {activePage === "investments" && (
            <div className="">
              <PageHeader
                title="💼 Investissements"
                subtitle="Gérez votre portefeuille"
              />
              <InvestmentsPage
                appData={appData}
                updateData={updateData}
                token={currentUser.token}
              />
            </div>
          )}

          {activePage === "goals" && (
            <div className="">
              <PageHeader
                title="🎯 Objectifs financiers"
                subtitle="Fixez un cap, suivez votre progression"
              />
              <GoalsPage
                appData={appData}
                updateData={updateData}
                token={currentUser.token}
              />
            </div>
          )}

          {activePage === "recurring" && (
            <div className="">
              <PageHeader
                title="🔁 Dépenses récurrentes"
                subtitle="Automatisez loyer, abonnements et charges fixes"
              />
              <RecurringPage
                appData={appData}
                updateData={updateData}
                token={currentUser.token}
              />
            </div>
          )}
        </div>
      </main>

      {/* Navigation mobile PWA (BottomNav) */}
      {isMobile && (
        <BottomNav
          activeTab={activePage}
          onChangeTab={(tabId) => navigateTo(tabId as PageId)}
        />
      )}

      {/* ═══ MODALES ═══ */}

      {showCatBudgets && (
        <CategoryBudgetsModal
          appData={appData}
          onSave={(budgets) => {
            updateData((d) => {
              d.categoryBudgets = budgets;
              return d;
            });
            setShowCatBudgets(false);
          }}
          onClose={() => setShowCatBudgets(false)}
        />
      )}

      {showImportCsv && (
        <ImportCsvModal
          targetMonth={viewMonth}
          onImport={handleImportCsvExpenses}
          onClose={() => setShowImportCsv(false)}
        />
      )}
      {showSettings && (
        <EditSettingsModal
          salary={salary}
          savings={savings}
          viewMonth={viewMonth}
          hasOverride={!!appData.monthOverrides?.[viewMonth]}
          onSave={async (s, sv, monthOnly) => {
            if (monthOnly) {
              // Override mensuel uniquement
              updateData((d) => {
                if (!d.monthOverrides) d.monthOverrides = {};
                d.monthOverrides[viewMonth] = { salary: s, savings: sv };
                return d;
              });
              if (!IS_ELECTRON && currentUser.token) {
                await remoteAPI
                  .saveMonthSettings(currentUser.token, viewMonth, s, sv)
                  .catch(() => {});
              }
            } else {
              // Valeurs globales (et effacer l'override du mois courant)
              updateData((d) => {
                d.salary = s;
                d.savings = sv;
                if (d.monthOverrides?.[viewMonth]) {
                  delete d.monthOverrides[viewMonth];
                }
                return d;
              });
              if (!IS_ELECTRON && currentUser.token) {
                await remoteAPI
                  .saveSettings(currentUser.token, s, sv)
                  .catch(() => {});
                await remoteAPI
                  .saveMonthSettings(currentUser.token, viewMonth, null, null)
                  .catch(() => {});
              }
            }
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showNewMonth && (
        <NewMonthModal
          currentMonthLabel={getMonthLabel(currentMonthKey)}
          nextMonthLabel={getMonthLabel(nextKey)}
          remaining={remaining}
          onConfirm={handleConfirmNewMonth}
          onClose={() => setShowNewMonth(false)}
        />
      )}

      {showSync && (
        <SyncModal
          appData={appData}
          onImport={handleImportData}
          onClose={() => setShowSync(false)}
        />
      )}

      {confirmAction && (
        <ConfirmModal
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onClose={() => setConfirmAction(null)}
        />
      )}
      {showReports && currentUser.token && (
        <ReportsModal
          viewMonth={viewMonth}
          token={currentUser.token}
          onClose={() => setShowReports(false)}
        />
      )}

      {showSearch && currentUser.token && (
        <SearchModal
          token={currentUser.token}
          onNavigateToMonth={(mk, expenseId) => {
            setViewMonth(mk);
            setHighlightedExpenseId(expenseId as number | string | null);
            navigateTo("depenses");
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}
