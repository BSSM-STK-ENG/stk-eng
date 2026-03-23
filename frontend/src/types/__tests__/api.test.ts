import { describe, it, expect } from 'vitest';
import type {
  AuthRequest,
  AuthResponse,
  MaterialDto,
  TransactionRequest,
  InventoryTransaction,
  Material,
  MonthlyClosing,
  User,
  TransactionType,
  ClosingStatus,
  Role,
} from '../api';

describe('API type definitions', () => {
  it('AuthRequest has correct shape', () => {
    const req: AuthRequest = { email: 'test@test.com', password: '123456' };
    expect(req.email).toBe('test@test.com');
    expect(req.password).toBe('123456');
  });

  it('AuthResponse has correct shape', () => {
    const res: AuthResponse = {
      token: 'jwt-token',
      email: 'test@test.com',
      role: 'ADMIN',
      passwordChangeRequired: true,
      message: 'success',
    };
    expect(res.token).toBe('jwt-token');
    expect(res.passwordChangeRequired).toBe(true);
  });

  it('MaterialDto supports nullable fields', () => {
    const material: MaterialDto = {
      materialCode: 'BG001',
      materialName: 'Test Material',
      location: null,
      safeStockQty: null,
      currentStockQty: null,
    };
    expect(material.location).toBeNull();
    expect(material.safeStockQty).toBeNull();
    expect(material.currentStockQty).toBeNull();
  });

  it('MaterialDto supports non-null values', () => {
    const material: MaterialDto = {
      materialCode: 'BG001',
      materialName: 'Test Material',
      location: 'A-1-1',
      safeStockQty: 100,
      currentStockQty: 250,
    };
    expect(material.location).toBe('A-1-1');
    expect(material.safeStockQty).toBe(100);
  });

  it('User.id is string (UUID)', () => {
    const user: User = { id: '550e8400-e29b-41d4-a716-446655440000', email: 'admin@test.com', role: 'ADMIN' };
    expect(typeof user.id).toBe('string');
  });

  it('InventoryTransaction supports nullable fields', () => {
    const tx: InventoryTransaction = {
      id: 1,
      transactionType: 'IN',
      material: { materialCode: 'BG001', materialName: 'Test', location: null, safeStockQty: null, currentStockQty: null },
      quantity: 100,
      transactionDate: '2024-01-01T00:00:00',
      businessUnit: null,
      manager: null,
      note: null,
      reference: null,
      createdBy: null,
      createdAt: '2024-01-01T00:00:00',
    };
    expect(tx.createdBy).toBeNull();
    expect(tx.businessUnit).toBeNull();
  });

  it('MonthlyClosing supports nullable closedBy and closedAt', () => {
    const closing: MonthlyClosing = {
      closingMonth: '2024-01',
      status: 'UNCLOSED',
      closedBy: null,
      closedAt: null,
    };
    expect(closing.closedBy).toBeNull();
    expect(closing.closedAt).toBeNull();
  });

  it('TransactionType union is correct', () => {
    const types: TransactionType[] = ['IN', 'OUT', 'RETURN', 'EXCHANGE'];
    expect(types).toHaveLength(4);
  });

  it('ClosingStatus union is correct', () => {
    const statuses: ClosingStatus[] = ['CLOSED', 'UNCLOSED'];
    expect(statuses).toHaveLength(2);
  });

  it('Role union is correct', () => {
    const roles: Role[] = ['USER', 'ADMIN', 'SUPER_ADMIN'];
    expect(roles).toHaveLength(3);
  });

  // Suppress unused import warnings — TransactionRequest and Material are used as type annotations above
  it('TransactionRequest optional fields are optional', () => {
    const req: TransactionRequest = { materialCode: 'BG001', quantity: 10 };
    expect(req.businessUnit).toBeUndefined();
    expect(req.manager).toBeUndefined();
    expect(req.note).toBeUndefined();
    expect(req.reference).toBeUndefined();
    expect(req.transactionDate).toBeUndefined();
  });

  it('Material has the same shape as MaterialDto', () => {
    const mat: Material = {
      materialCode: 'X001',
      materialName: 'Widget',
      location: 'B-2-3',
      safeStockQty: 50,
      currentStockQty: 120,
    };
    expect(mat.materialCode).toBe('X001');
  });
});
