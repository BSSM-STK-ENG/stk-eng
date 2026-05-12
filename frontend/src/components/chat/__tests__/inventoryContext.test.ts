import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildInventoryChatContext } from '../inventoryContext';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../../../api/axios', () => ({
  default: {
    get: apiMocks.get,
  },
}));

describe('buildInventoryChatContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a DB-backed answer context for yesterday inbound inventory questions', async () => {
    apiMocks.get.mockResolvedValueOnce({
      data: {
        content: [],
        page: 0,
        size: 100,
        totalElements: 0,
        totalPages: 0,
      },
    });

    const result = await buildInventoryChatContext(
      '어제 들어온 재고가 몇 개야?',
      undefined,
      new Date('2026-05-11T15:00:00.000Z'),
    );

    expect(apiMocks.get).toHaveBeenCalledWith(
      '/inventory/ledger',
      expect.objectContaining({
        params: expect.objectContaining({
          type: 'IN',
          from: '2026-05-11',
          to: '2026-05-11',
          page: 0,
          size: 100,
        }),
      }),
    );
    expect(result.promptContext).toContain('직접답: 어제(2026-05-11) 들어온 재고는 0개입니다.');
    expect(result.directAnswer).toBe('어제(2026-05-11) 들어온 재고는 0개입니다.');
    expect(result.toolTrace[0]?.title).toBe('어제 입고 조회');
    expect(result.toolTrace[0]?.rowCount).toBe(0);
  });

  it('skips DB calls for concept-only inventory questions', async () => {
    const result = await buildInventoryChatContext('안전재고가 뭐야?');

    expect(apiMocks.get).not.toHaveBeenCalled();
    expect(result.promptContext).toBeNull();
    expect(result.toolTrace).toEqual([]);
  });
});
