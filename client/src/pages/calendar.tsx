import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Calendar as CalendarIcon, Clock } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { UpcomingShiftsList } from "@/components/calendar/UpcomingShiftsList";
import { AddEditShiftModal } from "@/components/calendar/AddEditShiftModal";
import { PageLoader } from "@/components/ui/loader";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CalendarPage() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // URL state management
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const selectedDateFromUrl = urlParams.get('d');
  
  const [selectedDate, setSelectedDate] = useState<string>(selectedDateFromUrl || new Date().toISOString().split('T')[0]);
  const [currentView, setCurrentView] = useState<'month'>('month');
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  
  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedDate !== new Date().toISOString().split('T')[0]) {
      params.set('d', selectedDate);
    }
    const newUrl = params.toString() ? `${location.split('?')[0]}?${params.toString()}` : location.split('?')[0];
    if (newUrl !== location) {
      setLocation(newUrl, { replace: true });
    }
  }, [selectedDate, currentView, location, setLocation]);

  // Calculate visible date range for month view
  const getVisibleRange = () => {
    const date = new Date(selectedDate);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
      from: start.toISOString().split('T')[0],
      to: end.toISOString().split('T')[0]
    };
  };
  
  const visibleRange = getVisibleRange();
  
  // Fetch active contracts
  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['/api/contracts', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/contracts?userId=${user?.id}&status=active`);
      return res.json();
    },
    enabled: !!user,
  });
  
  // Fetch shifts for visible range
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['/api/shifts', visibleRange.from, visibleRange.to, user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/shifts?userId=${user?.id}&from=${visibleRange.from}&to=${visibleRange.to}`);
      return res.json();
    },
    enabled: !!user && !!user.id,
  });
  
  // Get upcoming shifts (next 7 days)
  const upcomingRange = {
    from: new Date().toISOString().split('T')[0],
    to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };
  
  const { data: upcomingShifts = [] } = useQuery({
    queryKey: ['/api/shifts', 'upcoming', upcomingRange.from, upcomingRange.to, user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/shifts?userId=${user?.id}&from=${upcomingRange.from}&to=${upcomingRange.to}`);
      return res.json();
    },
    enabled: !!user && !!user.id,
  });


  const isLoading = contractsLoading || shiftsLoading;
  
  // Create shift mutation
  const createShiftMutation = useMutation({
    mutationFn: async (shiftData: any) => {
      const res = await apiRequest('POST', `/api/shifts?userId=${user?.id}`, shiftData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({
        title: "Shift created",
        description: "Your shift has been added successfully.",
      });
      setShowAddEditModal(false);
      setEditingShift(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create shift. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Update shift mutation
  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, ...shiftData }: any) => {
      const res = await apiRequest('PUT', `/api/shifts/${id}`, shiftData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({
        title: "Shift updated",
        description: "Your shift has been updated successfully.",
      });
      setShowAddEditModal(false);
      setEditingShift(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update shift. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Delete shift mutation
  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const res = await apiRequest('DELETE', `/api/shifts/${shiftId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({
        title: "Shift deleted",
        description: "Shift has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete shift. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };
  
  
  const handleAddShift = (date?: string) => {
    setEditingShift(null);
    if (date) {
      setSelectedDate(date);
    }
    setShowAddEditModal(true);
  };
  
  const handleEditShift = (shift: any) => {
    setEditingShift(shift);
    setShowAddEditModal(true);
  };
  
  // Convert 12-hour time format to 24-hour format
  const convertTo24Hour = (time12h: string): string => {
    // If already in 24-hour format and matches HH:mm pattern, return as-is
    if (!time12h.includes('AM') && !time12h.includes('PM')) {
      // Ensure it's properly formatted as HH:mm
      const [hours, minutes] = time12h.split(':');
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
    
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    
    if (modifier === 'AM') {
      if (hour === 12) {
        hours = '00';
      } else {
        hours = hour.toString();
      }
    } else if (modifier === 'PM') {
      if (hour !== 12) {
        hours = (hour + 12).toString();
      } else {
        hours = '12';
      }
    }
    
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  };

  const handleShiftSubmit = (shiftData: any) => {
    // Convert times to 24-hour format before sending to backend
    const convertedData = {
      ...shiftData,
      start: convertTo24Hour(shiftData.start),
      end: convertTo24Hour(shiftData.end)
    };
    
    if (editingShift) {
      updateShiftMutation.mutate({ id: editingShift.id, ...convertedData });
    } else {
      createShiftMutation.mutate(convertedData);
    }
  };
  
  const handleShiftDelete = (shiftId: string) => {
    if (confirm('Are you sure you want to delete this shift?')) {
      deleteShiftMutation.mutate(shiftId);
    }
  };
  
  const dayShifts = useMemo(() => {
    return shifts.filter(shift => shift.localDate === selectedDate);
  }, [shifts, selectedDate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with form inputs
      }
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          const prevDate = new Date(selectedDate);
          prevDate.setDate(prevDate.getDate() - 1);
          setSelectedDate(prevDate.toISOString().split('T')[0]);
          break;
        case 'ArrowRight':
          e.preventDefault();
          const nextDate = new Date(selectedDate);
          nextDate.setDate(nextDate.getDate() + 1);
          setSelectedDate(nextDate.toISOString().split('T')[0]);
          break;
        case 'Enter':
          e.preventDefault();
          handleAddShift(selectedDate);
          break;
        case 'Escape':
          if (showAddEditModal) {
            setShowAddEditModal(false);
            setEditingShift(null);
          }
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate, showAddEditModal]);

  if (isLoading) {
    return <PageLoader text="Loading calendar..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        title="Calendar"
        subtitle="View and manage your shift schedule"
        actions={
          <Button 
            onClick={() => handleAddShift()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-add-shift"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Shift
          </Button>
        }
      />

      <div className="container mx-auto px-4 py-6">
        {/* Upcoming Shifts */}
        <UpcomingShiftsList 
          shifts={upcomingShifts}
          onShiftClick={handleEditShift}
        />

        {/* Calendar Month View */}
        <CalendarMonthView
          selectedDate={selectedDate}
          shifts={shifts}
          onDateSelect={handleDateSelect}
          onAddShift={handleAddShift}
          onEditShift={handleEditShift}
          dayShifts={dayShifts}
        />
      </div>

      {/* Add/Edit Shift Modal */}
      <AddEditShiftModal
        isOpen={showAddEditModal}
        onClose={() => {
          setShowAddEditModal(false);
          setEditingShift(null);
        }}
        onSubmit={handleShiftSubmit}
        onDelete={handleShiftDelete}
        editingShift={editingShift}
        contracts={contracts}
        selectedDate={selectedDate}
        isSubmitting={createShiftMutation.isPending || updateShiftMutation.isPending}
      />
    </div>
  );
}
