import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronUp, Clock, MapPin } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarMonth } from "@/components/calendar/CalendarMonth";
import { CalendarWeekToggle, CalendarWeekView } from "@/components/calendar/CalendarWeek";
import { DayDetailDrawer } from "@/components/drawers/DayDetailDrawer";
import { ShiftForm } from "@/components/forms/ShiftForm";
import { PageLoader } from "@/components/ui/loader";
import { contractApi, shiftApi } from "@/api/mock";
import { contractsApi, shiftsApi } from "@/lib/contracts-api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CalendarEvent, Shift } from "@/types";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isWeekView, setIsWeekView] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentMonth = currentDate.toISOString().slice(0, 7);

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: () => contractApi.listContracts(),
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['/api/shifts', currentMonth],
    queryFn: () => shiftApi.listShifts({ month: currentMonth }),
  });

  // Fetch real upcoming shifts
  const { data: upcomingShiftsReal = [] } = useQuery({
    queryKey: ['/api/shifts', user?.id],
    queryFn: () => shiftsApi.listShifts({ userId: user?.id }),
    enabled: !!user,
  });


  const isLoading = contractsLoading || shiftsLoading;

  const confirmShiftMutation = useMutation({
    mutationFn: ({ shiftId, updates }: { shiftId: string, updates: { actualStart: string; actualEnd: string } }) =>
      shiftApi.confirmShiftCompleted(shiftId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({
        title: "Shift confirmed",
        description: "Shift has been marked as completed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to confirm shift. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: (shiftData: Omit<Shift, 'id'>) =>
      shiftApi.createShift(shiftData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({
        title: "Shift created",
        description: "Your shift has been added successfully.",
      });
      setShowShiftForm(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create shift. Please try again.",
        variant: "destructive",
      });
    },
  });

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return shifts.map(shift => ({
      id: shift.id,
      date: shift.date,
      type: 'shift' as const,
      completed: shift.completed
    }));
  }, [shifts]);

  const dayShifts = useMemo(() => {
    return shifts.filter(shift => shift.date === selectedDate);
  }, [shifts, selectedDate]);

  const upcomingShifts = useMemo(() => {
    const today = new Date();
    const next7Days = new Date(today);
    next7Days.setDate(today.getDate() + 7);
    
    return shifts
      .filter(shift => {
        const shiftDate = new Date(shift.date);
        return shiftDate >= today && shiftDate <= next7Days && !shift.completed;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [shifts]);

  const nextThreeShifts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return upcomingShiftsReal
      .filter(shift => shift.localDate >= today)
      .sort((a, b) => new Date(a.localDate).getTime() - new Date(b.localDate).getTime())
      .slice(0, 3);
  }, [upcomingShiftsReal]);

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setShowDayDetail(true);
  };

  const handleConfirmShift = (shiftId: string, updates: { actualStart: string; actualEnd: string }) => {
    confirmShiftMutation.mutate({ shiftId, updates });
  };

  const handleCreateShift = (shiftData: Omit<Shift, 'id'>) => {
    createShiftMutation.mutate(shiftData);
  };

  const handleAddShiftToDay = () => {
    setShowDayDetail(false);
    setShowShiftForm(true);
  };

  const formatShiftDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (isLoading) {
    return <PageLoader text="Loading calendar..." />;
  }

  return (
    <>
      <AppHeader 
        title="Calendar"
        subtitle="View and manage your shift schedule"
        actions={
          <CalendarWeekToggle 
            isWeekView={isWeekView}
            onToggle={setIsWeekView}
          />
        }
      />

      {/* Upcoming Shifts Section */}
      {nextThreeShifts.length > 0 && (
        <div className="lg:px-8 px-4 pt-6 pb-0">
          <Card className="mb-6" data-testid="upcoming-shifts-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="w-5 h-5 text-blue-500" />
                Upcoming Shifts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {nextThreeShifts.map((shift) => {
                  const formatDate = (dateStr: string) => {
                    const date = new Date(dateStr);
                    const today = new Date();
                    const tomorrow = new Date();
                    tomorrow.setDate(today.getDate() + 1);
                    
                    if (date.toDateString() === today.toDateString()) {
                      return 'Today';
                    } else if (date.toDateString() === tomorrow.toDateString()) {
                      return 'Tomorrow';
                    } else {
                      return date.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      });
                    }
                  };

                  const formatTime = (utcDate: string) => {
                    return new Date(utcDate).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    });
                  };

                  return (
                    <div key={shift.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`shift-item-${shift.id}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(shift.localDate)}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="w-3 h-3" />
                            {shift.facility}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatTime(shift.startUtc)} - {formatTime(shift.endUtc)} · {shift.role}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Shift Button */}
      <div className="lg:px-8 px-4 pt-6 pb-0">
        <div className="mb-6 text-center">
          <Button onClick={() => setShowShiftForm(true)} data-testid="button-add-shift" className="px-8">
            <Plus className="w-4 h-4 mr-2" />
            Add Shift
          </Button>
        </div>
      </div>

      <div className="lg:px-8 px-4 py-6">
        {!isWeekView ? (
          <CalendarMonth
            currentDate={currentDate}
            events={calendarEvents}
            onDateChange={setCurrentDate}
            onDayClick={handleDayClick}
            upcomingShifts={nextThreeShifts}
          />
        ) : (
          <CalendarWeekView
            currentDate={currentDate}
            events={calendarEvents}
            onDateChange={setCurrentDate}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      <DayDetailDrawer
        isOpen={showDayDetail}
        onClose={() => setShowDayDetail(false)}
        selectedDate={selectedDate}
        shifts={dayShifts}
        onConfirmShift={handleConfirmShift}
        onAddShift={handleAddShiftToDay}
      />

      <ShiftForm
        isOpen={showShiftForm}
        onClose={() => setShowShiftForm(false)}
        onSubmit={handleCreateShift}
        contracts={contracts}
        defaultDate={selectedDate || undefined}
      />
    </>
  );
}
