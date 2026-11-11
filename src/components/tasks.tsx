import { ArrowRight, Check, ChevronDown, ChevronUp, CircleCheck, FileText, Lock, X } from 'lucide-react';
import { mdDot, mdDow } from '../lib/date';
import { useStore } from '../store/store';
import { openStatus, openTask } from '../store/ui';
import { statusLine } from '../store/selectors';
import type { Task, TaskStatus } from '../store/types';

export function StatusGlyph({ status }: { status: TaskStatus }) {
  switch (status) {
    case 'done':
      return <Check />;
    case 'deferred':
      return <ArrowRight />;
    case 'cancelled':
      return <X />;
    case 'delegated':
      return <CircleCheck />;
    case 'in_progress':
      return <span className="status-dot" />;
    default:
      return <span className="status-box" />;
  }
}

export function StatusButton({ task }: { task: Task }) {
  return (
    <button
      className={`status-btn ${task.status}`}
      onClick={(e) => {
        e.stopPropagation();
        openStatus(task.id);
      }}
      aria-label={`상태 변경: ${task.title}`}
      title="상태 선택"
    >
      <StatusGlyph status={task.status} />
    </button>
  );
}

export function QBadge({ q, showUnsorted = false }: { q: number; showUnsorted?: boolean }) {
  if (!q) return showUnsorted ? <span className="badge qn">Q 미분류</span> : null;
  return <span className={`badge q${q}`}>Q{q}</span>;
}

export function GroupBadge({ g }: { g: string }) {
  if (!g) return null;
  return <span className={`badge g${g.toLowerCase()}`}>{g}</span>;
}

export function useTrackName() {
  const tracks = useStore((s) => s.settings.tracks);
  return (id: string | null | undefined) => (id ? tracks.find((t) => t.id === id)?.name ?? '' : '');
}

export function TrackBadge({ id }: { id: string | null }) {
  const name = useTrackName()(id);
  if (!name) return null;
  return <span className="badge track">{name}</span>;
}

interface RowProps {
  task: Task;
  /** show date in sub line ("11.10 화요일 · 미시작") */
  withDate?: boolean;
  withGroup?: boolean;
  showUnsortedQ?: boolean;
  reorder?: { siblings: string[] };
  compact?: boolean;
  extraSub?: string;
}

export function TaskRow({ task, withDate, withGroup, showUnsortedQ, reorder, compact, extraSub }: RowProps) {
  const moveTask = useStore((s) => s.moveTask);
  const predecessor = useStore((s) => (task.predecessorId ? s.tasks.find((t) => t.id === task.predecessorId && !t.deletedAt) : undefined));
  const blocked = predecessor && predecessor.status !== 'done' && predecessor.status !== 'cancelled';
  const line = statusLine(task, mdDot);
  const sub = [withDate && task.date ? mdDow(task.date) : null, line, extraSub].filter(Boolean).join(' · ');
  return (
    <div className={`task-row ${compact ? 'compact' : ''} is-${task.status}`}>
      <StatusButton task={task} />
      <button className="task-main" onClick={() => openTask(undefined, task.id)}>
        <div className="task-title">
          <span>{task.title || '(제목 없음)'}</span>
          {task.memo ? <FileText aria-label="메모 있음" /> : null}
          {blocked ? <Lock aria-label="선행 업무 대기" /> : null}
        </div>
        <div className={`task-sub ${task.status === 'delegated' ? 'delegated' : ''}`}>
          {sub}
          {blocked ? ` · 선행: ${predecessor!.title}` : ''}
        </div>
      </button>
      <div className="task-meta">
        {withGroup ? <GroupBadge g={task.group} /> : null}
        <QBadge q={task.q} showUnsorted={showUnsortedQ} />
        {reorder ? (
          <div className="reorder">
            <button aria-label="위로" onClick={() => moveTask(task.id, -1, reorder.siblings)}>
              <ChevronUp />
            </button>
            <button aria-label="아래로" onClick={() => moveTask(task.id, 1, reorder.siblings)}>
              <ChevronDown />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TaskList({ tasks, empty, ...rest }: { tasks: Task[]; empty?: string } & Omit<RowProps, 'task'>) {
  if (!tasks.length) return <div className="empty">{empty ?? '이 기간에 연결된 업무가 없습니다.'}</div>;
  return (
    <div>
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} {...rest} />
      ))}
    </div>
  );
}
