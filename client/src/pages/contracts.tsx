import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ContractCard } from "@/components/contracts/ContractCard";
import { ContractWizard } from "@/components/contracts/ContractWizard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loader";
import { contractApi } from "@/api/mock";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Contract } from "@/types";

export default function ContractsPage() {
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: () => contractApi.listContracts(),
  });

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

