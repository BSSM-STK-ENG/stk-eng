import { describe, expect, it } from 'vitest';
import {
  formatBusinessUnit,
  formatDisplayText,
  formatLocation,
  formatTransactionTypeLabel,
  isMeaningfulInventoryValue,
  sanitizeBusinessUnit,
  sanitizeInventoryText,
  sanitizeLocation,
} from '../inventory-display';

describe('inventory-display utilities', () => {
  it('removes empty placeholder values', () => {
    expect(sanitizeInventoryText(' nan ')).toBeNull();
    expect(sanitizeInventoryText('undefined')).toBeNull();
    expect(sanitizeInventoryText(' A-01 ')).toBe('A-01');
  });

  it('filters memo-like business unit noise', () => {
    expect(sanitizeBusinessUnit('QA-T1')).toBe('QA-T1');
    expect(sanitizeBusinessUnit('2_1,2_2')).toBeNull();
    expect(sanitizeBusinessUnit('호환가능. 생김새 상이')).toBeNull();
  });

  it('keeps location cleanup lightweight', () => {
    expect(sanitizeLocation(' Rack A-02 ')).toBe('Rack A-02');
    expect(sanitizeLocation('nan')).toBeNull();
  });

  it('formats display fallbacks consistently', () => {
    expect(formatDisplayText(null)).toBe('-');
    expect(formatBusinessUnit('nan')).toBe('-');
    expect(formatLocation('zone-1')).toBe('zone-1');
  });

  it('maps transaction type labels to Korean copy', () => {
    expect(formatTransactionTypeLabel('IN')).toBe('입고');
    expect(formatTransactionTypeLabel('OUT')).toBe('출고');
    expect(formatTransactionTypeLabel('RETURN')).toBe('반입');
    expect(formatTransactionTypeLabel('EXCHANGE')).toBe('교환');
  });

  it('reports meaningful values based on sanitized text', () => {
    expect(isMeaningfulInventoryValue('A-01')).toBe(true);
    expect(isMeaningfulInventoryValue('nan')).toBe(false);
  });
});
