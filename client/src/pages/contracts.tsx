import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, BarChart3, DollarSign, Clock, FileText } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { StatCard } from "@/components/cards/StatCard";
import { ContractCard } from "@/components/contracts/ContractCard";
import { ContractWizard } from "@/components/contracts/ContractWizard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loader";
import { contractApi, shiftApi } from "@/api/mock";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Contract } from "@/types";
import { calculateMonthlyEarnings, formatCurrency } from "@/lib/metrics";

export default function ContractsPage() {
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: () => contractApi.listContracts(),
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['/api/shifts', currentMonth],
    queryFn: () => shiftApi.listShifts({ month: currentMonth }),
  });

  const isLoading = contractsLoading || shiftsLoading;

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

  const stats = {
    activeContracts: contracts.filter(c => c.status === 'active').length,
    monthlyEarnings: calculateMonthlyEarnings(contracts, shifts, currentMonth),
    hoursWorked: shifts.reduce((total, shift) => {
      if (shift.completed && shift.actualStart && shift.actualEnd) {
        const start = parseTime(shift.actualStart);
        const end = parseTime(shift.actualEnd);
        return total + (end - start) / (1000 * 60 * 60);
      } else {
        const start = parseTime(shift.start);
        const end = parseTime(shift.end);
        return total + (end - start) / (1000 * 60 * 60);
      }
    }, 0)
  };

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
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Active Contracts"
            value={stats.activeContracts}
            subtext="12% from last month"
            icon={<FileText className="w-6 h-6 text-primary" />}
            trend="up"
            trendColor="success"
          />
          
          <StatCard
            label="Monthly Earnings"
            value={formatCurrency(stats.monthlyEarnings)}
            subtext="8% from last month"
            icon={<DollarSign className="w-6 h-6 text-success-500" />}
            trend="up"
            trendColor="success"
          />
          
          <StatCard
            label="Hours This Month"
            value={Math.round(stats.hoursWorked)}
            subtext="2 hours under target"
            icon={<Clock className="w-6 h-6 text-warning-500" />}
            trend="neutral"
            trendColor="warning"
          />
        </div>

        {/* Contracts List */}
        {contracts.length > 0 ? (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onEdit={() => handleEditContract(contract)}
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

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}
