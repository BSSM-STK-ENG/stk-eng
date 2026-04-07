import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Ledger from '../Ledger';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('../../components/inventory/MaterialWorklistPanel', () => ({
  default: () => <div>worklist mock</div>,
}));

vi.mock('../../utils/material-worklist', () => ({
  getMaterialWorklistCodes: () => [],
  subscribeMaterialWorklist: () => () => undefined,
}));

const mockedGet = vi.mocked(api.get);

const pagedLedgerResponse = {
  content: [
    {
      id: 1,
      transactionType: 'IN',
      materialCode: 'MAT-001',
      quantity: 5,
      transactionDate: '2026-03-24T08:30:00',
      businessUnit: '부산항',
      manager: '김현장',
      note: '테스트 메모',
      reference: 'REF-001',
      createdByUserId: 'user-1',
      createdByEmail: 'admin@stk.com',
      reverted: false,
      systemGenerated: false,
      reversalOfTransactionId: null,
      revertedByUserId: null,
      revertedAt: null,
      createdAt: '2026-03-24T08:30:00',
    },
    {
      id: 2,
      transactionType: 'OUT',
      materialCode: 'MAT-002',
      quantity: 3,
      transactionDate: '2026-03-23T10:00:00',
      businessUnit: '인천항',
      manager: '박작업',
      note: null,
      reference: null,
      createdByUserId: 'user-2',
      createdByEmail: 'worker@stk.com',
      reverted: false,
      systemGenerated: false,
      reversalOfTransactionId: null,
      revertedByUserId: null,
      revertedAt: null,
      createdAt: '2026-03-23T10:00:00',
    },
  ],
  page: 0,
  size: 25,
  totalElements: 2,
  totalPages: 1,
};

const businessUnitsResponse = [
  { id: 1, category: 'BUSINESS_UNIT', value: '부산항' },
  { id: 2, category: 'BUSINESS_UNIT', value: '인천항' },
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
    mockedGet.mockImplementation(async (url: string) => ({
      data: url === '/master-data/business-units' ? businessUnitsResponse : pagedLedgerResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    }));
  });

  it('finds transactions by search term from URL params', async () => {
    renderLedger('/ledger?material=admin@stk.com');

    await waitFor(() => {
      expect(screen.getAllByText('MAT-001').length).toBeGreaterThan(0);
    });

    expect(screen.getByDisplayValue('admin@stk.com')).toBeInTheDocument();
  });

  it('shows a readable active-filter summary', async () => {
    renderLedger('/ledger?material=MAT-001&day=2026-03-24&unit=부산항');

    await waitFor(() => {
      expect(screen.getByText('지금 보고 있는 조건')).toBeInTheDocument();
    });

    expect(
      screen.getByText((_, element) =>
        element?.tagName === 'P'
        && element.textContent?.includes('"MAT-001"')
        && element.textContent.includes('2026. 3. 24.')
        && element.textContent.includes('부산항'),
      ),
    ).toBeInTheDocument();
  });
});
