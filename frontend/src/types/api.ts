// Backend DTO mappings (from Java Spring Boot entities)

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  role: Role;
  passwordChangeRequired: boolean;
  message: string;
}

export interface PasswordSetupRequest {
  currentPassword?: string;
  newPassword: string;
}

export interface AdminCreateUserRequest {
  email: string;
  temporaryPassword?: string;
  role: Exclude<Role, 'SUPER_ADMIN'>;
}

export interface AdminCreatedUserResponse {
  email: string;
  role: Role;
  temporaryPassword: string;
  passwordChangeRequired: boolean;
  createdAt: string | null;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  role: Role;
  passwordChangeRequired: boolean;
  createdAt: string | null;
}

export interface MaterialDto {
  materialCode: string;
  materialName: string;
  location: string | null;
  safeStockQty: number | null;
  currentStockQty: number | null;
}

export interface StockTrendPoint {
  date: string;
  stockQty: number;
  inboundQty: number;
  outboundQty: number;
}

export interface StockTrendSeries {
  materialCode: string;
  materialName: string;
  location: string | null;
  safeStockQty: number | null;
  currentStockQty: number | null;
  startStockQty: number;
  endStockQty: number;
  changeQty: number;
  minStockQty: number;
  maxStockQty: number;
  points: StockTrendPoint[];
}

export interface StockTrendResponse {
  fromDate: string;
  toDate: string;
  totalDays: number;
  materialCodes: string[];
  series: StockTrendSeries[];
}

export interface InventoryCalendarDay {
  date: string;
  inboundQty: number;
  outboundQty: number;
  netQty: number;
  inboundCount: number;
  outboundCount: number;
  transactionCount: number;
}

export interface InventoryCalendarTransaction {
  id: number;
  transactionType: TransactionType;
  transactionLabel: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  transactionDate: string;
  businessUnit: string | null;
  manager: string | null;
  note: string | null;
  reference: string | null;
  createdByEmail: string | null;
}

export interface InventoryCalendarResponse {
  month: string;
  monthStart: string;
  monthEnd: string;
  totalInboundQty: number;
  totalOutboundQty: number;
  activeDays: number;
  transactionCount: number;
  days: InventoryCalendarDay[];
  transactions: InventoryCalendarTransaction[];
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
export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
