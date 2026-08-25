import { useState } from "react";
import { getMonthLabel } from "../../lib/constants";
import { Expense, AppData } from "../../lib/types";
import { Section, SectionTitle } from "../../ui/Primitives";
import AddExpenseForm from "./AddExpenseForm";
import ExpenseList from "./ExpenseList";
import ImportCsvModal from "./Importcsvmodal";

interface Props {
  viewMonth: string;
  monthExpenses: Expense[];
  allMonthExpenses: Expense[];
  appData?: AppData;
  isCurrentMonth: boolean;
  onAdd: (expense: {
    amount: number;
    description: string;
    category: string;
    date: string;
  }) => void;
  onDelete: (id: number | string) => void;
  onDeleteMany: (ids: (number | string)[]) => void;
  onPaste: (
    expenses: Expense[],
    sourceMonth: string,
    mode: "copy" | "cut",
  ) => void;
  onOpenSettings: () => void;
  onOpenCatBudgets?: () => void;
  onExport: () => void;
  onNewMonth: () => void;
  onImportCsv: (
    expenses: {
      amount: number;
      description: string;
      category: string;
      date: string;
    }[],
  ) => void;
  // ── Mise en évidence depuis la recherche globale ────────────────────────────
  highlightExpenseId?: string | number | null;
  onHighlightConsumed?: () => void;
}

export default function DepensesPage({
  viewMonth,
  monthExpenses,
  allMonthExpenses,
  appData,
  isCurrentMonth,
  onAdd,
  onDelete,
  onDeleteMany,
  onPaste,
  onOpenSettings,
  onOpenCatBudgets,
  onImportCsv,
  onExport,
  onNewMonth,
  highlightExpenseId,
  onHighlightConsumed,
}: Props) {
    const [showImportCsv, setShowImportCsv] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Section est plate par défaut désormais (voir Primitives.tsx) —
          rien d'autre à changer ici, le style se propage automatiquement. */}
      <Section>
        <AddExpenseForm
          targetMonth={viewMonth}
          onAdd={onAdd}
          onOpenSettings={onOpenSettings}
          onOpenCatBudgets={onOpenCatBudgets}
          onExport={onExport}
          onOpenImport={() => setShowImportCsv(true)}
          onNewMonth={onNewMonth}
        />
      </Section>
      <Section>
        <SectionTitle
          icon="📋"
          action={
            <span className="text-[0.9rem] text-text-muted font-normal">
              ({monthExpenses.length})
            </span>
          }
        >
          Dépenses — {getMonthLabel(viewMonth)}
        </SectionTitle>
        <ExpenseList
          expenses={monthExpenses}
          viewMonth={viewMonth}
          allExpenses={allMonthExpenses}
          appData={appData}
          onDelete={onDelete}
          onDeleteMany={onDeleteMany}
          onPaste={onPaste}
          highlightExpenseId={highlightExpenseId}
          onHighlightConsumed={onHighlightConsumed}
        />
      </Section>
      {showImportCsv && (
        <ImportCsvModal
          targetMonth={viewMonth}
          onImport={onImportCsv}
          onClose={() => setShowImportCsv(false)}
        />
      )}
    </div>
  );
}
