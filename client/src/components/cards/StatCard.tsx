import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: ReactNode;
  isLoading?: boolean;
  trend?: "up" | "down" | "neutral";
  trendColor?: "success" | "error" | "warning";
}

export function StatCard({ 
  label, 
  value, 
  subtext, 
  icon, 
  isLoading = false,
  trend,
  trendColor = "success"
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-32 mt-4" />
        </CardContent>
      </Card>
    );
  }

  const trendColorClass = {
    success: "text-success-600",
    error: "text-error-600", 
    warning: "text-warning-600"
  }[trendColor];

  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "–";

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600" data-testid="text-stat-label">
              {label}
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-2" data-testid="text-stat-value">
              {value}
            </p>
          </div>
          {icon && (
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
        {subtext && (
          <p className={`text-sm mt-4 ${trendColorClass || "text-gray-600"}`} data-testid="text-stat-subtext">
            {trend && <span className="mr-1">{trendIcon}</span>}
            {subtext}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
