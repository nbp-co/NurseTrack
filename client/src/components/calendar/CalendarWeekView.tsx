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

interface CalendarWeekViewProps {
  selectedDate: string;
  shifts: Shift[];
  onDateSelect: (date: string) => void;
  onAddShift: (date?: string) => void;
  onEditShift: (shift: Shift) => void;
}

export function CalendarWeekView({
  selectedDate,
  shifts,
  onDateSelect,
  onAddShift,
  onEditShift
}: CalendarWeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(() => {
    const date = new Date(selectedDate || new Date());
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - date.getDay());
    return sunday;
  });

  const today = new Date().toISOString().split('T')[0];

  // Generate week days
  const weekDays = useMemo(() => {
    const days = [];
    const current = new Date(currentWeek);
    
    for (let i = 0; i < 7; i++) {
      const dateStr = current.toISOString().split('T')[0];
      const dayShifts = shifts.filter(shift => shift.localDate === dateStr);
      const isToday = dateStr === today;
      const isSelected = dateStr === selectedDate;
      
      days.push({
        date: dateStr,
        day: current.getDate(),
        dayName: current.toLocaleDateString('en-US', { weekday: 'short' }),
        month: current.toLocaleDateString('en-US', { month: 'short' }),
        isToday,
        isSelected,
        shifts: dayShifts
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentWeek, shifts, selectedDate, today]);

  const handlePrevWeek = () => {
    const prevWeek = new Date(currentWeek);
    prevWeek.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(prevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(nextWeek);
  };

  const formatTime = (utcDateString: string) => {
    return new Date(utcDateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isOvernightShift = (shift: Shift) => {
    const start = new Date(shift.startUtc);
    const end = new Date(shift.endUtc);
    return end.getDate() !== start.getDate();
  };

  const getShiftTimePosition = (shift: Shift) => {
    const start = new Date(shift.startUtc);
    const end = new Date(shift.endUtc);
    
    // Convert to minutes from midnight
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    
    // If overnight, end time is next day
    const actualEndMinutes = endMinutes < startMinutes ? endMinutes + 24 * 60 : endMinutes;
    
    // Position as percentage of 24 hours
    const topPercent = (startMinutes / (24 * 60)) * 100;
    const heightPercent = ((actualEndMinutes - startMinutes) / (24 * 60)) * 100;
    
    return {
      top: `${Math.max(0, Math.min(95, topPercent))}%`,
      height: `${Math.max(5, Math.min(100 - topPercent, heightPercent))}%`
    };
  };

  const weekRange = `${weekDays[0]?.month} ${weekDays[0]?.day} - ${weekDays[6]?.month} ${weekDays[6]?.day}, ${currentWeek.getFullYear()}`;

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={handlePrevWeek} data-testid="button-prev-week">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {weekRange}
          </h2>
          <Button variant="outline" size="sm" onClick={handleNextWeek} data-testid="button-next-week">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Week Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b">
            <div className="p-4 text-center text-sm font-medium text-gray-500 border-r">
              Time
            </div>
            {weekDays.map((day) => (
              <div 
                key={day.date} 
                className={cn(
                  "p-4 text-center border-r last:border-r-0 cursor-pointer hover:bg-gray-50",
                  day.isSelected && "bg-blue-50 border-blue-200",
                  day.isToday && "bg-yellow-50"
                )}
                onClick={() => onDateSelect(day.date)}
                data-testid={`week-day-header-${day.date}`}
              >
                <div className={cn(
                  "text-sm font-medium",
                  day.isToday && "text-blue-600 font-bold",
                  day.isSelected && "text-blue-600"
                )}>
                  {day.dayName}
                </div>
                <div className={cn(
                  "text-lg font-bold",
                  day.isToday && "text-blue-600",
                  day.isSelected && "text-blue-600"
                )}>
                  {day.day}
                </div>
                <div className="text-xs text-gray-500">
                  {day.shifts.length} shift{day.shifts.length !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="grid grid-cols-8 relative min-h-[600px]">
            {/* Time Column */}
            <div className="border-r">
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="h-12 border-b text-xs text-gray-500 p-2">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
              ))}
            </div>

            {/* Day Columns with Shifts */}
            {weekDays.map((day) => (
              <div 
                key={day.date} 
                className="border-r last:border-r-0 relative cursor-pointer"
                onClick={() => onAddShift(day.date)}
                data-testid={`week-day-column-${day.date}`}
              >
                {/* Hour Grid Lines */}
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="h-12 border-b border-gray-100" />
                ))}

                {/* Shift Chips */}
                <div className="absolute inset-0 p-1">
                  {day.shifts.map((shift) => {
                    const position = getShiftTimePosition(shift);
                    return (
                      <div
                        key={shift.id}
                        className={cn(
                          "absolute left-1 right-1 p-1 rounded text-xs cursor-pointer z-10",
                          "hover:shadow-md transition-shadow",
                          shift.contractId 
                            ? "bg-blue-100 border border-blue-300 text-blue-800" 
                            : "bg-gray-100 border border-gray-300 text-gray-800"
                        )}
                        style={position}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditShift(shift);
                        }}
                        data-testid={`week-shift-chip-${shift.id}`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {shift.contractId && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                          <span className="font-medium truncate">
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
                        <div className="text-xs">
                          {shift.contractId ? 'Contract' : 'No contract'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Shift Hover */}
                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-gray-50/50 flex items-center justify-center">
                  <Button size="sm" variant="outline" className="shadow-md">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Shift
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}