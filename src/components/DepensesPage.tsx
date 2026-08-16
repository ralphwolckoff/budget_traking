import { getMonthLabel } from "../constants";
import type { Expense, AppData } from "../types";
import AddExpenseForm from "./AddExpenseForm";
import ExpenseList from "./ExpenseList";
import { Section, SectionTitle } from "../ui/Primitives";

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
  onExport,
  onNewMonth,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-[30px]">
      <Section>
        <AddExpenseForm
          targetMonth={viewMonth}
          onAdd={onAdd}
          onOpenSettings={onOpenSettings}
          onOpenCatBudgets={onOpenCatBudgets}
          onExport={onExport}
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
        />
      </Section>
    </div>
  );
}
