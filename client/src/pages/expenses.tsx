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
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@shared/schema";
import { useExpensesQuery, useExpenseTotals, useActiveContracts, useCreateExpense, useUpdateExpense, fromCents } from "@/api/expenses";

export default function ExpensesPage() {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contractsData = [], isLoading: contractsLoading } = useActiveContracts(user?.id);
  
  const { data: expensesData, isLoading: expensesLoading } = useExpensesQuery({
    userId: user?.id,
    limit: 50,
    sort: "desc",
  });

  const { data: totalsData, isLoading: totalsLoading } = useExpenseTotals(user?.id);

  const allExpenses = expensesData?.items || [];
  const contracts = contractsData || [];
  const isLoading = contractsLoading || expensesLoading || totalsLoading;

  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();


  const stats = useMemo(() => {
    if (!totalsData) {
      return {
        totalThisWeek: "$0.00",
        totalNextWeek: "$0.00", 
        totalMonth: "$0.00"
      };
    }

    return {
      totalThisWeek: `$${fromCents(parseInt(totalsData.thisWeek.toString()) || 0)}`,
      totalNextWeek: `$${fromCents(parseInt(totalsData.nextWeek.toString()) || 0)}`,
      totalMonth: `$${fromCents(parseInt(totalsData.thisMonth.toString()) || 0)}`
    };
  }, [totalsData]);


  const handleCreateExpense = (formData: any) => {
    if (!user?.id) return;
    
    const payload = {
      contractId: formData.contractId || null,
      date: formData.date,
      category: formData.category,
      amount: parseFloat(formData.amount) || 0,
      description: formData.description,
      note: formData.note || undefined,
      isTaxDeductible: formData.deductible || false,
    };
    
    createExpenseMutation.mutate({ payload, userId: user.id }, {
      onSuccess: () => {
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
  };

  const handleUpdateExpense = (formData: any) => {
    if (!editingExpense || !user?.id) return;
    
    const payload = {
      contractId: formData.contractId || null,
      date: formData.date,
      category: formData.category,
      amount: parseFloat(formData.amount) || 0,
      description: formData.description,
      note: formData.note || undefined,
      isTaxDeductible: formData.deductible || false,
    };
    
    updateExpenseMutation.mutate({ id: editingExpense.id, payload, userId: user.id }, {
      onSuccess: () => {
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
      />

      <div className="lg:px-8 px-4 py-6">
        {/* Expenses Summary */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <StatCard
            label="This Week"
            value={stats.totalThisWeek}
          />
          <StatCard
            label="Next Week"
            value={stats.totalNextWeek}
          />
          <StatCard
            label="This Month"
            value={stats.totalMonth}
          />
        </div>

        {/* Add Expense Button */}
        <div className="mb-6 text-center">
          <Button onClick={() => setShowExpenseForm(true)} data-testid="button-add-expense" className="px-8">
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>

        {/* Recent Transactions */}
        {allExpenses.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Transactions ({allExpenses.length})
                </h3>
              </div>
              <ExpenseList 
                expenses={allExpenses} 
                onEdit={handleEditExpense}
              />
            </CardContent>
          </Card>
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
