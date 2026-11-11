import { addDays, addMonths, daysInMonth, monthOf, parseKey, weekStart, type DateKey } from './date';
import type { Review } from '../store/types';

export interface DueReview {
  key: string;
  label: string;
  path: string;
}

/**
 * Review windows: a week is reviewed from its 토요일 through the following 월요일,
 * a month from its last two days through the 3rd of the next month,
 * a year from 12/26 through 1/7.
 */
export function dueReviews(today: DateKey, reviews: Record<string, Review>, dismissed: string[]): DueReview[] {
  const out: DueReview[] = [];
  const d = parseKey(today);
  const dow = d.getDay();

  // week
  let wk: DateKey | null = null;
  if (dow === 6 || dow === 0) wk = weekStart(today);
  else if (dow === 1) wk = weekStart(addDays(today, -1));
  if (wk) out.push({ key: `week:${wk}`, label: '이번 주를 돌아볼 시간이에요', path: `review/week/${wk}` });

  // month
  const m = monthOf(today);
  const dim = daysInMonth(m);
  let mk: string | null = null;
  if (d.getDate() >= dim - 1) mk = m;
  else if (d.getDate() <= 3) mk = addMonths(m, -1);
  if (mk) out.push({ key: `month:${mk}`, label: `${Number(mk.slice(5))}월을 돌아볼 시간이에요`, path: `review/month/${mk}` });

  // year
  const y = d.getFullYear();
  let yk: string | null = null;
  if (d.getMonth() === 11 && d.getDate() >= 26) yk = String(y);
  else if (d.getMonth() === 0 && d.getDate() <= 7) yk = String(y - 1);
  if (yk) out.push({ key: `year:${yk}`, label: `${yk}년을 돌아볼 시간이에요`, path: `review/year/${yk}` });

  return out.filter((r) => !reviews[r.key]?.completedAt && !dismissed.includes(r.key));
}
