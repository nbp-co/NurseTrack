import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Calendar, 
  FileText, 
  Receipt, 
  User2, 
  Settings 
} from "lucide-react";
import { User } from "@/types";

interface SideNavProps {
  user: User | null;
}

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/contracts", label: "Contracts", icon: FileText },
  { path: "/expenses", label: "Expenses", icon: Receipt },
];

export function SideNav({ user }: SideNavProps) {
  const [location] = useLocation();

  return (
    <nav className="hidden lg:flex lg:flex-col lg:w-[260px] lg:border-r lg:bg-white lg:shadow-sm">
      <div className="p-6 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <User2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-gray-900" data-testid="text-app-title">
            NurseTrack
          </h1>
        </div>
      </div>
      
      <div className="flex-1 py-6">
        <div className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                data-testid={`link-nav-${item.label.toLowerCase()}`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      
      <div className="p-4 border-t">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <User2 className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate" data-testid="text-user-name">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 truncate" data-testid="text-user-role">
              {user?.role || "Nurse"}
            </p>
          </div>
          <Link
            href="/profile"
            className="text-gray-400 hover:text-gray-600 p-1"
            data-testid="button-user-settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
