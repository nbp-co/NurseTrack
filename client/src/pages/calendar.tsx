import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronUp, Clock, MapPin } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { CalendarMonth } from "@/components/calendar/CalendarMonth";
import { CalendarWeekToggle, CalendarWeekView } from "@/components/calendar/CalendarWeek";
import { DayDetailDrawer } from "@/components/drawers/DayDetailDrawer";
import { ShiftForm } from "@/components/forms/ShiftForm";
import { PageLoader } from "@/components/ui/loader";
import { contractApi, shiftApi } from "@/api/mock";
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
          <div className="flex items-center space-x-2">
            <CalendarWeekToggle 
              isWeekView={isWeekView}
              onToggle={setIsWeekView}
            />
            <Button onClick={() => setShowShiftForm(true)} data-testid="button-add-shift">
              <Plus className="w-4 h-4 mr-2" />
              Add Shift
            </Button>
          </div>
        }
      />

      {/* Upcoming Shifts Section */}
      {upcomingShifts.length > 0 && (
        <div className="lg:px-8 px-4 pt-6 pb-0">
          <div 
            className="flex items-center justify-between cursor-pointer mb-4"
            onClick={() => setShowUpcoming(!showUpcoming)}
            data-testid="button-toggle-upcoming"
          >
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Shifts</h2>
            <ChevronUp 
              className={`w-5 h-5 text-gray-500 transition-transform ${
                showUpcoming ? 'rotate-0' : 'rotate-180'
              }`}
            />
          </div>
          
          {showUpcoming && (
            <div className="space-y-3 mb-6">
              {upcomingShifts.map((shift) => {
                const contract = contracts.find(c => c.id === shift.contractId);
                
                return (
                  <div 
                    key={shift.id} 
                    className="bg-rose-50 border border-rose-200 rounded-lg p-4 cursor-pointer hover:bg-rose-100 transition-colors"
                    onClick={() => handleDayClick(shift.date)}
                    data-testid={`upcoming-shift-${shift.id}`}
                  >
                    <div className="grid grid-cols-3 items-center">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium text-gray-900">
                          {formatShiftDate(shift.date)}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <div className="flex items-center space-x-2 text-sm text-gray-700">
                          <MapPin className="w-4 h-4" />
                          <span className="font-medium">{shift.facility}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{shift.start} - {shift.end}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <span className="text-sm font-medium text-gray-600 bg-white px-3 py-1 rounded-full border">
                          {shift.role}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="lg:px-8 px-4 py-6">
        {!isWeekView ? (
          <CalendarMonth
            currentDate={currentDate}
            events={calendarEvents}
            onDateChange={setCurrentDate}
            onDayClick={handleDayClick}
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
