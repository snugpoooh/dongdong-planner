import { useMemo } from 'react';
import { Clock, Plus } from 'lucide-react';
import { Card, PageHead, PrevNext } from '../components/ui';
import { HOUR_PX } from '../components/Timeline';
import { useStore } from '../store/store';
import { openEvent } from '../store/ui';
import { layoutDay, occurrencesOn, timeRange } from '../store/selectors';
import { addDays, dow, dowLong, hhmm, mdDot, weekDays, weekRangeLabel, weekStart } from '../lib/date';
import { useNowMinutes, useToday } from '../lib/hooks';
import { go } from '../lib/router';
import { isHoliday } from '../lib/holidays';

export function WeeklyPage({ week }: { week: string }) {
  const today = useToday();
  const events = useStore((s) => s.events);
  const days = weekDays(week);
  const occ = useMemo(() => days.map((d) => occurrencesOn(events, d)), [events, week]); // eslint-disable-line react-hooks/exhaustive-deps
  const hasAllDay = occ.some((o) => o.some((x) => x.startMin == null));
  const now = useNowMinutes();
  const todayIdx = days.indexOf(today);

  const scrollToNow = () => {
    document.querySelector('.week-now')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="24-hour schedule"
        title="Weekly"
        desc={weekRangeLabel(week)}
        side={
          <PrevNext onPrev={() => go(`weekly/${addDays(week, -7)}`)} onNext={() => go(`weekly/${addDays(week, 7)}`)}>
            <button className="btn btn-soft" onClick={() => go(`weekly/${weekStart(today)}`)}>
              이번 주
            </button>
          </PrevNext>
        }
      />
      <Card
        icon={<Clock />}
        kicker="00:00 – 24:00"
        title="주간 시간표"
        actions={
          <>
            <button className="icon-btn" aria-label="현재 시각으로" onClick={scrollToNow} disabled={todayIdx < 0}>
              <Clock />
            </button>
            <button className="btn btn-soft" onClick={() => openEvent({ startDate: todayIdx >= 0 ? today : week })}>
              <Plus /> 일정 추가
            </button>
          </>
        }
      >
        <div className="tiny" style={{ color: 'var(--ink-2)', margin: '-4px 0 12px' }}>
          빈 칸을 누르면 일정이 추가되고, 날짜를 누르면 Daily가 열립니다. ◇는 종료 시간 미정입니다.
        </div>
        <div className="week-grid">
          <div className="week-head">
            <div>시간</div>
            {days.map((d) => {
              const w = dow(d);
              const cls = [d === today ? 'today' : '', w === 6 ? 'sat' : '', w === 0 || isHoliday(d) ? 'sun' : ''].join(' ');
              return (
                <button key={d} className={cls} onClick={() => go(`daily/${d}`)} title={`${mdDot(d)} Daily 열기`}>
                  {mdDot(d)} {dowLong(d)}
                </button>
              );
            })}
          </div>
          {hasAllDay && (
            <div className="week-allday">
              <div>종일</div>
              {occ.map((list, i) => (
                <div key={days[i]}>
                  {list
                    .filter((o) => o.startMin == null)
                    .map((o) => (
                      <button key={o.event.id} onClick={() => openEvent(undefined, o.event.id, days[i])}>
                        {o.event.title}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          )}
          <div className="week-body">
            <div className="week-times">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h}>{String(h).padStart(2, '0')}:00</div>
              ))}
              <div style={{ height: 0 }}>24:00</div>
            </div>
            {days.map((d, i) => (
              <div key={d} className={`week-col ${d === today ? 'today' : ''}`}>
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className="week-cell"
                    role="button"
                    aria-label={`${mdDot(d)} ${h}시에 일정 추가`}
                    onClick={() => openEvent({ startDate: d, startTime: hhmm(h * 60), endTime: hhmm(Math.min(h * 60 + 60, 1439)) })}
                  />
                ))}
                {layoutDay(occ[i]).map(({ o, start, end, col, cols }) => {
                  const w = 100 / cols;
                  return (
                    <button
                      key={o.event.id}
                      className={`tl-event ${o.endMin == null ? 'open-end' : ''} ${end - start < 58 ? 'one-line' : ''}`}
                      style={{
                        top: (start / 60) * HOUR_PX,
                        height: Math.max(((end - start) / 60) * HOUR_PX - 2, 18),
                        left: `calc(${col * w}% + 2px)`,
                        width: `calc(${w}% - 4px)`,
                        right: 'auto',
                      }}
                      onClick={() => openEvent(undefined, o.event.id, d)}
                      title={`${timeRange(o)} ${o.event.title}`}
                    >
                      <div className="t">{timeRange(o)}</div>
                      <div className="n">{o.event.title}</div>
                    </button>
                  );
                })}
              </div>
            ))}
            {todayIdx >= 0 && (
              <>
                <div className="week-now-pill" style={{ top: (now / 60) * HOUR_PX }}>
                  {hhmm(now)}
                </div>
                <div
                  className="week-now"
                  style={{
                    top: (now / 60) * HOUR_PX,
                    left: `calc(46px + (100% - 46px) * ${todayIdx} / 7)`,
                    width: `calc((100% - 46px) / 7)`,
                  }}
                />
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
