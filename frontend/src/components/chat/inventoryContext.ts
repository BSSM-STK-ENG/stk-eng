import api from '../../api/axios';
import type { DashboardSummary, MaterialDto, PagedLedger, TransactionResponse, TransactionType } from '../../types/api';
import type { ToolTrace } from '../../types/chat';

type InventoryChatContext = {
  promptContext: string | null;
  toolTrace: ToolTrace[];
  directAnswer?: string;
};

type DateRange = {
  label: string;
  from: string;
  to: string;
};

type MovementIntent = 'inbound' | 'outbound' | 'movement';

const SEOUL_TIME_ZONE = 'Asia/Seoul';
const LEDGER_PAGE_SIZE = 100;
const MAX_LEDGER_PAGES = 50;

const numberFormatter = new Intl.NumberFormat('ko-KR');

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function toQuantity(transaction: TransactionResponse) {
  return Number(transaction.quantity ?? 0);
}

function seoulDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SEOUL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return { year, month, day };
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function offsetSeoulDate(now: Date, offsetDays: number) {
  const { year, month, day } = seoulDateParts(now);
  const shifted = new Date(Date.UTC(year, month - 1, day + offsetDays, 12));
  const shiftedParts = seoulDateParts(shifted);
  return formatDate(shiftedParts.year, shiftedParts.month, shiftedParts.day);
}

function monthStart(now: Date) {
  const { year, month } = seoulDateParts(now);
  return formatDate(year, month, 1);
}

function resolveDateRange(message: string, now: Date): DateRange | null {
  if (/(어제|전날|하루 전|yesterday)/i.test(message)) {
    const date = offsetSeoulDate(now, -1);
    return { label: '어제', from: date, to: date };
  }

  if (/(오늘|금일|today)/i.test(message)) {
    const date = offsetSeoulDate(now, 0);
    return { label: '오늘', from: date, to: date };
  }

  if (/(최근\s*7일|일주일|지난\s*7일|이번\s*주|이번주|week)/i.test(message)) {
    return {
      label: '최근 7일',
      from: offsetSeoulDate(now, -6),
      to: offsetSeoulDate(now, 0),
    };
  }

  if (/(이번\s*달|이번달|금월|이달|month)/i.test(message)) {
    return {
      label: '이번 달',
      from: monthStart(now),
      to: offsetSeoulDate(now, 0),
    };
  }

  return null;
}

function resolveMovementIntent(message: string): MovementIntent | null {
  const asksInbound = /(입고|들어온|들어왔|들어오는|반입|매입|구매|inbound)/i.test(message);
  const asksOutbound = /(출고|나간|나갔|내보낸|불출|반출|판매|outbound)/i.test(message);

  if (asksInbound && asksOutbound) {
    return 'movement';
  }
  if (asksInbound) {
    return 'inbound';
  }
  if (asksOutbound) {
    return 'outbound';
  }
  if (/(수불|거래|이동)/i.test(message)) {
    return 'movement';
  }

  return null;
}

function isConceptQuestion(message: string) {
  return /(뭐야|무엇|뜻|의미|개념|설명|어떻게)/i.test(message) && !/(몇|수량|현황|부족|어제|오늘|이번)/i.test(message);
}

function looksLikeInventoryQuestion(message: string) {
  return /(재고|자재|품목|입고|출고|수불|마감|안전재고|창고|거래|stock|inventory|material)/i.test(message);
}

function wantsLowStockContext(message: string) {
  return /(부족|안전재고|위험|품절|0개|제로|low stock)/i.test(message);
}

function wantsOverviewContext(message: string) {
  return /(현황|전체|총|대시보드|현재|오늘|이번\s*달|이번달|몇\s*개|몇개|얼마나|수량)/i.test(message);
}

function movementToTransactionType(intent: MovementIntent): TransactionType | undefined {
  if (intent === 'inbound') {
    return 'IN';
  }
  if (intent === 'outbound') {
    return 'OUT';
  }
  return undefined;
}

function movementLabel(intent: MovementIntent) {
  if (intent === 'inbound') {
    return '입고';
  }
  if (intent === 'outbound') {
    return '출고';
  }
  return '입출고';
}

function endpointForLedger(params: { type?: TransactionType; from: string; to: string }) {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    size: String(LEDGER_PAGE_SIZE),
  });
  if (params.type) {
    query.set('type', params.type);
  }
  return `/inventory/ledger?${query.toString()}`;
}

async function fetchLedger(params: { type?: TransactionType; from: string; to: string }, signal?: AbortSignal) {
  const transactions: TransactionResponse[] = [];
  let totalElements = 0;
  let totalPages = 1;

  for (let page = 0; page < totalPages && page < MAX_LEDGER_PAGES; page += 1) {
    const response = await api.get<PagedLedger>('/inventory/ledger', {
      params: {
        type: params.type,
        from: params.from,
        to: params.to,
        page,
        size: LEDGER_PAGE_SIZE,
      },
      signal,
    });
    const ledger = response.data;
    transactions.push(...ledger.content);
    totalElements = ledger.totalElements;
    totalPages = ledger.totalPages || 1;
  }

  return { transactions, totalElements, totalPages };
}

function summarizeTransactions(transactions: TransactionResponse[]) {
  return transactions
    .slice(0, 5)
    .map((transaction) => {
      const typeLabel =
        transaction.transactionType === 'IN'
          ? '입고'
          : transaction.transactionType === 'OUT'
            ? '출고'
            : transaction.transactionType;
      return `- ${typeLabel} ${transaction.materialCode} ${formatNumber(toQuantity(transaction))}개 (${transaction.transactionDate})`;
    })
    .join('\n');
}

function buildMovementDirectAnswer(
  intent: MovementIntent,
  dateRange: DateRange,
  inboundQty: number,
  outboundQty: number,
) {
  const dateLabel =
    dateRange.from === dateRange.to
      ? `${dateRange.label}(${dateRange.from})`
      : `${dateRange.label}(${dateRange.from}~${dateRange.to})`;
  if (intent === 'inbound') {
    return `${dateLabel} 들어온 재고는 ${formatNumber(inboundQty)}개입니다.`;
  }
  if (intent === 'outbound') {
    return `${dateLabel} 나간 재고는 ${formatNumber(outboundQty)}개입니다.`;
  }
  return `${dateLabel} 입고는 ${formatNumber(inboundQty)}개, 출고는 ${formatNumber(outboundQty)}개입니다.`;
}

async function appendMovementContext(
  lines: string[],
  traces: ToolTrace[],
  message: string,
  dateRange: DateRange,
  intent: MovementIntent,
  signal?: AbortSignal,
) {
  const startedAt = performance.now();
  const type = movementToTransactionType(intent);
  const ledger = await fetchLedger({ type, from: dateRange.from, to: dateRange.to }, signal);
  const inboundQty = ledger.transactions
    .filter((transaction) => transaction.transactionType === 'IN')
    .reduce((sum, transaction) => sum + toQuantity(transaction), 0);
  const outboundQty = ledger.transactions
    .filter((transaction) => transaction.transactionType === 'OUT')
    .reduce((sum, transaction) => sum + toQuantity(transaction), 0);
  const totalQty = type === 'IN' ? inboundQty : type === 'OUT' ? outboundQty : inboundQty + outboundQty;
  const label = movementLabel(intent);
  const endpoint = endpointForLedger({ type, from: dateRange.from, to: dateRange.to });
  const directAnswer = buildMovementDirectAnswer(intent, dateRange, inboundQty, outboundQty);
  const examples = summarizeTransactions(ledger.transactions);

  lines.push(`질문: ${message}`);
  lines.push(`직접답: ${directAnswer}`);
  lines.push(`조회 범위: ${dateRange.label} (${dateRange.from} ~ ${dateRange.to})`);
  lines.push(`조회 유형: ${label}${type ? ` (${type})` : ''}`);
  lines.push(`총 입고 수량: ${formatNumber(inboundQty)}개`);
  lines.push(`총 출고 수량: ${formatNumber(outboundQty)}개`);
  lines.push(`직접 관련 합계: ${formatNumber(totalQty)}개`);
  lines.push(`거래 건수: ${formatNumber(ledger.totalElements)}건`);
  lines.push('응답 규칙: 직접답의 숫자를 최종 답변에 사용하세요. 거래 건수가 0건이면 0개라고 답하세요.');
  if (examples) {
    lines.push(`최근 거래 예시:\n${examples}`);
  }

  traces.push({
    kind: 'inventory',
    title: `${dateRange.label} ${label} 조회`,
    summary: `${dateRange.from}~${dateRange.to} ${label} ${formatNumber(totalQty)}개, 거래 ${formatNumber(ledger.totalElements)}건`,
    sourceViews: [`GET ${endpoint}`],
    rowCount: ledger.totalElements,
    durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
  });

  return directAnswer;
}

async function appendLowStockContext(lines: string[], traces: ToolTrace[], signal?: AbortSignal) {
  const startedAt = performance.now();
  const response = await api.get<MaterialDto[]>('/materials', { signal });
  const materials = response.data;
  const lowStock = materials
    .filter((material) => {
      const safeStockQty = material.safeStockQty ?? 0;
      const currentStockQty = material.currentStockQty ?? 0;
      return safeStockQty > 0 && currentStockQty <= safeStockQty;
    })
    .sort((left, right) => (left.currentStockQty ?? 0) - (right.currentStockQty ?? 0));

  lines.push(`안전재고 이하 품목 수: ${formatNumber(lowStock.length)}개`);
  lines.push(`전체 품목 수: ${formatNumber(materials.length)}개`);
  if (lowStock.length > 0) {
    lines.push(
      `안전재고 이하 품목 예시:\n${lowStock
        .slice(0, 8)
        .map(
          (material) =>
            `- ${material.materialCode} ${material.materialName}: 현재 ${formatNumber(material.currentStockQty ?? 0)}개 / 안전 ${formatNumber(material.safeStockQty ?? 0)}개`,
        )
        .join('\n')}`,
    );
  }

  traces.push({
    kind: 'inventory',
    title: '안전재고 조회',
    summary: `안전재고 이하 ${formatNumber(lowStock.length)}개 / 전체 ${formatNumber(materials.length)}개`,
    sourceViews: ['GET /materials'],
    rowCount: materials.length,
    durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
  });
}

async function appendOverviewContext(lines: string[], traces: ToolTrace[], signal?: AbortSignal) {
  const startedAt = performance.now();
  const response = await api.get<DashboardSummary>('/dashboard/summary', { signal });
  const summary = response.data;

  lines.push(`현재 총 재고 수량: ${formatNumber(summary.totalStockQty)}개`);
  lines.push(`전체 품목 수: ${formatNumber(summary.totalMaterials)}개`);
  lines.push(`안정 품목: ${formatNumber(summary.stableCount)}개`);
  lines.push(`부족 품목: ${formatNumber(summary.lowCount)}개`);
  lines.push(`0개 품목: ${formatNumber(summary.zeroCount)}개`);
  lines.push(`오늘 입고: ${formatNumber(summary.todayInboundQty)}개`);
  lines.push(`오늘 출고: ${formatNumber(summary.todayOutboundQty)}개`);
  if (summary.currentMonthInboundQty !== undefined) {
    lines.push(`이번 달 입고: ${formatNumber(summary.currentMonthInboundQty)}개`);
  }
  if (summary.currentMonthOutboundQty !== undefined) {
    lines.push(`이번 달 출고: ${formatNumber(summary.currentMonthOutboundQty)}개`);
  }

  traces.push({
    kind: 'inventory',
    title: '재고 현황 조회',
    summary: `총 재고 ${formatNumber(summary.totalStockQty)}개, 부족 ${formatNumber(summary.lowCount)}개`,
    sourceViews: ['GET /dashboard/summary'],
    rowCount: 1,
    durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
  });
}

export async function buildInventoryChatContext(
  message: string,
  signal?: AbortSignal,
  now = new Date(),
): Promise<InventoryChatContext> {
  const trimmedMessage = message.trim();
  if (!trimmedMessage || !looksLikeInventoryQuestion(trimmedMessage) || isConceptQuestion(trimmedMessage)) {
    return { promptContext: null, toolTrace: [] };
  }

  const lines = [
    '[DB_CONTEXT]',
    '아래 값은 현재 로그인 사용자의 권한으로 앱 재고 API에서 조회한 신뢰 가능한 DB 근거입니다.',
    `조회 기준 시간대: ${SEOUL_TIME_ZONE}`,
    `조회 기준일: ${offsetSeoulDate(now, 0)}`,
  ];
  const traces: ToolTrace[] = [];
  const dateRange = resolveDateRange(trimmedMessage, now);
  const movementIntent = resolveMovementIntent(trimmedMessage);
  let directAnswer: string | undefined;

  if (dateRange && movementIntent) {
    directAnswer = await appendMovementContext(lines, traces, trimmedMessage, dateRange, movementIntent, signal);
  }

  if (wantsLowStockContext(trimmedMessage)) {
    await appendLowStockContext(lines, traces, signal);
  }

  if (traces.length === 0 && wantsOverviewContext(trimmedMessage)) {
    await appendOverviewContext(lines, traces, signal);
  }

  if (traces.length === 0) {
    return { promptContext: null, toolTrace: [] };
  }

  lines.push('[/DB_CONTEXT]');
  return {
    promptContext: lines.join('\n'),
    toolTrace: traces,
    directAnswer,
  };
}
