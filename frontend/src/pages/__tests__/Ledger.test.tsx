import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Ledger from '../Ledger';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('../../components/ledger/InventoryCalendarBoard', () => ({
  default: () => <div>calendar mock</div>,
}));

vi.mock('../../components/inventory/MaterialWorklistPanel', () => ({
  default: () => <div>worklist mock</div>,
}));

vi.mock('../../utils/material-worklist', () => ({
  getMaterialWorklistCodes: () => [],
  subscribeMaterialWorklist: () => () => undefined,
}));

const mockedGet = vi.mocked(api.get);

const ledgerResponse = [
  {
    id: 1,
    transactionType: 'IN',
    material: {
      materialCode: 'MAT-001',
      materialName: '관리자 등록 자재',
      location: 'A-01',
      safeStockQty: 10,
      currentStockQty: 50,
    },
    quantity: 5,
    transactionDate: '2026-03-24T08:30:00',
    businessUnit: '부산항',
    manager: '김현장',
    note: '테스트 메모',
    reference: 'REF-001',
    createdBy: {
      id: 'user-1',
      email: 'admin@stk.com',
      role: 'ADMIN',
    },
    createdAt: '2026-03-24T08:30:00',
  },
  {
    id: 2,
    transactionType: 'OUT',
    material: {
      materialCode: 'MAT-002',
      materialName: '다른 자재',
      location: 'B-01',
      safeStockQty: 8,
      currentStockQty: 20,
    },
    quantity: 3,
    transactionDate: '2026-03-23T10:00:00',
    businessUnit: '인천항',
    manager: '박작업',
    note: null,
    reference: null,
    createdBy: {
      id: 'user-2',
      email: 'worker@stk.com',
      role: 'USER',
    },
    createdAt: '2026-03-23T10:00:00',
  },
];

const renderLedger = (initialEntry = '/ledger') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/ledger" element={<Ledger />} />
      </Routes>
    </MemoryRouter>,
  );

describe('Ledger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGet.mockResolvedValue({
      data: ledgerResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    });
  });

  it('finds transactions by createdBy email from the search field', async () => {
    renderLedger('/ledger?material=admin@stk.com');

    await waitFor(() => {
      expect(screen.getByText('관리자 등록 자재')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('admin@stk.com')).toBeInTheDocument();
    expect(screen.getByText(/현재 결과 1건/)).toBeInTheDocument();
    expect(screen.queryByText(/맞는 거래가 없습니다/)).not.toBeInTheDocument();
  });

  it('shows a readable active-filter summary', async () => {
    renderLedger('/ledger?material=MAT-001&day=2026-03-24&unit=부산항');

    await waitFor(() => {
      expect(screen.getByText('지금 보고 있는 조건')).toBeInTheDocument();
    });

    expect(screen.getByText(/"MAT-001"를 찾고 있고/)).toBeInTheDocument();
    expect(screen.getByText(/부산항에서/)).toBeInTheDocument();
  });
});
