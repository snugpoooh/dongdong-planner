import { useMemo, useState } from 'react';
import { CalendarRange, ChevronDown, ChevronRight, FileText, GitBranch, Trash2 } from 'lucide-react';
import { Modal } from './ui';
import { StatusGlyph } from './tasks';
import { useStore, newTask } from '../store/store';
import { useUi, openStatus } from '../store/ui';
import { STATUS_LABEL, Q_HINT } from '../store/selectors';
import { mdDot, monthLabel, todayKey, weekRangeLabel, weekStart } from '../lib/date';
import type { PriorityGroup, Quadrant, Task } from '../store/types';

export function TaskModal() {
  const modal = useUi((s) => s.taskModal);
  if (!modal) return null;
  return <TaskModalInner key={modal.id ?? 'new'} id={modal.id} defaults={modal.defaults} />;
}

function TaskModalInner({ id, defaults }: { id?: string; defaults?: Partial<Task> }) {
  const set = useUi((s) => s.set);
  const notify = useUi((s) => s.notify);
  const existing = useStore((s) => (id ? s.tasks.find((t) => t.id === id) : undefined));
  const { addTask, updateTask, deleteTask } = useStore.getState();
  const tracks = useStore((s) => s.settings.tracks);
  const projectsAll = useStore((s) => s.projects);
  const projects = useMemo(() => projectsAll.filter((p) => !p.deletedAt), [projectsAll]);
  const allTasks = useStore((s) => s.tasks);
  const goals = useStore((s) => s.goals);

  const [t, setT] = useState<Task>(() => existing ?? newTask({ date: todayKey(), ...defaults }));
  const [memoOpen, setMemoOpen] = useState(true);
  const [linkOpen, setLinkOpen] = useState(() => !!(t.weekKey || t.monthKey || t.yearKey || t.projectId || t.goalId));
  const [predOpen, setPredOpen] = useState(!!t.predecessorId);
  const close = () => set({ taskModal: null });
  const patch = (p: Partial<Task>) => setT((cur) => ({ ...cur, ...p }));

  const goalOptions = useMemo(
    () =>
      goals
        .filter((g) => !g.deletedAt)
        .sort((a, b) => (a.period < b.period ? 1 : -1))
        .slice(0, 60),
    [goals],
  );
  const predOptions = useMemo(
    () =>
      allTasks
        .filter((x) => !x.deletedAt && x.id !== t.id && (t.projectId ? x.projectId === t.projectId : x.status === 'todo' || x.status === 'in_progress'))
        .slice(-80),
    [allTasks, t.id, t.projectId],
  );

  const save = () => {
    const title = t.title.trim();
    if (!title) {
      notify('업무 제목을 입력하세요.');
      return;
    }
    if (existing) updateTask(t.id, { ...t, title });
    else addTask({ ...t, title, order: Date.now() });
    close();
  };

  const linkSummary =
    [
      t.weekKey ? '주간' : null,
      t.monthKey ? `${Number(t.monthKey.slice(5))}월` : null,
      t.yearKey ? `${t.yearKey}년` : null,
      t.goalId ? '목표' : null,
      t.projectId ? projects.find((p) => p.id === t.projectId)?.title ?? '프로젝트' : null,
    ]
      .filter(Boolean)
      .join(' · ') || '연결 없음';
  const pred = t.predecessorId ? allTasks.find((x) => x.id === t.predecessorId) : undefined;

  return (
    <Modal onClose={close} label={existing ? '업무 편집' : '새 업무'}>
      <div
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
        }}
        style={{ display: 'contents' }}
      >
        <div className="modal-bar">
          <button className="cancel" onClick={close}>
            취소
          </button>
          <div className="ttl">{existing ? '업무 편집' : '새 업무'}</div>
          <button className="btn btn-primary save" onClick={save}>
            저장
          </button>
        </div>
        <div className="modal-body">
          <label className="field-label accent">업무 제목</label>
          <input
            className="title-input"
            data-autofocus
            value={t.title}
            placeholder="무엇을 해야 하나요?"
            onChange={(e) => patch({ title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) save();
            }}
          />

          <div className="form-section">
            <label className="field-label accent">배정</label>
            <div className="panel panel-split">
              <div className="panel-row">
                <label htmlFor="t-date">Daily 배정일</label>
                <input id="t-date" type="date" value={t.date ?? ''} onChange={(e) => patch({ date: e.target.value || null })} />
              </div>
              <div className="panel-row">
                <label htmlFor="t-track">트랙</label>
                <select id="t-track" value={t.track ?? ''} onChange={(e) => patch({ track: e.target.value || null })}>
                  <option value="">나중에 지정</option>
                  {tracks.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section two-col">
            <div>
              <label className="field-label accent">Q 분류</label>
              <div className="choice-row">
                {([0, 1, 2, 3] as Quadrant[]).map((q) => (
                  <button
                    key={q}
                    title={Q_HINT[q]}
                    className={`choice ${q ? `q${q}` : 'plain'} ${t.q === q ? 'on' : ''}`}
                    onClick={() => patch({ q })}
                  >
                    {q ? `Q${q}` : '미분류'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label accent">우선순위 그룹</label>
              <div className="choice-row">
                {(['', 'A', 'B', 'C'] as PriorityGroup[]).map((g) => (
                  <button key={g || 'none'} className={`choice ${g ? `g${g.toLowerCase()}` : 'plain'} ${t.group === g ? 'on' : ''}`} onClick={() => patch({ group: g })}>
                    {g || '미분류'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-section">
            <button className={`disclosure ${memoOpen ? 'open' : ''}`} onClick={() => setMemoOpen((v) => !v)}>
              <FileText /> 메모 <ChevronDown className="chev" />
            </button>
            {memoOpen && (
              <textarea
                className="textarea"
                rows={3}
                placeholder="이 업무에 필요한 내용을 기록하세요."
                value={t.memo}
                onChange={(e) => patch({ memo: e.target.value })}
              />
            )}
          </div>

          <button className="link-row" onClick={() => setLinkOpen((v) => !v)} style={{ borderTop: '1px solid var(--line)', marginTop: 14 }}>
            <CalendarRange /> <span className="lbl">계획과 연결</span>
            <span className="val">
              {linkSummary} {linkOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>
          {linkOpen && (
            <div className="panel" style={{ marginTop: 10 }}>
              <div className="panel-row">
                <label>주간 업무 · 주의 날짜</label>
                <input
                  type="date"
                  value={t.weekKey ?? ''}
                  onChange={(e) => patch({ weekKey: e.target.value ? weekStart(e.target.value) : null })}
                />
              </div>
              {t.weekKey && <div className="panel-note inside">{weekRangeLabel(t.weekKey)}</div>}
              <div className="panel-row">
                <label>월간 주요업무</label>
                <input type="month" value={t.monthKey ?? ''} onChange={(e) => patch({ monthKey: e.target.value || null })} />
              </div>
              <div className="panel-row">
                <label>연간 주요업무</label>
                <select value={t.yearKey ?? ''} onChange={(e) => patch({ yearKey: e.target.value || null })}>
                  <option value="">연결 없음</option>
                  {yearOptions().map((y) => (
                    <option key={y} value={y}>
                      {y}년
                    </option>
                  ))}
                </select>
              </div>
              <div className="panel-row">
                <label>목표</label>
                <select value={t.goalId ?? ''} onChange={(e) => patch({ goalId: e.target.value || null })}>
                  <option value="">연결 없음</option>
                  {goalOptions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.scope === 'month' ? monthLabel(g.period) : `${g.period}년`} · {g.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="panel-row">
                <label>프로젝트</label>
                <select value={t.projectId ?? ''} onChange={(e) => patch({ projectId: e.target.value || null })}>
                  <option value="">연결 없음</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button className="link-row" onClick={() => setPredOpen((v) => !v)}>
            <GitBranch /> <span className="lbl">선행 업무</span>
            <span className="val">
              {pred ? pred.title : '선행 업무 없음'} {predOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>
          {predOpen && (
            <div className="panel" style={{ marginTop: 10 }}>
              <div className="panel-row">
                <label>먼저 끝나야 하는 업무</label>
                <select value={t.predecessorId ?? ''} onChange={(e) => patch({ predecessorId: e.target.value || null })}>
                  <option value="">선행 업무 없음</option>
                  {predOptions.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title}
                      {x.date ? ` (${mdDot(x.date)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {existing && (
            <div className="row" style={{ marginTop: 18 }}>
              <span className={`badge`} style={{ gap: 5 }}>
                <span className={`status-btn ${existing.status}`} style={{ width: 14, height: 14 }}>
                  <StatusGlyph status={existing.status} />
                </span>
                {STATUS_LABEL[existing.status]}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  updateTask(t.id, { ...t, title: t.title.trim() || existing.title });
                  close();
                  openStatus(t.id);
                }}
              >
                상태 변경
              </button>
              <span className="spacer" />
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  deleteTask(t.id);
                  close();
                  notify('업무를 휴지통으로 옮겼습니다.');
                }}
              >
                <Trash2 /> 업무 삭제
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function yearOptions() {
  const y = new Date().getFullYear();
  return [y - 1, y, y + 1, y + 2].map(String);
}
