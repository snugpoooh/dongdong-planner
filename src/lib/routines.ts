import { addDays, dow, minutesOf, type DateKey } from './date';
import type { Routine, RoutineMark } from '../store/types';

export const markKey = (date: DateKey, id: string) => `${date}|${id}`;

export function isActiveOn(r: Routine, date: DateKey): boolean {
  return !r.deletedAt && date >= r.startDate && (!r.endDate || date <= r.endDate) && r.days.includes(dow(date));
}

export function routinesOn(routines: Routine[], date: DateKey): Routine[] {
  return routines
    .filter((r) => isActiveOn(r, date))
    .sort((a, b) => (minutesOf(a.time) ?? 9999) - (minutesOf(b.time) ?? 9999) || a.order - b.order);
}

export function markOf(checks: Record<string, RoutineMark>, date: DateKey, id: string): RoutineMark | null {
  return checks[markKey(date, id)] ?? null;
}

/** Consecutive scheduled days done, counting back from `today` (today counts only once it is done). */
export function streakOf(r: Routine, checks: Record<string, RoutineMark>, today: DateKey): number {
  let n = 0;
  let d = today;
  if (isActiveOn(r, d) && markOf(checks, d, r.id) !== 'done') d = addDays(d, -1); // today still open
  for (let i = 0; i < 400 && d >= r.startDate; i++, d = addDays(d, -1)) {
    if (!isActiveOn(r, d)) continue;
    const m = markOf(checks, d, r.id);
    if (m === 'done') n++;
    else if (m === 'skipped') continue; // a rest day doesn't break the chain
    else break;
  }
  return n;
}

/** Done / counted days within [start, end], up to `today`. Skipped days are left out. */
export function rateOf(r: Routine, checks: Record<string, RoutineMark>, start: DateKey, end: DateKey, today: DateKey) {
  let done = 0;
  let total = 0;
  const last = end < today ? end : today;
  for (let d = start; d <= last; d = addDays(d, 1)) {
    if (!isActiveOn(r, d)) continue;
    const m = markOf(checks, d, r.id);
    if (m === 'skipped') continue;
    if (d === today && m !== 'done') continue; // today isn't missed yet
    total++;
    if (m === 'done') done++;
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : null };
}

const DAY = ['일', '월', '화', '수', '목', '금', '토'];

export function daysLabel(days: number[]): string {
  const s = [...days].sort();
  if (s.length === 7) return '매일';
  if (s.join() === '1,2,3,4,5') return '평일';
  if (s.join() === '0,6') return '주말';
  // 월요일부터 보여 준다
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => s.includes(d)).map((d) => DAY[d]).join('·');
}

export function durationLabel(min: number): string {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

/** Longest run of done days (skipped days don't break it) from the routine's start up to `today`. */
export function bestStreakOf(r: Routine, checks: Record<string, RoutineMark>, today: DateKey): number {
  let best = 0;
  let run = 0;
  const end = r.endDate && r.endDate < today ? r.endDate : today;
  for (let d = r.startDate, i = 0; d <= end && i < 2000; d = addDays(d, 1), i++) {
    if (!isActiveOn(r, d)) continue;
    const m = markOf(checks, d, r.id);
    if (m === 'done') best = Math.max(best, ++run);
    else if (m === 'skipped') continue;
    else if (d !== today) run = 0;
  }
  return best;
}

export function totalDoneOf(r: Routine, checks: Record<string, RoutineMark>): number {
  const suffix = `|${r.id}`;
  let n = 0;
  for (const [k, v] of Object.entries(checks)) if (v === 'done' && k.endsWith(suffix)) n++;
  return n;
}

export interface DayRate {
  date: DateKey;
  done: number;
  total: number; // scheduled minus skipped
  pct: number | null;
}

/** All routines combined, per day, for [start, end] (days after today are left empty). */
export function dailyRates(routines: Routine[], checks: Record<string, RoutineMark>, start: DateKey, end: DateKey, today: DateKey): DayRate[] {
  const out: DayRate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    let done = 0;
    let total = 0;
    if (d <= today) {
      for (const r of routines) {
        if (!isActiveOn(r, d)) continue;
        const m = markOf(checks, d, r.id);
        if (m === 'skipped') continue;
        if (d === today && m !== 'done') continue;
        total++;
        if (m === 'done') done++;
      }
    }
    out.push({ date: d, done, total, pct: total ? Math.round((done / total) * 100) : null });
  }
  return out;
}

/** Completion by weekday (0 = 일 … 6 = 토) across [start, end]. */
export function weekdayRates(routines: Routine[], checks: Record<string, RoutineMark>, start: DateKey, end: DateKey, today: DateKey) {
  const acc = Array.from({ length: 7 }, () => ({ done: 0, total: 0 }));
  for (const day of dailyRates(routines, checks, start, end, today)) {
    const w = dow(day.date);
    acc[w].done += day.done;
    acc[w].total += day.total;
  }
  return acc.map((a, w) => ({ dow: w, ...a, pct: a.total ? Math.round((a.done / a.total) * 100) : null }));
}

export function sumRates(days: DayRate[]) {
  const done = days.reduce((s, d) => s + d.done, 0);
  const total = days.reduce((s, d) => s + d.total, 0);
  return { done, total, pct: total ? Math.round((done / total) * 100) : null };
}
