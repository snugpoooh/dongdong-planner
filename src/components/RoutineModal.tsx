import { useState } from 'react';
import { Pause, Play, Trash2 } from 'lucide-react';
import { Modal } from './ui';
import { useStore } from '../store/store';
import { useUi } from '../store/ui';
import { addDays, todayKey } from '../lib/date';
import { durationLabel } from '../lib/routines';
import type { Routine } from '../store/types';

const DAYS = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAME = ['일', '월', '화', '수', '목', '금', '토'];
const PRESETS: { label: string; days: number[] }[] = [
  { label: '매일', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: '평일', days: [1, 2, 3, 4, 5] },
  { label: '주말', days: [0, 6] },
];
const DURATIONS = [10, 15, 20, 30, 45, 60, 90];

export function RoutineModal() {
  const m = useUi((s) => s.routineModal);
  if (!m) return null;
  return <Inner key={m.id ?? 'new'} id={m.id} />;
}

function Inner({ id }: { id?: string }) {
  const set = useUi((s) => s.set);
  const notify = useUi((s) => s.notify);
  const existing = useStore((s) => (id ? s.routines.find((r) => r.id === id) : undefined));
  const tracks = useStore((s) => s.settings.tracks);
  const { addRoutine, updateRoutine, deleteRoutine } = useStore.getState();
  const [r, setR] = useState<Partial<Routine>>(
    () => existing ?? { title: '', days: [0, 1, 2, 3, 4, 5, 6], time: null, duration: 30, track: tracks[0]?.id ?? null, memo: '' },
  );
  const patch = (p: Partial<Routine>) => setR((cur) => ({ ...cur, ...p }));
  const close = () => set({ routineModal: null });
  const days = r.days ?? [];

  const save = () => {
    const title = (r.title ?? '').trim();
    if (!title) return notify('루틴 이름을 입력하세요.');
    if (!days.length) return notify('하는 요일을 하나 이상 고르세요.');
    if (existing) updateRoutine(existing.id, { ...r, title });
    else addRoutine({ ...r, title, order: Date.now() });
    close();
  };

  return (
    <Modal onClose={close} label={existing ? '루틴 편집' : '새 루틴'} size="md">
      <div style={{ display: 'contents' }} onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && save()}>
        <div className="modal-bar">
          <button className="cancel" onClick={close}>
            취소
          </button>
          <div className="ttl">{existing ? '루틴 편집' : '새 루틴'}</div>
          <button className="btn btn-primary save" onClick={save}>
            저장
          </button>
        </div>
        <div className="modal-body">
          <label className="field-label accent">루틴</label>
          <input
            className="title-input"
            data-autofocus
            placeholder="예: 아침 스트레칭, 독서 30분, 감사 일기"
            value={r.title ?? ''}
            onChange={(e) => patch({ title: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && save()}
          />

          <div className="form-section">
            <label className="field-label accent">하는 요일</label>
            <div className="choice-row" style={{ marginBottom: 8 }}>
              {PRESETS.map((p) => (
                <button key={p.label} className={`btn btn-sm ${[...days].sort().join() === [...p.days].sort().join() ? 'btn-soft' : 'btn-outline'}`} onClick={() => patch({ days: p.days })}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="dow-pick" role="group" aria-label="요일 선택">
              {DAYS.map((d) => (
                <button
                  key={d}
                  aria-pressed={days.includes(d)}
                  className={`${days.includes(d) ? 'on' : ''} ${d === 0 ? 'sun' : d === 6 ? 'sat' : ''}`}
                  onClick={() => patch({ days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d] })}
                >
                  {DAY_NAME[d]}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label className="field-label accent">시간</label>
            <div className="panel">
              <div className="panel-row">
                <label htmlFor="r-time">시작 시간</label>
                <input id="r-time" type="time" value={r.time ?? ''} onChange={(e) => patch({ time: e.target.value || null })} />
              </div>
              <div className="panel-row">
                <label htmlFor="r-dur">걸리는 시간</label>
                <select id="r-dur" value={r.duration ?? 30} onChange={(e) => patch({ duration: Number(e.target.value) })}>
                  {DURATIONS.map((m) => (
                    <option key={m} value={m}>
                      {durationLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="panel-row">
                <label htmlFor="r-track">트랙</label>
                <select id="r-track" value={r.track ?? ''} onChange={(e) => patch({ track: e.target.value || null })}>
                  <option value="">지정 안 함</option>
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="panel-note">시간을 정하면 Daily·Weekly 시간표에 자동으로 들어갑니다. 비워 두면 오늘의 루틴 목록에만 나옵니다.</div>
          </div>

          <div className="form-section">
            <label className="field-label accent">메모</label>
            <textarea className="textarea" rows={2} placeholder="왜 이 루틴을 하는지, 어떻게 할지" value={r.memo ?? ''} onChange={(e) => patch({ memo: e.target.value })} />
          </div>

          {existing && (
            <div className="row" style={{ marginTop: 16, flexWrap: 'wrap' }}>
              {existing.endDate ? (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    updateRoutine(existing.id, { endDate: null });
                    notify('루틴을 다시 시작합니다.');
                    close();
                  }}
                >
                  <Play /> 다시 시작
                </button>
              ) : (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    updateRoutine(existing.id, { endDate: addDays(todayKey(), -1) });
                    notify('오늘부터 루틴을 멈춥니다. 지난 기록은 남습니다.');
                    close();
                  }}
                >
                  <Pause /> 오늘부터 멈추기
                </button>
              )}
              <span className="spacer" />
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  deleteRoutine(existing.id);
                  notify('루틴을 휴지통으로 옮겼습니다.');
                  close();
                }}
              >
                <Trash2 /> 루틴 삭제
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
