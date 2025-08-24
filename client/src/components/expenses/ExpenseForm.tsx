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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Expense, Contract } from "@/types";

const expenseFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  contractId: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().min(1, "Description is required"),
  note: z.string().optional(),
  deductible: z.boolean().default(false),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Expense, 'id'>) => void;
  contracts: Contract[];
  initialData?: Expense;
}

const EXPENSE_CATEGORIES = [
  "Transportation",
  "Meals", 
  "Accommodation",
  "Supplies",
  "Equipment",
  "Training",
  "Other"
];

export function ExpenseForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  contracts,
  initialData
}: ExpenseFormProps) {
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: initialData?.date || new Date().toISOString().split('T')[0],
      contractId: initialData?.contractId || "none",
      category: initialData?.category || "",
      amount: initialData?.amount || 0,
      description: initialData?.description || "",
      note: initialData?.note || "",
      deductible: initialData?.deductible || false,
    },
  });

  const handleSubmit = (data: ExpenseFormData) => {
    onSubmit({
      date: data.date,
      contractId: data.contractId === "none" ? undefined : data.contractId || undefined,
      category: data.category,
      amount: data.amount,
      description: data.description,
      note: data.note || undefined,
      deductible: data.deductible,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]" data-testid="dialog-expense-form">
        <DialogHeader>
          <DialogTitle data-testid="text-expense-form-title">
            {initialData ? "Edit Expense" : "Add Expense"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      data-testid="input-expense-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contractId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Contract</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-expense-contract">
                        <SelectValue placeholder="Select a contract (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No contract</SelectItem>
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-expense-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00"
                        className="pl-8"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-expense-amount"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Brief description of the expense"
                      data-testid="input-expense-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Additional notes (optional)"
                      rows={3}
                      data-testid="input-expense-note"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deductible"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-expense-deductible"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Tax Deductible</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      This expense can be claimed as a tax deduction
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel-expense"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                data-testid="button-save-expense"
              >
                {initialData ? "Update" : "Create"} Expense
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
