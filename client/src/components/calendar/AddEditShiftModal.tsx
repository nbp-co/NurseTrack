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
import { toUtcFromLocal, isOvernight, overlaps } from '@/lib/time';
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  otRate?: string;
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
  status: z.enum(['scheduled', 'unconfirmed', 'completed', 'cancelled']).default('scheduled'),
  timezone: z.string().default('America/Chicago'),
  baseRate: z.string().optional().default(""),
  otRate: z.string().optional().default("")
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
  const [outOfRangeError, setOutOfRangeError] = useState<string>("");

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      contractId: null,
      date: selectedDate,
      start: "07:00",
      end: "19:00",
      facility: "",
      status: "scheduled",
      timezone: "America/Chicago",
      baseRate: "",
      otRate: ""
    }
  });

  // Get schedule preview for selected contract
  const { data: schedulePreview, error: schedulePreviewError } = useQuery({
    queryKey: ['/api/contracts', selectedContractId, 'schedule-preview', form.watch('date')],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/contracts/${selectedContractId}/schedule-preview?date=${form.watch('date')}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to get schedule preview');
      }
      return res.json();
    },
    enabled: !!selectedContractId && !!form.watch('date'),
    retry: false,
  });

  // Check for overlapping shifts
  const checkOverlaps = async (data: ShiftFormData) => {
    if (!user) return;
    
    try {
      const shiftDate = data.date;
      const res = await apiRequest('GET', `/api/shifts?userId=${user.id}&from=${shiftDate}&to=${shiftDate}`);
      const existingShifts = await res.json();
      
      // Convert form data to UTC timestamps
      const newStartUtc = toUtcFromLocal(data.date, data.start, data.timezone);
      let newEndUtc = toUtcFromLocal(data.date, data.end, data.timezone);
      
      // Handle overnight shifts - end time is next day
      if (isOvernight(data.start, data.end)) {
        const nextDay = new Date(data.date);
        nextDay.setDate(nextDay.getDate() + 1);
        newEndUtc = toUtcFromLocal(nextDay.toISOString().split('T')[0], data.end, data.timezone);
      }
      
      const overlappingShifts = existingShifts.filter((shift: Shift) => {
        if (editingShift && shift.id === editingShift.id) return false;
        
        return overlaps(
          newStartUtc,
          newEndUtc,
          new Date(shift.startUtc),
          new Date(shift.endUtc)
        );
      });
      
      if (overlappingShifts.length > 0) {
        const shiftNames = overlappingShifts.map((s: Shift) => 
          s.facility || 'Unnamed shift'
        ).join(', ');
        setOverlapWarning(`Time overlaps with existing shift(s): ${shiftNames}`);
      } else {
        setOverlapWarning("");
      }
    } catch (error) {
      // Handle error silently
      setOverlapWarning("");
    }
  };

  // Validate contract date range
  const validateContractDate = (contractId: number | null, date: string) => {
    if (!contractId) {
      setContractValidationError("");
      return true;
    }
    
    const contractsArray = contracts || [];
    if (!Array.isArray(contractsArray)) {
      setContractValidationError("Contracts not loaded");
      return false;
    }
    
    const contract = contractsArray.find((c: any) => c.id === contractId);
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
    const contractsArray = contracts || [];
    if (selectedContractId && schedulePreview && Array.isArray(contractsArray)) {
      const contract = contractsArray.find((c: any) => c.id === selectedContractId);
      if (contract && schedulePreview.enabled) {
        form.setValue('start', schedulePreview.start);
        form.setValue('end', schedulePreview.end);
        form.setValue('timezone', schedulePreview.timezone || contract.timezone);
        if (!form.getValues('facility')) {
          form.setValue('facility', contract.facility);
        }
        // Pre-fill rates from contract
        if (contract.baseRate && !form.getValues('baseRate')) {
          form.setValue('baseRate', contract.baseRate);
        }
        if (contract.otRate && !form.getValues('otRate')) {
          form.setValue('otRate', contract.otRate);
        }
      }
      setOutOfRangeError(""); // Clear error if preview loads successfully
    } else if (selectedContractId === null) {
      // Reset to default values when "No contract" is selected
      form.setValue('start', '07:00');
      form.setValue('end', '19:00');
      form.setValue('timezone', 'America/Chicago');
      setOutOfRangeError(""); // Clear any previous errors
    }
  }, [selectedContractId, schedulePreview, contracts, form]);

  // Handle schedule preview errors
  useEffect(() => {
    if (schedulePreviewError && selectedContractId) {
      const errorMessage = schedulePreviewError.message;
      if (errorMessage.includes('outside contract range')) {
        setOutOfRangeError("Date is outside contract range. Please select a date within the contract period.");
      } else {
        setOutOfRangeError("Failed to load schedule preview for this date.");
      }
    } else {
      setOutOfRangeError("");
    }
  }, [schedulePreviewError, selectedContractId]);

  // Initialize form when editing
  useEffect(() => {
    if (editingShift) {
      // Format time to HH:mm format for type="time" inputs
      const formatTimeForInput = (timeString: string) => {
        // Remove seconds if present and ensure HH:mm format
        const [hourStr, minuteStr] = timeString.split(':');
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10) || 0;
        
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      };
      
      const startTime = formatTimeForInput(editingShift.startUtc || '07:00');
      const endTime = formatTimeForInput(editingShift.endUtc || '19:00');
      
      form.setValue('contractId', editingShift.contractId || null);
      form.setValue('date', editingShift.localDate);
      form.setValue('start', startTime);
      form.setValue('end', endTime);
      form.setValue('facility', editingShift.facility || '');
      form.setValue('status', (editingShift.status as 'scheduled' | 'unconfirmed' | 'completed' | 'cancelled') || 'scheduled');
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

  // Convert 12-hour time format to 24-hour format
  const convertTo24Hour = (time12h: string): string => {
    // If already in 24-hour format, return as-is
    if (!time12h.includes('AM') && !time12h.includes('PM')) {
      return time12h;
    }
    
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    
    if (modifier === 'AM') {
      if (hour === 12) {
        hours = '00';
      }
    } else if (modifier === 'PM') {
      if (hour !== 12) {
        hours = String(hour + 12);
      }
    }
    
    return `${hours.padStart(2, '0')}:${minutes}`;
  };

  const handleSubmit = (data: ShiftFormData) => {
    if (!validateContractDate(data.contractId, data.date)) {
      return;
    }
    
    // Convert times to 24-hour format before sending to backend
    const convertedData = {
      ...data,
      start: convertTo24Hour(data.start),
      end: convertTo24Hour(data.end)
    };
    
    onSubmit(convertedData);
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

  const contractsArray = contracts || [];
  const selectedContract = selectedContractId && Array.isArray(contractsArray) ? contractsArray.find((c: any) => c.id === selectedContractId) : null;

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
                      {contracts && Array.isArray(contracts) ? 
                        contracts.map((contract: any) => (
                          <SelectItem key={contract.id} value={contract.id.toString()}>
                            <div className="flex flex-col w-full">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{contract.name}</span>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <span>Base: ${contract.baseRate}/hr</span>
                                  {contract.otRate && (
                                    <span>OT: ${contract.otRate}/hr</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm text-gray-500">{contract.facility}</span>
                            </div>
                          </SelectItem>
                        )) : null}
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

            {/* OUT_OF_RANGE Error */}
            {outOfRangeError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{outOfRangeError}</span>
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
                      <Input type="time" step="300" {...field} data-testid="input-start-time" />
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
                      <Input type="time" step="300" {...field} data-testid="input-end-time" />
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

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Select shift status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="unconfirmed">Unconfirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="baseRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Rate ($/hr)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={selectedContract ? selectedContract.baseRate : "Enter rate"}
                        {...field} 
                        data-testid="input-base-rate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="otRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OT Rate ($/hr)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={selectedContract?.otRate ? selectedContract.otRate : "Enter OT rate"}
                        {...field} 
                        data-testid="input-ot-rate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                  <div className="flex items-center gap-4 mt-1">
                    <span>Base Rate: ${selectedContract.baseRate}/hour</span>
                    {selectedContract.otRate && (
                      <span>OT Rate: ${selectedContract.otRate}/hour</span>
                    )}
                  </div>
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
                  disabled={isSubmitting || !!contractValidationError || !!outOfRangeError}
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