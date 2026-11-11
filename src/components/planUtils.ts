import type { Occurrence } from '../store/types';

export { addMonths, mdDow } from '../lib/date';

export function timeLabelOf(o: Occurrence): string {
  const e = o.event;
  if (e.allDay) return '종일';
  if (!e.startTime) return '';
  return e.endTime ? `${e.startTime}–${e.endTime}` : `${e.startTime}~`;
}
