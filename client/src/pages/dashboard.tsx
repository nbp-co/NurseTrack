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
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/metrics";

export default function DashboardPage() {
  const [showShiftForm, setShowShiftForm] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const currentDate = new Date().toISOString().split('T')[0];

  // Fetch dashboard summary data
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/dashboard/summary', currentDate, user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/dashboard/summary?anchor=${currentDate}&userId=${user?.id}`);
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch upcoming shifts
  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ['/api/dashboard/upcoming', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/dashboard/upcoming?limit=10&userId=${user?.id}`);
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch active contracts for count
  const { data: contractsData, isLoading: contractsLoading } = useQuery({
    queryKey: ['/api/contracts', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/contracts?userId=${user?.id}&status=active`);
      return res.json();
    },
    enabled: !!user,
  });

  const isLoading = summaryLoading || upcomingLoading || contractsLoading;
  
  const activeContracts = contractsData?.contracts || [];
  const activeContractsCount = activeContracts.length;

  const dashboardStats = useMemo(() => {
    if (!summaryData?.summary) {
      return {
        thisWeek: { hours: 0, earnings: 0 },
        nextWeek: { hours: 0, earnings: 0 },
        thisMonth: { hours: 0, earnings: 0 },
      };
    }
    return summaryData.summary;
  }, [summaryData]);

  const upcomingShifts = upcomingData?.shifts || [];

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
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 whitespace-nowrap" data-testid="text-weekly-label">
                    This Week
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <p className="text-lg font-bold text-gray-900" data-testid="text-weekly-hours">
                        {dashboardStats.thisWeek.hours.toFixed(1)} hours
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-gray-900" data-testid="text-weekly-earnings">
                        {formatCurrency(dashboardStats.thisWeek.earnings)}
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
                  <p className="text-sm font-medium text-gray-600 whitespace-nowrap" data-testid="text-next-weekly-label">
                    Next Week
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <p className="text-lg font-bold text-gray-900" data-testid="text-next-weekly-hours">
                        {dashboardStats.nextWeek.hours.toFixed(1)} hours
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-gray-900" data-testid="text-next-weekly-earnings">
                        {formatCurrency(dashboardStats.nextWeek.earnings)}
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
                  <p className="text-sm font-medium text-gray-600 whitespace-nowrap" data-testid="text-monthly-label">
                    This Month
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-warning-500" />
                      <p className="text-lg font-bold text-gray-900" data-testid="text-monthly-hours">
                        {dashboardStats.thisMonth.hours.toFixed(1)} hours
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-gray-900" data-testid="text-monthly-earnings">
                        {formatCurrency(dashboardStats.thisMonth.earnings)}
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
                  {activeContractsCount} Active Contract{activeContractsCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingShifts.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {upcomingShifts.map((shift: any) => {
                  const formatDate = (dateStr: string) => {
                    const date = new Date(dateStr + 'T00:00:00');
                    return date.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    });
                  };

                  const formatTime = (timeStr: string) => {
                    if (!timeStr) return '';
                    const [hours, minutes] = timeStr.split(':').map(Number);
                    const date = new Date();
                    date.setHours(hours, minutes);
                    return date.toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    });
                  };

                  // Check if shift goes overnight
                  const isOvernight = shift.localEnd < shift.localStart;
                  
                  return (
                    <div key={shift.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <BarChart3 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900" data-testid={`text-shift-facility-${shift.id}`}>
                            {shift.contract ? `${shift.contract.name} - ${shift.contract.facility}` : "No contract"}
                          </p>
                          <p className="text-sm text-gray-500" data-testid={`text-shift-schedule-${shift.id}`}>
                            {formatDate(shift.localDate)}, {formatTime(shift.start || '07:00')} – {formatTime(shift.end || '19:00')}{shift.overnight ? ' (+1 day)' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={shift.status === 'Finalized' ? 'default' : 'secondary'}
                          data-testid={`badge-shift-status-${shift.id}`}
                        >
                          {shift.status}
                        </Badge>
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
    </>
  );
}
