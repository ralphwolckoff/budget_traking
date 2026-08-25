import { describe, it, expect } from "vitest";
import { AppData, resolveMonthSettings, Investment, resolveMonthInvestments, RecurringExpense, generateRecurringExpenses, FinancialGoal, resolveGoalProgress } from "./lib/types";

  

// ── Helpers ─────────────────────────────────────────────────────────────────
function baseAppData(overrides: Partial<AppData> = {}): AppData {
  return {
    salary: 150000,
    savings: 30000,
    months: {},
    carryOver: {},
    forecastItems: {},
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// resolveMonthSettings
// ══════════════════════════════════════════════════════════════════════════
describe("resolveMonthSettings", () => {
  it("retourne les valeurs globales si aucun override n'existe", () => {
    const data = baseAppData();
    expect(resolveMonthSettings(data, "2026-03")).toEqual({
      salary: 150000,
      savings: 30000,
    });
  });

  it("applique l'override d'un mois quand il existe", () => {
    const data = baseAppData({
      monthOverrides: { "2026-03": { salary: 200000, savings: 50000 } },
    });
    expect(resolveMonthSettings(data, "2026-03")).toEqual({
      salary: 200000,
      savings: 50000,
    });
  });

  it("n'affecte pas les mois sans override", () => {
    const data = baseAppData({
      monthOverrides: { "2026-03": { salary: 200000, savings: 50000 } },
    });
    expect(resolveMonthSettings(data, "2026-04")).toEqual({
      salary: 150000,
      savings: 30000,
    });
  });

  it("un override partiel (salary null) retombe sur la valeur globale pour ce champ", () => {
    const data = baseAppData({
      monthOverrides: { "2026-03": { salary: null, savings: 50000 } },
    });
    expect(resolveMonthSettings(data, "2026-03")).toEqual({
      salary: 150000,
      savings: 50000,
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// resolveMonthInvestments
// ══════════════════════════════════════════════════════════════════════════
describe("resolveMonthInvestments", () => {
  const inv = (overrides: Partial<Investment>): Investment => ({
    id: "inv-1",
    type: "epargne",
    name: "Test",
    amount: 100000,
    startDate: "2026-01-15",
    status: "actif",
    ...overrides,
  });

  it("compte le capital initial dans le mois de démarrage", () => {
    const data = baseAppData({
      investments: {
        "inv-1": inv({ startDate: "2026-03-05", amount: 100000 }),
      },
    });
    expect(resolveMonthInvestments(data, "2026-03")).toEqual({
      cost: 100000,
      gains: 0,
      net: 100000,
    });
  });

  it("ignore le capital initial les mois suivants", () => {
    const data = baseAppData({
      investments: {
        "inv-1": inv({ startDate: "2026-01-05", amount: 100000 }),
      },
    });
    expect(resolveMonthInvestments(data, "2026-03")).toEqual({
      cost: 0,
      gains: 0,
      net: 0,
    });
  });

  it("ajoute les versements datés du mois concerné", () => {
    const data = baseAppData({
      investments: {
        "inv-1": inv({
          startDate: "2026-01-05",
          payments: [
            { id: "p1", date: "2026-03-10", amount: 20000 },
            { id: "p2", date: "2026-04-10", amount: 15000 }, // autre mois, ignoré
          ],
        }),
      },
    });
    expect(resolveMonthInvestments(data, "2026-03")).toEqual({
      cost: 20000,
      gains: 0,
      net: 20000,
    });
  });

  it("compte les gains encaissés ce mois et les soustrait du coût net", () => {
    const data = baseAppData({
      investments: {
        "inv-1": inv({
          startDate: "2026-01-05",
          gains: [{ id: "g1", monthKey: "2026-03", amount: 8000 }],
        }),
      },
    });
    expect(resolveMonthInvestments(data, "2026-03")).toEqual({
      cost: 0,
      gains: 8000,
      net: -8000, // net négatif = augmente le budget disponible
    });
  });

  it("ignore complètement les investissements clôturés", () => {
    const data = baseAppData({
      investments: {
        "inv-1": inv({
          status: "cloture",
          startDate: "2026-03-05",
          amount: 500000,
          gains: [{ id: "g1", monthKey: "2026-03", amount: 8000 }],
        }),
      },
    });
    expect(resolveMonthInvestments(data, "2026-03")).toEqual({
      cost: 0,
      gains: 0,
      net: 0,
    });
  });

  it("cumule correctement plusieurs investissements simultanés", () => {
    const data = baseAppData({
      investments: {
        a: inv({ id: "a", startDate: "2026-03-01", amount: 50000 }),
        b: inv({
          id: "b",
          startDate: "2026-01-01",
          gains: [{ id: "g", monthKey: "2026-03", amount: 10000 }],
        }),
      },
    });
    expect(resolveMonthInvestments(data, "2026-03")).toEqual({
      cost: 50000,
      gains: 10000,
      net: 40000,
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// generateRecurringExpenses
// ══════════════════════════════════════════════════════════════════════════
describe("generateRecurringExpenses", () => {
  const rec = (overrides: Partial<RecurringExpense>): RecurringExpense => ({
    id: "rec-1",
    description: "Loyer",
    category: "logement",
    amount: 40000,
    dayOfMonth: 5,
    active: true,
    startMonth: "2026-01",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });

  it("ne génère rien s'il n'y a aucune récurrence", () => {
    const data = baseAppData();
    const result = generateRecurringExpenses(data, "2026-03");
    expect(result.addedCount).toBe(0);
    expect(result.data).toBe(data); // pas de nouvelle référence si rien à faire
  });

  it("génère une dépense pour le mois cible si jamais générée avant", () => {
    const data = baseAppData({
      recurringExpenses: { "rec-1": rec({}) },
    });
    const result = generateRecurringExpenses(data, "2026-01");
    expect(result.addedCount).toBe(1);
    expect(result.data.months["2026-01"]).toHaveLength(1);
    expect(result.data.months["2026-01"][0].amount).toBe(40000);
    expect(result.data.recurringExpenses!["rec-1"].lastGeneratedMonth).toBe(
      "2026-01",
    );
  });

  it("est idempotent : ne régénère pas un mois déjà généré", () => {
    const data = baseAppData({
      recurringExpenses: {
        "rec-1": rec({ lastGeneratedMonth: "2026-01" }),
      },
    });
    const result = generateRecurringExpenses(data, "2026-01");
    expect(result.addedCount).toBe(0);
  });

  it("rattrape (backfill) tous les mois manquants entre lastGeneratedMonth et le mois cible", () => {
    const data = baseAppData({
      recurringExpenses: {
        "rec-1": rec({ startMonth: "2026-01", lastGeneratedMonth: "2026-01" }),
      },
    });
    const result = generateRecurringExpenses(data, "2026-04");
    // Doit générer février, mars, avril = 3 dépenses
    expect(result.addedCount).toBe(3);
    expect(Object.keys(result.data.months).sort()).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
    ]);
    expect(result.data.recurringExpenses!["rec-1"].lastGeneratedMonth).toBe(
      "2026-04",
    );
  });

  it("ignore une récurrence inactive (en pause)", () => {
    const data = baseAppData({
      recurringExpenses: { "rec-1": rec({ active: false }) },
    });
    const result = generateRecurringExpenses(data, "2026-01");
    expect(result.addedCount).toBe(0);
  });

  it("n'anticipe pas avant startMonth", () => {
    const data = baseAppData({
      recurringExpenses: { "rec-1": rec({ startMonth: "2026-05" }) },
    });
    const result = generateRecurringExpenses(data, "2026-03");
    expect(result.addedCount).toBe(0);
  });

  it("s'arrête à endMonth et ne génère rien au-delà", () => {
    const data = baseAppData({
      recurringExpenses: {
        "rec-1": rec({ startMonth: "2026-01", endMonth: "2026-02" }),
      },
    });
    const result = generateRecurringExpenses(data, "2026-04");
    expect(result.addedCount).toBe(2); // janvier + février seulement
    expect(Object.keys(result.data.months).sort()).toEqual([
      "2026-01",
      "2026-02",
    ]);
  });

  it("ajuste le jour du mois si dayOfMonth dépasse le nombre de jours du mois (ex: 31 en février)", () => {
    const data = baseAppData({
      recurringExpenses: {
        "rec-1": rec({ startMonth: "2026-02", dayOfMonth: 31 }),
      },
    });
    const result = generateRecurringExpenses(data, "2026-02");
    const expense = result.data.months["2026-02"][0];
    const day = new Date(expense.date).getDate();
    expect(day).toBeLessThanOrEqual(28); // février 2026 n'est pas bissextile
  });
});

// ══════════════════════════════════════════════════════════════════════════
// resolveGoalProgress
// ══════════════════════════════════════════════════════════════════════════
describe("resolveGoalProgress", () => {
  const goal = (overrides: Partial<FinancialGoal>): FinancialGoal => ({
    id: "goal-1",
    name: "Test",
    targetAmount: 1000000,
    targetDate: "2027-01-01",
    startDate: "2026-01-01",
    linkedInvestmentIds: ["inv-1"],
    status: "actif",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });

  it("currentAmount = 0 si aucun investissement lié n'existe", () => {
    const data = baseAppData({ savings: 20000 });
    const p = resolveGoalProgress(goal({}), data);
    expect(p.currentAmount).toBe(0);
    expect(p.pctComplete).toBe(0);
  });

  it("utilise currentValue de l'investissement lié quand disponible, sinon le montant investi", () => {
    const data = baseAppData({
      investments: {
        "inv-1": {
          id: "inv-1",
          type: "epargne",
          name: "x",
          amount: 300000,
          startDate: "2026-01-01",
          status: "actif",
          currentValue: 350000,
        },
      },
    });
    const p = resolveGoalProgress(goal({ targetAmount: 1000000 }), data);
    expect(p.currentAmount).toBe(350000);
    expect(p.pctComplete).toBe(35);
  });

  it("plafonne pctComplete à 100 même si l'objectif est dépassé", () => {
    const data = baseAppData({
      investments: {
        "inv-1": {
          id: "inv-1",
          type: "epargne",
          name: "x",
          amount: 300000,
          startDate: "2026-01-01",
          status: "actif",
          currentValue: 2000000,
        },
      },
    });
    const p = resolveGoalProgress(goal({ targetAmount: 1000000 }), data);
    expect(p.pctComplete).toBe(100);
    expect(p.remaining).toBe(0);
  });

  it("onTrack est vrai quand l'épargne mensuelle actuelle suffit à tenir l'échéance", () => {
    const data = baseAppData({ savings: 100000 });
    // Échéance dans ~10 mois, il reste 1 000 000 F à trouver → besoin ~100k/mois
    const nearFuture = new Date();
    nearFuture.setMonth(nearFuture.getMonth() + 10);
    const p = resolveGoalProgress(
      goal({
        targetAmount: 1000000,
        targetDate: nearFuture.toISOString().slice(0, 10),
      }),
      data,
    );
    expect(p.onTrack).toBe(true);
    expect(p.gap).toBe(0);
  });

  it("onTrack est faux et gap > 0 quand l'épargne actuelle est insuffisante", () => {
    const data = baseAppData({ savings: 10000 });
    const nearFuture = new Date();
    nearFuture.setMonth(nearFuture.getMonth() + 10);
    const p = resolveGoalProgress(
      goal({
        targetAmount: 1000000,
        targetDate: nearFuture.toISOString().slice(0, 10),
      }),
      data,
    );
    expect(p.onTrack).toBe(false);
    expect(p.gap).toBeGreaterThan(0);
  });

  it("projectedMonths est null quand l'épargne mensuelle actuelle est nulle et l'objectif non atteint", () => {
    const data = baseAppData({ savings: 0 });
    const p = resolveGoalProgress(goal({ targetAmount: 1000000 }), data);
    expect(p.projectedMonths).toBeNull();
  });
});
