export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function excerpt(value: string, max = 180): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max).trimEnd()}…`;
}

export function authorName(author: string | { _id: string; name: string }): string {
  return typeof author === 'string' ? 'You' : author.name;
}
