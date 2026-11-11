import { useMemo, useState } from 'react';
import { CalendarClock, ChevronDown, ChevronRight, FileText, LayoutList, Plus, Repeat2, Target } from 'lucide-react';
import { Card } from './ui';
import { TaskList, TrackBadge, useTrackName } from './tasks';
import { EventList } from './Timeline';
import { useStore } from '../store/store';
import { openEvent, openTask, useUi } from '../store/ui';
import { byOrder, eventsInRange, REPEAT_LABEL } from '../store/selectors';
import { addMonths, mdDow, timeLabelOf } from './planUtils';
import type { Goal } from '../store/types';

/** 이달의/올해의 방향 + 중요한 목표 (월간·연간 공용) */
export function GoalsCard({ scope, period }: { scope: 'month' | 'year'; period: string }) {
  const dirKey = `${scope}:${period}`;
  const direction = useStore((s) => s.directions[dirKey] ?? '');
  const setDirection = useStore((s) => s.setDirection);
  const goalsAll = useStore((s) => s.goals);
  const tracks = useStore((s) => s.settings.tracks);
  const addGoal = useStore((s) => s.addGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const setUi = useUi((s) => s.set);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [track, setTrack] = useState(tracks[0]?.id ?? '');
  const [openResult, setOpenResult] = useState<string | null>(null);

  const goals = useMemo(() => goalsAll.filter((g) => !g.deletedAt && g.scope === scope && g.period === period).sort((a, b) => a.order - b.order), [goalsAll, scope, period]);
  const prevPeriod = scope === 'month' ? addMonths(period, -1) : String(Number(period) - 1);
  const prevOpen = useMemo(
    () => goalsAll.filter((g) => !g.deletedAt && g.scope === scope && g.period === prevPeriod && !g.done && !goals.some((x) => x.carriedFrom === g.id)),
    [goalsAll, scope, prevPeriod, goals],
  );
  const M = scope === 'month';

  const submit = () => {
    if (!title.trim()) return;
    addGoal({ scope, period, title: title.trim(), track: track || null });
    setTitle('');
  };

  return (
    <Card icon={<Target />} kicker="Intentions" title={M ? '월간 목표' : '연간 목표'}>
      <label className="field-label" style={{ color: 'var(--ink)' }}>
        {M ? '이달의 방향' : '올해의 방향'}
      </label>
      <DirectionField key={dirKey} value={direction} onSave={(v) => setDirection(dirKey, v)} placeholder={M ? '이번 달에는 무엇에 마음을 두고 싶나요?' : '올해 어떤 방향으로 나아가고 싶나요?'} />
      <div className="divider" />
      <div className="row" style={{ marginBottom: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{M ? '이번 달의 중요한 목표' : '올해의 중요한 목표'}</div>
        <span className="spacer" />
        <button className="btn btn-soft" onClick={() => setAdding(true)}>
          <Plus /> 목표 추가
        </button>
      </div>
      {adding && (
        <div className="row" style={{ margin: '6px 0 10px', flexWrap: 'wrap' }}>
          <input
            className="input"
            autoFocus
            style={{ flex: '1 1 200px' }}
            placeholder={M ? '이번 달 이루고 싶은 목표' : '올해 이루고 싶은 목표'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit();
              if (e.key === 'Escape') setAdding(false);
            }}
          />
          <select className="select" style={{ width: 130 }} value={track} onChange={(e) => setTrack(e.target.value)}>
            <option value="">트랙 없음</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={submit}>
            추가
          </button>
          <button className="btn btn-ghost" onClick={() => setAdding(false)}>
            닫기
          </button>
        </div>
      )}
      {goals.length === 0 && !adding && <div className="empty">{M ? '이번 달 이루고 싶은 중요한 목표를 적어보세요.' : '올해 이루고 싶은 중요한 목표를 적어보세요.'}</div>}
      {prevOpen.length > 0 && (
        <button className="chip-btn" style={{ marginBottom: 6 }} onClick={() => setUi({ carry: { scope, from: prevPeriod, to: period } })}>
          <Repeat2 /> {M ? '지난달' : '지난해'} 목표 이어가기 · {prevOpen.length}개
        </button>
      )}
      {goals.map((g) => (
        <GoalRow key={g.id} goal={g} resultOpen={openResult === g.id} toggleResult={() => setOpenResult(openResult === g.id ? null : g.id)} onToggleDone={() => updateGoal(g.id, { done: !g.done })} />
      ))}
    </Card>
  );
}

function DirectionField({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder: string }) {
  const [v, setV] = useState(value);
  return (
    <textarea
      className="textarea soft"
      rows={2}
      placeholder={placeholder}
      value={v}
      onChange={(e) => {
        setV(e.target.value);
        onSave(e.target.value);
      }}
    />
  );
}

function GoalRow({ goal, resultOpen, toggleResult, onToggleDone }: { goal: Goal; resultOpen: boolean; toggleResult: () => void; onToggleDone: () => void }) {
  const setUi = useUi((s) => s.set);
  const updateGoal = useStore((s) => s.updateGoal);
  const msDone = goal.milestones.filter((m) => m.done).length;
  return (
    <div className={`goal-row ${goal.done ? 'done' : ''}`}>
      <div className="goal-main">
        <input type="checkbox" className="check" checked={goal.done} onChange={onToggleDone} aria-label="목표 달성" />
        <button className="row" style={{ flex: 1, minWidth: 0, textAlign: 'left' }} onClick={() => setUi({ goalModal: goal.id })}>
          <span className="goal-title">{goal.title}</span>
          <TrackBadge id={goal.track} />
          {goal.carriedFrom && <span className="badge">이어감</span>}
          <span className="goal-chev">
            <ChevronRight />
          </span>
        </button>
      </div>
      <div className="row" style={{ gap: 6, paddingLeft: 24 }}>
        <button className="chip-btn" onClick={toggleResult}>
          <FileText /> 결과 기록 {resultOpen ? <ChevronDown /> : <ChevronDown style={{ transform: 'rotate(-90deg)' }} />}
        </button>
        {goal.milestones.length > 0 && (
          <span className="tiny muted" style={{ marginTop: 6 }}>
            진행 단계 {msDone}/{goal.milestones.length}
          </span>
        )}
      </div>
      {resultOpen && (
        <textarea
          className="textarea soft"
          style={{ marginTop: 8, marginLeft: 24, width: 'calc(100% - 24px)' }}
          rows={2}
          placeholder="이 목표의 결과와 배운 점을 적어두세요."
          defaultValue={goal.result}
          onChange={(e) => updateGoal(goal.id, { result: e.target.value })}
        />
      )}
    </div>
  );
}

/** 주요업무: tasks linked to a month/year/week, plus tasks dated inside the period. */
export function PeriodTasksCard({
  kicker = 'Priorities',
  title = '주요업무',
  link,
  start,
  end,
  showDated = true,
}: {
  kicker?: string;
  title?: string;
  link: { monthKey?: string; yearKey?: string; weekKey?: string };
  start: string;
  end: string;
  showDated?: boolean;
}) {
  const tasksAll = useStore((s) => s.tasks);
  const [open, setOpen] = useState(false);
  const linked = useMemo(
    () =>
      tasksAll
        .filter(
          (t) =>
            !t.deletedAt &&
            ((link.monthKey && t.monthKey === link.monthKey) || (link.yearKey && t.yearKey === link.yearKey) || (link.weekKey && t.weekKey === link.weekKey)),
        )
        .sort(byOrder),
    [tasksAll, link.monthKey, link.yearKey, link.weekKey],
  );
  const dated = useMemo(
    () =>
      tasksAll
        .filter((t) => !t.deletedAt && t.date && t.date >= start && t.date <= end && !linked.includes(t) && !(t.status === 'deferred' && t.deferredTo))
        .sort((a, b) => (a.date! < b.date! ? -1 : 1)),
    [tasksAll, start, end, linked],
  );
  return (
    <Card
      icon={<LayoutList />}
      kicker={kicker}
      title={title}
      actions={
        <button className="btn btn-soft" onClick={() => openTask({ ...link, date: null })}>
          <Plus /> 업무 추가
        </button>
      }
    >
      <TaskList tasks={linked} withDate showUnsortedQ={false} compact empty="이 기간에 연결된 업무가 없습니다." />
      {showDated && dated.length > 0 && (
        <>
          <button className="help-toggle" style={{ marginTop: 10, fontWeight: 600 }} onClick={() => setOpen(!open)}>
            {open ? '▼' : '▶'} 연결된 업무 {dated.length}개
          </button>
          {open && <TaskList tasks={dated} withDate compact />}
        </>
      )}
    </Card>
  );
}

export function PeriodEventsCard({ start, end, defaultDate }: { start: string; end: string; defaultDate: string }) {
  const events = useStore((s) => s.events);
  const trackName = useTrackName();
  const list = useMemo(() => eventsInRange(events, start, end), [events, start, end]);
  return (
    <Card
      icon={<CalendarClock />}
      kicker="Calendar"
      title="연결된 일정"
      actions={
        <button className="btn btn-soft" onClick={() => openEvent({ startDate: defaultDate })}>
          <Plus /> 일정 추가
        </button>
      }
    >
      <EventList
        occurrences={list}
        withDate={(o) => [mdDow(o.date), timeLabelOf(o), REPEAT_LABEL[o.event.repeat] ? `${REPEAT_LABEL[o.event.repeat]} 반복` : '', trackName(o.event.track)].filter(Boolean).join(' · ')}
      />
    </Card>
  );
}
