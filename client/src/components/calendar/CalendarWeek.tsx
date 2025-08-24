import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarEvent } from "@/types";

interface CalendarWeekToggleProps {
  isWeekView: boolean;
  onToggle: (isWeek: boolean) => void;
}

export function CalendarWeekToggle({ isWeekView, onToggle }: CalendarWeekToggleProps) {
  return (
    <div className="bg-gray-100 p-1 rounded-lg">
      <Button
        variant={!isWeekView ? "default" : "ghost"}
        size="sm"
        onClick={() => onToggle(false)}
        className={!isWeekView ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}
        data-testid="button-month-view"
      >
        Month
      </Button>
      <Button
        variant={isWeekView ? "default" : "ghost"}
        size="sm"
        onClick={() => onToggle(true)}
        className={isWeekView ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}
        data-testid="button-week-view"
      >
        Week
      </Button>
    </div>
  );
}

interface CalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateChange: (date: Date) => void;
  onDayClick: (date: string) => void;
}

export function CalendarWeekView({ currentDate, events, onDateChange, onDayClick }: CalendarWeekViewProps) {
  const { weeks, weekDates } = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weeks = [];
    const weekDates = [];
    
    // Generate two weeks
    for (let w = 0; w < 2; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + (w * 7) + d);
        week.push(date);
        weekDates.push(date);
      }
      weeks.push(week);
    }
    
    return { weeks, weekDates };
  }, [currentDate]);

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  const goToPreviousWeeks = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 14);
    onDateChange(newDate);
  };

  const goToNextWeeks = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 14);
    onDateChange(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    onDateChange(today);
  };

  const formatWeekRange = () => {
    const firstDate = weekDates[0];
    const lastDate = weekDates[weekDates.length - 1];
    
    if (firstDate.getMonth() === lastDate.getMonth()) {
      return `${firstDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()} ${firstDate.getDate()}-${lastDate.getDate()}, ${firstDate.getFullYear()}`;
    } else {
      return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}, ${lastDate.getFullYear()}`;
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousWeeks}
            data-testid="button-prev-weeks"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <h2 className="text-xl font-semibold text-gray-900" data-testid="text-week-range">
            {formatWeekRange()}
          </h2>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              data-testid="button-today-week"
              title="Go to today"
            >
              <Calendar className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextWeeks}
              data-testid="button-next-weeks"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Week Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
          <div key={day} className="p-4 text-center text-sm font-medium text-gray-500 border-r border-gray-200 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Week Grid */}
      <div className="divide-y divide-gray-200">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 min-h-[100px]">
            {week.map((date) => {
              const dayEvents = getEventsForDate(date);
              const dateStr = date.toISOString().split('T')[0];
              
              return (
                <div
                  key={date.toISOString()}
                  className="p-2 border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onDayClick(dateStr)}
                  data-testid={`day-${dateStr}`}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${
                        isToday(date) 
                          ? 'text-white bg-primary rounded-full w-6 h-6 flex items-center justify-center' 
                          : isCurrentMonth(date) 
                            ? 'text-gray-900' 
                            : 'text-gray-400'
                      }`}>
                        {date.getDate()}
                      </span>
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      {dayEvents.slice(0, 2).map((event, index) => (
                        <div key={event.id} className="text-xs">
                          <Badge 
                            variant={event.completed ? "default" : "secondary"} 
                            className="w-full text-center py-0.5 text-[10px]"
                          >
                            {event.type === 'shift' ? 'Shift' : 'Expense'}
                          </Badge>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-gray-500 text-center">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
