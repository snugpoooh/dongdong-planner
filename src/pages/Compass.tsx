import { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Compass as CompassIcon, Copy, LayoutList, Pencil } from 'lucide-react';
import { Card, PageHead, PrevNext } from '../components/ui';
import { PeriodEventsCard, PeriodTasksCard } from '../components/PlanCards';
import { TaskRow } from '../components/tasks';
import { useStore } from '../store/store';
import { useUi } from '../store/ui';
import { tasksInRange } from '../store/selectors';
import { addDays, dow, dowShort, mdDot, mdDow, weekDays, weekRangeLabel, weekStart } from '../lib/date';
import { useToday } from '../lib/hooks';
import { go } from '../lib/router';
import type { CompassWeek } from '../store/types';

export function CompassPage({ week }: { week: string }) {
  const today = useToday();
  const settings = useStore((s) => s.settings);
  const end = addDays(week, 6);
  return (
    <div className="page">
      <PageHead
        eyebrow="Weekly Compass"
        title="Weekly Compass"
        desc={weekRangeLabel(week, false)}
        side={
          <PrevNext onPrev={() => go(`compass/${addDays(week, -7)}`)} onNext={() => go(`compass/${addDays(week, 7)}`)}>
            <button className="btn btn-soft" onClick={() => go(`compass/${weekStart(today)}`)}>
              이번 주
            </button>
          </PrevNext>
        }
      />
      <div className="grid-2 even" style={{ gridTemplateColumns: 'minmax(0, 1.28fr) minmax(0, 1fr)' }}>
        <div className="stack">
          <section className="saw-box">
            <div className="saw-head">
              <div className="k">SHARPEN THE SAW</div>
              <div className="t">자기계발</div>
            </div>
            {settings.sawAreas.map((a) => (
              <CompassField key={`${week}-${a.id}`} week={week} kind="saw" id={a.id} name={a.name} placeholder="이번 주 이 영역에서 실천할 한 가지" />
            ))}
          </section>
          <Card
            icon={<CompassIcon />}
            kicker="Roles & Big Rocks"
            title="역할별 Big Rock"
            actions={
              <button className="btn btn-ghost btn-sm" onClick={() => go('settings')} title="역할 편집">
                <Pencil /> 역할 편집
              </button>
            }
          >
            {settings.roles.length === 0 && <div className="empty">설정에서 내가 맡은 역할을 추가하세요.</div>}
            {settings.roles.map((r) => (
              <CompassField key={`${week}-${r.id}`} week={week} kind="rocks" id={r.id} name={r.name} placeholder="이번 주 이 역할에서 가장 중요한 일" />
            ))}
          </Card>
        </div>
        <div className="stack">
          <Card
            icon={<CalendarDays />}
            kicker="This week"
            title="Daily 열기"
            actions={
              <button className="link-btn" onClick={() => go(`review/week/${week}`)}>
                주간 Review
              </button>
            }
          >
            <div className="day-pills">
              {weekDays(week).map((d) => (
                <button key={d} className={`${d === today ? 'today' : ''} ${dow(d) === 0 ? 'sun' : ''}`} onClick={() => go(`daily/${d}`)}>
                  {mdDot(d)}
                  <small>{dowShort(d)}</small>
                </button>
              ))}
            </div>
          </Card>
          <PeriodTasksCard kicker="Weekly tasks" title="연결된 주간 업무" link={{ weekKey: week }} start={week} end={end} showDated={false} />
          <DailyTasksCard week={week} />
          <PeriodEventsCard start={week} end={end} defaultDate={today >= week && today <= end ? today : week} />
        </div>
      </div>
    </div>
  );
}

function CompassField({ week, kind, id, name, placeholder }: { week: string; kind: keyof CompassWeek; id: string; name: string; placeholder: string }) {
  const value = useStore((s) => s.compass[week]?.[kind]?.[id] ?? '');
  const prev = useStore((s) => s.compass[addDays(week, -7)]?.[kind]?.[id] ?? '');
  const setCompass = useStore((s) => s.setCompass);
  const notify = useUi((s) => s.notify);
  const [v, setV] = useState(value);
  return (
    <div className="role-block">
      <div className="role-head">
        <span className="role-name">{name}</span>
        <button
          className="copy-btn"
          disabled={!prev}
          title={prev ? `지난주: ${prev}` : '지난주 기록이 없습니다'}
          onClick={() => {
            const next = v ? `${v}\n${prev}` : prev;
            setV(next);
            setCompass(week, kind, id, next);
            notify('지난주 내용을 가져왔습니다.');
          }}
          style={{ opacity: prev ? 1 : 0.5 }}
        >
          <Copy /> 지난주 복사
        </button>
      </div>
      <textarea
        className="textarea soft"
        rows={2}
        placeholder={placeholder}
        value={v}
        onChange={(e) => {
          setV(e.target.value);
          setCompass(week, kind, id, e.target.value);
        }}
      />
    </div>
  );
}

function DailyTasksCard({ week }: { week: string }) {
  const tasksAll = useStore((s) => s.tasks);
  const end = addDays(week, 6);
  const tasks = useMemo(() => tasksInRange(tasksAll, week, end), [tasksAll, week, end]);
  const byDate = useMemo(() => {
    const m = new Map<string, typeof tasks>();
    tasks.forEach((t) => m.set(t.date!, [...(m.get(t.date!) ?? []), t]));
    return [...m.entries()];
  }, [tasks]);
  return (
    <Card icon={<LayoutList />} kicker="Daily tasks" title="일간에 배정된 업무">
      {byDate.length === 0 && <div className="empty">이번 주 일간에 배정한 업무가 없습니다.</div>}
      {byDate.map(([d, list]) => (
        <div key={d}>
          <button className="date-group" onClick={() => go(`daily/${d}`)}>
            <ArrowRight /> {mdDow(d)}
          </button>
          {list.map((t) => (
            <TaskRow key={t.id} task={t} compact />
          ))}
        </div>
      ))}
    </Card>
  );
}
