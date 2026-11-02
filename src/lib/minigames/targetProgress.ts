import type { Operation } from './targetMasters';

export type TargetProgress = { unlocked: number; stars: Record<string, number>; daily: string; attempts?: number; completed?: number; hintsUsed?: number; operationsUsed?: Partial<Record<Operation, number>>; dailyWins?: number; dailyDates?: string[] };
export const EMPTY_PROGRESS: TargetProgress = { unlocked: 1, stars: {}, daily: '' };
const ops: Operation[] = ['+', '−', '×', '÷'];
const count = (value: unknown, max = 10000000) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;

export function normalizeProgress(value: unknown): TargetProgress {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawStars = data.stars && typeof data.stars === 'object' ? data.stars as Record<string, unknown> : {};
  const stars: Record<string, number> = {};
  for (let level = 1; level <= 100; level++) { const star = count(rawStars[String(level)], 3); if (star) stars[level] = star; }
  const rawOps = data.operationsUsed && typeof data.operationsUsed === 'object' ? data.operationsUsed as Record<string, unknown> : {};
  const operationsUsed: Partial<Record<Operation, number>> = {};
  for (const op of ops) operationsUsed[op] = count(rawOps[op]);
  return { unlocked: Math.max(1, count(data.unlocked, 100)), stars, daily: typeof data.daily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.daily) ? data.daily : '', attempts: count(data.attempts), completed: count(data.completed), hintsUsed: count(data.hintsUsed), dailyWins: count(data.dailyWins), dailyDates: Array.isArray(data.dailyDates) ? [...new Set(data.dailyDates.filter((v): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)))].slice(-366) : [], operationsUsed };
}

/** Niveles y estrellas máximos; contadores sumados entre dispositivos distintos. */
export function mergeProgress(replicas: TargetProgress[]): TargetProgress {
  const result = normalizeProgress(EMPTY_PROGRESS);
  for (const item of replicas.map(normalizeProgress)) {
    result.unlocked = Math.max(result.unlocked, item.unlocked);
    result.daily = item.daily > result.daily ? item.daily : result.daily;
    for (const [level, stars] of Object.entries(item.stars)) result.stars[level] = Math.max(result.stars[level] ?? 0, stars);
    for (const field of ['attempts', 'completed', 'hintsUsed', 'dailyWins'] as const) result[field] = (result[field] ?? 0) + (item[field] ?? 0);
    for (const op of ops) result.operationsUsed![op] = (result.operationsUsed![op] ?? 0) + (item.operationsUsed?.[op] ?? 0);
  }
  result.dailyDates = [...new Set(replicas.flatMap(item => normalizeProgress(item).dailyDates ?? []))].sort();
  result.dailyWins = (result.dailyWins ?? 0) + result.dailyDates.length;
  return result;
}

/** Idempotent merge for the same device, including two tabs racing. */
export function mergeSameDevice(a: TargetProgress, b: TargetProgress): TargetProgress {
  const left = normalizeProgress(a), right = normalizeProgress(b);
  const result = mergeProgress([left, right]);
  for (const field of ['attempts', 'completed', 'hintsUsed', 'dailyWins'] as const) result[field] = Math.max(left[field] ?? 0, right[field] ?? 0);
  for (const op of ops) result.operationsUsed![op] = Math.max(left.operationsUsed?.[op] ?? 0, right.operationsUsed?.[op] ?? 0);
  return result;
}
