import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Filter, ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ContractCard } from "@/components/contracts/ContractCard";
import { ContractWizard } from "@/components/contracts/ContractWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loader";
import { contractsApi, formatContractDuration, shiftsApi } from "@/lib/contracts-api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { Contract } from "@shared/schema";

export default function ContractsPage() {
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('startDate');
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contractsResponse, isLoading } = useQuery({
    queryKey: ['/api/contracts', user?.id, statusFilter, currentPage],
    queryFn: () => contractsApi.listContracts({
      userId: user?.id,
      status: statusFilter === 'all' ? undefined : statusFilter,
      page: currentPage,
      limit: 10,
    }),
    enabled: !!user,
  });

  // Fetch upcoming shifts
  const { data: upcomingShifts = [] } = useQuery({
    queryKey: ['/api/shifts', user?.id],
    queryFn: () => shiftsApi.listShifts({ userId: user?.id }),
    enabled: !!user,
  });

  // Calculate next 3 upcoming shifts
  const nextThreeShifts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return upcomingShifts
      .filter(shift => shift.localDate >= today)
      .sort((a, b) => new Date(a.localDate).getTime() - new Date(b.localDate).getTime())
      .slice(0, 3);
  }, [upcomingShifts]);


  const contracts = useMemo(() => {
    if (!contractsResponse?.contracts) return [];
    
    let filtered = [...contractsResponse.contracts];
    
    // Sort contracts - Active always on top, then by selected criteria
    filtered.sort((a, b) => {
      // First priority: Active contracts always on top
      const statusPriority = { 'active': 0, 'planned': 1, 'archived': 2 };
      const aStatusPriority = statusPriority[a.status as keyof typeof statusPriority] ?? 3;
      const bStatusPriority = statusPriority[b.status as keyof typeof statusPriority] ?? 3;
      
      if (aStatusPriority !== bStatusPriority) {
        return aStatusPriority - bStatusPriority;
      }
      
      // Secondary sort by selected criteria within same status
      switch (sortBy) {
        case 'facility':
          return a.facility.localeCompare(b.facility);
        case 'role':
          return a.role.localeCompare(b.role);
        case 'startDate':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'endDate':
          return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [contractsResponse?.contracts, sortBy]);

  const createContractMutation = useMutation({
    mutationFn: (contractData: any) => {
      if (!user?.id) throw new Error('User not authenticated');
      return contractsApi.createContract(contractData, user.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      
      const shiftsMsg = result.seedResult 
        ? ` ${result.seedResult.created} shifts added.`
        : '';
      
      toast({
        title: "Contract created",
        description: `Your contract has been created successfully.${shiftsMsg}`,
      });
      setShowContractWizard(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      contractsApi.updateContract(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      
      let updateMsg = "Your contract has been updated successfully.";
      if (result.updateResult) {
        const { created, updated, deleted } = result.updateResult;
        updateMsg += ` +${created}/~${updated}/-${deleted} seed shifts.`;
      }
      
      toast({
        title: "Contract updated",
        description: updateMsg,
      });
      setShowContractWizard(false);
      setEditingContract(undefined);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteContractMutation = useMutation({
    mutationFn: (contractId: string) => contractsApi.deleteContract(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({
        title: "Contract deleted",
        description: "The contract has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateContract = (contractData: any) => {
    createContractMutation.mutate(contractData);
  };

  const handleUpdateContract = (contractData: any) => {
    if (editingContract) {
      updateContractMutation.mutate({ 
        id: editingContract.id.toString(), 
        data: contractData 
      });
    }
  };

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract);
    setShowContractWizard(true);
  };

  const handleDeleteContract = (contract: Contract) => {
    if (confirm(`Are you sure you want to delete the contract "${contract.name}"? This action cannot be undone.`)) {
      deleteContractMutation.mutate(contract.id.toString());
    }
  };

  const handleCloseWizard = () => {
    setShowContractWizard(false);
    setEditingContract(undefined);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const totalPages = contractsResponse?.pagination.totalPages || 1;
  const currentPageNumber = contractsResponse?.pagination.page || 1;

  if (isLoading) {
    return <PageLoader text="Loading contracts..." />;
  }

  return (
    <>
      <AppHeader 
        title="Contracts"
        subtitle="Manage your nursing contracts and assignments"
      />

      <div className="lg:px-8 px-4 py-6">
        {/* Upcoming Shifts Section */}
        {nextThreeShifts.length > 0 && (
          <Card className="mb-6" data-testid="upcoming-shifts-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="w-5 h-5 text-blue-500" />
                Upcoming Shifts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {nextThreeShifts.map((shift) => {
                  const formatDate = (dateStr: string) => {
                    const date = new Date(dateStr);
                    const today = new Date();
                    const tomorrow = new Date();
                    tomorrow.setDate(today.getDate() + 1);
                    
                    if (date.toDateString() === today.toDateString()) {
                      return 'Today';
                    } else if (date.toDateString() === tomorrow.toDateString()) {
                      return 'Tomorrow';
                    } else {
                      return date.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      });
                    }
                  };

                  const formatTime = (utcDate: string) => {
                    return new Date(utcDate).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    });
                  };

                  return (
                    <div key={shift.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`shift-item-${shift.id}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(shift.localDate)}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="w-3 h-3" />
                            {shift.facility}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatTime(shift.startUtc)} - {formatTime(shift.endUtc)} · {shift.role}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Combined Filters and Add Button */}
        <Card className="mb-6">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
              {/* Add Contract Button - Left Side */}
              <Button onClick={() => setShowContractWizard(true)} data-testid="button-add-contract" className="flex-shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Add Contract
              </Button>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters</span>
              </div>
              
              <div className="flex gap-2 sm:gap-4 flex-1 min-w-0">
                <div className="flex-1 min-w-[120px] max-w-[200px]">
                  <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="unconfirmed">Unconfirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archive">Archive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-1 min-w-[120px] max-w-[200px]">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger data-testid="select-sort-by">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="startDate">Sort by Start Date</SelectItem>
                      <SelectItem value="endDate">Sort by End Date</SelectItem>
                      <SelectItem value="status">Sort by Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contracts List */}
        {contracts.length > 0 ? (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract as any}
                onEdit={() => handleEditContract(contract)}
                onDelete={() => handleDeleteContract(contract)}
                shiftsCount={(contract as any).shiftsCount || 0}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileText className="w-8 h-8 text-gray-400" />}
            title="No contracts yet"
            description="Get started by adding your first nursing contract."
            action={{
              label: "Add Your First Contract",
              onClick: () => setShowContractWizard(true)
            }}
            testId="empty-state-contracts"
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPageNumber - 1)}
              disabled={currentPageNumber === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600">
                Page {currentPageNumber} of {totalPages}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPageNumber + 1)}
              disabled={currentPageNumber === totalPages}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <ContractWizard
        isOpen={showContractWizard}
        onClose={handleCloseWizard}
        onSubmit={editingContract ? handleUpdateContract : handleCreateContract}
        initialData={editingContract as any}
      />
    </>
  );
}

