import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Calendar as CalendarIcon, Clock } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
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
  const viewFromUrl = urlParams.get('view') || 'month';
  
  const [selectedDate, setSelectedDate] = useState<string>(selectedDateFromUrl || new Date().toISOString().split('T')[0]);
  const [currentView, setCurrentView] = useState<'month' | 'week'>(viewFromUrl as 'month' | 'week');
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  
  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedDate !== new Date().toISOString().split('T')[0]) {
      params.set('d', selectedDate);
    }
    if (currentView !== 'month') {
      params.set('view', currentView);
    }
    const newUrl = params.toString() ? `${location.split('?')[0]}?${params.toString()}` : location.split('?')[0];
    if (newUrl !== location) {
      setLocation(newUrl, { replace: true });
    }
  }, [selectedDate, currentView, location, setLocation]);

  // Calculate visible date range based on current view
  const getVisibleRange = () => {
    const date = new Date(selectedDate);
    if (currentView === 'month') {
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return {
        from: start.toISOString().split('T')[0],
        to: end.toISOString().split('T')[0]
      };
    } else {
      // Week view - get Sunday to Saturday
      const sunday = new Date(date);
      sunday.setDate(date.getDate() - date.getDay());
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      return {
        from: sunday.toISOString().split('T')[0],
        to: saturday.toISOString().split('T')[0]
      };
    }
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
    enabled: !!user,
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
    enabled: !!user,
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
  
  const handleViewChange = (view: string) => {
    setCurrentView(view as 'month' | 'week');
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
  
  const handleShiftSubmit = (shiftData: any) => {
    if (editingShift) {
      updateShiftMutation.mutate({ id: editingShift.id, ...shiftData });
    } else {
      createShiftMutation.mutate(shiftData);
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

        {/* Calendar Tabs */}
        <Tabs value={currentView} onValueChange={handleViewChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="month" data-testid="tab-month">Month</TabsTrigger>
            <TabsTrigger value="week" data-testid="tab-week">Week</TabsTrigger>
          </TabsList>
          
          <TabsContent value="month" className="mt-0">
            <CalendarMonthView
              selectedDate={selectedDate}
              shifts={shifts}
              onDateSelect={handleDateSelect}
              onAddShift={handleAddShift}
              onEditShift={handleEditShift}
              dayShifts={dayShifts}
            />
          </TabsContent>
          
          <TabsContent value="week" className="mt-0">
            <CalendarWeekView
              selectedDate={selectedDate}
              shifts={shifts}
              onDateSelect={handleDateSelect}
              onAddShift={handleAddShift}
              onEditShift={handleEditShift}
            />
          </TabsContent>
        </Tabs>
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
