import { useMemo, useState } from 'react';
import { ArrowLeft, Briefcase, Plus, Trash2 } from 'lucide-react';
import { Card, Modal, ModalHead, PageHead, Seg } from '../components/ui';
import { TaskRow, TrackBadge, useTrackName } from '../components/tasks';
import { useStore } from '../store/store';
import { openTask, useUi } from '../store/ui';
import { byOrder, progressOf } from '../store/selectors';
import { diffDays, mdDow } from '../lib/date';
import { useToday } from '../lib/hooks';
import { go } from '../lib/router';
import type { Project, Task } from '../store/types';

export function ProjectsPage() {
  const projectsAll = useStore((s) => s.projects);
  const tasksAll = useStore((s) => s.tasks);
  const tracks = useStore((s) => s.settings.tracks);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const projects = useMemo(
    () => projectsAll.filter((p) => !p.deletedAt && (filter === 'all' || p.track === filter)).sort((a, b) => a.order - b.order),
    [projectsAll, filter],
  );
  return (
    <div className="page">
      <PageHead
        eyebrow="Projects"
        title="프로젝트"
        desc="마감일과 선행 업무를 연결하고, 같은 체크 상태를 모든 계획 화면에서 확인합니다."
        side={
          <button className="btn btn-primary btn-lg" onClick={() => setEditing('new')}>
            <Plus /> 프로젝트 추가
          </button>
        }
      />
      {tracks.length > 1 && projectsAll.some((p) => !p.deletedAt) && (
        <div style={{ marginBottom: 14 }}>
          <Seg value={filter} onChange={setFilter} options={[{ value: 'all', label: '전체' }, ...tracks.map((t) => ({ value: t.id, label: t.name }))]} />
        </div>
      )}
      <div className="stack">
        {projects.length === 0 && (
          <Card>
            <div className="empty">여러 개의 할 일을 마쳐야 완성되는 일을 프로젝트로 묶어보세요.</div>
          </Card>
        )}
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} tasks={tasksAll.filter((t) => !t.deletedAt && t.projectId === p.id).sort(byOrder)} onEdit={() => setEditing(p.id)} />
        ))}
      </div>
      {editing && <ProjectModal id={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Deadline({ p }: { p: Project }) {
  const today = useToday();
  if (!p.deadline) return <span className="small" style={{ color: 'var(--ink-2)' }}>마감일 미지정</span>;
  const d = diffDays(today, p.deadline);
  return (
    <span className="small" style={{ color: d < 0 ? 'var(--danger)' : 'var(--ink-2)' }}>
      마감 {mdDow(p.deadline)} · {d === 0 ? 'D-day' : d > 0 ? `D-${d}` : `${-d}일 지남`}
    </span>
  );
}

function SubtaskInput({ projectId, track }: { projectId: string; track: string | null }) {
  const addTasksFromText = useStore((s) => s.addTasksFromText);
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim()) return;
    addTasksFromText(text, { projectId, track, date: null });
    setText('');
  };
  return (
    <div className="quick-add" style={{ marginBottom: 12 }}>
      <textarea
        className="textarea"
        rows={1}
        placeholder="하위 업무를 적고 Enter로 추가..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData('text');
          if (pasted.includes('\n')) {
            e.preventDefault();
            addTasksFromText(text + pasted, { projectId, track, date: null });
            setText('');
          }
        }}
      />
      <button className="btn btn-primary" onClick={submit}>
        <Plus /> 추가
      </button>
    </div>
  );
}

function ProjectCard({ project: p, tasks, onEdit }: { project: Project; tasks: Task[]; onEdit: () => void }) {
  const prog = progressOf(tasks);
  return (
    <Card
      icon={<Briefcase />}
      title={
        <span className="row" style={{ gap: 8 }}>
          {p.title} <TrackBadge id={p.track} />
        </span>
      }
      actions={
        <>
          <button className="btn btn-ghost btn-sm" onClick={() => go(`projects/${p.id}`)}>
            열기
          </button>
          <button className="btn btn-outline btn-sm" onClick={onEdit}>
            편집
          </button>
        </>
      }
    >
      <SubtaskInput projectId={p.id} track={p.track} />
      <div className="row" style={{ marginBottom: 8 }}>
        <Deadline p={p} />
        <span className="spacer" />
        <span style={{ fontWeight: 800, fontSize: 15 }}>{prog.pct}%</span>
      </div>
      <div className="progress">
        <div style={{ width: `${prog.pct}%` }} />
      </div>
      <div className="tiny" style={{ color: 'var(--ink-2)', margin: '10px 0 2px' }}>
        {prog.done} / {prog.total} 완료
      </div>
      {tasks.length === 0 ? (
        <div className="empty">프로젝트를 실행할 업무를 추가하세요.</div>
      ) : (
        tasks.map((t) => <TaskRow key={t.id} task={t} withGroup compact extraSub={t.date ? undefined : '날짜 미정'} withDate={!!t.date} />)
      )}
    </Card>
  );
}

export function ProjectDetailPage({ id }: { id: string }) {
  const p = useStore((s) => s.projects.find((x) => x.id === id));
  const tasksAll = useStore((s) => s.tasks);
  const trackName = useTrackName();
  const [editing, setEditing] = useState(false);
  const tasks = useMemo(() => tasksAll.filter((t) => !t.deletedAt && t.projectId === id).sort(byOrder), [tasksAll, id]);
  if (!p || p.deletedAt) {
    return (
      <div className="page">
        <button className="btn btn-ghost" onClick={() => go('projects')}>
          <ArrowLeft /> 프로젝트 목록
        </button>
        <div className="empty" style={{ marginTop: 20 }}>
          프로젝트를 찾을 수 없습니다.
        </div>
      </div>
    );
  }
  const prog = progressOf(tasks);
  const open = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress' || t.status === 'delegated');
  const closed = tasks.filter((t) => !open.includes(t));
  return (
    <div className="page narrow">
      <button className="btn btn-ghost" style={{ marginBottom: 12, marginLeft: -8 }} onClick={() => go('projects')}>
        <ArrowLeft /> 프로젝트 목록
      </button>
      <PageHead
        eyebrow={trackName(p.track) || 'Project'}
        title={p.title}
        desc={<Deadline p={p} />}
        side={
          <div className="navgroup">
            <button className="btn btn-outline" onClick={() => setEditing(true)}>
              편집
            </button>
            <button className="btn btn-primary" onClick={() => openTask({ projectId: p.id, track: p.track, date: null })}>
              <Plus /> 업무 추가
            </button>
          </div>
        }
      />
      <div className="stack">
        <Card>
          <div className="row" style={{ marginBottom: 8 }}>
            <span className="small" style={{ color: 'var(--ink-2)' }}>
              {prog.done} / {prog.total} 완료
            </span>
            <span className="spacer" />
            <span style={{ fontWeight: 800, fontSize: 20 }}>{prog.pct}%</span>
          </div>
          <div className="progress">
            <div style={{ width: `${prog.pct}%` }} />
          </div>
          {p.memo && (
            <div className="small" style={{ whiteSpace: 'pre-wrap', marginTop: 14, color: 'var(--ink-2)' }}>
              {p.memo}
            </div>
          )}
        </Card>
        <Card kicker="Next actions" title="해야 할 업무">
          <SubtaskInput projectId={p.id} track={p.track} />
          {open.length === 0 ? <div className="empty">남은 업무가 없습니다.</div> : open.map((t) => <TaskRow key={t.id} task={t} withGroup withDate={!!t.date} extraSub={t.date ? undefined : '날짜 미정'} />)}
        </Card>
        {closed.length > 0 && (
          <Card kicker="Done" title="마친 업무">
            {closed.map((t) => (
              <TaskRow key={t.id} task={t} withDate={!!t.date} compact />
            ))}
          </Card>
        )}
      </div>
      {editing && <ProjectModal id={p.id} onClose={() => setEditing(false)} />}
    </div>
  );
}

function ProjectModal({ id, onClose }: { id?: string; onClose: () => void }) {
  const existing = useStore((s) => (id ? s.projects.find((p) => p.id === id) : undefined));
  const tracks = useStore((s) => s.settings.tracks);
  const { addProject, updateProject, deleteProject } = useStore.getState();
  const notify = useUi((s) => s.notify);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [track, setTrack] = useState(existing?.track ?? tracks[0]?.id ?? '');
  const [deadline, setDeadline] = useState(existing?.deadline ?? '');
  const [memo, setMemo] = useState(existing?.memo ?? '');
  const save = () => {
    if (!title.trim()) return notify('프로젝트 이름을 입력하세요.');
    const data = { title: title.trim(), track: track || null, deadline: deadline || null, memo };
    if (existing) updateProject(existing.id, data);
    else addProject(data);
    onClose();
  };
  return (
    <Modal onClose={onClose} size="md" label="프로젝트">
      <ModalHead kicker="Project" title={existing ? '프로젝트 편집' : '새 프로젝트'} onClose={onClose} />
      <div className="modal-body" style={{ paddingTop: 8 }}>
        <label className="field-label">이름</label>
        <input className="input" data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && save()} />
        <div className="two-col" style={{ marginTop: 12, gap: 12 }}>
          <div>
            <label className="field-label">트랙</label>
            <select className="select" value={track} onChange={(e) => setTrack(e.target.value)}>
              <option value="">지정 안 함</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">마감일</label>
            <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
        <label className="field-label" style={{ marginTop: 12 }}>
          메모
        </label>
        <textarea className="textarea" rows={3} value={memo} placeholder="목적, 완료 기준, 참고할 내용" onChange={(e) => setMemo(e.target.value)} />
      </div>
      <div className="modal-foot">
        {existing && (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => {
              deleteProject(existing.id);
              notify('프로젝트를 휴지통으로 옮겼습니다.');
              onClose();
              go('projects');
            }}
          >
            <Trash2 /> 삭제
          </button>
        )}
        <span className="spacer" />
        <button className="btn btn-ghost" onClick={onClose}>
          취소
        </button>
        <button className="btn btn-primary" onClick={save}>
          저장
        </button>
      </div>
    </Modal>
  );
}
