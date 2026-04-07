import { useQuery } from '@tanstack/react-query';
import api from './axios';
import type { DashboardSummary, MaterialDto, MasterDataItem, PagedLedger } from '../types/api';

export const queryKeys = {
  dashboardSummary: ['dashboard', 'summary'] as const,
  materials: ['materials'] as const,
  businessUnits: ['master-data', 'business-units'] as const,
  ledger: (params: Record<string, unknown>) => ['ledger', params] as const,
  history: (params: Record<string, unknown>) => ['history', params] as const,
  closings: ['closings'] as const,
  masterData: (category: string) => ['master-data', category] as const,
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: async () => {
      const response = await api.get<DashboardSummary>('/dashboard/summary');
      return response.data;
    },
  });
}

export function useMaterials() {
  return useQuery({
    queryKey: queryKeys.materials,
    queryFn: async () => {
      const response = await api.get<MaterialDto[]>('/materials');
      return response.data;
    },
  });
}

export function useBusinessUnits() {
  return useQuery({
    queryKey: queryKeys.businessUnits,
    queryFn: async () => {
      const response = await api.get<MasterDataItem[]>('/master-data/business-units');
      return response.data;
    },
  });
}

export function usePagedLedger(params: {
  type?: string;
  page?: number;
  size?: number;
  q?: string;
  from?: string;
  to?: string;
  unit?: string;
}) {
  return useQuery({
    queryKey: queryKeys.ledger(params),
    queryFn: async () => {
      const response = await api.get<PagedLedger>('/inventory/ledger', {
        params: {
          type: params.type || undefined,
          page: params.page ?? 0,
          size: params.size ?? 50,
          q: params.q?.trim() || undefined,
          from: params.from || undefined,
          to: params.to || undefined,
          unit: params.unit || undefined,
        },
      });
      return response.data;
    },
  });
}

export function useClosings() {
  return useQuery({
    queryKey: queryKeys.closings,
    queryFn: async () => {
      const response = await api.get('/closing');
      return response.data;
    },
  });
}
