import type { TransactionType } from '../types/api';

const EMPTY_TOKENS = new Set(['', '-', '--', 'nan', 'null', 'undefined', 'n/a', 'na', 'none']);
const BUSINESS_UNIT_PATTERN = /^[0-9A-Za-z가-힣][0-9A-Za-z가-힣\s()/_-]{0,35}$/;
const BUSINESS_UNIT_BLOCKLIST = ['호환', '상이', '생김새', '사양'];

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function sanitizeInventoryText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const normalized = collapseWhitespace(value);
  if (!normalized || EMPTY_TOKENS.has(normalized.toLowerCase())) {
    return null;
  }

  return normalized;
}

export function isMeaningfulInventoryValue(value: string | null | undefined) {
  return sanitizeInventoryText(value) != null;
}

export function sanitizeBusinessUnit(value: string | null | undefined): string | null {
  const normalized = sanitizeInventoryText(value);
  if (!normalized) {
    return null;
  }

  if (!BUSINESS_UNIT_PATTERN.test(normalized)) {
    return null;
  }

  if (BUSINESS_UNIT_BLOCKLIST.some((fragment) => normalized.includes(fragment))) {
    return null;
  }

  return normalized;
}

export function sanitizeLocation(value: string | null | undefined): string | null {
  return sanitizeInventoryText(value);
}

export function formatDisplayText(value: string | null | undefined, fallback = '-') {
  return sanitizeInventoryText(value) ?? fallback;
}

export function formatBusinessUnit(value: string | null | undefined, fallback = '-') {
  return sanitizeBusinessUnit(value) ?? fallback;
}

export function formatLocation(value: string | null | undefined, fallback = '-') {
  return sanitizeLocation(value) ?? fallback;
}

export function formatTransactionTypeLabel(type: TransactionType) {
  switch (type) {
    case 'IN':
      return '입고';
    case 'OUT':
      return '출고';
    case 'RETURN':
      return '반입';
    case 'EXCHANGE':
      return '교환';
    default:
      return type;
  }
}
