const numberFormat = new Intl.NumberFormat('ko-KR');
const compactNumberFormat = new Intl.NumberFormat('ko-KR', { notation: 'compact' });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatCompactNumber(value: number): string {
  return compactNumberFormat.format(value);
}
