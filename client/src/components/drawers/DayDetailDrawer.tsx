import { useState } from "react";
import { X, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shift } from "@/types";

interface DayDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  shifts: Shift[];
  onConfirmShift: (shiftId: string, updates: { actualStart: string; actualEnd: string }) => void;
  onAddShift: () => void;
}

export function DayDetailDrawer({ 
  isOpen, 
  onClose, 
  selectedDate, 
  shifts,
  onConfirmShift,
  onAddShift
}: DayDetailDrawerProps) {
  const [editingShift, setEditingShift] = useState<string | null>(null);
  const [timeUpdates, setTimeUpdates] = useState<{ actualStart: string; actualEnd: string }>({
    actualStart: '',
    actualEnd: ''
  });

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const calculateDailyStats = () => {
    const totalHours = shifts.reduce((sum, shift) => {
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

    const earnings = shifts.reduce((sum, shift) => {
      // Note: In real app, would get hourly rate from contract
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

  const handleConfirmShift = (shift: Shift) => {
    if (editingShift === shift.id) {
      onConfirmShift(shift.id, timeUpdates);
      setEditingShift(null);
    } else {
      setEditingShift(shift.id);
      setTimeUpdates({
        actualStart: shift.actualStart || shift.start,
        actualEnd: shift.actualEnd || shift.end
      });
    }
  };

  const stats = calculateDailyStats();

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex justify-center items-end"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white shadow-xl flex flex-col rounded-t-xl max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900" data-testid="text-drawer-date">
                {formatDate(selectedDate)}
              </h2>
              <p className="text-sm text-gray-500" data-testid="text-shift-count">
                {selectedDate === new Date().toISOString().split('T')[0] ? 'Today • ' : ''}
                {shifts.length} shift{shifts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="button-close-drawer"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Daily Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Daily Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Total Hours</p>
                <p className="font-medium text-gray-900" data-testid="text-daily-hours">
                  {stats.hours} hours
                </p>
              </div>
              <div>
                <p className="text-gray-500">Earnings</p>
                <p className="font-medium text-gray-900" data-testid="text-daily-earnings">
                  ${stats.earnings}
                </p>
              </div>
            </div>
          </div>

          {/* Shifts List */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Shifts</h3>
            
            {shifts.map((shift) => (
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
                          {shift.actualStart || shift.start} - {shift.actualEnd || shift.end}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleConfirmShift(shift)}
                    className="text-primary hover:text-primary/80"
                    data-testid={`button-confirm-shift-${shift.id}`}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    {editingShift === shift.id ? "Save Changes" : "Confirm Completion"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <Button 
            onClick={onAddShift} 
            className="w-full"
            data-testid="button-add-shift"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Shift
          </Button>
        </div>
      </div>
    </div>
  );
}
