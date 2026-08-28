export function paginationWindow(current: number, total: number, radius = 2): number[] {
  if (total <= 0) return [];
  const start = Math.max(1, current - radius);
  const end = Math.min(total, current + radius);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
