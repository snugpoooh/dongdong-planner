import { useRef } from 'react';
import { Check, Repeat } from 'lucide-react';
import { hhmm, minutesOf } from '../lib/date';
import { useNowMinutes } from '../lib/hooks';
import { layoutItems, timeRange } from '../store/selectors';
import { useStore } from '../store/store';
import { openEvent } from '../store/ui';
import type { Occurrence, Routine, RoutineMark } from '../store/types';

export const HOUR_PX = 33;

export interface TimedRoutine {
  r: Routine;
  mark: RoutineMark | null;
}

type Item = { kind: 'event'; o: Occurrence } | { kind: 'routine'; tr: TimedRoutine };

/** Events and timed routines for one day, laid out together. */
export function placeDay(occ: Occurrence[], routines: TimedRoutine[] = []) {
  const items: { item: Item; start: number; end: number }[] = [
    ...occ.filter((o) => o.startMin != null).map((o) => ({ item: { kind: 'event' as const, o }, start: o.startMin!, end: o.endMin ?? o.startMin! + 45 })),
    ...routines
      .filter((tr) => tr.r.time)
      .map((tr) => {
        const s = minutesOf(tr.r.time)!;
        return { item: { kind: 'routine' as const, tr }, start: s, end: Math.min(s + tr.r.duration, 24 * 60) };
      }),
  ];
  return layoutItems(items);
}

/** One positioned block (event or routine) inside a day column. */
export function Block({ item, start, end, col, cols, date, inset = 1 }: { item: Item; start: number; end: number; col: number; cols: number; date: string; inset?: number }) {
  const setMark = useStore((s) => s.setRoutineMark);
  const top = (start / 60) * HOUR_PX;
  const height = Math.max(((end - start) / 60) * HOUR_PX - 2, 18);
  const w = 100 / cols;
  const style = { top, height, left: `calc(${col * w}% + ${inset}px)`, width: `calc(${w}% - ${inset * 2 + 1}px)`, right: 'auto' as const };
  const oneLine = end - start < 58 ? 'one-line' : '';
  if (item.kind === 'event') {
    const o = item.o;
    return (
      <button
        className={`tl-event ${o.endMin == null ? 'open-end' : ''} ${oneLine}`}
        style={style}
        onClick={() => openEvent(undefined, o.event.id, date)}
        title={`${timeRange(o)} ${o.event.title}`}
      >
        <div className="t">{timeRange(o)}</div>
        <div className="n">{o.event.title}</div>
      </button>
    );
  }
  const { r, mark } = item.tr;
  const done = mark === 'done';
  return (
    <button
      className={`tl-event tl-routine ${oneLine} ${done ? 'done' : ''} ${mark === 'skipped' ? 'skipped' : ''}`}
      style={style}
      aria-pressed={done}
      onClick={() => setMark(date, r.id, done ? null : 'done')}
      title={`루틴 · ${r.time} ${r.title} — 눌러서 ${done ? '완료 취소' : '완료'}`}
    >
      <div className="t">
        {done ? <Check className="ri" /> : <Repeat className="ri" />} {r.time}
      </div>
      <div className="n">{r.title}</div>
    </button>
  );
}

export function DayTimeline({
  date,
  occurrences,
  routines = [],
  isToday,
  scrollRef,
}: {
  date: string;
  occurrences: Occurrence[];
  routines?: TimedRoutine[];
  isToday: boolean;
  scrollRef?: React.RefObject<HTMLDivElement>;
}) {
  const now = useNowMinutes();
  const placed = placeDay(occurrences, routines);
  const allDay = occurrences.filter((o) => o.startMin == null);
  const localRef = useRef<HTMLDivElement>(null);
  const ref = scrollRef ?? localRef;
  return (
    <div>
      {allDay.length > 0 && (
        <div className="allday">
          {allDay.map((o) => (
            <button key={o.event.id} onClick={() => openEvent(undefined, o.event.id, date)}>
              {o.event.title}
              {o.multiDay ? ' ↔' : ''}
            </button>
          ))}
        </div>
      )}
      <div className="timeline" ref={ref}>
        {Array.from({ length: 25 }, (_, h) => (
          <div className="tl-row" key={h} data-hour={h}>
            <div className="tl-time">{String(h).padStart(2, '0')}:00</div>
            {h < 24 ? (
              <button
                className="tl-slot"
                aria-label={`${h}시에 일정 추가`}
                onClick={() => openEvent({ startDate: date, startTime: hhmm(h * 60), endTime: hhmm(Math.min(h * 60 + 60, 24 * 60 - 1)) })}
              />
            ) : (
              <div className="tl-slot" style={{ cursor: 'default' }} />
            )}
          </div>
        ))}
        <div className="tl-events">
          {placed.map((p) => (
            <Block key={p.item.kind === 'event' ? `e-${p.item.o.event.id}` : `r-${p.item.tr.r.id}`} {...p} date={date} />
          ))}
        </div>
        {isToday && (
          <div className="tl-now" style={{ top: 8 + (now / 60) * HOUR_PX }} data-now>
            <span className="tl-now-pill">{hhmm(now)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function EventList({ occurrences, date, withDate }: { occurrences: Occurrence[]; date?: string; withDate?: (o: Occurrence) => string }) {
  if (!occurrences.length) return <div className="empty">이 기간에 예정된 일정이 없습니다.</div>;
  return (
    <div className="event-list">
      {occurrences.map((o) => (
        <button key={`${o.event.id}-${o.date}`} className="event-item" onClick={() => openEvent(undefined, o.event.id, date ?? o.date)}>
          <span className="bar" />
          <span className="time">{o.event.allDay ? '종일' : o.event.startTime ?? ''}</span>
          <span>
            <div className="name">{o.event.title}</div>
            <div className="meta">{withDate ? withDate(o) : timeRange(o)}</div>
          </span>
        </button>
      ))}
    </div>
  );
}
