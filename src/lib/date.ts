// Date helpers. All calendar dates are local 'YYYY-MM-DD' strings (DateKey).

export type DateKey = string; // YYYY-MM-DD
export type MonthKey = string; // YYYY-MM
export type YearKey = string; // YYYY

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayKey(): DateKey {
  return toKey(new Date());
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthOf(key: DateKey): MonthKey {
  return key.slice(0, 7);
}

export function yearOf(key: DateKey | MonthKey): YearKey {
  return key.slice(0, 4);
}

/** Monday of the week containing `key` (weeks run 월요일–주일). */
export function weekStart(key: DateKey): DateKey {
  const d = parseKey(key);
  const dow = d.getDay(); // 0 = Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return toKey(d);
}

export function weekDays(weekKey: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekKey, i));
}

export function daysInMonth(month: MonthKey): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthDays(month: MonthKey): DateKey[] {
  const n = daysInMonth(month);
  return Array.from({ length: n }, (_, i) => `${month}-${pad(i + 1)}`);
}

/** 6x7 (or 5x7) grid for a month, starting on Sunday (0) or Monday (1). */
export function monthGrid(month: MonthKey, startDow: 0 | 1): DateKey[] {
  const first = parseKey(`${month}-01`);
  const lead = (first.getDay() - startDow + 7) % 7;
  const start = addDays(`${month}-01`, -lead);
  const total = lead + daysInMonth(month);
  const weeks = Math.ceil(total / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
}

export function dow(key: DateKey): number {
  return parseKey(key).getDay();
}

export const DOW_SHORT = ['일', '월', '화', '수', '목', '금', '토'];
export const DOW_LONG = ['주일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
export const MONTH_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** 일요일 is labelled per settings (default 주일, matching the reference). */
let sundayLabel = '주일';
export function setSundayLabel(label: string) {
  sundayLabel = label || '일요일';
}
export function dowLong(key: DateKey): string {
  const d = dow(key);
  return d === 0 ? sundayLabel : DOW_LONG[d];
}
export function dowShort(key: DateKey): string {
  const d = dow(key);
  return d === 0 ? (sundayLabel === '주일' ? '주일' : '일') : DOW_SHORT[d];
}

/** "11.10" */
export function mdDot(key: DateKey): string {
  const d = parseKey(key);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

/** "11.10 화요일" */
export function mdDow(key: DateKey): string {
  return `${mdDot(key)} ${dowLong(key)}`;
}

/** "11월 10일" */
export function mdKorean(key: DateKey): string {
  const d = parseKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** "2026. 11. 10." */
export function ymdDots(key: DateKey): string {
  const d = parseKey(key);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

/** "2026년 11월" */
export function monthLabel(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number);
  return `${y}년 ${m}월`;
}

/** "2026년 11.9 월요일 – 11.15 주일" */
export function weekRangeLabel(weekKey: DateKey, withYear = true): string {
  const end = addDays(weekKey, 6);
  const y = weekKey.slice(0, 4);
  return `${withYear ? `${y}년 ` : ''}${mdDow(weekKey)} – ${mdDow(end)}`;
}

export function isBetween(key: DateKey, start: DateKey, end: DateKey) {
  return key >= start && key <= end;
}

export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86400000);
}

// ---- time ----
export function minutesOf(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

export function hhmm(min: number): string {
  const m = Math.max(0, Math.min(24 * 60, Math.round(min)));
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** "오전 05:00" */
export function ampm(time: string): string {
  const m = minutesOf(time);
  if (m == null) return '';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const isPm = h >= 12 && h < 24;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${isPm ? '오후' : '오전'} ${pad(h12)}:${pad(mm)}`;
}

export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
