import { Clock, MapPin, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

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

interface UpcomingShiftsListProps {
  shifts: Shift[];
  onShiftClick: (shift: Shift) => void;
}

export function UpcomingShiftsList({ shifts, onShiftClick }: UpcomingShiftsListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

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

  // Filter and sort upcoming shifts (next 7 days, limit 5)
  const today = new Date().toISOString().split('T')[0];
  const upcomingShifts = shifts
    .filter(shift => shift.localDate >= today)
    .sort((a, b) => new Date(a.localDate).getTime() - new Date(b.localDate).getTime())
    .slice(0, 5);

  if (upcomingShifts.length === 0) {
    return null;
  }

  return (
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
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="button-toggle-upcoming-shifts"
          >
            <ChevronUp className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="space-y-3">
            {upcomingShifts.map((shift) => (
              <div 
                key={shift.id} 
                className="bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors" 
                data-testid={`shift-item-${shift.id}`}
                onClick={() => onShiftClick(shift)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(shift.localDate)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <MapPin className="w-3 h-3" />
                      {shift.facility || 'No facility'}
                    </div>
                    {shift.contractId && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {formatTime(shift.startUtc)} - {formatTime(shift.endUtc)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}