import { useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Modal, ModalHead } from './ui';
import { TaskList } from './tasks';
import { useStore } from '../store/store';
import { openTask, useUi } from '../store/ui';
import { mdDot, monthLabel, todayKey } from '../lib/date';
import { uid } from '../lib/id';

export function GoalModal() {
  const id = useUi((s) => s.goalModal);
  if (!id) return null;
  return <Inner key={id} id={id} />;
}

function Inner({ id }: { id: string }) {
  const set = useUi((s) => s.set);
  const notify = useUi((s) => s.notify);
  const goal = useStore((s) => s.goals.find((g) => g.id === id));
  const tracks = useStore((s) => s.settings.tracks);
  const tasksAll = useStore((s) => s.tasks);
  const updateGoal = useStore((s) => s.updateGoal);
  const deleteGoal = useStore((s) => s.deleteGoal);
  const [ms, setMs] = useState('');
  const [chg, setChg] = useState('');
  const linked = useMemo(() => tasksAll.filter((t) => !t.deletedAt && t.goalId === id), [tasksAll, id]);
  const close = () => set({ goalModal: null });
  if (!goal) return null;
  const periodLabel = goal.scope === 'month' ? monthLabel(goal.period) : `${goal.period}년`;

  const addMs = () => {
    if (!ms.trim()) return;
    updateGoal(id, { milestones: [...goal.milestones, { id: uid(), text: ms.trim(), done: false }] });
    setMs('');
  };
  const addChg = () => {
    if (!chg.trim()) return;
    updateGoal(id, { changes: [{ id: uid(), date: todayKey(), text: chg.trim() }, ...goal.changes] });
    setChg('');
  };

  return (
    <Modal onClose={close} label="목표">
      <ModalHead kicker={`${periodLabel} · ${goal.scope === 'month' ? '월간' : '연간'} 목표`} title="목표 살피기" onClose={close} />
      <div className="modal-body" style={{ paddingTop: 10 }}>
        <input className="title-input" value={goal.title} onChange={(e) => updateGoal(id, { title: e.target.value })} aria-label="목표 제목" />
        <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" className="check" checked={goal.done} onChange={(e) => updateGoal(id, { done: e.target.checked })} /> 달성함
          </label>
          <span className="spacer" />
          <select className="select" style={{ width: 150 }} value={goal.track ?? ''} onChange={(e) => updateGoal(id, { track: e.target.value || null })}>
            <option value="">트랙 없음</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-section">
          <label className="field-label accent">진행 단계</label>
          {goal.milestones.length === 0 && <div className="empty">앞으로 밟아갈 단계를 적어두세요.</div>}
          {goal.milestones.map((m) => (
            <div key={m.id} className={`ms-row ${m.done ? 'done' : ''}`}>
              <input
                type="checkbox"
                className="check"
                checked={m.done}
                onChange={(e) => updateGoal(id, { milestones: goal.milestones.map((x) => (x.id === m.id ? { ...x, done: e.target.checked } : x)) })}
              />
              <input
                type="text"
                value={m.text}
                onChange={(e) => updateGoal(id, { milestones: goal.milestones.map((x) => (x.id === m.id ? { ...x, text: e.target.value } : x)) })}
              />
              <button className="icon-btn plain sm" aria-label="단계 삭제" onClick={() => updateGoal(id, { milestones: goal.milestones.filter((x) => x.id !== m.id) })}>
                <X />
              </button>
            </div>
          ))}
          <div className="row" style={{ marginTop: 6 }}>
            <input className="input" placeholder="새 단계" value={ms} onChange={(e) => setMs(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && addMs()} />
            <button className="btn btn-soft" onClick={addMs}>
              <Plus /> 추가
            </button>
          </div>
        </div>

        <div className="form-section">
          <label className="field-label accent">결과 기록</label>
          <textarea className="textarea" rows={3} placeholder="이 목표로 무엇을 이루고 배웠나요?" value={goal.result} onChange={(e) => updateGoal(id, { result: e.target.value })} />
        </div>

        <div className="form-section">
          <label className="field-label accent">변화 기록</label>
          <div className="row">
            <input className="input" placeholder="지나오며 배운 것, 달라진 것" value={chg} onChange={(e) => setChg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && addChg()} />
            <button className="btn btn-soft" onClick={addChg}>
              <Plus /> 기록
            </button>
          </div>
          {goal.changes.map((c) => (
            <div key={c.id} className="row" style={{ padding: '7px 0', borderBottom: '1px solid var(--line)', alignItems: 'flex-start' }}>
              <span className="tiny muted" style={{ minWidth: 40, paddingTop: 2 }}>
                {mdDot(c.date)}
              </span>
              <span className="small" style={{ flex: 1, whiteSpace: 'pre-wrap' }}>
                {c.text}
              </span>
              <button className="icon-btn plain sm" aria-label="기록 삭제" onClick={() => updateGoal(id, { changes: goal.changes.filter((x) => x.id !== c.id) })}>
                <X />
              </button>
            </div>
          ))}
        </div>

        <div className="form-section">
          <div className="row">
            <label className="field-label accent" style={{ margin: 0 }}>
              연결된 업무
            </label>
            <span className="spacer" />
            <button
              className="btn btn-soft btn-sm"
              onClick={() => {
                close();
                openTask({ goalId: id, date: null, ...(goal.scope === 'month' ? { monthKey: goal.period } : { yearKey: goal.period }) });
              }}
            >
              <Plus /> 업무 추가
            </button>
          </div>
          <TaskList tasks={linked} withDate compact empty="이 목표에 연결된 업무가 없습니다." />
        </div>
      </div>
      <div className="modal-foot">
        <button
          className="btn btn-danger btn-sm"
          onClick={() => {
            deleteGoal(id);
            close();
            notify('목표를 휴지통으로 옮겼습니다.');
          }}
        >
          <Trash2 /> 목표 삭제
        </button>
        <span className="spacer" />
        <button className="btn btn-primary" onClick={close}>
          완료
        </button>
      </div>
    </Modal>
  );
}

/** 이어가기: the user picks which unfinished goals continue into the next period. */
export function CarryModal() {
  const carry = useUi((s) => s.carry);
  if (!carry) return null;
  return <CarryInner {...carry} />;
}

function CarryInner({ scope, from, to }: { scope: 'month' | 'year'; from: string; to: string }) {
  const set = useUi((s) => s.set);
  const notify = useUi((s) => s.notify);
  const goalsAll = useStore((s) => s.goals);
  const carryGoals = useStore((s) => s.carryGoals);
  const already = useMemo(() => new Set(goalsAll.filter((g) => g.period === to && g.carriedFrom).map((g) => g.carriedFrom)), [goalsAll, to]);
  const candidates = useMemo(
    () => goalsAll.filter((g) => !g.deletedAt && g.scope === scope && g.period === from && !g.done && !already.has(g.id)),
    [goalsAll, scope, from, already],
  );
  const [picked, setPicked] = useState<string[]>([]);
  const close = () => set({ carry: null });
  const label = (p: string) => (scope === 'month' ? monthLabel(p) : `${p}년`);
  return (
    <Modal onClose={close} size="md" label="목표 이어가기">
      <ModalHead kicker={`${label(from)} → ${label(to)}`} title="이어갈 목표 고르기" onClose={close} />
      <div className="modal-body" style={{ paddingTop: 8 }}>
        <div className="small" style={{ color: 'var(--ink-2)', marginBottom: 10 }}>
          끝내지 못한 목표가 저절로 넘어가지 않습니다. 지금도 중요한 목표만 골라 이어가세요.
        </div>
        {candidates.length === 0 && <div className="empty">이어갈 목표가 없습니다.</div>}
        {candidates.map((g) => (
          <label key={g.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              className="check"
              checked={picked.includes(g.id)}
              onChange={(e) => setPicked(e.target.checked ? [...picked, g.id] : picked.filter((x) => x !== g.id))}
            />
            <span style={{ fontWeight: 700 }}>{g.title}</span>
            {g.milestones.length > 0 && (
              <span className="tiny muted">
                단계 {g.milestones.filter((m) => m.done).length}/{g.milestones.length}
              </span>
            )}
          </label>
        ))}
      </div>
      <div className="modal-foot">
        <span className="spacer" />
        <button className="btn btn-ghost" onClick={close}>
          취소
        </button>
        <button
          className="btn btn-primary"
          disabled={!picked.length}
          onClick={() => {
            carryGoals(picked, to);
            notify(`${picked.length}개 목표를 이어갑니다.`);
            close();
          }}
        >
          선택한 목표 이어가기
        </button>
      </div>
    </Modal>
  );
}
