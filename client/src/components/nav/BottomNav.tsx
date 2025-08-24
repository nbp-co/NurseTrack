import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Calendar, 
  FileText, 
  Receipt 
} from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/contracts", label: "Contracts", icon: FileText },
  { path: "/expenses", label: "Expenses", icon: Receipt },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] block lg:hidden z-50">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                isActive ? "text-primary" : "text-gray-500 hover:text-primary"
              }`}
              data-testid={`button-nav-${item.label.toLowerCase()}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
