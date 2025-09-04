import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
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

  // Generate 2 weeks of days (14 days)
  const weekDays = useMemo(() => {
    const days = [];
    const current = new Date(currentWeek);
    
    for (let i = 0; i < 14; i++) {
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
    prevWeek.setDate(currentWeek.getDate() - 14);
    setCurrentWeek(prevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(currentWeek.getDate() + 14);
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

  const weekRange = `${weekDays[0]?.month} ${weekDays[0]?.day} - ${weekDays[13]?.month} ${weekDays[13]?.day}, ${currentWeek.getFullYear()}`;

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-center relative">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePrevWeek} 
          data-testid="button-prev-week"
          className="absolute left-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <h2 className="text-xl font-semibold">
          {weekRange}
        </h2>
        
        <div className="flex items-center space-x-2 absolute right-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              const sunday = new Date(today);
              sunday.setDate(today.getDate() - today.getDay());
              setCurrentWeek(sunday);
            }}
            data-testid="button-today"
            title="Go to today"
          >
            <Calendar className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNextWeek} 
            data-testid="button-next-week"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 2-Week Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Day Headers - First Week */}
          <div className="grid grid-cols-7 border-b">
            {weekDays.slice(0, 7).map((day) => (
              <div key={day.date} className="p-2 text-center text-xs font-medium text-gray-500 border-r last:border-r-0">
                {day.dayName}
              </div>
            ))}
          </div>

          {/* First Week Days */}
          <div className="grid grid-cols-7">
            {weekDays.slice(0, 7).map((day) => (
              <div
                key={day.date}
                className={cn(
                  "min-h-[120px] border-r border-b last:border-r-0 p-2 cursor-pointer hover:bg-gray-50 transition-colors relative",
                  day.isSelected && "bg-blue-50 border-blue-200",
                  day.isToday && "bg-yellow-50"
                )}
                onClick={() => onDateSelect(day.date)}
                data-testid={`day-cell-${day.date}`}
              >
                <div className={cn(
                  "text-sm font-medium mb-1",
                  day.isToday && "text-blue-600 font-bold",
                  day.isSelected && "text-blue-600"
                )}>
                  {day.day}
                </div>
                
                <div className="space-y-1">
                  {day.shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className={cn(
                        "text-xs p-1 rounded cursor-pointer hover:shadow-sm transition-shadow",
                        shift.contractId 
                          ? "bg-blue-100 border border-blue-300 text-blue-800" 
                          : "bg-gray-100 border border-gray-300 text-gray-700"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditShift(shift);
                      }}
                      data-testid={`shift-${shift.id}`}
                    >
                      <div className="flex items-center gap-1 mb-1">
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
                    </div>
                  ))}
                </div>

                {/* Add shift button on hover */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute bottom-1 right-1 opacity-0 hover:opacity-100 transition-opacity h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddShift(day.date);
                  }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Second Week Days */}
          <div className="grid grid-cols-7">
            {weekDays.slice(7, 14).map((day) => (
              <div
                key={day.date}
                className={cn(
                  "min-h-[120px] border-r border-b last:border-r-0 p-2 cursor-pointer hover:bg-gray-50 transition-colors relative",
                  day.isSelected && "bg-blue-50 border-blue-200",
                  day.isToday && "bg-yellow-50"
                )}
                onClick={() => onDateSelect(day.date)}
                data-testid={`day-cell-${day.date}`}
              >
                <div className={cn(
                  "text-sm font-medium mb-1",
                  day.isToday && "text-blue-600 font-bold",
                  day.isSelected && "text-blue-600"
                )}>
                  {day.day}
                </div>
                
                <div className="space-y-1">
                  {day.shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className={cn(
                        "text-xs p-1 rounded cursor-pointer hover:shadow-sm transition-shadow",
                        shift.contractId 
                          ? "bg-blue-100 border border-blue-300 text-blue-800" 
                          : "bg-gray-100 border border-gray-300 text-gray-700"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditShift(shift);
                      }}
                      data-testid={`shift-${shift.id}`}
                    >
                      <div className="flex items-center gap-1 mb-1">
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
                    </div>
                  ))}
                </div>

                {/* Add shift button on hover */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute bottom-1 right-1 opacity-0 hover:opacity-100 transition-opacity h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddShift(day.date);
                  }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}