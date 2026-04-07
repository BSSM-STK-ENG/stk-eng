import api from '../api/axios';

export type ExportType = 'inbound' | 'outbound' | 'current' | 'ledger' | 'history' | 'closing';

export async function downloadServerExcel(type: ExportType) {
  const response = await api.get(`/export/${type}`, { responseType: 'blob' });
  const disposition = response.headers['content-disposition'] as string | undefined;
  const fallbackDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fallbackName = `${type}_${fallbackDate}.xlsx`;
  const filename = disposition?.match(/filename=(.+)/)?.[1] ?? fallbackName;

  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;

  const keys = Object.keys(rows[0]!);
  const header = keys.map(escapeCsvField).join(',');
  const body = rows.map((row) => keys.map((k) => escapeCsvField(String(row[k] ?? ''))).join(',')).join('\n');
  const csv = `${header}\n${body}`;

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  link.href = url;
  link.download = `${filename}_${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
