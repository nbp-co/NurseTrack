import { Button } from "@/components/ui/button";

interface CalendarWeekProps {
  isWeekView: boolean;
  onToggle: (isWeek: boolean) => void;
}

export function CalendarWeek({ isWeekView, onToggle }: CalendarWeekProps) {
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
