import { ReactNode } from "react";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 lg:px-8 px-4 py-4 h-[73px] flex items-center">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1" data-testid="text-page-subtitle">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div data-testid="container-header-actions">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
