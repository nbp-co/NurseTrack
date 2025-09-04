import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Expense } from "@shared/schema";

// Utility functions for currency conversion
export const toCents = (dollars: number): number => Math.round(dollars * 100);
export const fromCents = (cents: number): string => (cents / 100).toFixed(2);

// API functions
export const listExpenses = async (params: { userId: string; from?: string; to?: string; limit?: number; offset?: number; sort?: "asc" | "desc" }) => {
  const searchParams = new URLSearchParams();
  searchParams.append("userId", params.userId);
  if (params.from) searchParams.append("from", params.from);
  if (params.to) searchParams.append("to", params.to);
  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.offset) searchParams.append("offset", params.offset.toString());
  if (params.sort) searchParams.append("sort", params.sort);

  const res = await apiRequest("GET", `/api/expenses?${searchParams.toString()}`);
  return res.json() as Promise<{ items: Expense[]; total: number }>;
};

export const getExpense = async (id: string, userId: string) => {
  const res = await apiRequest("GET", `/api/expenses/${id}?userId=${userId}`);
  return res.json() as Promise<Expense>;
};

export const createExpense = async (payload: {
  contractId?: number | null;
  date: string;
  category: string;
  amount: number;
  description: string;
  note?: string;
  isTaxDeductible?: boolean;
}, userId: string) => {
  const res = await apiRequest("POST", `/api/expenses?userId=${userId}`, payload);
  return res.json() as Promise<Expense>;
};

export const updateExpense = async (id: string, payload: {
  contractId?: number | null;
  date?: string;
  category?: string;
  amount?: number;
  description?: string;
  note?: string;
  isTaxDeductible?: boolean;
}, userId: string) => {
  const res = await apiRequest("PATCH", `/api/expenses/${id}?userId=${userId}`, payload);
  return res.json() as Promise<Expense>;
};

export const getExpenseTotals = async (userId: string, today: string) => {
  const res = await apiRequest("GET", `/api/expenses/totals?userId=${userId}&today=${today}`);
  return res.json() as Promise<{ thisWeek: number; nextWeek: number; thisMonth: number }>;
};

export const getActiveContracts = async (userId: string) => {
  const res = await apiRequest("GET", `/api/contracts/active?userId=${userId}`);
  return res.json() as Promise<{ id: number; name: string }[]>;
};

// React Query hooks
export const useExpensesQuery = (params: { userId?: string; from?: string; to?: string; limit?: number; offset?: number; sort?: "asc" | "desc" }) => {
  return useQuery({
    queryKey: ["/api/expenses", params],
    queryFn: () => listExpenses(params as any),
    enabled: !!params.userId,
  });
};

export const useExpenseQuery = (id: string, userId?: string) => {
  return useQuery({
    queryKey: ["/api/expenses", id],
    queryFn: () => getExpense(id, userId!),
    enabled: !!id && !!userId,
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ payload, userId }: { payload: Parameters<typeof createExpense>[0]; userId: string }) => 
      createExpense(payload, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/totals"] });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, payload, userId }: { id: string; payload: Parameters<typeof updateExpense>[1]; userId: string }) => 
      updateExpense(id, payload, userId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/totals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", variables.id] });
    },
  });
};

export const useExpenseTotals = (userId?: string) => {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ["/api/expenses/totals", userId, today],
    queryFn: () => getExpenseTotals(userId!, today),
    enabled: !!userId,
  });
};

export const useActiveContracts = (userId?: string) => {
  return useQuery({
    queryKey: ["/api/contracts/active", userId],
    queryFn: () => getActiveContracts(userId!),
    enabled: !!userId,
  });
};