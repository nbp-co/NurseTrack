import { useState, useEffect } from "react";
import { Calendar, Clock, DollarSign, User2, ArrowRight, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface WelcomeBackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WelcomeBackDialog({ open, onOpenChange }: WelcomeBackDialogProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-close dialog after 3 seconds
  useEffect(() => {
    if (open) {
      const autoCloseTimer = setTimeout(() => {
        onOpenChange(false);
        setLocation('/dashboard');
      }, 3000);
      return () => clearTimeout(autoCloseTimer);
    }
  }, [open, onOpenChange, setLocation]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getTimeOfDayEmoji = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "🌅";
    if (hour < 17) return "☀️";
    return "🌙";
  };

  const handleQuickAction = (path: string) => {
    onOpenChange(false);
    setLocation(path);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // When dialog is closed (including X button), navigate to dashboard
      setLocation('/dashboard');
    }
    onOpenChange(open);
  };

  const handleDialogContentClick = (e: React.MouseEvent) => {
    // Check if the click target is within the quick actions area
    const target = e.target as HTMLElement;
    const quickActionsArea = target.closest('[data-quick-actions]');
    
    if (!quickActionsArea) {
      // Navigate to dashboard if not clicking on quick actions
      onOpenChange(false);
      setLocation('/dashboard');
    }
  };

  const handleCloseClick = () => {
    onOpenChange(false);
    setLocation('/dashboard');
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent 
        className="sm:max-w-[500px] bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 cursor-pointer" 
        data-testid="dialog-welcome-back"
        onClick={handleDialogContentClick}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-full">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2" data-testid="text-welcome-title">
              {getGreeting()}, {user?.name || "Nurse"}! {getTimeOfDayEmoji()}
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 text-base italic" data-testid="text-welcome-description">
            "Every shift is an opportunity to make a difference. You've got this! 💪"
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {/* Quick Actions */}
          <div className="space-y-3" data-quick-actions>
            <h3 className="font-semibold text-gray-900 text-sm">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto p-3 bg-white/70 backdrop-blur-sm hover:bg-white/90 border-blue-200 hover:border-blue-300 transition-all"
                onClick={() => handleQuickAction('/calendar')}
                data-testid="button-view-schedule"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Schedule</p>
                    <p className="text-xs text-gray-600">View shifts</p>
                  </div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto p-3 bg-white/70 backdrop-blur-sm hover:bg-white/90 border-blue-200 hover:border-blue-300 transition-all"
                onClick={() => handleQuickAction('/contracts')}
                data-testid="button-view-contracts"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Contracts</p>
                    <p className="text-xs text-gray-600">Manage work</p>
                  </div>
                </div>
              </Button>
            </div>
          </div>

        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button 
            variant="outline" 
            onClick={handleCloseClick}
            className="bg-white/70 backdrop-blur-sm hover:bg-white/90"
            data-testid="button-close-welcome"
          >
            Close
          </Button>
          <Button 
            onClick={() => handleQuickAction('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            data-testid="button-go-to-dashboard"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}