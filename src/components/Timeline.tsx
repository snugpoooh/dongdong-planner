import { useRef } from 'react';
import { hhmm } from '../lib/date';
import { useNowMinutes } from '../lib/hooks';
import { layoutDay, timeRange } from '../store/selectors';
import { openEvent } from '../store/ui';
import type { Occurrence } from '../store/types';

export const HOUR_PX = 33;

export function DayTimeline({
  date,
  occurrences,
  isToday,
  scrollRef,
}: {
  date: string;
  occurrences: Occurrence[];
  isToday: boolean;
  scrollRef?: React.RefObject<HTMLDivElement>;
}) {
  const now = useNowMinutes();
  const placed = layoutDay(occurrences);
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
                onClick={() =>
                  openEvent({ startDate: date, startTime: hhmm(h * 60), endTime: hhmm(Math.min(h * 60 + 60, 24 * 60 - 1)) })
                }
              />
            ) : (
              <div className="tl-slot" style={{ cursor: 'default' }} />
            )}
          </div>
        ))}
        <div className="tl-events">
          {placed.map(({ o, start, end, col, cols }) => {
            const top = (start / 60) * HOUR_PX;
            const height = Math.max(((end - start) / 60) * HOUR_PX - 2, 18);
            const w = 100 / cols;
            return (
              <button
                key={`${o.event.id}-${o.date}`}
                className={`tl-event ${o.endMin == null ? 'open-end' : ''} ${end - start < 58 ? 'one-line' : ''}`}
                style={{ top, height, left: `calc(${col * w}% + 1px)`, width: `calc(${w}% - 3px)` }}
                onClick={() => openEvent(undefined, o.event.id, date)}
                title={`${timeRange(o)} ${o.event.title}`}
              >
                <div className="t">{timeRange(o)}</div>
                <div className="n">{o.event.title}</div>
              </button>
            );
          })}
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
