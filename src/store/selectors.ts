import { addDays, diffDays, dow, minutesOf, parseKey, type DateKey } from '../lib/date';
import type { Occurrence, PlanEvent, PriorityGroup, Task, TaskStatus } from './types';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '미시작',
  in_progress: '진행 중',
  done: '완료',
  deferred: '연기',
  cancelled: '취소',
  delegated: '위임',
};

export const GROUP_LABEL: Record<Exclude<PriorityGroup, ''>, string> = {
  A: '반드시 오늘 해야 할 일',
  B: '하면 좋은 일',
  C: '여유가 생기면',
};

export const Q_HINT: Record<number, string> = {
  0: '미분류',
  1: 'Q1 · 긴급하고 중요한 일',
  2: 'Q2 · 중요하지만 긴급하지 않은 일',
  3: 'Q3 · 긴급하지만 중요하지 않은 일',
};

const GROUP_RANK: Record<PriorityGroup, number> = { A: 0, B: 1, C: 2, '': 3 };

export const alive = <T extends { deletedAt: string | null }>(xs: T[]) => xs.filter((x) => !x.deletedAt);

export function byOrder(a: Task, b: Task) {
  return GROUP_RANK[a.group] - GROUP_RANK[b.group] || a.order - b.order;
}

export function tasksOnDate(tasks: Task[], date: DateKey): Task[] {
  return tasks.filter((t) => !t.deletedAt && t.date === date).sort(byOrder);
}

export function tasksInRange(tasks: Task[], start: DateKey, end: DateKey): Task[] {
  return tasks
    .filter((t) => !t.deletedAt && t.date && t.date >= start && t.date <= end)
    .sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : byOrder(a, b)));
}

/** Tasks that still need attention (not finished, cancelled or handed forward). */
export function isOpen(t: Task) {
  return t.status === 'todo' || t.status === 'in_progress';
}

export function isClosed(t: Task) {
  return t.status === 'done' || t.status === 'cancelled' || (t.status === 'deferred' && !!t.deferredTo);
}

/** Progress over tasks that count: deferred-with-successor rows are bookkeeping, not work. */
export function progressOf(tasks: Task[]) {
  const counted = tasks.filter((t) => !t.deletedAt && !(t.status === 'deferred' && t.deferredTo) && t.status !== 'cancelled');
  const done = counted.filter((t) => t.status === 'done').length;
  return { done, total: counted.length, pct: counted.length ? Math.round((done / counted.length) * 100) : 0 };
}

export function statusLine(t: Task, mdFn: (d: DateKey) => string): string {
  switch (t.status) {
    case 'deferred':
      return t.deferredTo ? `연기 → ${mdFn(t.deferredTo)}` : '연기';
    case 'delegated':
      return ['위임', t.delegateTo, t.checkDate ? `확인 ${mdFn(t.checkDate)}` : null].filter(Boolean).join(' · ');
    default:
      return STATUS_LABEL[t.status];
  }
}

// ---------- events ----------

function occursOn(e: PlanEvent, date: DateKey): boolean {
  if (date < e.startDate) return false;
  const span = e.endDate && e.endDate > e.startDate ? diffDays(e.startDate, e.endDate) : 0;
  const inSpan = (anchor: DateKey) => date >= anchor && date <= addDays(anchor, span);
  switch (e.repeat) {
    case 'none':
      return inSpan(e.startDate);
    case 'daily':
      return true;
    case 'weekly': {
      for (let k = 0; k <= span; k++) if (dow(addDays(date, -k)) === dow(e.startDate) && addDays(date, -k) >= e.startDate) return true;
      return false;
    }
    case 'monthly': {
      for (let k = 0; k <= span; k++) {
        const anchor = addDays(date, -k);
        if (anchor >= e.startDate && parseKey(anchor).getDate() === parseKey(e.startDate).getDate()) return true;
      }
      return false;
    }
    case 'yearly': {
      for (let k = 0; k <= span; k++) {
        const anchor = addDays(date, -k);
        if (anchor >= e.startDate && anchor.slice(5) === e.startDate.slice(5)) return true;
      }
      return false;
    }
  }
}

export function occurrencesOn(events: PlanEvent[], date: DateKey): Occurrence[] {
  const out: Occurrence[] = [];
  for (const e of events) {
    if (e.deletedAt || !occursOn(e, date)) continue;
    const multiDay = !!e.endDate && e.endDate > e.startDate;
    const s = e.allDay ? null : minutesOf(e.startTime);
    const en = e.allDay ? null : minutesOf(e.endTime);
    out.push({ event: e, date, startMin: s, endMin: en != null && s != null && en <= s ? 24 * 60 : en, multiDay });
  }
  return out.sort((a, b) => (a.startMin ?? -1) - (b.startMin ?? -1));
}

export function occurrencesInRange(events: PlanEvent[], start: DateKey, end: DateKey): Occurrence[] {
  const out: Occurrence[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(...occurrencesOn(events, d));
  return out;
}

/** One entry per event within a range (its first occurrence), for "연결된 일정" lists. */
export function eventsInRange(events: PlanEvent[], start: DateKey, end: DateKey): Occurrence[] {
  const seen = new Set<string>();
  return occurrencesInRange(events, start, end).filter((o) => {
    if (seen.has(o.event.id)) return false;
    seen.add(o.event.id);
    return true;
  });
}

export const REPEAT_LABEL: Record<string, string> = { none: '', daily: '매일', weekly: '매주', monthly: '매월', yearly: '매년' };

/** Lay out overlapping timed occurrences in columns. */
export function layoutDay(occ: Occurrence[]) {
  const timed = occ
    .filter((o) => o.startMin != null)
    .map((o) => ({ o, start: o.startMin!, end: Math.max(o.endMin ?? o.startMin! + 45, o.startMin! + 20) }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const placed: { o: Occurrence; start: number; end: number; col: number; cols: number }[] = [];
  let cluster: typeof placed = [];
  let clusterEnd = -1;
  const flush = () => {
    const n = Math.max(1, ...cluster.map((c) => c.col + 1));
    cluster.forEach((c) => (c.cols = n));
    cluster = [];
  };
  for (const item of timed) {
    if (item.start >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    const used = new Set(cluster.filter((c) => c.end > item.start).map((c) => c.col));
    let col = 0;
    while (used.has(col)) col++;
    const p = { ...item, col, cols: 1 };
    cluster.push(p);
    placed.push(p);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();
  return placed;
}

export function timeRange(o: Occurrence): string {
  const e = o.event;
  if (e.allDay) return '종일';
  if (!e.startTime) return '';
  return e.endTime ? `${e.startTime}–${e.endTime}` : `${e.startTime} ◇`;
}
