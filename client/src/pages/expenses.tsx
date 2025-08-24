import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Filter, Receipt, TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { StatCard } from "@/components/cards/StatCard";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [filters, setFilters] = useState({
    contractId: "",
    category: "",
    dateRange: "this-month"
  });
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

  const filteredExpenses = useMemo(() => {
    let filtered = [...allExpenses];

    // Apply contract filter
    if (filters.contractId && filters.contractId !== "all") {
      filtered = filtered.filter(expense => expense.contractId === filters.contractId);
    }

    // Apply category filter
    if (filters.category && filters.category !== "all") {
      filtered = filtered.filter(expense => expense.category === filters.category);
    }

    // Apply date range filter
    if (filters.dateRange === "this-month") {
      filtered = filtered.filter(expense => expense.date.startsWith(currentMonth));
    }

    return filtered;
  }, [allExpenses, filters, currentMonth]);

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

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(allExpenses.map(expense => expense.category)));
    return uniqueCategories.sort();
  }, [allExpenses]);

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

  const handleApplyFilters = () => {
    // Filters are applied automatically via useMemo
    toast({
      title: "Filters applied",
      description: `Showing ${filteredExpenses.length} expense${filteredExpenses.length !== 1 ? 's' : ''}.`,
    });
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
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contract</label>
                <Select 
                  value={filters.contractId} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, contractId: value }))}
                >
                  <SelectTrigger data-testid="select-filter-contract">
                    <SelectValue placeholder="All Contracts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Contracts</SelectItem>
                    {contracts.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.facility}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <Select 
                  value={filters.category} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger data-testid="select-filter-category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <Select 
                  value={filters.dateRange} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
                >
                  <SelectTrigger data-testid="select-filter-date">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={handleApplyFilters} 
                  className="w-full"
                  data-testid="button-apply-filters"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Total This Month"
            value={formatCurrency(stats.totalMonth)}
            subtext="15% from last month"
            icon={<DollarSign className="w-6 h-6 text-error-500" />}
            trend="up"
            trendColor="error"
          />
          
          <StatCard
            label="Pending Receipts"
            value={stats.pendingReceipts}
            subtext="Upload receipts to complete"
            icon={<AlertCircle className="w-6 h-6 text-warning-500" />}
            trend="neutral"
            trendColor="warning"
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
        {filteredExpenses.length > 0 ? (
          <>
            <Card className="mb-6">
              <CardContent className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Expenses ({filteredExpenses.length})
                </h3>
              </CardContent>
            </Card>
            <ExpenseList 
              expenses={filteredExpenses} 
              onEdit={handleEditExpense}
            />
          </>
        ) : (
          <EmptyState
            icon={<Receipt className="w-8 h-8 text-gray-400" />}
            title="No expenses found"
            description={
              filters.contractId || filters.category || filters.dateRange !== "this-month"
                ? "Try adjusting your filters to see more results."
                : "Start tracking your work-related expenses."
            }
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
