const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
});

const DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
});

function toDate(value: string | number | Date) {
  return value instanceof Date ? value : new Date(value);
}

export function formatAppDateTime(value: string | number | Date | null | undefined) {
  if (!value) {
    return '-';
  }
  return DATE_TIME_FORMATTER.format(toDate(value));
}

export function formatAppDate(value: string | number | Date | null | undefined) {
  if (!value) {
    return '-';
  }
  return DATE_FORMATTER.format(toDate(value));
}

export function formatAppTime(value: string | number | Date | null | undefined) {
  if (!value) {
    return '-';
  }
  return TIME_FORMATTER.format(toDate(value));
}
