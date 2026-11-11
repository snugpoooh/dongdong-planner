import { useMemo, useState } from 'react';
import { CalendarDays, ClipboardCheck, Plus } from 'lucide-react';
import { Card, PageHead, PrevNext, Seg } from '../components/ui';
import { GoalsCard, PeriodEventsCard, PeriodTasksCard } from '../components/PlanCards';
import { TaskRow } from '../components/tasks';
import { useStore } from '../store/store';
import { openEvent, useUi } from '../store/ui';
import { occurrencesOn, tasksOnDate } from '../store/selectors';
import { addMonths, dow, dowLong, DOW_SHORT, mdDot, monthDays, monthGrid, monthLabel, todayKey } from '../lib/date';
import { useToday } from '../lib/hooks';
import { go } from '../lib/router';
import { holidayName } from '../lib/holidays';

export function MonthlyPage({ month }: { month: string }) {
  const today = useToday();
  const startsOn = useStore((s) => s.settings.monthStartsOn);
  const sundayLabel = useStore((s) => s.settings.sundayLabel);
  const tasksAll = useStore((s) => s.tasks);
  const events = useStore((s) => s.events);
  const setUi = useUi((s) => s.set);
  const [mode, setMode] = useState<'cal' | 'list'>('cal');
  const grid = useMemo(() => monthGrid(month, startsOn), [month, startsOn]);
  const days = monthDays(month);
  const start = days[0];
  const end = days[days.length - 1];
  const dows = Array.from({ length: 7 }, (_, i) => (i + startsOn) % 7);

  const cellData = useMemo(() => {
    const map: Record<string, { tasks: number; open: number; occ: ReturnType<typeof occurrencesOn> }> = {};
    for (const d of grid) {
      const ts = tasksOnDate(tasksAll, d).filter((t) => !(t.status === 'deferred' && t.deferredTo));
      map[d] = { tasks: ts.length, open: ts.filter((t) => t.status === 'todo' || t.status === 'in_progress').length, occ: occurrencesOn(events, d) };
    }
    return map;
  }, [grid, tasksAll, events]);

  return (
    <div className="page">
      <PageHead
        eyebrow="Monthly"
        title={monthLabel(month)}
        desc="날짜 숫자 → Daily · 날짜 칸이나 + → 계획 확인과 추가"
        side={
          <PrevNext onPrev={() => go(`monthly/${addMonths(month, -1)}`)} onNext={() => go(`monthly/${addMonths(month, 1)}`)}>
            <button className="btn btn-soft" onClick={() => go(`review/month/${month}`)}>
              <ClipboardCheck /> 월간 Review
            </button>
          </PrevNext>
        }
      />
      <div className="stack">
        <Card
          icon={<CalendarDays />}
          kicker="Month view"
          title="월간 달력"
          actions={
            <>
              {month !== today.slice(0, 7) && (
                <button className="btn btn-ghost btn-sm" onClick={() => go(`monthly/${todayKey().slice(0, 7)}`)}>
                  이번 달
                </button>
              )}
              <Seg
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'cal', label: '캘린더' },
                  { value: 'list', label: '목록' },
                ]}
              />
            </>
          }
        >
          {mode === 'cal' ? (
            <>
              <div className="month-dows">
                {dows.map((d) => (
                  <div key={d} className={d === 0 ? 'sun' : d === 6 ? 'sat' : ''}>
                    {d === 0 && sundayLabel === '주일' ? '주일' : DOW_SHORT[d]}
                  </div>
                ))}
              </div>
              <div className="month-grid">
                {grid.map((d) => {
                  const inMonth = d.slice(0, 7) === month;
                  const w = dow(d);
                  const hol = holidayName(d);
                  const data = cellData[d];
                  const cls = ['mcell', !inMonth ? 'other' : d === today ? 'today' : w === 0 ? 'sun' : w === 6 ? 'sat' : ''].join(' ');
                  return (
                    <div
                      key={d}
                      className={cls}
                      role="button"
                      tabIndex={0}
                      aria-label={`${mdDot(d)} ${dowLong(d)} 계획 보기`}
                      onClick={() => setUi({ dayModal: d })}
                      onKeyDown={(e) => e.key === 'Enter' && setUi({ dayModal: d })}
                    >
                      <button
                        className={`mnum ${hol ? 'holiday' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          go(`daily/${d}`);
                        }}
                        title="Daily 열기"
                      >
                        {Number(d.slice(8))}
                      </button>
                      <button
                        className="mplus"
                        aria-label="계획 추가"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUi({ dayModal: d });
                        }}
                      >
                        <Plus />
                      </button>
                      {hol && inMonth && <div className="mholiday">{hol}</div>}
                      {data.occ.slice(0, 3).map((o) => (
                        <div key={o.event.id} className="mev">
                          {o.event.allDay || !o.event.startTime ? null : <span className="mev-time">{o.event.startTime} </span>}
                          {o.event.title}
                        </div>
                      ))}
                      {data.occ.length > 3 && <div className="mev muted">+{data.occ.length - 3}</div>}
                      {data.tasks > 0 && (
                        <span className="mtasks" title={`업무 ${data.tasks}개 · 남은 ${data.open}개`}>
                          {data.tasks}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <MonthList month={month} />
          )}
        </Card>
        <div className="grid-2">
          <GoalsCard scope="month" period={month} />
          <div className="stack">
            <PeriodTasksCard link={{ monthKey: month }} start={start} end={end} />
            <PeriodEventsCard start={start} end={end} defaultDate={today.slice(0, 7) === month ? today : start} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthList({ month }: { month: string }) {
  const tasksAll = useStore((s) => s.tasks);
  const events = useStore((s) => s.events);
  const rows = monthDays(month)
    .map((d) => ({ d, tasks: tasksOnDate(tasksAll, d), occ: occurrencesOn(events, d) }))
    .filter((r) => r.tasks.length || r.occ.length);
  if (!rows.length) return <div className="empty">이번 달에 기록된 업무와 일정이 없습니다.</div>;
  return (
    <div className="month-list">
      {rows.map((r) => (
        <div className="mday" key={r.d}>
          <button className="mday-date" onClick={() => go(`daily/${r.d}`)} style={{ textAlign: 'left' }}>
            {mdDot(r.d)}
            <small>{dowLong(r.d)}</small>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            {r.occ.map((o) => (
              <button key={o.event.id} className="mev" style={{ display: 'block', fontSize: 12.5, padding: '2px 0' }} onClick={() => openEvent(undefined, o.event.id, r.d)}>
                <b>{o.event.allDay ? '종일' : o.event.startTime}</b> {o.event.title}
              </button>
            ))}
            {r.tasks.map((t) => (
              <TaskRow key={t.id} task={t} compact />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
