import { useMemo, useState } from 'react';
import { CalendarCheck, CircleCheck } from 'lucide-react';
import { Card, PageHead, Seg } from '../components/ui';
import { TaskRow } from '../components/tasks';
import { useStore } from '../store/store';
import { STATUS_LABEL } from '../store/selectors';
import { mdDot, mdDow, toKey } from '../lib/date';
import { useToday } from '../lib/hooks';
import type { Task } from '../store/types';

export function DelegationPage() {
  const tasksAll = useStore((s) => s.tasks);
  const today = useToday();
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const delegated = useMemo(() => tasksAll.filter((t) => !t.deletedAt && t.status === 'delegated'), [tasksAll]);
  const handled = useMemo(
    () => tasksAll.filter((t) => !t.deletedAt && t.status !== 'delegated' && t.history.some((h) => h.to === 'delegated')).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [tasksAll],
  );
  const groups = useMemo(() => {
    const m = new Map<string, Task[]>();
    delegated
      .slice()
      .sort((a, b) => (a.checkDate ?? '9999').localeCompare(b.checkDate ?? '9999'))
      .forEach((t) => {
        const k = t.delegateTo || '담당자 미정';
        m.set(k, [...(m.get(k) ?? []), t]);
      });
    return [...m.entries()];
  }, [delegated]);

  return (
    <div className="page">
      <PageHead eyebrow="Delegation" title="위임한 일" desc="담당자와 확인일을 보며 맡긴 일의 결과를 확인합니다." />
      <div style={{ marginBottom: 14 }}>
        <Seg
          value={tab}
          onChange={setTab}
          options={[
            { value: 'open', label: `위임 중 ${delegated.length}` },
            { value: 'done', label: `처리 이력 ${handled.length}` },
          ]}
        />
      </div>
      {tab === 'open' ? (
        <Card icon={<CircleCheck />} kicker="Waiting for" title="위임 업무">
          {groups.length === 0 && <div className="empty">업무의 체크칸에서 위임을 선택하고 담당자를 지정하세요.</div>}
          {groups.map(([who, list]) => {
            const next = list.find((t) => t.checkDate)?.checkDate;
            return (
              <div className="deleg-group" key={who}>
                <div className="deleg-head">
                  {who}
                  {next && (
                    <span className={`deleg-check ${next <= today ? 'due' : ''}`}>
                      <CalendarCheck /> 확인 {mdDow(next)}
                    </span>
                  )}
                </div>
                {list.map((t) => (
                  <div key={t.id}>
                    <TaskRow task={t} withDate showUnsortedQ compact />
                    <HistoryList task={t} />
                  </div>
                ))}
              </div>
            );
          })}
        </Card>
      ) : (
        <Card kicker="History" title="처리 이력">
          {handled.length === 0 && <div className="empty">위임했다가 처리한 업무가 여기에 남습니다.</div>}
          {handled.map((t) => (
            <div key={t.id}>
              <TaskRow task={t} withDate compact extraSub={`담당 ${t.delegateTo ?? '-'}`} />
              <HistoryList task={t} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function HistoryList({ task }: { task: Task }) {
  if (!task.history.length) return null;
  return (
    <details className="history">
      <summary>▶ 상태 변경 기록 {task.history.length}개</summary>
      <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
        {task.history.map((h, i) => (
          <li key={i}>
            {mdDot(toKey(new Date(h.at)))} {new Date(h.at).toTimeString().slice(0, 5)} · {STATUS_LABEL[h.from]} → {STATUS_LABEL[h.to]}
            {h.note ? ` (${h.note})` : ''}
          </li>
        ))}
      </ul>
    </details>
  );
}
