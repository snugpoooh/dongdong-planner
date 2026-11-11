import { useMemo } from 'react';
import { Check, Plus, Repeat, Settings2 } from 'lucide-react';
import { Card } from './ui';
import { useStore } from '../store/store';
import { openRoutine } from '../store/ui';
import { durationLabel, markOf, routinesOn, streakOf } from '../lib/routines';
import { go } from '../lib/router';
import type { Routine, RoutineMark } from '../store/types';

/** 오늘의 루틴: every routine scheduled for this day appears here automatically. */
export function RoutineCard({ date, today }: { date: string; today: string }) {
  const routinesAll = useStore((s) => s.routines);
  const checks = useStore((s) => s.routineChecks);
  const list = useMemo(() => routinesOn(routinesAll, date), [routinesAll, date]);
  const done = list.filter((r) => markOf(checks, date, r.id) === 'done').length;
  const counted = list.filter((r) => markOf(checks, date, r.id) !== 'skipped').length;
  const future = date > today;
  return (
    <Card
      icon={<Repeat />}
      kicker="Daily routine"
      title={date === today ? '오늘의 루틴' : '이날의 루틴'}
      actions={
        <>
          {list.length > 0 && (
            <span className="routine-count">
              {done} / {counted}
            </span>
          )}
          <button className="icon-btn" aria-label="루틴 관리" title="루틴 관리·통계" onClick={() => go('routines')}>
            <Settings2 />
          </button>
          <button className="icon-btn soft" aria-label="루틴 추가" title="루틴 추가" onClick={() => openRoutine()}>
            <Plus />
          </button>
        </>
      }
    >
      {list.length === 0 ? (
        <div className="empty">
          매일 반복할 루틴을 추가하면 하루 일과에 자동으로 들어옵니다.{' '}
          <button className="link-btn" onClick={() => openRoutine()}>
            루틴 추가
          </button>
        </div>
      ) : (
        <>
          {counted > 0 && (
            <div className="progress" style={{ marginBottom: 6 }} aria-label={`루틴 ${done}/${counted} 완료`}>
              <div style={{ width: `${Math.round((done / counted) * 100)}%`, background: 'var(--routine-line)' }} />
            </div>
          )}
          {list.map((r) => (
            <RoutineRow key={r.id} r={r} date={date} mark={markOf(checks, date, r.id)} streak={streakOf(r, checks, today)} future={future} />
          ))}
        </>
      )}
    </Card>
  );
}

function RoutineRow({ r, date, mark, streak, future }: { r: Routine; date: string; mark: RoutineMark | null; streak: number; future: boolean }) {
  const setMark = useStore((s) => s.setRoutineMark);
  const sub = [r.time ? `${r.time} · ${durationLabel(r.duration)}` : null, mark === 'skipped' ? '건너뜀' : null, streak > 0 && !future ? `연속 ${streak}일` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className={`task-row compact routine-row ${mark ?? ''}`}>
      <button
        className={`routine-check ${mark === 'done' ? 'on' : ''}`}
        aria-pressed={mark === 'done'}
        aria-label={`${r.title} ${mark === 'done' ? '완료 취소' : '완료'}`}
        disabled={future}
        title={future ? '아직 오지 않은 날입니다' : undefined}
        onClick={() => setMark(date, r.id, mark === 'done' ? null : 'done')}
      >
        {mark === 'done' ? <Check /> : null}
      </button>
      <button className="task-main" onClick={() => openRoutine(r.id)}>
        <div className="task-title">{r.title}</div>
        {sub && <div className="task-sub">{sub}</div>}
      </button>
      {!future && mark !== 'done' && (
        <button className="btn btn-ghost btn-sm" onClick={() => setMark(date, r.id, mark === 'skipped' ? null : 'skipped')} title="쉬는 날로 표시하면 달성률에서 빠집니다">
          {mark === 'skipped' ? '되돌리기' : '건너뛰기'}
        </button>
      )}
    </div>
  );
}
