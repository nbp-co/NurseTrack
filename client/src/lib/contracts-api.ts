import { apiRequest } from "./queryClient";
import type { Contract, CreateContractRequest, UpdateContractRequest } from "@shared/schema";

export interface ContractsListResponse {
  contracts: Contract[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ContractCreateResponse {
  contract: Contract;
  seedResult?: {
    created: number;
    enabledDays: number;
  };
}

export interface ContractUpdateResponse {
  contract: Contract;
  updateResult?: {
    created: number;
    updated: number;
    deleted: number;
  };
}

export const contractsApi = {
  async listContracts(params?: {
    userId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ContractsListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const response = await apiRequest('GET', `/api/contracts?${searchParams}`);
    return response.json();
  },

  async getContract(id: string): Promise<Contract> {
    const response = await apiRequest('GET', `/api/contracts/${id}`);
    return response.json();
  },

  async createContract(
    data: CreateContractRequest,
    userId: string
  ): Promise<ContractCreateResponse> {
    const searchParams = new URLSearchParams({ userId });
    const response = await apiRequest('POST', `/api/contracts?${searchParams}`, data);
    return response.json();
  },

  async updateContract(
    id: string,
    data: UpdateContractRequest
  ): Promise<ContractUpdateResponse> {
    const response = await apiRequest('PUT', `/api/contracts/${id}`, data);
    return response.json();
  },

  async updateContractStatus(
    id: string,
    status: string
  ): Promise<Contract> {
    const response = await apiRequest('PATCH', `/api/contracts/${id}/status`, { status });
    return response.json();
  }
};

// Utility functions
export function calculateSeedEstimate(
  startDate: string,
  endDate: string,
  enabledDays: Record<string, boolean>
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const weekday = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    if (enabledDays[weekday.toString()]) {
      count++;
    }
  }

  return count;
}

export function formatContractDuration(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffWeeks > 0) {
    const remainingDays = diffDays % 7;
    if (remainingDays === 0) {
      return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''}`;
    }
    return `${diffWeeks}w ${remainingDays}d`;
  }
  
  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
}