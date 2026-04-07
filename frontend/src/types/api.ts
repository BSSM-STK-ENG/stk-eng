// Backend DTO mappings (from Java Spring Boot entities)

export interface AuthRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  email: string;
  message: string;
}

export interface EmailVerificationResponse {
  email: string;
  message: string;
}

export interface AuthResponse {
  token: string;
  name: string | null;
  email: string;
  role: Role;
  permissionPreset: string | null;
  pagePermissions: PagePermissionKey[];
  passwordChangeRequired: boolean;
  message: string;
}

export interface PasswordSetupRequest {
  currentPassword?: string;
  name?: string;
  newPassword: string;
}

export interface AdminCreateUserRequest {
  name?: string;
  email: string;
  temporaryPassword?: string;
  role: Exclude<Role, 'SUPER_ADMIN'>;
  roleProfileKey?: string;
  permissionPreset?: string;
  pagePermissions?: PagePermissionKey[];
}

export interface AdminCreatedUserResponse {
  name: string | null;
  email: string;
  role: Role;
  roleProfileKey: string | null;
  roleLabel: string;
  permissionPreset: string | null;
  pagePermissions: PagePermissionKey[];
  temporaryPassword: string;
  passwordChangeRequired: boolean;
  createdAt: string | null;
}

export interface AdminUserSummary {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  roleProfileKey: string | null;
  roleLabel: string;
  permissionPreset: string | null;
  pagePermissions: PagePermissionKey[];
  passwordChangeRequired: boolean;
  emailVerified: boolean;
  createdAt: string | null;
}

export interface AdminUpdateUserRoleRequest {
  role: Exclude<Role, 'SUPER_ADMIN'>;
  roleProfileKey?: string;
}

export interface AdminUpdateUserNameRequest {
  name: string;
}

export interface AdminUpdateUserPermissionsRequest {
  permissionPreset: string;
  pagePermissions: PagePermissionKey[];
}

export interface AdminPasswordResetResponse {
  email: string;
  role: Role;
  roleProfileKey: string | null;
  roleLabel: string;
  temporaryPassword: string;
  passwordChangeRequired: boolean;
}

export interface RoleProfileOption {
  key: string;
  label: string;
  description: string;
  baseRole: Role;
  systemProfile: boolean;
}

export interface PagePermissionOption {
  key: PagePermissionKey;
  label: string;
  path: string;
}

export interface PermissionPresetOption {
  key: string;
  label: string;
  description: string;
  systemPreset: boolean;
  pagePermissions: PagePermissionKey[];
}

export interface AdminPermissionOptionsResponse {
  roleProfiles: RoleProfileOption[];
  pages: PagePermissionOption[];
  presets: PermissionPresetOption[];
}

export interface AdminCreateRoleProfileRequest {
  label: string;
  description?: string;
  baseRole: Exclude<Role, 'SUPER_ADMIN'>;
}

export interface AdminCreatePermissionPresetRequest {
  label: string;
  description?: string;
  pagePermissions: PagePermissionKey[];
}

export interface UserOption {
  id: string;
  name: string;
  email: string;
}

export interface MaterialDto {
  materialCode: string;
  materialName: string;
  description: string | null;
  location: string | null;
  safeStockQty: number | null;
  currentStockQty: number | null;
}

export interface MasterDataItem {
  id: number;
  name: string;
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
  managerUserId?: string;
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
  managerUser?: User | null;
  note: string | null;
  reference: string | null;
  createdBy: User | null;
  createdAt: string;
}

export interface Material {
  materialCode: string;
  materialName: string;
  description: string | null;
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
  name: string | null;
  email: string;
  role: Role;
}

export interface DashboardDayMetric {
  date: string;
  inboundQty: number;
  outboundQty: number;
  count: number;
}

export interface TransactionResponse {
  id: number;
  transactionType: TransactionType;
  materialCode: string;
  quantity: number;
  transactionDate: string;
  businessUnit: string | null;
  manager: string | null;
  note: string | null;
  reference: string | null;
  createdByUserId: string | null;
  createdByEmail: string | null;
  reverted: boolean;
  systemGenerated: boolean;
  reversalOfTransactionId: number | null;
  revertedByUserId: string | null;
  revertedAt: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  totalStockQty: number;
  totalMaterials: number;
  stableCount: number;
  lowCount: number;
  zeroCount: number;
  todayInboundQty: number;
  todayOutboundQty: number;
  recentWeek: DashboardDayMetric[];
  recentTransactions: TransactionResponse[];
}

export interface PagedLedger {
  content: TransactionResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type TransactionType = 'IN' | 'OUT' | 'RETURN' | 'EXCHANGE';
export type ClosingStatus = 'CLOSED' | 'UNCLOSED';
export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
export type PagePermissionKey =
  | 'DASHBOARD'
  | 'CURRENT_STOCK'
  | 'STOCK_LEDGER'
  | 'HISTORY'
  | 'INBOUND'
  | 'OUTBOUND'
  | 'CLOSING'
  | 'MASTER_DATA'
  | 'ADMIN_ACCOUNTS';
