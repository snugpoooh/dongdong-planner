import { useMemo } from 'react';
import { RotateCcw, Trash2, X } from 'lucide-react';
import { Card, PageHead } from '../components/ui';
import { useStore, type TrashKind } from '../store/store';
import { useUi } from '../store/ui';
import { mdDot, toKey } from '../lib/date';

const KIND_LABEL: Record<TrashKind, string> = { task: '업무', event: '일정', goal: '목표', project: '프로젝트', inbox: 'Inbox', routine: '루틴' };

export function TrashPage() {
  const s = useStore();
  const notify = useUi((x) => x.notify);
  const items = useMemo(() => {
    const out: { kind: TrashKind; id: string; title: string; deletedAt: string }[] = [];
    s.tasks.forEach((x) => x.deletedAt && out.push({ kind: 'task', id: x.id, title: x.title, deletedAt: x.deletedAt }));
    s.events.forEach((x) => x.deletedAt && out.push({ kind: 'event', id: x.id, title: x.title, deletedAt: x.deletedAt }));
    s.goals.forEach((x) => x.deletedAt && out.push({ kind: 'goal', id: x.id, title: x.title, deletedAt: x.deletedAt }));
    s.projects.forEach((x) => x.deletedAt && out.push({ kind: 'project', id: x.id, title: x.title, deletedAt: x.deletedAt }));
    s.inbox.forEach((x) => x.deletedAt && out.push({ kind: 'inbox', id: x.id, title: x.text.split('\n')[0], deletedAt: x.deletedAt }));
    s.routines.forEach((x) => x.deletedAt && out.push({ kind: 'routine', id: x.id, title: x.title, deletedAt: x.deletedAt }));
    return out.sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1));
  }, [s.tasks, s.events, s.goals, s.projects, s.inbox, s.routines]);

  return (
    <div className="page narrow">
      <PageHead
        eyebrow="Trash"
        title="휴지통"
        desc="지운 항목은 여기에서 되살리거나 완전히 지울 수 있습니다."
        side={
          items.length > 0 ? (
            <button
              className="btn btn-outline"
              onClick={() => {
                if (window.confirm(`휴지통의 ${items.length}개 항목을 완전히 지울까요? 되돌릴 수 없습니다.`)) {
                  s.emptyTrash();
                  notify('휴지통을 비웠습니다.');
                }
              }}
            >
              <Trash2 /> 휴지통 비우기
            </button>
          ) : null
        }
      />
      <Card>
        {items.length === 0 && <div className="empty">휴지통이 비어 있습니다.</div>}
        {items.map((it) => (
          <div key={`${it.kind}-${it.id}`} className="task-row compact">
            <span className="badge" style={{ minWidth: 54, justifyContent: 'center' }}>
              {KIND_LABEL[it.kind]}
            </span>
            <div className="task-main">
              <div className="task-title">{it.title || '(제목 없음)'}</div>
              <div className="task-sub">{mdDot(toKey(new Date(it.deletedAt)))} 삭제</div>
            </div>
            <button
              className="btn btn-soft btn-sm"
              onClick={() => {
                s.restore(it.kind, it.id);
                notify('되살렸습니다.');
              }}
            >
              <RotateCcw /> 되살리기
            </button>
            <button className="icon-btn plain sm" aria-label="완전히 삭제" title="완전히 삭제" onClick={() => s.purge(it.kind, it.id)}>
              <X />
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}
