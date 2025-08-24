import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DonutCardProps {
  title: string;
  completeCount: number;
  remainingCount: number;
  percentage: number;
}

export function DonutCard({ title, completeCount, remainingCount, percentage }: DonutCardProps) {
  // Calculate stroke-dasharray for the progress circle
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (percentage / 100) * circumference;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900" data-testid="text-donut-title">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="relative w-48 h-48 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle 
              cx="50" 
              cy="50" 
              r={radius} 
              stroke="#E5E7EB" 
              strokeWidth="8" 
              fill="none"
            />
            {/* Progress circle */}
            <circle 
              cx="50" 
              cy="50" 
              r={radius} 
              stroke="hsl(var(--primary))" 
              strokeWidth="8" 
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              strokeLinecap="round"
              className="transition-all duration-500"
              data-testid="svg-donut-progress"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900" data-testid="text-donut-hours">
                {completeCount}
              </p>
              <p className="text-sm text-gray-500">Hours</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span className="text-sm text-gray-600">Hours Worked</span>
            </div>
            <span className="text-sm font-medium text-gray-900" data-testid="text-hours-worked">
              {completeCount}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <span className="text-sm text-gray-600">Hours Remaining</span>
            </div>
            <span className="text-sm font-medium text-gray-900" data-testid="text-hours-remaining">
              {remainingCount}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
