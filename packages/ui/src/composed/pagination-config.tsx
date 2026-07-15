export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export const MAX_PAGE_SIZE = PAGE_SIZE_OPTIONS.at(-1) ?? 100;

export function normalizePageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize)) {
    return PAGE_SIZE_OPTIONS[0];
  }

  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(pageSize)));
}
