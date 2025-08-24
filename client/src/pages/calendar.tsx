import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
