// MySQL returns "YYYY-MM-DD HH:MM:SS" (space, no offset). That's not strict ISO 8601 —
// Safari/Firefox can reject it as Invalid Date even though V8 accepts it as an extension.
// Converting the space to 'T' makes it unambiguous and locale/timezone-naive everywhere.
export function parseServerDate(value: string): Date {
  return new Date(value.includes('T') ? value : value.replace(' ', 'T'));
}

export function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(parseServerDate(value));
}

export function formatEventTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(parseServerDate(value));
}

export function formatEventDateTime(value: string): string {
  return `${formatEventDate(value)} · ${formatEventTime(value)}`;
}

export function formatEventDateLong(value: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(parseServerDate(value));
}

export function formatLiveTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).format(date);
}

export function formatLiveDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).format(date);
}
