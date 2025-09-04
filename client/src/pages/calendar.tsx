import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronUp, Clock, MapPin, Calendar, CheckCircle2, Edit3 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CalendarMonth } from "@/components/calendar/CalendarMonth";
import { CalendarWeekToggle, CalendarWeekView } from "@/components/calendar/CalendarWeek";
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
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [editingShift, setEditingShift] = useState<string | null>(null);
  const [timeUpdates, setTimeUpdates] = useState<{ actualStart: string; actualEnd: string }>({
    actualStart: '',
    actualEnd: ''
  });
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
  };

  const handleConfirmShift = (shiftId: string, updates: { actualStart: string; actualEnd: string }) => {
    confirmShiftMutation.mutate({ shiftId, updates });
  };

  const handleCreateShift = (shiftData: Omit<Shift, 'id'>) => {
    createShiftMutation.mutate(shiftData);
  };

  const handleAddShiftToDay = () => {
    setShowShiftForm(true);
  };

  // Helper functions for inline day details
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const calculateDailyStats = (dayShifts: Shift[]) => {
    const totalHours = dayShifts.reduce((sum, shift) => {
      if (shift.completed && shift.actualStart && shift.actualEnd) {
        const start = parseTime(shift.actualStart);
        const end = parseTime(shift.actualEnd);
        return sum + (end - start) / (1000 * 60 * 60);
      } else {
        const start = parseTime(shift.start);
        const end = parseTime(shift.end);
        return sum + (end - start) / (1000 * 60 * 60);
      }
    }, 0);

    const earnings = dayShifts.reduce((sum, shift) => {
      const rate = 45; // Mock rate
      const hours = shift.completed && shift.actualStart && shift.actualEnd
        ? (parseTime(shift.actualEnd) - parseTime(shift.actualStart)) / (1000 * 60 * 60)
        : (parseTime(shift.end) - parseTime(shift.start)) / (1000 * 60 * 60);
      return sum + (hours * rate);
    }, 0);

    return {
      hours: Math.round(totalHours * 10) / 10,
      earnings: Math.round(earnings * 100) / 100
    };
  };

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.getTime();
  };

  const handleConfirmShiftInline = (shift: Shift) => {
    if (editingShift === shift.id) {
      handleConfirmShift(shift.id, timeUpdates);
      setEditingShift(null);
    } else {
      setEditingShift(shift.id);
      setTimeUpdates({
        actualStart: shift.actualStart || shift.start,
        actualEnd: shift.actualEnd || shift.end
      });
    }
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
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Upcoming Shifts
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUpcoming(!showUpcoming)}
                  data-testid="button-toggle-upcoming-shifts"
                >
                  <ChevronUp className={`w-4 h-4 transition-transform ${showUpcoming ? 'rotate-180' : ''}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            {showUpcoming && (
              <CardContent>
                <div className="space-y-2">
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
                    <div key={shift.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3" data-testid={`shift-item-${shift.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(shift.localDate)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="w-3 h-3" />
                            {shift.facility}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatTime(shift.startUtc)} - {formatTime(shift.endUtc)}
                      </div>
                    </div>
                  );
                })}
                </div>
              </CardContent>
            )}
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

      {/* Inline Day Details Section - below calendar */}
      {selectedDate && (
        <div className="lg:px-8 px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                {formatDate(selectedDate)}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  {selectedDate === new Date().toISOString().split('T')[0] ? 'Today • ' : ''}
                  {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dayShifts.length > 0 ? (
                <>
                  {/* Daily Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Daily Summary</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Total Hours</p>
                        <p className="font-medium text-gray-900" data-testid="text-daily-hours">
                          {calculateDailyStats(dayShifts).hours} hours
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Earnings</p>
                        <p className="font-medium text-gray-900" data-testid="text-daily-earnings">
                          ${calculateDailyStats(dayShifts).earnings}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Shifts List */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">Shifts</h3>
                    
                    {dayShifts.map((shift) => (
                      <div key={shift.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900" data-testid={`text-shift-facility-${shift.id}`}>
                              {shift.facility}
                            </h4>
                            <p className="text-sm text-gray-500" data-testid={`text-shift-role-${shift.id}`}>
                              {shift.role}
                            </p>
                          </div>
                          <Badge 
                            variant={shift.completed ? "default" : "secondary"}
                            data-testid={`badge-shift-status-${shift.id}`}
                          >
                            {shift.completed ? "Completed" : "Scheduled"}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Scheduled:</span>
                            <span className="text-gray-900" data-testid={`text-shift-scheduled-${shift.id}`}>
                              {shift.start} - {shift.end}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Actual:</span>
                            <div className="flex items-center space-x-2">
                              {editingShift === shift.id ? (
                                <>
                                  <Input
                                    type="time"
                                    value={timeUpdates.actualStart}
                                    onChange={(e) => setTimeUpdates(prev => ({ ...prev, actualStart: e.target.value }))}
                                    className="w-20 h-6 text-xs p-1"
                                    data-testid={`input-actual-start-${shift.id}`}
                                  />
                                  <span className="text-gray-500">-</span>
                                  <Input
                                    type="time"
                                    value={timeUpdates.actualEnd}
                                    onChange={(e) => setTimeUpdates(prev => ({ ...prev, actualEnd: e.target.value }))}
                                    className="w-20 h-6 text-xs p-1"
                                    data-testid={`input-actual-end-${shift.id}`}
                                  />
                                </>
                              ) : (
                                <span className="text-gray-900" data-testid={`text-shift-actual-${shift.id}`}>
                                  {shift.actualStart && shift.actualEnd 
                                    ? `${shift.actualStart} - ${shift.actualEnd}`
                                    : 'Not recorded'
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end mt-3">
                          <Button
                            variant={editingShift === shift.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleConfirmShiftInline(shift)}
                            data-testid={`button-confirm-shift-${shift.id}`}
                          >
                            {editingShift === shift.id ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Save
                              </>
                            ) : (
                              <>
                                <Edit3 className="w-4 h-4 mr-1" />
                                {shift.completed ? "Edit" : "Mark Complete"}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Add Shift Button */}
                    <Button 
                      onClick={handleAddShiftToDay} 
                      className="w-full"
                      variant="outline"
                      data-testid="button-add-shift-to-day"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Shift
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No shifts scheduled for this day</p>
                  <Button 
                    onClick={handleAddShiftToDay} 
                    data-testid="button-add-shift-empty"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Shift
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
