import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, BarChart3, DollarSign, Clock, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { StatCard } from "@/components/cards/StatCard";
import { DonutCard } from "@/components/cards/DonutCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loader";
import { ShiftForm } from "@/components/forms/ShiftForm";
import { contractApi, shiftApi, expenseApi } from "@/api/mock";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  getDaysCompleteAndRemaining, 
  getWeeklySummaries, 
  calculateMonthlyEarnings,
  formatCurrency 
} from "@/lib/metrics";
import { Shift } from "@/types";

export default function DashboardPage() {
  const [showShiftForm, setShowShiftForm] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentWeekStart = useMemo(() => {
    const today = new Date();
    const sunday = new Date(today.setDate(today.getDate() - today.getDay()));
    return sunday.toISOString().split('T')[0];
  }, []);

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: () => contractApi.listContracts(),
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['/api/shifts', currentMonth],
    queryFn: () => shiftApi.listShifts({ month: currentMonth }),
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['/api/expenses'],
    queryFn: () => expenseApi.listExpenses(),
  });

  const isLoading = contractsLoading || shiftsLoading || expensesLoading;

  const dashboardStats = useMemo(() => {
    const activeContracts = contracts.filter(c => c.status === 'active');
    const completedShifts = shifts.filter(s => s.completed);
    const monthlyEarnings = calculateMonthlyEarnings(contracts, shifts, currentMonth);
    
    const monthStart = `${currentMonth}-01`;
    const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0)
      .toISOString().split('T')[0];
    
    const progressMetrics = getDaysCompleteAndRemaining({
      from: monthStart,
      to: monthEnd,
      completedShiftDates: completedShifts.map(s => s.date)
    });

    const { overallTotal } = getWeeklySummaries(contracts, shifts, currentWeekStart);
    
    // Calculate next week stats
    const nextWeekStart = new Date();
    nextWeekStart.setDate(nextWeekStart.getDate() + (7 - nextWeekStart.getDay()));
    const nextWeekStartStr = nextWeekStart.toISOString().split('T')[0];
    
    const { overallTotal: nextWeekTotal } = getWeeklySummaries(contracts, shifts, nextWeekStartStr);

    return {
      activeContracts: activeContracts.length,
      monthlyEarnings,
      hoursWorked: Math.round(overallTotal.hours * 10) / 10,
      weeklyStats: overallTotal,
      nextWeekStats: nextWeekTotal,
      progressMetrics
    };
  }, [contracts, shifts, currentMonth, currentWeekStart]);

  const futureShifts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return shifts
      .filter(shift => shift.date >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [shifts]);

  const handleCreateShift = async (shiftData: Omit<Shift, 'id'>) => {
    try {
      await shiftApi.createShift(shiftData);
      toast({
        title: "Shift created",
        description: "Your shift has been added successfully.",
      });
      setShowShiftForm(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create shift. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <PageLoader text="Loading dashboard..." />;
  }

  return (
    <>
      <AppHeader 
        title="Dashboard"
        subtitle="Overview of your nursing contracts and recent activity"
      />

      <div className="lg:px-8 px-4 py-6">
        {/* Weekly, Next Week, and Monthly Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600" data-testid="text-weekly-label">
                    This Week
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <p className="text-2xl font-bold text-gray-900" data-testid="text-weekly-hours">
                        {dashboardStats.weeklyStats.hours} hours
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-success-500" />
                      <p className="text-2xl font-bold text-gray-900" data-testid="text-weekly-earnings">
                        {formatCurrency(dashboardStats.weeklyStats.earnings)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600" data-testid="text-next-weekly-label">
                    Next Week
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <p className="text-2xl font-bold text-gray-900" data-testid="text-next-weekly-hours">
                        {dashboardStats.nextWeekStats.hours} hours
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-success-500" />
                      <p className="text-2xl font-bold text-gray-900" data-testid="text-next-weekly-earnings">
                        {formatCurrency(dashboardStats.nextWeekStats.earnings)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600" data-testid="text-monthly-label">
                    This Month
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-warning-500" />
                      <p className="text-2xl font-bold text-gray-900" data-testid="text-monthly-hours">
                        {dashboardStats.hoursWorked} hours
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-success-500" />
                      <p className="text-2xl font-bold text-gray-900" data-testid="text-monthly-earnings">
                        {formatCurrency(dashboardStats.monthlyEarnings)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shift Schedule */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Shift Schedule
              </CardTitle>
              <div className="text-sm text-gray-600">
                <span data-testid="text-active-contracts-label">
                  {dashboardStats.activeContracts} Active Contract{dashboardStats.activeContracts !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {futureShifts.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {futureShifts.map((shift) => {
                  const contract = contracts.find(c => c.id === shift.contractId);
                  const earnings = contract ? 
                    ((parseTime(shift.actualEnd || shift.end) - parseTime(shift.actualStart || shift.start)) / (1000 * 60 * 60)) * contract.baseRate
                    : 0;
                  
                  return (
                    <div key={shift.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <BarChart3 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900" data-testid={`text-shift-facility-${shift.id}`}>
                            {shift.facility}
                          </p>
                          <p className="text-sm text-gray-500" data-testid={`text-shift-schedule-${shift.id}`}>
                            {formatDate(shift.date)}, {shift.start} - {shift.end}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={shift.completed ? "default" : "secondary"}
                          data-testid={`badge-shift-status-${shift.id}`}
                        >
                          {shift.completed ? "Completed" : "Scheduled"}
                        </Badge>
                        {shift.completed && (
                          <p className="text-sm text-gray-500 mt-1" data-testid={`text-shift-earnings-${shift.id}`}>
                            {formatCurrency(earnings)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming shifts</h3>
                <p className="text-gray-500">Your upcoming shifts will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      <ShiftForm
        isOpen={showShiftForm}
        onClose={() => setShowShiftForm(false)}
        onSubmit={handleCreateShift}
        contracts={contracts}
      />
    </>
  );
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
}
