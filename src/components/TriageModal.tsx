import { useMemo } from 'react';
import { Modal, ModalHead } from './ui';
import { useStore } from '../store/store';
import { useUi } from '../store/ui';
import { tasksOnDate, Q_HINT } from '../store/selectors';
import { mdDow } from '../lib/date';
import type { PriorityGroup, Quadrant } from '../store/types';

/** 정리하기: classify captured tasks into Q1–Q3 and A/B/C, one card per task. */
export function TriageModal() {
  const triage = useUi((s) => s.triage);
  const set = useUi((s) => s.set);
  const tasksAll = useStore((s) => s.tasks);
  const updateTask = useStore((s) => s.updateTask);
  const list = useMemo(() => {
    if (!triage) return [];
    return tasksOnDate(tasksAll, triage.date).filter((t) => t.status !== 'delegated' && (!triage.onlyUnsorted || !t.group));
  }, [tasksAll, triage]);
  // Keep the cards stable while classifying so items don't jump away mid-edit.
  const ids = useMemo(() => list.map((t) => t.id), [triage]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!triage) return null;
  const close = () => set({ triage: null });
  const shown = ids.map((id) => tasksAll.find((t) => t.id === id)).filter(Boolean) as typeof list;

  return (
    <Modal onClose={close} label="정리하기">
      <ModalHead kicker={mdDow(triage.date)} title={triage.onlyUnsorted ? '아직 정리하지 않은 일' : '분류 다시 보기'} onClose={close} />
      <div className="modal-body" style={{ paddingTop: 8 }}>
        <div className="tiny" style={{ color: 'var(--ink-2)', marginBottom: 12 }}>
          중요한 일과 급한 일을 나누고(Q), 오늘 어떤 순서로 할지(A·B·C) 정하세요.
        </div>
        {shown.length === 0 && <div className="empty">정리할 업무가 없습니다.</div>}
        {shown.map((t) => (
          <div className="triage-card" key={t.id}>
            <div className="t">{t.title}</div>
            <div className="two-col" style={{ gap: 12 }}>
              <div className="choice-row">
                {([1, 2, 3] as Quadrant[]).map((q) => (
                  <button key={q} title={Q_HINT[q]} className={`choice q${q} ${t.q === q ? 'on' : ''}`} onClick={() => updateTask(t.id, { q: t.q === q ? 0 : q })}>
                    Q{q}
                  </button>
                ))}
              </div>
              <div className="choice-row">
                {(['A', 'B', 'C'] as PriorityGroup[]).map((g) => (
                  <button key={g} className={`choice g${g.toLowerCase()} ${t.group === g ? 'on' : ''}`} onClick={() => updateTask(t.id, { group: t.group === g ? '' : g })}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="modal-foot">
        <span className="tiny muted">Q1 긴급·중요 · Q2 중요 · Q3 긴급 / A 반드시 · B 하면 좋은 · C 여유가 생기면</span>
        <span className="spacer" />
        <button className="btn btn-primary" onClick={close}>
          완료
        </button>
      </div>
    </Modal>
  );
}
