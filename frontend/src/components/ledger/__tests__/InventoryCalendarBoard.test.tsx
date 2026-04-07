import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../api/axios';
import type { InventoryCalendarResponse } from '../../../types/api';
import InventoryCalendarBoard from '../InventoryCalendarBoard';

vi.mock('../../../api/axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedGet = vi.mocked(api.get);

function buildCalendarResponse(month: string): InventoryCalendarResponse {
  const [yearPart = '0', monthPart = '1'] = month.split('-');
  const year = Number(yearPart);
  const monthNumber = Number(monthPart);
  const monthStart = `${month}-01`;
  const monthEndDate = new Date(year, monthNumber, 0).getDate();
  const monthEnd = `${month}-${`${monthEndDate}`.padStart(2, '0')}`;

  const days = Array.from({ length: monthEndDate }, (_, index) => {
    const date = `${month}-${`${index + 1}`.padStart(2, '0')}`;

    if (index + 1 === 12) {
      return {
        date,
        inboundQty: 120,
        outboundQty: 30,
        netQty: 90,
        inboundCount: 1,
        outboundCount: 1,
        transactionCount: 2,
      };
    }

    if (index + 1 === 18) {
      return {
        date,
        inboundQty: 45,
        outboundQty: 0,
        netQty: 45,
        inboundCount: 1,
        outboundCount: 0,
        transactionCount: 1,
      };
    }

    return {
      date,
      inboundQty: 0,
      outboundQty: 0,
      netQty: 0,
      inboundCount: 0,
      outboundCount: 0,
      transactionCount: 0,
    };
  });

  return {
    month,
    monthStart,
    monthEnd,
    totalInboundQty: 165,
    totalOutboundQty: 30,
    activeDays: 2,
    transactionCount: 3,
    days,
    transactions: [
      {
        id: 1,
        transactionType: 'IN',
        transactionLabel: '입고',
        materialCode: 'MAT-001',
        materialName: '알루미늄 코일',
        quantity: 120,
        transactionDate: `${month}-12T09:30:00`,
        businessUnit: '천안',
        manager: '김민수',
        note: '긴급 보충 입고',
        reference: 'PO-12',
        createdByEmail: 'planner@stk.local',
      },
      {
        id: 2,
        transactionType: 'OUT',
        transactionLabel: '출고',
        materialCode: 'MAT-001',
        materialName: '알루미늄 코일',
        quantity: 30,
        transactionDate: `${month}-12T15:00:00`,
        businessUnit: '천안',
        manager: '박지수',
        note: '라인 공급',
        reference: 'WO-77',
        createdByEmail: 'planner@stk.local',
      },
      {
        id: 3,
        transactionType: 'RETURN',
        transactionLabel: '반입',
        materialCode: 'MAT-002',
        materialName: '모터 하우징',
        quantity: 45,
        transactionDate: `${month}-18T10:00:00`,
        businessUnit: '평택',
        manager: '이선우',
        note: '검수 후 반입',
        reference: 'RT-18',
        createdByEmail: 'planner@stk.local',
      },
    ],
  };
}

describe('InventoryCalendarBoard', () => {
  const currentMonth = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
  })();

  beforeEach(() => {
    mockedGet.mockResolvedValue({ data: buildCalendarResponse(currentMonth) } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads month calendar data and shows the selected day timeline', async () => {
    render(<InventoryCalendarBoard />);

    expect(await screen.findAllByText('알루미늄 코일')).toHaveLength(2);

    expect(mockedGet).toHaveBeenCalledWith('/inventory/calendar', {
      params: { month: currentMonth },
    });

    expect(screen.getByText('Selected Day')).toBeInTheDocument();
    expect(screen.getAllByText('알루미늄 코일').length).toBeGreaterThan(0);
  });

  it('shows another day timeline when the user clicks a date cell', async () => {
    const user = userEvent.setup();

    render(<InventoryCalendarBoard />);
    await screen.findAllByText('알루미늄 코일');

    await user.click(screen.getByRole('button', { name: new RegExp(`${currentMonth}-18 거래 1건`) }));

    expect(await screen.findByText('모터 하우징')).toBeInTheDocument();
  });

  it('filters selected day transactions by outbound type', async () => {
    const user = userEvent.setup();

    render(<InventoryCalendarBoard />);
    await screen.findAllByText('알루미늄 코일');

    await user.click(screen.getByRole('button', { name: '출고' }));

    await waitFor(() => {
      expect(screen.getByText('라인 공급')).toBeInTheDocument();
    });
    expect(screen.queryByText('긴급 보충 입고')).not.toBeInTheDocument();
  });
});
