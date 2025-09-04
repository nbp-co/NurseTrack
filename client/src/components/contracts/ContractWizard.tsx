import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, ChevronLeft, ChevronRight, Check, Calendar, Clock, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { calculateSeedEstimate } from "@/lib/contracts-api";
import type { CreateContractRequest } from "@shared/schema";

// Form schema for the 3-step wizard
const contractWizardSchema = z.object({
  // Step 1: Basics
  name: z.string().min(1, "Contract name is required"),
  facility: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  baseRate: z.string().min(1, "Base rate is required"),
  otRate: z.string().optional(),
  hoursPerWeek: z.string().optional(),
  timezone: z.string().optional(),
  
  // Step 2: Schedule
  defaultStart: z.string().min(1, "Default start time is required"),
  defaultEnd: z.string().min(1, "Default end time is required"),
  
  // Weekday toggles
  enableSunday: z.boolean(),
  enableMonday: z.boolean(),
  enableTuesday: z.boolean(),
  enableWednesday: z.boolean(),
  enableThursday: z.boolean(),
  enableFriday: z.boolean(),
  enableSaturday: z.boolean(),
  
  // Per-day overrides
  sundayStart: z.string().optional(),
  sundayEnd: z.string().optional(),
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
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "End date must be greater than or equal to start date",
  path: ["endDate"],
}).refine((data) => {
  const hasEnabledDays = [
    data.enableSunday,
    data.enableMonday,
    data.enableTuesday,
    data.enableWednesday,
    data.enableThursday,
    data.enableFriday,
    data.enableSaturday,
  ].some(Boolean);
  return hasEnabledDays;
}, {
  message: "At least one weekday must be enabled",
  path: ["enableMonday"],
});

type ContractWizardFormData = z.infer<typeof contractWizardSchema>;

interface ContractWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateContractRequest) => void;
  initialData?: any;
}

const WEEKDAYS = [
  { key: "enableSunday", label: "Sunday", short: "Sun", startField: "sundayStart", endField: "sundayEnd", dayIndex: 0 },
  { key: "enableMonday", label: "Monday", short: "Mon", startField: "mondayStart", endField: "mondayEnd", dayIndex: 1 },
  { key: "enableTuesday", label: "Tuesday", short: "Tue", startField: "tuesdayStart", endField: "tuesdayEnd", dayIndex: 2 },
  { key: "enableWednesday", label: "Wednesday", short: "Wed", startField: "wednesdayStart", endField: "wednesdayEnd", dayIndex: 3 },
  { key: "enableThursday", label: "Thursday", short: "Thu", startField: "thursdayStart", endField: "thursdayEnd", dayIndex: 4 },
  { key: "enableFriday", label: "Friday", short: "Fri", startField: "fridayStart", endField: "fridayEnd", dayIndex: 5 },
  { key: "enableSaturday", label: "Saturday", short: "Sat", startField: "saturdayStart", endField: "saturdayEnd", dayIndex: 6 },
];

const ROLES = [
  "Registered Nurse (RN)",
  "Licensed Practical Nurse (LPN)",
  "Certified Nursing Assistant (CNA)",
  "Nurse Practitioner (NP)",
  "Nurse Manager",
  "OR Tech",
  "Respiratory Therapist",
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago", 
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

export function ContractWizard({ isOpen, onClose, onSubmit, initialData }: ContractWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [seedEstimate, setSeedEstimate] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string>("enableMonday");

  // Helper function to get default values with proper schedule loading
  const getDefaultValues = () => {
    const defaults = {
      name: initialData?.name || "",
      facility: initialData?.facility || "",
      startDate: initialData?.startDate || "",
      endDate: initialData?.endDate || "",
      baseRate: initialData?.baseRate?.toString() || "",
      otRate: initialData?.otRate?.toString() || "",
      hoursPerWeek: initialData?.hoursPerWeek?.toString() || "",
      timezone: initialData?.timezone || "America/Chicago",
      defaultStart: "07:00",
      defaultEnd: "19:00",
      enableSunday: false,
      enableMonday: true,
      enableTuesday: true,
      enableWednesday: true,
      enableThursday: true,
      enableFriday: true,
      enableSaturday: false,
      sundayStart: "07:00",
      sundayEnd: "19:00",
      mondayStart: "07:00",
      mondayEnd: "19:00",
      tuesdayStart: "07:00",
      tuesdayEnd: "19:00",
      wednesdayStart: "07:00",
      wednesdayEnd: "19:00",
      thursdayStart: "07:00",
      thursdayEnd: "19:00",
      fridayStart: "07:00",
      fridayEnd: "19:00",
      saturdayStart: "07:00",
      saturdayEnd: "19:00",
    };

    // If we have schedule data from initialData, load it
    if (initialData?.schedule) {
      defaults.defaultStart = initialData.schedule.defaultStart || "07:00";
      defaults.defaultEnd = initialData.schedule.defaultEnd || "19:00";
      
      // Load day-specific schedule settings
      Object.entries(initialData.schedule.days || {}).forEach(([dayIndex, dayConfig]: [string, any]) => {
        const weekdayIndex = parseInt(dayIndex);
        const weekday = WEEKDAYS[weekdayIndex];
        if (weekday && dayConfig) {
          (defaults as any)[weekday.key] = dayConfig.enabled;
          if (dayConfig.start) {
            (defaults as any)[weekday.startField] = dayConfig.start;
          }
          if (dayConfig.end) {
            (defaults as any)[weekday.endField] = dayConfig.end;
          }
        }
      });
    }

    return defaults;
  };

  const form = useForm<ContractWizardFormData>({
    resolver: zodResolver(contractWizardSchema),
    defaultValues: getDefaultValues(),
  });

  const watchStartDate = form.watch("startDate");
  const watchEndDate = form.watch("endDate");
  const watchEnabledDays = WEEKDAYS.map(day => form.watch(day.key as any));

  // Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      form.reset(getDefaultValues());
    }
  }, [initialData]);

  useEffect(() => {
    if (watchStartDate && watchEndDate) {
      const enabledDays: Record<string, boolean> = {};
      WEEKDAYS.forEach((day, index) => {
        enabledDays[index.toString()] = watchEnabledDays[index];
      });
      
      const estimate = calculateSeedEstimate(watchStartDate, watchEndDate, enabledDays);
      setSeedEstimate(estimate);
    }
  }, [watchStartDate, watchEndDate, ...watchEnabledDays]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof ContractWizardFormData)[] = [];
    
    if (currentStep === 1) {
      fieldsToValidate = ["name", "startDate", "endDate", "baseRate"];
    } else if (currentStep === 2) {
      fieldsToValidate = ["defaultStart", "defaultEnd"];
      // Also validate that at least one day is enabled
      const hasEnabledDays = WEEKDAYS.some(day => form.getValues(day.key as any));
      if (!hasEnabledDays) {
        form.setError("enableMonday", { message: "At least one weekday must be enabled" });
        return;
      }
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const applyDefaultTimes = () => {
    const defaultStart = form.getValues("defaultStart");
    const defaultEnd = form.getValues("defaultEnd");
    
    WEEKDAYS.forEach(day => {
      form.setValue(day.startField as any, defaultStart);
      form.setValue(day.endField as any, defaultEnd);
    });
  };

  const handleSubmit = (data: ContractWizardFormData) => {
    // Convert form data to API format
    const schedule: any = {
      defaultStart: data.defaultStart,
      defaultEnd: data.defaultEnd,
      days: {}
    };

    WEEKDAYS.forEach((day, index) => {
      const enabled = data[day.key as keyof ContractWizardFormData] as boolean;
      schedule.days[index.toString()] = {
        enabled,
        start: enabled ? (data[day.startField as keyof ContractWizardFormData] as string) : undefined,
        end: enabled ? (data[day.endField as keyof ContractWizardFormData] as string) : undefined,
      };
    });

    const apiData: CreateContractRequest = {
      name: data.name,
      facility: data.facility,
      // role field removed per user requirements
      startDate: data.startDate,
      endDate: data.endDate,
      baseRate: data.baseRate,
      otRate: data.otRate,
      hoursPerWeek: data.hoursPerWeek,
      timezone: data.timezone,
      schedule,
      seedShifts: true,
    };

    onSubmit(apiData);
  };

  const resetForm = () => {
    setCurrentStep(1);
    form.reset();
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const formatCurrency = (value: string) => {
    if (!value) return "";
    return `$${parseFloat(value).toFixed(2)}/hour`;
  };

  const renderBasicsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contract Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Memorial Hospital ICU" {...field} data-testid="input-contract-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="facility"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Facility</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Memorial Hospital" {...field} data-testid="input-facility" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} data-testid="input-start-date" />
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
              <FormLabel>End Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} data-testid="input-end-date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="baseRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Base Rate ($/hour)</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="45.00"
                    className="pl-8"
                    {...field}
                    onKeyPress={(e) => {
                      if (!/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                        e.preventDefault();
                      }
                    }}
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
          name="otRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Overtime Rate ($/hour)</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="67.50"
                    className="pl-8"
                    {...field}
                    onKeyPress={(e) => {
                      if (!/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                        e.preventDefault();
                      }
                    }}
                    data-testid="input-ot-rate"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hoursPerWeek"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hours per Week</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="36"
                  {...field}
                  data-testid="input-hours-per-week"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderScheduleStep = () => {
    const selectedDayInfo = WEEKDAYS.find(day => day.key === selectedDay);
    
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg border">
          <h4 className="font-medium text-blue-900 mb-2">Default Schedule Times</h4>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <FormField
              control={form.control}
              name="defaultStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Start Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} data-testid="input-default-start" />
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
                  <FormLabel>Default End Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} data-testid="input-default-end" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="button"
              variant="outline"
              onClick={applyDefaultTimes}
              data-testid="button-apply-defaults"
            >
              Apply Default Times to All
            </Button>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-4">Weekly Schedule</h4>
          
          {/* Day selector */}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {WEEKDAYS.map((day) => {
              const isEnabled = form.watch(day.key as any);
              
              return (
                <div
                  key={day.key}
                  className={`
                    p-3 rounded-lg border-2 transition-colors
                    ${isEnabled 
                      ? 'border-green-500 bg-green-50 text-green-700' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  data-testid={`day-selector-${day.key}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue(day.key as any, !isEnabled);
                    }}
                    className="w-full text-center"
                  >
                    <div className="text-xl font-bold">{day.label.slice(0, 3).toUpperCase()}</div>
                    {isEnabled && (
                      <div className="text-xs text-green-600 mt-1">✓</div>
                    )}
                  </button>
                  
                  {/* Time inputs within the day box */}
                  {isEnabled && (
                    <div className="mt-3 space-y-2">
                      <FormField
                        control={form.control}
                        name={day.startField as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                className="text-xs h-7 w-full"
                                data-testid={`input-${day.startField}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={day.endField as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                className="text-xs h-7 w-full"
                                data-testid={`input-${day.endField}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Helper text */}
          {WEEKDAYS.filter(day => form.watch(day.key as any)).length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <p>Click on the days above to enable them and set working hours</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReviewStep = () => {
    const formData = form.getValues();
    const enabledDays = WEEKDAYS.filter(day => formData[day.key as keyof ContractWizardFormData]);

    return (
      <div className="space-y-6">
        {/* Contract Summary */}
        <Card>
          <CardContent className="p-6">
            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Contract Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Contract Name:</span>
                <p className="font-medium">{formData.name}</p>
              </div>
              <div>
                <span className="text-gray-600">Facility:</span>
                <p className="font-medium">{formData.facility}</p>
              </div>
              <div>
                <span className="text-gray-600">Duration:</span>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formData.startDate} to {formData.endDate}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rates */}
        <Card>
          <CardContent className="p-6">
            <h4 className="font-semibold text-lg mb-4">Compensation</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Base Rate:</span>
                <p className="font-medium text-green-600">{formatCurrency(formData.baseRate)}</p>
              </div>
              {formData.otRate && (
                <div>
                  <span className="text-gray-600">Overtime Rate:</span>
                  <p className="font-medium text-green-600">{formatCurrency(formData.otRate)}</p>
                </div>
              )}
              {formData.hoursPerWeek && (
                <div>
                  <span className="text-gray-600">Hours per Week:</span>
                  <p className="font-medium">{formData.hoursPerWeek} hours</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Schedule Summary */}
        <Card>
          <CardContent className="p-6">
            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Schedule
            </h4>
            <div className="grid grid-cols-7 gap-2 text-center">
              {WEEKDAYS.map(day => {
                const isEnabled = enabledDays.some(enabledDay => enabledDay.key === day.key);
                const startTime = formData[day.startField as keyof ContractWizardFormData] as string;
                const endTime = formData[day.endField as keyof ContractWizardFormData] as string;
                
                const formatTime = (time: string) => {
                  if (!time) return '';
                  const [hours, minutes] = time.split(':');
                  const hour = parseInt(hours);
                  const ampm = hour >= 12 ? 'P' : 'A';
                  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                  return `${displayHour}${ampm}`;
                };
                
                const timeDisplay = isEnabled && startTime && endTime 
                  ? `${formatTime(startTime)}-${formatTime(endTime)}`
                  : '';
                
                return (
                  <div key={day.key} className="flex flex-col items-center">
                    <div className="text-xs font-medium text-gray-600 mb-1">{day.short.toUpperCase()}</div>
                    <div className={`text-xs px-2 py-1 rounded ${isEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                      {timeDisplay || 'Inactive'}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center">
              {enabledDays.length} {enabledDays.length === 1 ? 'shift' : 'shifts'}
            </div>
          </CardContent>
        </Card>

        {/* Seed Estimate */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h4 className="font-semibold text-lg mb-2 text-blue-900">Seed Estimate</h4>
            <p className="text-blue-800">
              Based on your selected schedule and contract duration, approximately{" "}
              <span className="font-bold text-2xl">{seedEstimate}</span> shifts will be created.
            </p>
            <p className="text-sm text-blue-700 mt-2">
              These shifts will be automatically generated when you create the contract.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Contract Basics";
      case 2: return "Schedule Setup";
      case 3: return "Review & Create";
      default: return "Contract Setup";
    }
  };

  const canProceed = () => {
    if (currentStep === 1) {
      const requiredFields = ["name", "startDate", "endDate", "baseRate"];
      return requiredFields.every(field => form.getValues(field as any));
    }
    if (currentStep === 2) {
      const hasEnabledDays = WEEKDAYS.some(day => form.getValues(day.key as any));
      return hasEnabledDays && form.getValues("defaultStart") && form.getValues("defaultEnd");
    }
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="wizard-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStepTitle()}
            <Badge variant="outline">Step {currentStep} of 3</Badge>
          </DialogTitle>
          <DialogDescription id="wizard-description">
            {currentStep === 1 && "Enter basic contract information including rates and duration."}
            {currentStep === 2 && "Set up your weekly schedule and working hours."}
            {currentStep === 3 && "Review your contract details before creating."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6 px-2">
          {[
            { number: 1, label: "Basics" },
            { number: 2, label: "Schedule" },
            { number: 3, label: "Review" }
          ].map((step) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.number < currentStep 
                    ? "bg-green-100 text-green-600" 
                    : step.number === currentStep 
                    ? "bg-blue-100 text-blue-600" 
                    : "bg-gray-100 text-gray-400"
                }`}>
                  {step.number < currentStep ? <Check className="w-4 h-4" /> : step.number}
                </div>
                <div className={`text-xs mt-1 font-medium ${
                  step.number === currentStep 
                    ? "text-blue-600" 
                    : step.number < currentStep
                    ? "text-green-600"
                    : "text-gray-400"
                }`}>
                  {step.label}
                </div>
              </div>
              {step.number < 3 && (
                <div className={`w-16 h-1 mx-2 ${
                  step.number < currentStep ? "bg-green-200" : "bg-gray-200"
                }`} />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {currentStep === 1 && renderBasicsStep()}
            {currentStep === 2 && renderScheduleStep()}
            {currentStep === 3 && renderReviewStep()}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                data-testid="button-previous-step"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed()}
                    data-testid="button-next-step"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    data-testid="button-create-contract"
                  >
                    {form.formState.isSubmitting ? "Creating..." : "Create Contract"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}