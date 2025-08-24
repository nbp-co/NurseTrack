import { Edit2, Car, Utensils, Briefcase, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expense } from "@/types";

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete?: (id: string) => void;
}

const categoryIcons = {
  Transportation: Car,
  Meals: Utensils,
  Supplies: Briefcase,
  Accommodation: Receipt,
} as const;

export function ExpenseList({ expenses, onEdit }: ExpenseListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || Receipt;
    return IconComponent;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      Transportation: 'bg-warning-50 text-warning-500',
      Meals: 'bg-primary/10 text-primary',
      Supplies: 'bg-success-50 text-success-500',
      Accommodation: 'bg-purple-50 text-purple-500',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-50 text-gray-500';
  };

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses yet</h3>
          <p className="text-gray-500">Start tracking your work-related expenses.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {expenses.map((expense) => {
            const IconComponent = getCategoryIcon(expense.category);
            
            return (
              <div 
                key={expense.id} 
                className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(expense.category)}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900" data-testid={`text-expense-description-${expense.id}`}>
                      {expense.description}
                    </p>
                    <p className="text-sm text-gray-500" data-testid={`text-expense-details-${expense.id}`}>
                      {expense.category} • {formatDate(expense.date)}
                    </p>
                    {expense.note && (
                      <p className="text-xs text-gray-400 mt-1" data-testid={`text-expense-note-${expense.id}`}>
                        {expense.note}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-medium text-gray-900" data-testid={`text-expense-amount-${expense.id}`}>
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(expense)}
                    data-testid={`button-edit-expense-${expense.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
