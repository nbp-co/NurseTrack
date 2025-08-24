import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@/types";

interface CalendarMonthProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateChange: (date: Date) => void;
  onDayClick: (date: string) => void;
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

export function CalendarMonth({ currentDate, events, onDateChange, onDayClick }: CalendarMonthProps) {
  const [viewDate, setViewDate] = useState(currentDate);
  
  const calendarData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // End on Saturday of the week containing the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const weeks = [];
    const currentWeek = [];
    let current = new Date(startDate);
    
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayEvents = events.filter(event => event.date === dateStr);
      
      currentWeek.push({
        date: new Date(current),
        dateString: dateStr,
        isCurrentMonth: current.getMonth() === month,
        isToday: dateStr === new Date().toISOString().split('T')[0],
        events: dayEvents
      });
      
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek.length = 0;
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return weeks;
  }, [viewDate, events]);
  
  const handlePrevMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setViewDate(newDate);
    onDateChange(newDate);
  };
  
  const handleNextMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setViewDate(newDate);
    onDateChange(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    setViewDate(today);
    onDateChange(today);
  };

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevMonth}
          data-testid="button-prev-month"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <h2 className="text-xl font-semibold text-gray-900" data-testid="text-current-month">
          {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
        </h2>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToday}
            data-testid="button-today"
            title="Go to today"
          >
            <Calendar className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            data-testid="button-next-month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {DAYS.map(day => (
            <div key={day} className="p-4 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarData.map((week, weekIndex) =>
            week.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`p-3 min-h-[100px] border-r border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                  day.isToday ? "bg-primary/10" : ""
                } ${!day.isCurrentMonth ? "text-gray-400" : ""}`}
                onClick={() => onDayClick(day.dateString)}
                data-testid={`cell-calendar-day-${day.dateString}`}
              >
                <span className={`text-sm font-medium ${
                  day.isToday 
                    ? "text-primary" 
                    : day.isCurrentMonth 
                      ? "text-gray-900" 
                      : "text-gray-400"
                }`}>
                  {day.date.getDate()}
                </span>
                {day.events.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {day.events.slice(0, 2).map((event, eventIndex) => {
                      let dotColor = "bg-gray-400"; // Default
                      if (event.type === 'shift') {
                        if (event.completed) {
                          dotColor = "bg-blue-500"; // Blue for completed
                        } else {
                          dotColor = "bg-green-500"; // Green for scheduled
                        }
                      } else {
                        dotColor = "bg-yellow-500"; // Expenses
                      }
                      
                      return (
                        <div
                          key={event.id}
                          className={`w-2 h-2 rounded-full ${dotColor}`}
                          data-testid={`indicator-event-${event.type}-${eventIndex}`}
                        />
                      );
                    })}
                    {day.events.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{day.events.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
