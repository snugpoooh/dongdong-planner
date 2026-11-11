import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus } from 'lucide-react';
import { Card, PageHead, PrevNext, Seg } from '../components/ui';
import { TrackBadge } from '../components/tasks';
import { useStore } from '../store/store';
import { openRoutine } from '../store/ui';
import { addDays, addMonths, dow, mdDot, mdDow, monthDays, monthLabel, weekStart } from '../lib/date';
import { useToday } from '../lib/hooks';
import {
  bestStreakOf,
  dailyRates,
  daysLabel,
  durationLabel,
  isActiveOn,
  markOf,
  rateOf,
  streakOf,
  sumRates,
  totalDoneOf,
  weekdayRates,
  type DayRate,
} from '../lib/routines';
import type { Routine } from '../store/types';

const SUGGESTIONS = ['아침 스트레칭', '물 2L 마시기', '독서 30분', '감사 일기', '저녁 산책'];
type Range = '7' | '30' | '90';

export function RoutinesPage() {
  const today = useToday();
  const routinesAll = useStore((s) => s.routines);
  const checks = useStore((s) => s.routineChecks);
  const addRoutine = useStore((s) => s.addRoutine);
  const [range, setRange] = useState<Range>('30');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [showPaused, setShowPaused] = useState(false);

  const all = useMemo(() => routinesAll.filter((r) => !r.deletedAt).sort((a, b) => a.order - b.order), [routinesAll]);
  const active = all.filter((r) => !r.endDate || r.endDate >= today);
  const paused = all.filter((r) => r.endDate && r.endDate < today);
  const rangeStart = addDays(today, -(Number(range) - 1));

  const stats = useMemo(() => {
    const todayRates = dailyRates(all, checks, today, today, today)[0];
    const scheduledToday = all.filter((r) => isActiveOn(r, today) && markOf(checks, today, r.id) !== 'skipped').length;
    const week = sumRates(dailyRates(all, checks, weekStart(today), today, today));
    const days = dailyRates(all, checks, rangeStart, today, today);
    const period = sumRates(days);
    const best = all
      .map((r) => ({ r, n: streakOf(r, checks, today) }))
      .sort((a, b) => b.n - a.n)[0];
    return { todayDone: todayRates.done, scheduledToday, week, days, period, best, weekdays: weekdayRates(all, checks, rangeStart, today, today) };
  }, [all, checks, today, rangeStart]);

  if (all.length === 0) {
    return (
      <div className="page">
        <PageHead eyebrow="Routines" title="루틴" desc="반복하는 습관을 정해 두면 하루 일과에 자동으로 들어가고, 얼마나 지켰는지 쌓여 갑니다." />
        <Card>
          <div style={{ padding: '18px 4px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>첫 루틴을 만들어 보세요</div>
            <div className="small" style={{ color: 'var(--ink-2)', marginBottom: 14 }}>
              요일과 시간을 정하면 Daily의 ‘오늘의 루틴’과 시간표에 매일 자동으로 나옵니다. 체크한 기록으로 달성률과 연속 일수를 보여 드려요.
            </div>
            <div className="choice-row">
              <button className="btn btn-primary" onClick={() => openRoutine()}>
                <Plus /> 루틴 추가
              </button>
              {SUGGESTIONS.map((t) => (
                <button key={t} className="btn btn-outline" onClick={() => addRoutine({ title: t, order: Date.now() })}>
                  + {t}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const pctText = (p: number | null) => (p == null ? '–' : `${p}%`);

  return (
    <div className="page">
      <PageHead
        eyebrow="Routines"
        title="루틴"
        desc="반복하는 습관을 정해 두면 하루 일과에 자동으로 들어가고, 얼마나 지켰는지 쌓여 갑니다."
        side={
          <button className="btn btn-primary btn-lg" onClick={() => openRoutine()}>
            <Plus /> 루틴 추가
          </button>
        }
      />

      <Card
        kicker="Tracker"
        title={`${monthLabel(month)} 기록`}
        className="mb"
        actions={
          <PrevNext onPrev={() => setMonth(addMonths(month, -1))} onNext={() => setMonth(addMonths(month, 1))}>
            {month !== today.slice(0, 7) && (
              <button className="btn btn-soft" onClick={() => setMonth(today.slice(0, 7))}>
                이번 달
              </button>
            )}
          </PrevNext>
        }
        hint="칸을 눌러 했음/안 함을 바꿀 수 있습니다. 지난 날도 고칠 수 있어요."
      >
        <MonthTracker routines={all.filter((r) => monthDays(month).some((d) => isActiveOn(r, d)))} month={month} today={today} />
      </Card>
      <div className="stat-row">
        <div className="stat">
          <div className="stat-k">오늘</div>
          <div className="stat-v">
            {stats.todayDone}
            <small> / {stats.scheduledToday}</small>
          </div>
          <div className="stat-s">{stats.scheduledToday ? `${Math.round((stats.todayDone / stats.scheduledToday) * 100)}% 완료` : '오늘 할 루틴 없음'}</div>
        </div>
        <div className="stat">
          <div className="stat-k">이번 주 달성률</div>
          <div className="stat-v">{pctText(stats.week.pct)}</div>
          <div className="stat-s">
            {stats.week.done} / {stats.week.total}회
          </div>
        </div>
        <div className="stat">
          <div className="stat-k">최근 {range}일 달성률</div>
          <div className="stat-v">{pctText(stats.period.pct)}</div>
          <div className="stat-s">
            {stats.period.done} / {stats.period.total}회
          </div>
        </div>
        <div className="stat">
          <div className="stat-k">가장 긴 현재 연속</div>
          <div className="stat-v">
            {stats.best?.n ?? 0}
            <small>일</small>
          </div>
          <div className="stat-s ellipsis">{stats.best?.n ? stats.best.r.title : '오늘부터 시작해 보세요'}</div>
        </div>
      </div>

      <div className="row" style={{ margin: '4px 0 12px' }}>
        <span className="small" style={{ fontWeight: 700 }}>
          통계 기간
        </span>
        <Seg
          value={range}
          onChange={setRange}
          options={[
            { value: '7', label: '7일' },
            { value: '30', label: '30일' },
            { value: '90', label: '90일' },
          ]}
        />
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }}>
        <Card kicker="Trend" title="날짜별 달성률" hint={`${mdDot(rangeStart)} – ${mdDot(today)} · 모든 루틴 합계 (건너뛴 날 제외)`}>
          <TrendChart days={stats.days} />
        </Card>
        <Card kicker="By weekday" title="요일별 달성률" hint="어느 요일에 잘 지키고, 어느 요일에 놓치는지">
          <WeekdayChart rows={stats.weekdays} />
        </Card>
      </div>

      <Card kicker="Per routine" title="루틴별 통계" className="mt">
        <div className="rt-table" role="table" aria-label="루틴별 통계">
          <div className="rt-row rt-head" role="row">
            <span role="columnheader">루틴</span>
            <span role="columnheader">최근 {range}일</span>
            <span role="columnheader" className="num">
              현재 연속
            </span>
            <span role="columnheader" className="num">
              최장 연속
            </span>
            <span role="columnheader" className="num">
              누적
            </span>
            <span />
          </div>
          {active.map((r, i) => (
            <RoutineStatRow key={r.id} r={r} rangeStart={rangeStart} today={today} first={i === 0} last={i === active.length - 1} />
          ))}
        </div>
        {paused.length > 0 && (
          <>
            <button className="help-toggle" style={{ marginTop: 12, fontWeight: 700 }} onClick={() => setShowPaused(!showPaused)}>
              {showPaused ? '▼' : '▶'} 멈춘 루틴 {paused.length}개
            </button>
            {showPaused && (
              <div className="rt-table">
                {paused.map((r) => (
                  <RoutineStatRow key={r.id} r={r} rangeStart={rangeStart} today={today} paused />
                ))}
              </div>
            )}
          </>
        )}
      </Card>

    </div>
  );
}

function RoutineStatRow({ r, rangeStart, today, first, last, paused }: { r: Routine; rangeStart: string; today: string; first?: boolean; last?: boolean; paused?: boolean }) {
  const checks = useStore((s) => s.routineChecks);
  const moveRoutine = useStore((s) => s.moveRoutine);
  const rate = rateOf(r, checks, rangeStart, today, today);
  const streak = streakOf(r, checks, today);
  const best = bestStreakOf(r, checks, today);
  const total = totalDoneOf(r, checks);
  return (
    <div className="rt-row" role="row">
      <button className="rt-name" role="cell" onClick={() => openRoutine(r.id)}>
        <span className="t">{r.title}</span>
        <span className="s">
          {daysLabel(r.days)}
          {r.time ? ` · ${r.time} · ${durationLabel(r.duration)}` : ''}
          {paused && r.endDate ? ` · ${mdDot(r.endDate)}까지` : ''}
        </span>
        <TrackBadge id={r.track} />
      </button>
      <span role="cell" className="rt-rate" title={`${rate.done} / ${rate.total}회`}>
        <span className="hbar">
          <span style={{ width: `${rate.pct ?? 0}%` }} />
        </span>
        <span className="hval">{rate.pct == null ? '–' : `${rate.pct}%`}</span>
      </span>
      <span role="cell" className="num">
        {streak}일
      </span>
      <span role="cell" className="num">
        {best}일
      </span>
      <span role="cell" className="num">
        {total}회
      </span>
      <span role="cell" className="rt-actions">
        {!paused && (
          <>
            <button className="icon-btn plain sm" aria-label="위로" disabled={first} onClick={() => moveRoutine(r.id, -1)}>
              <ChevronUp />
            </button>
            <button className="icon-btn plain sm" aria-label="아래로" disabled={last} onClick={() => moveRoutine(r.id, 1)}>
              <ChevronDown />
            </button>
          </>
        )}
        <button className="icon-btn plain sm" aria-label={`${r.title} 편집`} onClick={() => openRoutine(r.id)}>
          <Pencil />
        </button>
      </span>
    </div>
  );
}

/** Column chart of the combined daily completion rate. */
function TrendChart({ days }: { days: DayRate[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const h = hover != null ? days[hover] : null;
  const labelEvery = days.length <= 7 ? 1 : days.length <= 31 ? 7 : 14;
  return (
    <div>
      <div className="chart" onMouseLeave={() => setHover(null)}>
        <div className="chart-grid">
          {[100, 50, 0].map((v) => (
            <div key={v} className="gl" style={{ bottom: `${v}%` }}>
              <span>{v}%</span>
            </div>
          ))}
        </div>
        <div className="chart-cols" style={{ gap: days.length > 40 ? 1 : 2 }}>
          {days.map((d, i) => (
            <div
              key={d.date}
              className={`col ${hover === i ? 'on' : ''}`}
              tabIndex={0}
              role="img"
              aria-label={`${mdDow(d.date)} ${d.pct == null ? '기록 없음' : `${d.pct}%, ${d.done}/${d.total}`}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              {d.pct != null ? <span className="bar" style={{ height: `${Math.max(d.pct, 1.5)}%` }} /> : <span className="none" />}
            </div>
          ))}
        </div>
        {h && hover != null && (
          <div className="chart-tip" style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}>
            <b>{h.pct == null ? '–' : `${h.pct}%`}</b>
            <span>
              {mdDow(h.date)}
              {h.total ? ` · ${h.done}/${h.total}` : ' · 할 루틴 없음'}
            </span>
          </div>
        )}
      </div>
      <div className="chart-x">
        {days.map((d, i) => (
          <span
            key={d.date}
            style={{
              // every Nth day, plus the last day when it isn't crowding the previous label
              visibility: (i % labelEvery === 0 && (days.length - 1 - i >= labelEvery / 2 || i === days.length - 1)) || i === days.length - 1 ? 'visible' : 'hidden',
            }}
          >
            {mdDot(d.date)}
          </span>
        ))}
      </div>
      <details className="chart-table">
        <summary>표로 보기</summary>
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>완료</th>
              <th>달성률</th>
            </tr>
          </thead>
          <tbody>
            {days
              .slice()
              .reverse()
              .map((d) => (
                <tr key={d.date}>
                  <td>{mdDow(d.date)}</td>
                  <td>{d.total ? `${d.done} / ${d.total}` : '–'}</td>
                  <td>{d.pct == null ? '–' : `${d.pct}%`}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAME = ['일', '월', '화', '수', '목', '금', '토'];

function WeekdayChart({ rows }: { rows: { dow: number; done: number; total: number; pct: number | null }[] }) {
  const sorted = WEEK_ORDER.map((w) => rows[w]);
  const withData = sorted.filter((r) => r.pct != null);
  const low = withData.length > 1 ? withData.reduce((a, b) => (b.pct! < a.pct! ? b : a)) : null;
  return (
    <div>
      <div className="chart small">
        <div className="chart-grid">
          {[100, 50, 0].map((v) => (
            <div key={v} className="gl" style={{ bottom: `${v}%` }}>
              <span>{v}%</span>
            </div>
          ))}
        </div>
        <div className="chart-cols labeled">
          {sorted.map((r) => (
            <div key={r.dow} className="col" tabIndex={0} role="img" aria-label={`${DAY_NAME[r.dow]}요일 ${r.pct == null ? '기록 없음' : `${r.pct}%, ${r.done}/${r.total}`}`} title={r.total ? `${r.done}/${r.total}회` : ''}>
              {r.pct != null ? (
                <span className="bar" style={{ height: `${Math.max(r.pct, 1.5)}%` }}>
                  <em>{r.pct}%</em>
                </span>
              ) : (
                <span className="none" />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="chart-x even">
        {sorted.map((r) => (
          <span key={r.dow} className={r.dow === 0 ? 'sun' : r.dow === 6 ? 'sat' : ''}>
            {DAY_NAME[r.dow]}
          </span>
        ))}
      </div>
      {low && low.pct! < 100 && (
        <div className="small" style={{ color: 'var(--ink-2)', marginTop: 10 }}>
          <b>{DAY_NAME[low.dow]}요일</b>에 가장 자주 놓쳤어요 ({low.pct}%).
        </div>
      )}
    </div>
  );
}

function MonthTracker({ routines, month, today }: { routines: Routine[]; month: string; today: string }) {
  const checks = useStore((s) => s.routineChecks);
  const setMark = useStore((s) => s.setRoutineMark);
  const days = monthDays(month);
  if (!routines.length) return <div className="empty">이 달에 해당하는 루틴이 없습니다.</div>;
  return (
    <div className="tracker-wrap">
      <div className="tracker" style={{ gridTemplateColumns: `minmax(120px, 180px) repeat(${days.length}, 24px) 52px` }}>
        <div className="tk-corner" />
        {days.map((d) => (
          <div key={d} className={`tk-day ${d === today ? 'today' : ''} ${dow(d) === 0 ? 'sun' : dow(d) === 6 ? 'sat' : ''}`}>
            <span>{Number(d.slice(8))}</span>
            <small>{DAY_NAME[dow(d)]}</small>
          </div>
        ))}
        <div className="tk-day">
          <small>달성</small>
        </div>
        {routines.map((r) => {
          const rate = rateOf(r, checks, days[0], days[days.length - 1], today);
          return [
            <button key={`${r.id}-n`} className="tk-name" onClick={() => openRoutine(r.id)} title={r.title}>
              {r.title}
            </button>,
            ...days.map((d) => {
              const on = isActiveOn(r, d);
              const m = on ? markOf(checks, d, r.id) : null;
              const future = d > today;
              const state = !on ? 'off' : m === 'done' ? 'done' : m === 'skipped' ? 'skip' : future || d === today ? 'open' : 'miss';
              const label = { off: '해당 없음', done: '했음', skip: '건너뜀', open: '아직', miss: '안 함' }[state];
              return (
                <button
                  key={`${r.id}-${d}`}
                  className={`tk-cell ${state} ${d === today ? 'today' : ''}`}
                  disabled={!on || future}
                  aria-label={`${r.title} ${mdDot(d)} ${label}`}
                  title={`${mdDow(d)} · ${label}`}
                  onClick={() => setMark(d, r.id, m === 'done' ? 'skipped' : m === 'skipped' ? null : 'done')}
                />
              );
            }),
            <div key={`${r.id}-p`} className="tk-pct">
              {rate.pct == null ? '–' : `${rate.pct}%`}
            </div>,
          ];
        })}
      </div>
      <div className="tk-legend">
        <span>
          <i className="tk-cell done" /> 했음
        </span>
        <span>
          <i className="tk-cell skip" /> 건너뜀
        </span>
        <span>
          <i className="tk-cell miss" /> 안 함
        </span>
        <span>
          <i className="tk-cell off" /> 쉬는 요일
        </span>
        <span className="muted">칸을 누를 때마다 했음 → 건너뜀 → 지움</span>
      </div>
    </div>
  );
}
