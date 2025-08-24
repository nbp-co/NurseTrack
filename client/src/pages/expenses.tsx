import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt, TrendingUp, DollarSign } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { StatCard } from "@/components/cards/StatCard";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loader";
import { contractApi, expenseApi } from "@/api/mock";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Expense } from "@/types";
import { calculateTotalExpenses, calculateDeductibleExpenses, formatCurrency } from "@/lib/metrics";

export default function ExpensesPage() {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: () => contractApi.listContracts(),
  });

  const { data: allExpenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['/api/expenses'],
    queryFn: () => expenseApi.listExpenses(),
  });

  const isLoading = contractsLoading || expensesLoading;

  const createExpenseMutation = useMutation({
    mutationFn: (expenseData: Omit<Expense, 'id'>) => expenseApi.createExpense(expenseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: "Expense created",
        description: "Your expense has been added successfully.",
      });
      setShowExpenseForm(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Expense> }) => 
      expenseApi.updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: "Expense updated",
        description: "Your expense has been updated successfully.",
      });
      setShowExpenseForm(false);
      setEditingExpense(undefined);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update expense. Please try again.",
        variant: "destructive",
      });
    },
  });


  const stats = useMemo(() => {
    const monthlyExpenses = allExpenses.filter(expense => expense.date.startsWith(currentMonth));
    const totalMonth = calculateTotalExpenses(monthlyExpenses);
    const deductible = calculateDeductibleExpenses(monthlyExpenses);
    const pendingReceipts = monthlyExpenses.filter(expense => !expense.note).length;

    return {
      totalMonth,
      pendingReceipts,
      deductible,
      deductiblePercent: totalMonth > 0 ? Math.round((deductible / totalMonth) * 100) : 0
    };
  }, [allExpenses, currentMonth]);


  const handleCreateExpense = (expenseData: Omit<Expense, 'id'>) => {
    createExpenseMutation.mutate(expenseData);
  };

  const handleUpdateExpense = (expenseData: Omit<Expense, 'id'>) => {
    if (editingExpense) {
      updateExpenseMutation.mutate({ 
        id: editingExpense.id, 
        data: expenseData 
      });
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleCloseForm = () => {
    setShowExpenseForm(false);
    setEditingExpense(undefined);
  };


  if (isLoading) {
    return <PageLoader text="Loading expenses..." />;
  }

  return (
    <>
      <AppHeader 
        title="Expenses"
        subtitle="Track your work-related expenses and deductions"
        actions={
          <Button onClick={() => setShowExpenseForm(true)} data-testid="button-add-expense">
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        }
      />

      <div className="lg:px-8 px-4 py-6">
        {/* Expenses Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <StatCard
            label="Total This Month"
            value={formatCurrency(stats.totalMonth)}
            subtext="15% from last month"
            icon={<DollarSign className="w-6 h-6 text-error-500" />}
            trend="up"
            trendColor="error"
          />
          
          <StatCard
            label="Tax Deductible"
            value={formatCurrency(stats.deductible)}
            subtext={`${stats.deductiblePercent}% of total expenses`}
            icon={<TrendingUp className="w-6 h-6 text-success-500" />}
            trend="up"
            trendColor="success"
          />
        </div>

        {/* Expenses List */}
        {allExpenses.length > 0 ? (
          <>
            <Card className="mb-6">
              <CardContent className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Expenses ({allExpenses.length})
                </h3>
              </CardContent>
            </Card>
            <ExpenseList 
              expenses={allExpenses} 
              onEdit={handleEditExpense}
            />
          </>
        ) : (
          <EmptyState
            icon={<Receipt className="w-8 h-8 text-gray-400" />}
            title="No expenses found"
            description="Start tracking your work-related expenses."
            action={{
              label: "Add Your First Expense",
              onClick: () => setShowExpenseForm(true)
            }}
            testId="empty-state-expenses"
          />
        )}
      </div>

      <ExpenseForm
        isOpen={showExpenseForm}
        onClose={handleCloseForm}
        onSubmit={editingExpense ? handleUpdateExpense : handleCreateExpense}
        contracts={contracts}
        initialData={editingExpense}
      />
    </>
  );
}
