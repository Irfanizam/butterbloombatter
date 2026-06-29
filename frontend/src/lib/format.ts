export function formatRM(amount: number): string {
  return `RM ${amount.toFixed(2)}`;
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** 'YYYY-MM' -> short month label e.g. 'Jun'. */
export function monthLabel(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  return new Date(year, mon - 1, 1).toLocaleDateString('en-MY', { month: 'short' });
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
