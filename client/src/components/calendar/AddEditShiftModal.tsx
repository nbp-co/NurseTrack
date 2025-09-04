import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface Shift {
  id: number;
  localDate: string;
  startUtc: string;
  endUtc: string;
  facility?: string;
  contractId?: number | null;
  status: string;
  source: string;
}

interface Contract {
  id: number;
  name: string;
  facility: string;
  baseRate?: string;
  startDate: string;
  endDate: string;
  timezone: string;
}

const shiftSchema = z.object({
  contractId: z.number().nullable(),
  date: z.string(),
  start: z.string(),
  end: z.string(),
  facility: z.string().optional(),
  timezone: z.string().default('America/Chicago')
});

type ShiftFormData = z.infer<typeof shiftSchema>;

interface AddEditShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ShiftFormData) => void;
  onDelete?: (shiftId: string) => void;
  editingShift?: Shift | null;
  contracts: Contract[];
  selectedDate: string;
  isSubmitting?: boolean;
}

export function AddEditShiftModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  editingShift,
  contracts,
  selectedDate,
  isSubmitting = false
}: AddEditShiftModalProps) {
  const { user } = useAuth();
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<string>("");
  const [contractValidationError, setContractValidationError] = useState<string>("");

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      contractId: null,
      date: selectedDate,
      start: "07:00",
      end: "19:00",
      facility: "",
      timezone: "America/Chicago"
    }
  });

  // Get schedule preview for selected contract
  const { data: schedulePreview } = useQuery({
    queryKey: ['/api/contracts', selectedContractId, 'schedule-preview', form.watch('date')],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/contracts/${selectedContractId}/schedule-preview?date=${form.watch('date')}`);
      return res.json();
    },
    enabled: !!selectedContractId && !!form.watch('date'),
  });

  // Check for overlapping shifts
  const checkOverlaps = async (data: ShiftFormData) => {
    if (!user) return;
    
    try {
      const shiftDate = data.date;
      const res = await apiRequest('GET', `/api/shifts?userId=${user.id}&from=${shiftDate}&to=${shiftDate}`);
      const existingShifts = await res.json();
      
      const overlaps = existingShifts.filter((shift: Shift) => {
        if (editingShift && shift.id === editingShift.id) return false;
        
        const newStart = new Date(`${data.date}T${data.start}`);
        const newEnd = new Date(`${data.date}T${data.end}`);
        const existingStart = new Date(shift.startUtc);
        const existingEnd = new Date(shift.endUtc);
        
        return (newStart < existingEnd && newEnd > existingStart);
      });
      
      if (overlaps.length > 0) {
        setOverlapWarning(`Warning: This shift overlaps with ${overlaps.length} existing shift(s) on this date.`);
      } else {
        setOverlapWarning("");
      }
    } catch (error) {
      // Handle error silently
    }
  };

  // Validate contract date range
  const validateContractDate = (contractId: number | null, date: string) => {
    if (!contractId) {
      setContractValidationError("");
      return true;
    }
    
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) {
      setContractValidationError("Contract not found");
      return false;
    }
    
    if (date < contract.startDate || date > contract.endDate) {
      setContractValidationError(`Shift date must be between ${contract.startDate} and ${contract.endDate}`);
      return false;
    }
    
    setContractValidationError("");
    return true;
  };

  // Handle contract selection change
  useEffect(() => {
    if (selectedContractId && schedulePreview) {
      const contract = contracts.find(c => c.id === selectedContractId);
      if (contract && schedulePreview.enabled) {
        form.setValue('start', schedulePreview.start);
        form.setValue('end', schedulePreview.end);
        form.setValue('timezone', schedulePreview.timezone || contract.timezone);
        if (!form.getValues('facility')) {
          form.setValue('facility', contract.facility);
        }
      }
    } else if (selectedContractId === null) {
      // Reset to default values when "No contract" is selected
      form.setValue('start', '07:00');
      form.setValue('end', '19:00');
      form.setValue('timezone', 'America/Chicago');
    }
  }, [selectedContractId, schedulePreview, contracts, form]);

  // Initialize form when editing
  useEffect(() => {
    if (editingShift) {
      const startTime = new Date(editingShift.startUtc).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      const endTime = new Date(editingShift.endUtc).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      form.setValue('contractId', editingShift.contractId || null);
      form.setValue('date', editingShift.localDate);
      form.setValue('start', startTime);
      form.setValue('end', endTime);
      form.setValue('facility', editingShift.facility || '');
      setSelectedContractId(editingShift.contractId || null);
    } else {
      form.setValue('date', selectedDate);
      setSelectedContractId(null);
    }
  }, [editingShift, selectedDate, form]);

  // Watch form changes for validation
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (data.contractId !== undefined && data.date) {
        validateContractDate(data.contractId, data.date);
        checkOverlaps(data as ShiftFormData);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleSubmit = (data: ShiftFormData) => {
    if (!validateContractDate(data.contractId, data.date)) {
      return;
    }
    onSubmit(data);
  };

  const handleContractChange = (value: string) => {
    const contractId = value === "null" ? null : parseInt(value);
    setSelectedContractId(contractId);
    form.setValue('contractId', contractId);
  };

  const isOvernightShift = () => {
    const start = form.watch('start');
    const end = form.watch('end');
    return start && end && start > end;
  };

  const selectedContract = selectedContractId ? contracts.find(c => c.id === selectedContractId) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="add-edit-shift-modal">
        <DialogHeader>
          <DialogTitle>
            {editingShift ? 'Edit Shift' : 'Add Shift'}
          </DialogTitle>
          <DialogDescription>
            {editingShift ? 'Update shift details below.' : 'Create a new shift for your schedule.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Contract Selection */}
            <FormField
              control={form.control}
              name="contractId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract</FormLabel>
                  <Select onValueChange={handleContractChange} value={selectedContractId?.toString() || "null"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-contract">
                        <SelectValue placeholder="Select a contract" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="null">No contract</SelectItem>
                      {contracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span>{contract.name} ({contract.facility})</span>
                            {contract.baseRate && (
                              <span className="text-sm text-gray-500 ml-2">
                                ${contract.baseRate}/hr
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contract Validation Error */}
            {contractValidationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{contractValidationError}</span>
              </div>
            )}

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-shift-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} data-testid="input-start-time" />
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
                      <Input type="time" {...field} data-testid="input-end-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Overnight Shift Badge */}
            {isOvernightShift() && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                <span className="font-medium">Overnight shift detected</span> - End time is next day (+1 day)
              </div>
            )}

            {/* Facility */}
            <FormField
              control={form.control}
              name="facility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter facility name" 
                      {...field} 
                      data-testid="input-facility"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Overlap Warning */}
            {overlapWarning && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{overlapWarning}</span>
              </div>
            )}

            {/* Contract Info Display */}
            {selectedContract && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                  <div className="font-medium">{selectedContract.name}</div>
                  <div>Facility: {selectedContract.facility}</div>
                  {selectedContract.baseRate && (
                    <div>Rate: ${selectedContract.baseRate}/hour</div>
                  )}
                  <div className="text-xs text-blue-600 mt-1">
                    Contract active: {selectedContract.startDate} - {selectedContract.endDate}
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-4">
              <div>
                {editingShift && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(editingShift.id.toString())}
                    data-testid="button-delete-shift"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !!contractValidationError}
                  data-testid="button-save-shift"
                >
                  {isSubmitting ? 'Saving...' : editingShift ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}