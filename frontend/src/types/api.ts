// Backend DTO mappings (from Java Spring Boot entities)

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  message: string;
}

export interface MaterialDto {
  materialCode: string;
  materialName: string;
  location: string | null;
  safeStockQty: number | null;
  currentStockQty: number | null;
}

export interface TransactionRequest {
  materialCode: string;
  quantity: number;
  transactionDate?: string;
  businessUnit?: string;
  manager?: string;
  note?: string;
  reference?: string;
}

export interface InventoryTransaction {
  id: number;
  transactionType: TransactionType;
  material: Material;
  quantity: number;
  transactionDate: string;
  businessUnit: string | null;
  manager: string | null;
  note: string | null;
  reference: string | null;
  createdBy: User | null;
  createdAt: string;
}

export interface Material {
  materialCode: string;
  materialName: string;
  location: string | null;
  safeStockQty: number | null;
  currentStockQty: number | null;
}

export interface MonthlyClosing {
  closingMonth: string;
  status: ClosingStatus;
  closedBy: User | null;
  closedAt: string | null;
}

export interface User {
  id: string;
  email: string;
  role: Role;
}

export type TransactionType = 'IN' | 'OUT' | 'RETURN' | 'EXCHANGE';
export type ClosingStatus = 'CLOSED' | 'UNCLOSED';
export type Role = 'USER' | 'ADMIN';
