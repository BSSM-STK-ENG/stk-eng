import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StockTrendPanel from '../StockTrendPanel';
import api from '../../../api/axios';
import type { MaterialDto, StockTrendResponse } from '../../../types/api';

vi.mock('../../../api/axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedGet = vi.mocked(api.get);

const materials: MaterialDto[] = [
  { materialCode: 'MAT-001', materialName: '알루미늄 코일', location: 'A-01', safeStockQty: 80, currentStockQty: 420 },
  { materialCode: 'MAT-002', materialName: '스테인리스 판재', location: 'A-03', safeStockQty: 120, currentStockQty: 280 },
  { materialCode: 'MAT-003', materialName: '구리 배선', location: 'B-04', safeStockQty: 40, currentStockQty: 510 },
  { materialCode: 'MAT-004', materialName: '절연 튜브', location: 'B-07', safeStockQty: 25, currentStockQty: 160 },
];

const trendResponse: StockTrendResponse = {
  fromDate: '2026-03-18',
  toDate: '2026-03-24',
  totalDays: 7,
  materialCodes: ['MAT-003', 'MAT-001', 'MAT-002'],
  series: [
    {
      materialCode: 'MAT-003',
      materialName: '구리 배선',
      location: 'B-04',
      safeStockQty: 40,
      currentStockQty: 510,
      startStockQty: 440,
      endStockQty: 510,
      changeQty: 70,
      minStockQty: 430,
      maxStockQty: 510,
      points: [
        { date: '2026-03-18', stockQty: 440, inboundQty: 10, outboundQty: 0 },
        { date: '2026-03-19', stockQty: 430, inboundQty: 0, outboundQty: 10 },
        { date: '2026-03-20', stockQty: 455, inboundQty: 25, outboundQty: 0 },
        { date: '2026-03-21', stockQty: 470, inboundQty: 15, outboundQty: 0 },
        { date: '2026-03-22', stockQty: 480, inboundQty: 10, outboundQty: 0 },
        { date: '2026-03-23', stockQty: 490, inboundQty: 10, outboundQty: 0 },
        { date: '2026-03-24', stockQty: 510, inboundQty: 20, outboundQty: 0 },
      ],
    },
    {
      materialCode: 'MAT-001',
      materialName: '알루미늄 코일',
      location: 'A-01',
      safeStockQty: 80,
      currentStockQty: 420,
      startStockQty: 460,
      endStockQty: 420,
      changeQty: -40,
      minStockQty: 420,
      maxStockQty: 460,
      points: [
        { date: '2026-03-18', stockQty: 460, inboundQty: 0, outboundQty: 0 },
        { date: '2026-03-19', stockQty: 450, inboundQty: 0, outboundQty: 10 },
        { date: '2026-03-20', stockQty: 445, inboundQty: 0, outboundQty: 5 },
        { date: '2026-03-21', stockQty: 435, inboundQty: 0, outboundQty: 10 },
        { date: '2026-03-22', stockQty: 430, inboundQty: 5, outboundQty: 10 },
        { date: '2026-03-23', stockQty: 425, inboundQty: 0, outboundQty: 5 },
        { date: '2026-03-24', stockQty: 420, inboundQty: 0, outboundQty: 5 },
      ],
    },
    {
      materialCode: 'MAT-002',
      materialName: '스테인리스 판재',
      location: 'A-03',
      safeStockQty: 120,
      currentStockQty: 280,
      startStockQty: 260,
      endStockQty: 280,
      changeQty: 20,
      minStockQty: 250,
      maxStockQty: 280,
      points: [
        { date: '2026-03-18', stockQty: 260, inboundQty: 10, outboundQty: 0 },
        { date: '2026-03-19', stockQty: 250, inboundQty: 0, outboundQty: 10 },
        { date: '2026-03-20', stockQty: 255, inboundQty: 5, outboundQty: 0 },
        { date: '2026-03-21', stockQty: 260, inboundQty: 5, outboundQty: 0 },
        { date: '2026-03-22', stockQty: 270, inboundQty: 10, outboundQty: 0 },
        { date: '2026-03-23', stockQty: 275, inboundQty: 5, outboundQty: 0 },
        { date: '2026-03-24', stockQty: 280, inboundQty: 5, outboundQty: 0 },
      ],
    },
  ],
};

describe('StockTrendPanel', () => {
  beforeEach(() => {
    mockedGet.mockResolvedValue({ data: trendResponse } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches trend data for the default top-stock materials and renders the chart', async () => {
    render(<StockTrendPanel materials={materials} />);

    await screen.findByText('구리 배선');
    expect(mockedGet).toHaveBeenCalled();

    const [firstPath, firstConfig] = mockedGet.mock.calls[0] as [string, { params: { materialCodes: string } }];
    expect(firstPath).toBe('/inventory/stock-trends');
    expect(firstConfig).toMatchObject({
      params: {
        materialCodes: 'MAT-003,MAT-001,MAT-002',
      },
    });

    expect(screen.getByRole('img', { name: '자재별 재고 수량 변화 그래프' })).toBeInTheDocument();
    expect(screen.getAllByText('알루미늄 코일').length).toBeGreaterThan(0);
  });

  it('refetches when the user changes the period preset', async () => {
    const user = userEvent.setup();

    render(<StockTrendPanel materials={materials} />);
    await screen.findByText('구리 배선');

    mockedGet.mockClear();

    await user.click(screen.getByRole('button', { name: '7일' }));

    await waitFor(() => expect(mockedGet).toHaveBeenCalled());

    const [lastPath, lastConfig] = mockedGet.mock.calls.at(-1) as [string, { params: { materialCodes: string; from: string; to: string } }];
    expect(lastPath).toBe('/inventory/stock-trends');
    expect(lastConfig).toMatchObject({
      params: {
        materialCodes: 'MAT-003,MAT-001,MAT-002',
      },
    });

    const from = new Date(`${lastConfig.params.from}T00:00:00`);
    const to = new Date(`${lastConfig.params.to}T00:00:00`);
    const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    expect(days).toBe(7);
  });

  it('refetches when the material filter selection changes', async () => {
    const user = userEvent.setup();

    render(<StockTrendPanel materials={materials} />);
    await screen.findByText('구리 배선');

    mockedGet.mockClear();

    await user.click(screen.getByRole('button', { name: /자재 선택/ }));
    await user.click(screen.getByRole('button', { name: /절연 튜브/ }));

    await waitFor(() => expect(mockedGet).toHaveBeenCalled());

    const [lastPath, lastConfig] = mockedGet.mock.calls.at(-1) as [string, { params: { materialCodes: string } }];
    expect(lastPath).toBe('/inventory/stock-trends');
    expect(lastConfig).toMatchObject({
      params: {
        materialCodes: 'MAT-003,MAT-001,MAT-002,MAT-004',
      },
    });
  });
});
