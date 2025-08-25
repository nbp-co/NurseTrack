import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Filter } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ContractCard } from "@/components/contracts/ContractCard";
import { ContractWizard } from "@/components/contracts/ContractWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loader";
import { contractApi } from "@/api/mock";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Contract } from "@/types";

export default function ContractsPage() {
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('facility');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allContracts = [], isLoading } = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: () => contractApi.listContracts(),
  });


  const { data: allShifts = [] } = useQuery({
    queryKey: ['/api/shifts'],
    queryFn: () => shiftApi.listShifts(),
  });

  const getShiftsCount = (contractId: string) => {
    return allShifts.filter(shift => shift.contractId === contractId).length;
  };


  const contracts = useMemo(() => {
    let filtered = [...allContracts];
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(contract => contract.status === statusFilter);
    }
    
    // Sort contracts - Active always on top
    filtered.sort((a, b) => {
      // First priority: Active contracts always on top
      const statusPriority = { 'active': 0, 'planned': 1, 'completed': 2, 'archive': 3 };
      const aStatusPriority = statusPriority[a.status as keyof typeof statusPriority] ?? 4;
      const bStatusPriority = statusPriority[b.status as keyof typeof statusPriority] ?? 4;
      
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
  }, [allContracts, statusFilter, sortBy]);

  const createContractMutation = useMutation({
    mutationFn: (contractData: Omit<Contract, 'id'>) => contractApi.createContract(contractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({
        title: "Contract created",
        description: "Your contract has been added successfully.",
      });
      setShowContractWizard(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contract> }) => 
      contractApi.updateContract(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({
        title: "Contract updated",
        description: "Your contract has been updated successfully.",
      });
      setShowContractWizard(false);
      setEditingContract(undefined);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update contract. Please try again.",
        variant: "destructive",
      });
    },
  });


  const handleCreateContract = (contractData: Omit<Contract, 'id'>) => {
    createContractMutation.mutate(contractData);
  };

  const handleUpdateContract = (contractData: Omit<Contract, 'id'>) => {
    if (editingContract) {
      updateContractMutation.mutate({ 
        id: editingContract.id, 
        data: contractData 
      });
    }
  };

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract);
    setShowContractWizard(true);
  };

  const handleCloseWizard = () => {
    setShowContractWizard(false);
    setEditingContract(undefined);
  };

  if (isLoading) {
    return <PageLoader text="Loading contracts..." />;
  }

  return (
    <>
      <AppHeader 
        title="Contracts"
        subtitle="Manage your nursing contracts and assignments"
        actions={
          <Button onClick={() => setShowContractWizard(true)} data-testid="button-add-contract">
            <Plus className="w-4 h-4 mr-2" />
            Add Contract
          </Button>
        }
      />

      <div className="lg:px-8 px-4 py-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
              <div className="flex items-center gap-2 flex-shrink-0">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters</span>
              </div>
              
              <div className="flex gap-2 sm:gap-4 flex-1 min-w-0">
                <div className="flex-1 min-w-[120px] max-w-[200px]">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="planned">Planned</SelectItem>
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
                      <SelectItem value="facility">Sort by Facility</SelectItem>
                      <SelectItem value="role">Sort by Role</SelectItem>
                      <SelectItem value="startDate">Sort by Start Date</SelectItem>
                      <SelectItem value="endDate">Sort by End Date</SelectItem>
                      <SelectItem value="status">Sort by Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="text-sm text-gray-500 flex-shrink-0 hidden sm:block">
                {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
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
                contract={contract}
                onEdit={() => handleEditContract(contract)}
                shiftsCount={getShiftsCount(contract.id)}
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
      </div>

      <ContractWizard
        isOpen={showContractWizard}
        onClose={handleCloseWizard}
        onSubmit={editingContract ? handleUpdateContract : handleCreateContract}
        initialData={editingContract}
      />
    </>
  );
}

