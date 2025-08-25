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
import { Checkbox } from "@/components/ui/checkbox";
import { Contract } from "@/types";

const contractFormSchema = z.object({
  facility: z.string().min(1, "Contract name is required"),
  role: z.string().min(1, "Role is required"),
  department: z.string().optional(),
  baseRate: z.number().min(0.01, "Base rate must be greater than 0"),
  overtimeRate: z.number().min(0, "OT rate must be greater than or equal to 0").optional(),
  weeklyHours: z.number().min(1, "Weekly hours must be at least 1").max(80, "Weekly hours cannot exceed 80"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  byDay: z.array(z.string()).min(1, "Select at least one day of the week"),
  defaultStart: z.string().min(1, "Default start time is required"),
  defaultEnd: z.string().min(1, "Default end time is required"),
  // Individual day schedules
  mondayStart: z.string().optional(),
  mondayEnd: z.string().optional(),
  tuesdayStart: z.string().optional(),
  tuesdayEnd: z.string().optional(),
  wednesdayStart: z.string().optional(),
  wednesdayEnd: z.string().optional(),
  thursdayStart: z.string().optional(),
  thursdayEnd: z.string().optional(),
  fridayStart: z.string().optional(),
  fridayEnd: z.string().optional(),
  saturdayStart: z.string().optional(),
  saturdayEnd: z.string().optional(),
  sundayStart: z.string().optional(),
  sundayEnd: z.string().optional(),
  address: z.string().min(1, "Address must contain at least street and city").optional().or(z.literal("")),
  contactName: z.string().min(2, "Contact name must be at least 2 characters").max(50, "Contact name cannot exceed 50 characters").regex(/^[a-zA-Z\s.-]+$/, "Contact name can only contain letters, spaces, periods, and hyphens").optional().or(z.literal("")),
  phoneNumber: z.string().regex(/^([0-9]{3})-([0-9]{3})-([0-9]{4})$/, "Please enter a valid phone number (e.g., 444-444-4444)").optional().or(z.literal("")),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

type ContractFormData = z.infer<typeof contractFormSchema>;

interface ContractWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Contract, 'id'>) => void;
  initialData?: Contract;
}

const DAYS_OF_WEEK = [
  { value: "SUN", label: "Sunday" },
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
];

const ROLES = [
  "Registered Nurse (RN)",
  "Licensed Practical Nurse (LPN)",
  "Certified Nursing Assistant (CNA)",
  "Nurse Practitioner (NP)",
];

const DEPARTMENTS = [
  "ICU",
  "Emergency",
  "Medical/Surgical",
  "Pediatrics",
  "Oncology",
  "OR",
  "Labor & Delivery",
  "NICU",
];

export function ContractWizard({ isOpen, onClose, onSubmit, initialData }: ContractWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  
  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      facility: initialData?.facility || "",
      role: initialData?.role || "",
      department: initialData?.department || "",
      baseRate: initialData?.baseRate || 0,
      overtimeRate: initialData?.overtimeRate || undefined,
      weeklyHours: initialData?.weeklyHours || 40,
      startDate: initialData?.startDate || "",
      endDate: initialData?.endDate || "",
      byDay: initialData?.recurrence.byDay || [],
      defaultStart: initialData?.recurrence.defaultStart || "07:00",
      defaultEnd: initialData?.recurrence.defaultEnd || "19:00",
      // Individual day defaults - use default times initially
      mondayStart: initialData?.recurrence.defaultStart || "07:00",
      mondayEnd: initialData?.recurrence.defaultEnd || "19:00",
      tuesdayStart: initialData?.recurrence.defaultStart || "07:00",
      tuesdayEnd: initialData?.recurrence.defaultEnd || "19:00",
      wednesdayStart: initialData?.recurrence.defaultStart || "07:00",
      wednesdayEnd: initialData?.recurrence.defaultEnd || "19:00",
      thursdayStart: initialData?.recurrence.defaultStart || "07:00",
      thursdayEnd: initialData?.recurrence.defaultEnd || "19:00",
      fridayStart: initialData?.recurrence.defaultStart || "07:00",
      fridayEnd: initialData?.recurrence.defaultEnd || "19:00",
      saturdayStart: initialData?.recurrence.defaultStart || "07:00",
      saturdayEnd: initialData?.recurrence.defaultEnd || "19:00",
      sundayStart: initialData?.recurrence.defaultStart || "07:00",
      sundayEnd: initialData?.recurrence.defaultEnd || "19:00",
      address: initialData?.address || "",
      contactName: initialData?.contactName || "",
      phoneNumber: initialData?.phoneNumber || "",
      notes: initialData?.notes || "",
    },
  });

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Update all individual day times when default times change
  const updateAllDayTimes = (startTime: string, endTime: string) => {
    const selectedDays = form.watch('byDay');
    selectedDays.forEach(dayCode => {
      const day = DAYS_OF_WEEK.find(d => d.value === dayCode);
      if (day) {
        const dayName = day.label.toLowerCase();
        form.setValue(`${dayName}Start` as keyof ContractFormData, startTime);
        form.setValue(`${dayName}End` as keyof ContractFormData, endTime);
      }
    });
  };

  const handleSubmit = (data: ContractFormData) => {
    const contract: Omit<Contract, 'id'> = {
      facility: data.facility,
      role: data.role,
      department: data.department,
      startDate: data.startDate,
      endDate: data.endDate,
      payType: 'hourly',
      baseRate: data.baseRate,
      overtimeRate: data.overtimeRate,
      weeklyHours: data.weeklyHours,
      recurrence: {
        byDay: data.byDay as any,
        defaultStart: data.defaultStart,
        defaultEnd: data.defaultEnd,
        exceptions: initialData?.recurrence.exceptions || []
      },
      status: initialData?.status || 'planned',
      address: data.address,
      contactName: data.contactName,
      phoneNumber: data.phoneNumber,
      notes: data.notes
    };
    
    onSubmit(contract);
    onClose();
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= step 
                ? "bg-primary text-primary-foreground" 
                : "bg-gray-200 text-gray-600"
            }`}>
              {step}
            </div>
            <span className={`ml-2 text-sm font-medium ${
              currentStep >= step ? "text-gray-900" : "text-gray-500"
            }`}>
              {step === 1 ? "Basics" : step === 2 ? "Schedule" : "Review"}
            </span>
            {step < 3 && <div className="w-8 h-0.5 bg-gray-200 ml-4"></div>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-contract-wizard">
        <DialogHeader>
          <DialogTitle data-testid="text-contract-wizard-title">
            {initialData ? "Edit Contract" : "Add New Contract"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {renderStepIndicator()}

            {/* Step 1: Basics */}
            {currentStep === 1 && (
              <div className="space-y-6" data-testid="step-contract-basics">
                <FormField
                  control={form.control}
                  name="facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="St. Mary's Hospital Contract" 
                          {...field} 
                          data-testid="input-facility"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility/Unit</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ICU, Emergency, Medical/Surgical" 
                            {...field} 
                            data-testid="input-department"
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
                        <FormLabel>Role *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date *</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            data-testid="input-start-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date *</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            data-testid="input-end-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="baseRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Rate *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="45.00"
                              className="pl-8"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              data-testid="input-base-rate"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="overtimeRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OT Rate</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="67.50"
                              className="pl-8"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              data-testid="input-overtime-rate"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="weeklyHours"
                  render={({ field }) => (
                    <FormItem className="md:w-1/2">
                      <FormLabel>Est. Weekly Hours *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="80"
                          placeholder="40"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-weekly-hours"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contact Information Section */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Contact Information</h4>
                  
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John Smith" 
                            {...field} 
                            data-testid="input-contact-name"
                            maxLength={50}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="123 Main St, City, State 12345" 
                            {...field} 
                            data-testid="input-address"
                            maxLength={100}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="444-444-4444" 
                            {...field} 
                            data-testid="input-phone-number"
                            maxLength={12}
                            onChange={(e) => {
                              // Only allow numbers and dashes
                              const value = e.target.value.replace(/[^0-9-]/g, '');
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Additional notes about this contract..."
                            {...field}
                            data-testid="textarea-notes"
                            maxLength={500}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Schedule */}
            {currentStep === 2 && (
              <div className="space-y-6" data-testid="step-contract-schedule">
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="defaultStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Start Time *</FormLabel>
                        <FormControl>
                          <Input 
                            type="time" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              updateAllDayTimes(e.target.value, form.watch('defaultEnd'));
                            }}
                            data-testid="input-default-start"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default End Time *</FormLabel>
                        <FormControl>
                          <Input 
                            type="time" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              updateAllDayTimes(form.watch('defaultStart'), e.target.value);
                            }}
                            data-testid="input-default-end"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="byDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Working Days *</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            {DAYS_OF_WEEK.filter(day => ['MON', 'TUE', 'WED', 'THU'].includes(day.value)).map((day) => (
                              <div key={day.value} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={field.value?.includes(day.value)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, day.value]);
                                      // Set default times for newly selected day
                                      const dayName = day.label.toLowerCase();
                                      form.setValue(`${dayName}Start` as keyof ContractFormData, form.watch('defaultStart'));
                                      form.setValue(`${dayName}End` as keyof ContractFormData, form.watch('defaultEnd'));
                                    } else {
                                      field.onChange(currentValue.filter((d) => d !== day.value));
                                    }
                                  }}
                                  data-testid={`checkbox-day-${day.value.toLowerCase()}`}
                                />
                                <label className="text-sm font-medium">{day.label}</label>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-4">
                            {['FRI', 'SAT', 'SUN'].map((dayValue) => {
                              const day = DAYS_OF_WEEK.find(d => d.value === dayValue);
                              if (!day) return null;
                              return (
                                <div key={day.value} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={field.value?.includes(day.value)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValue, day.value]);
                                        // Set default times for newly selected day
                                        const dayName = day.label.toLowerCase();
                                        form.setValue(`${dayName}Start` as keyof ContractFormData, form.watch('defaultStart'));
                                        form.setValue(`${dayName}End` as keyof ContractFormData, form.watch('defaultEnd'));
                                      } else {
                                        field.onChange(currentValue.filter((d) => d !== day.value));
                                      }
                                    }}
                                    data-testid={`checkbox-day-${day.value.toLowerCase()}`}
                                  />
                                  <label className="text-sm font-medium">{day.label}</label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Individual Day Schedules */}
                {form.watch('byDay').length > 0 && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-md font-semibold text-gray-900">Individual Day Schedules</h4>
                        <p className="text-sm text-gray-500">Customize times for each working day (defaults to the times above)</p>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateAllDayTimes(form.watch('defaultStart'), form.watch('defaultEnd'))}
                        data-testid="button-apply-defaults"
                      >
                        Apply Default Times to All
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {form.watch('byDay').map((dayCode) => {
                        const day = DAYS_OF_WEEK.find(d => d.value === dayCode);
                        if (!day) return null;
                        
                        const dayName = day.label.toLowerCase();
                        const startFieldName = `${dayName}Start` as keyof ContractFormData;
                        const endFieldName = `${dayName}End` as keyof ContractFormData;
                        
                        return (
                          <div key={dayCode} className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-medium text-gray-900">{day.label}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={startFieldName}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Start Time</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="time" 
                                        {...field} 
                                        data-testid={`input-${dayName}-start`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={endFieldName}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>End Time</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="time" 
                                        {...field} 
                                        data-testid={`input-${dayName}-end`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="space-y-6" data-testid="step-contract-review">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Contract Name</p>
                      <p className="font-medium" data-testid="review-facility">{form.watch('facility')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Facility/Unit</p>
                      <p className="font-medium" data-testid="review-department">{form.watch('department') || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Role</p>
                      <p className="font-medium" data-testid="review-role">{form.watch('role')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Weekly Hours</p>
                      <p className="font-medium" data-testid="review-hours">{form.watch('weeklyHours')} hours</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Base Rate</p>
                      <p className="font-medium" data-testid="review-rate">
                        ${form.watch('baseRate')}/hour
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">OT Rate</p>
                      <p className="font-medium" data-testid="review-overtime-rate">
                        {form.watch('overtimeRate') ? `$${form.watch('overtimeRate')}/hour` : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Duration</p>
                      <p className="font-medium" data-testid="review-duration">
                        {form.watch('startDate')} to {form.watch('endDate')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Working Days</p>
                      <p className="font-medium" data-testid="review-days">
                        {form.watch('byDay')?.join(', ') || 'None selected'}
                      </p>
                    </div>
                  </div>

                  {/* Contact Information in Review */}
                  {(form.watch('address') || form.watch('contactName') || form.watch('phoneNumber') || form.watch('notes')) && (
                    <div className="bg-gray-50 p-4 rounded-lg mt-6">
                      <h4 className="font-semibold text-gray-900 mb-4">Contact Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {form.watch('address') && (
                          <div>
                            <p className="text-gray-500">Address</p>
                            <p className="font-medium" data-testid="review-address">{form.watch('address')}</p>
                          </div>
                        )}
                        {form.watch('contactName') && (
                          <div>
                            <p className="text-gray-500">Name</p>
                            <p className="font-medium" data-testid="review-contact-name">{form.watch('contactName')}</p>
                          </div>
                        )}
                        {form.watch('phoneNumber') && (
                          <div>
                            <p className="text-gray-500">Phone Number</p>
                            <p className="font-medium" data-testid="review-phone-number">{form.watch('phoneNumber')}</p>
                          </div>
                        )}
                      </div>
                      {form.watch('notes') && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-gray-500">Notes</p>
                          <p className="font-medium text-sm mt-1" data-testid="review-notes">{form.watch('notes')}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between pt-6 mt-8 border-t border-gray-200">
              <Button 
                type="button" 
                variant="outline" 
                onClick={currentStep > 1 ? handlePrev : onClose}
                data-testid="button-wizard-back"
              >
                {currentStep > 1 ? "Back" : "Cancel"}
              </Button>
              
              {currentStep < 3 ? (
                <Button 
                  type="button" 
                  onClick={handleNext}
                  data-testid="button-wizard-next"
                >
                  Continue
                </Button>
              ) : (
                <Button 
                  type="submit"
                  data-testid="button-wizard-save"
                >
                  {initialData ? "Update Contract" : "Create Contract"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
