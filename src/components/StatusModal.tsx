import { useMemo, useState } from 'react';
import { Modal, ModalHead } from './ui';
import { StatusGlyph } from './tasks';
import { useStore } from '../store/store';
import { useUi } from '../store/ui';
import { STATUS_LABEL } from '../store/selectors';
import { addDays, todayKey } from '../lib/date';
import type { TaskStatus } from '../store/types';

const ORDER: TaskStatus[] = ['done', 'deferred', 'cancelled', 'delegated', 'in_progress', 'todo'];

export function StatusModal() {
  const id = useUi((s) => s.statusFor);
  if (!id) return null;
  return <Inner key={id} id={id} />;
}

function Inner({ id }: { id: string }) {
  const set = useUi((s) => s.set);
  const notify = useUi((s) => s.notify);
  const task = useStore((s) => s.tasks.find((t) => t.id === id));
  const tasks = useStore((s) => s.tasks);
  const setStatus = useStore((s) => s.setStatus);
  const [mode, setMode] = useState<'deferred' | 'delegated' | null>(null);
  const [deferTo, setDeferTo] = useState(() => addDays(task?.date ?? todayKey(), 1));
  const [who, setWho] = useState(task?.delegateTo ?? '');
  const [check, setCheck] = useState(task?.checkDate ?? addDays(todayKey(), 2));
  const people = useMemo(() => [...new Set(tasks.map((t) => t.delegateTo).filter(Boolean) as string[])], [tasks]);
  const close = () => set({ statusFor: null });
  if (!task) return null;

  const choose = (s: TaskStatus) => {
    if (s === 'deferred' || s === 'delegated') {
      setMode(s);
      return;
    }
    if (s !== task.status) setStatus(task.id, s);
    close();
  };

  return (
    <Modal onClose={close} size="md" label="업무 상태">
      <ModalHead kicker="업무 상태" title={task.title} onClose={close} />
      <div className="modal-body" style={{ paddingTop: 10 }}>
        <div className="status-grid">
          {ORDER.map((s) => (
            <button
              key={s}
              className={`status-choice ${s} ${task.status === s ? 'cur' : ''}`}
              onClick={() => choose(s)}
              data-autofocus={task.status === s ? true : undefined}
            >
              <span className={`status-btn ${s}`} style={{ width: 18, height: 18 }}>
                <StatusGlyph status={s} />
              </span>
              <span className={s === 'in_progress' || s === 'todo' ? 'l' : ''}>{STATUS_LABEL[s]}</span>
              {task.status === s ? <span className="cur-tag">현재</span> : null}
            </button>
          ))}
        </div>

        {mode === 'deferred' && (
          <div className="status-extra">
            <label className="field-label">어느 날로 옮길까요?</label>
            <div className="row">
              <input className="input" type="date" value={deferTo} onChange={(e) => setDeferTo(e.target.value)} />
              <button
                className="btn btn-primary btn-lg"
                onClick={() => {
                  setStatus(task.id, 'deferred', { deferTo });
                  notify(`${deferTo.slice(5).replace('-', '.')}로 연기했습니다.`);
                  close();
                }}
              >
                연기
              </button>
            </div>
            <div className="panel-note">이 날에는 → 로 남고, 새 날짜에 같은 업무가 놓입니다.</div>
          </div>
        )}
        {mode === 'delegated' && (
          <div className="status-extra">
            <div className="two-col" style={{ gap: 10 }}>
              <div>
                <label className="field-label">담당자</label>
                <input className="input" list="people" value={who} placeholder="누구에게 맡기나요?" onChange={(e) => setWho(e.target.value)} autoFocus />
                <datalist id="people">
                  {people.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="field-label">확인일</label>
                <input className="input" type="date" value={check} onChange={(e) => setCheck(e.target.value)} />
              </div>
            </div>
            <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                disabled={!who.trim()}
                onClick={() => {
                  setStatus(task.id, 'delegated', { delegateTo: who.trim(), checkDate: check || null });
                  close();
                }}
              >
                위임
              </button>
            </div>
          </div>
        )}
        <div className="panel-note" style={{ paddingTop: 10 }}>
          연기는 날짜를, 위임은 담당자와 확인일을 입력해요.
        </div>
      </div>
    </Modal>
  );
}
