import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shift, Contract } from "@/types";

const shiftFormSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  date: z.string().min(1, "Date is required"),
  start: z.string().min(1, "Start time is required"),
  end: z.string().min(1, "End time is required"),
  role: z.string().min(1, "Role is required"),
  facility: z.string().min(1, "Facility is required"),
});

type ShiftFormData = z.infer<typeof shiftFormSchema>;

interface ShiftFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Shift, 'id'>) => void;
  contracts: Contract[];
  initialData?: Partial<Shift>;
  defaultDate?: string;
}

export function ShiftForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  contracts,
  initialData,
  defaultDate
}: ShiftFormProps) {
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  
  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      contractId: initialData?.contractId || "",
      date: initialData?.date || defaultDate || "",
      start: initialData?.start || "07:00",
      end: initialData?.end || "19:00",
      role: initialData?.role || "",
      facility: initialData?.facility || "",
    },
  });

  const handleContractSelect = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
      setSelectedContract(contract);
      form.setValue("role", contract.role);
      form.setValue("facility", contract.facility);
      form.setValue("start", contract.recurrence.defaultStart);
      form.setValue("end", contract.recurrence.defaultEnd);
    }
  };

  const handleSubmit = (data: ShiftFormData) => {
    onSubmit({
      contractId: data.contractId,
      date: data.date,
      start: data.start,
      end: data.end,
      role: data.role,
      facility: data.facility,
      completed: false,
      actualStart: undefined,
      actualEnd: undefined,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="dialog-shift-form">
        <DialogHeader>
          <DialogTitle data-testid="text-shift-form-title">
            {initialData ? "Edit Shift" : "Add Shift"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="contractId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleContractSelect(value);
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-shift-contract">
                        <SelectValue placeholder="Select a contract" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.facility} - {contract.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      data-testid="input-shift-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        {...field} 
                        data-testid="input-shift-start"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        {...field} 
                        data-testid="input-shift-end"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="facility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Hospital or clinic name"
                      data-testid="input-shift-facility"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., ICU Nurse"
                      data-testid="input-shift-role"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel-shift"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                data-testid="button-save-shift"
              >
                {initialData ? "Update" : "Create"} Shift
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
