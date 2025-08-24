import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  testId?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  testId = "empty-state"
}: EmptyStateProps) {
  return (
    <div className="text-center py-12" data-testid={testId}>
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2" data-testid="text-empty-title">
        {title}
      </h3>
      <p className="text-gray-500 mb-6" data-testid="text-empty-description">
        {description}
      </p>
      {action && (
        <Button 
          onClick={action.onClick}
          data-testid="button-empty-action"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
