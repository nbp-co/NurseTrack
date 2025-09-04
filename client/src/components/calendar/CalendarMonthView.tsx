import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Shift {
  id: number;
  localDate: string;
  startUtc: string;
  endUtc: string;
  facility?: string;
  contractId?: number | null;
  status: string;
  source: string;
}

interface Contract {
  id: number;
  name: string;
  facility: string;
}

interface CalendarMonthViewProps {
  selectedDate: string;
  shifts: Shift[];
  onDateSelect: (date: string) => void;
  onAddShift: (date?: string) => void;
  onEditShift: (shift: Shift) => void;
  dayShifts: Shift[];
}

export function CalendarMonthView({
  selectedDate,
  shifts,
  onDateSelect,
  onAddShift,
  onEditShift,
  dayShifts
}: CalendarMonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date(selectedDate || new Date());
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const today = new Date().toISOString().split('T')[0];

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentMonth);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Start from Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    // End on Saturday of the week containing the last day  
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayShifts = shifts.filter(shift => shift.localDate === dateStr);
      const isCurrentMonth = current.getMonth() === currentMonth.getMonth();
      const isToday = dateStr === today;
      const isSelected = dateStr === selectedDate;
      
      days.push({
        date: dateStr,
        day: current.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
        shifts: dayShifts
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentMonth, shifts, selectedDate, today]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const formatTime = (utcDateString: string) => {
    const date = new Date(utcDateString);
    const hour = date.getHours();
    const minute = date.getMinutes();
    
    // Format as "8A" or "8P" style
    if (minute === 0) {
      // For times on the hour, show just hour + A/P
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const period = hour < 12 ? 'A' : 'P';
      return `${displayHour}${period}`;
    } else {
      // For times with minutes, show hour:minute + AM/PM
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const period = hour < 12 ? 'AM' : 'PM';
      return `${displayHour}:${minute.toString().padStart(2, '0')}${period}`;
    }
  };

  const isOvernightShift = (shift: Shift) => {
    const start = new Date(shift.startUtc);
    const end = new Date(shift.endUtc);
    return end.getDate() !== start.getDate();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={handlePrevMonth} data-testid="button-prev-month">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <Button variant="outline" size="sm" onClick={handleNextMonth} data-testid="button-next-month">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-4 text-center text-sm font-medium text-gray-500 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => (
              <div
                key={day.date}
                className={cn(
                  "min-h-[120px] p-2 border-r border-b last:border-r-0 cursor-pointer hover:bg-gray-50 transition-colors",
                  !day.isCurrentMonth && "bg-gray-50 text-gray-400",
                  day.isSelected && "bg-blue-50 border-blue-200",
                  day.isToday && "bg-yellow-50"
                )}
                onClick={() => onDateSelect(day.date)}
                data-testid={`calendar-day-${day.date}`}
              >
                <div className={cn(
                  "text-sm font-medium mb-1",
                  day.isToday && "text-blue-600 font-bold",
                  day.isSelected && "text-blue-600"
                )}>
                  {day.day}
                </div>

                {/* Shift chips */}
                <div className="space-y-1">
                  {day.shifts.slice(0, 2).map((shift) => (
                    <div
                      key={shift.id}
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded cursor-pointer truncate",
                        shift.contractId 
                          ? "bg-blue-100 text-blue-800 hover:bg-blue-200" 
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditShift(shift);
                      }}
                      data-testid={`shift-chip-${shift.id}`}
                    >
                      <div className="flex items-center gap-1">
                        {shift.contractId && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                        <span className="truncate">
                          {formatTime(shift.startUtc)}-{formatTime(shift.endUtc)}
                        </span>
                        {isOvernightShift(shift) && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">(+1 day)</Badge>
                        )}
                      </div>
                      {shift.facility && (
                        <div className="truncate text-gray-600">
                          {shift.facility}
                        </div>
                      )}
                      {!shift.contractId && (
                        <div className="truncate text-gray-500 text-xs">
                          No contract
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {day.shifts.length > 2 && (
                    <div className="text-xs text-gray-500 px-1.5">
                      +{day.shifts.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Panel */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{formatDate(selectedDate)}</span>
                <Badge variant="outline" className="text-xs">
                  {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <Button 
                onClick={() => onAddShift(selectedDate)}
                size="sm"
                data-testid="button-add-shift-day"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Shift
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayShifts.length > 0 ? (
              <div className="space-y-3">
                {dayShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => onEditShift(shift)}
                    data-testid={`day-shift-${shift.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {shift.contractId && (
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                      )}
                      <div>
                        <div className="font-medium">
                          {formatTime(shift.startUtc)} - {formatTime(shift.endUtc)}
                          {isOvernightShift(shift) && (
                            <Badge variant="secondary" className="ml-2 text-xs">+1 day</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {shift.facility || 'No facility'}
                          {shift.contractId ? ' • Contract' : ' • No contract'}
                        </div>
                      </div>
                    </div>
                    <Badge variant={shift.status === 'completed' ? 'default' : 'secondary'}>
                      {shift.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">No shifts scheduled for this day</p>
                <Button 
                  onClick={() => onAddShift(selectedDate)}
                  variant="outline"
                  data-testid="button-add-shift-empty-day"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Shift
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}