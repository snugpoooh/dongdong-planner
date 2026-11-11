import { useState } from 'react';
import { Briefcase, ChevronDown, FileText, Trash2, User } from 'lucide-react';
import { Modal } from './ui';
import { useStore, newEvent } from '../store/store';
import { useUi } from '../store/ui';
import { hhmm, minutesOf, todayKey } from '../lib/date';
import type { PlanEvent, Repeat } from '../store/types';

const DURATIONS = [
  { label: '30분', min: 30 },
  { label: '1시간', min: 60 },
  { label: '1시간 30분', min: 90 },
  { label: '2시간', min: 120 },
  { label: '3시간', min: 180 },
];

export function EventModal() {
  const m = useUi((s) => s.eventModal);
  if (!m) return null;
  return <Inner key={m.id ?? 'new'} id={m.id} defaults={m.defaults} />;
}

function Inner({ id, defaults }: { id?: string; defaults?: Partial<PlanEvent> }) {
  const set = useUi((s) => s.set);
  const notify = useUi((s) => s.notify);
  const existing = useStore((s) => (id ? s.events.find((e) => e.id === id) : undefined));
  const tracks = useStore((s) => s.settings.tracks);
  const { addEvent, updateEvent, deleteEvent } = useStore.getState();
  const [e, setE] = useState<PlanEvent>(() => existing ?? newEvent({ startDate: todayKey(), track: tracks[0]?.id ?? null, ...defaults }));
  const [memoOpen, setMemoOpen] = useState(true);
  const patch = (p: Partial<PlanEvent>) => setE((cur) => ({ ...cur, ...p }));
  const close = () => set({ eventModal: null });

  const save = () => {
    const title = e.title.trim();
    if (!title) {
      notify('일정 제목을 입력하세요.');
      return;
    }
    const clean: PlanEvent = {
      ...e,
      title,
      endDate: e.endDate && e.endDate > e.startDate ? e.endDate : null,
      startTime: e.allDay ? null : e.startTime,
      endTime: e.allDay ? null : e.endTime,
    };
    if (existing) updateEvent(e.id, clean);
    else addEvent(clean);
    close();
  };

  const setDuration = (min: number | null) => {
    const s = minutesOf(e.startTime) ?? 9 * 60;
    patch({ endTime: min == null ? null : hhmm(Math.min(s + min, 24 * 60 - 1)) });
  };

  return (
    <Modal onClose={close} label={existing ? '일정 편집' : '새 일정'}>
      <div style={{ display: 'contents' }} onKeyDown={(ev) => ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey) && save()}>
        <div className="modal-bar">
          <button className="cancel" onClick={close}>
            취소
          </button>
          <div className="ttl">{existing ? '일정 편집' : '새 일정'}</div>
          <button className="btn btn-primary save" onClick={save}>
            저장
          </button>
        </div>
        <div className="modal-body">
          <label className="field-label accent">일정 제목</label>
          <input
            className="title-input bare"
            data-autofocus
            placeholder="제목을 입력하세요"
            value={e.title}
            onChange={(ev) => patch({ title: ev.target.value })}
            onKeyDown={(ev) => ev.key === 'Enter' && !ev.nativeEvent.isComposing && save()}
          />

          <div className="form-section">
            <label className="field-label accent">날짜와 시간</label>
            <div className="panel">
              <div className="panel-row">
                <label htmlFor="e-start">시작일</label>
                <input id="e-start" type="date" value={e.startDate} onChange={(ev) => ev.target.value && patch({ startDate: ev.target.value })} />
              </div>
              <div className="panel-row">
                <label htmlFor="e-end">종료일</label>
                <input id="e-end" type="date" value={e.endDate ?? ''} min={e.startDate} onChange={(ev) => patch({ endDate: ev.target.value || null })} />
              </div>
              <div className="panel-note inside">하루 일정은 종료일을 비워두세요.</div>
              <div className="panel-row">
                <label htmlFor="e-allday">종일</label>
                <input
                  id="e-allday"
                  type="checkbox"
                  className="check"
                  style={{ marginLeft: 'auto' }}
                  checked={e.allDay}
                  onChange={(ev) => patch({ allDay: ev.target.checked })}
                />
              </div>
              {!e.allDay && (
                <div className="panel-split">
                  <div className="panel-row">
                    <label htmlFor="e-st">시작 시간</label>
                    <input id="e-st" type="time" value={e.startTime ?? ''} onChange={(ev) => patch({ startTime: ev.target.value || null })} />
                  </div>
                  <div className="panel-row">
                    <label htmlFor="e-et">종료 시간</label>
                    <input id="e-et" type="time" value={e.endTime ?? ''} onChange={(ev) => patch({ endTime: ev.target.value || null })} />
                  </div>
                </div>
              )}
            </div>
            {!e.allDay && (
              <>
                <div className="panel-note">종료 시간은 직접 입력하거나 소요 시간으로 선택할 수 있어요.</div>
                <div className="choice-row" style={{ marginTop: 8 }}>
                  {DURATIONS.map((d) => (
                    <button key={d.min} className="btn btn-outline btn-sm" onClick={() => setDuration(d.min)}>
                      {d.label}
                    </button>
                  ))}
                  <button className={`btn btn-sm ${e.endTime ? 'btn-outline' : 'btn-soft'}`} onClick={() => setDuration(null)}>
                    ◇ 종료 미정
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="form-section">
            <label className="field-label accent">일정 설정</label>
            <div className="panel">
              <div style={{ padding: '10px 12px 12px' }}>
                <div className="lbl" style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
                  트랙
                </div>
                <div className="seg" style={{ width: '100%', display: 'grid', gridTemplateColumns: `repeat(${tracks.length + 1}, 1fr)` }}>
                  {tracks.map((tr, i) => (
                    <button key={tr.id} className={e.track === tr.id ? 'on' : ''} onClick={() => patch({ track: tr.id })} style={{ height: 36 }}>
                      {i === 0 ? <User size={13} style={{ verticalAlign: -2, marginRight: 5 }} /> : <Briefcase size={13} style={{ verticalAlign: -2, marginRight: 5 }} />}
                      {tr.name}
                    </button>
                  ))}
                  <button className={!e.track ? 'on' : ''} onClick={() => patch({ track: null })} style={{ height: 36 }}>
                    지정 안 함
                  </button>
                </div>
              </div>
              <div className="panel-row">
                <label htmlFor="e-rep">반복</label>
                <select id="e-rep" value={e.repeat} onChange={(ev) => patch({ repeat: ev.target.value as Repeat })}>
                  <option value="none">안 함</option>
                  <option value="daily">매일</option>
                  <option value="weekly">매주</option>
                  <option value="monthly">매월</option>
                  <option value="yearly">매년</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <button className={`disclosure ${memoOpen ? 'open' : ''}`} onClick={() => setMemoOpen((v) => !v)}>
              <FileText /> 메모 <ChevronDown className="chev" />
            </button>
            {memoOpen && (
              <textarea className="textarea" rows={3} placeholder="준비물이나 기억할 내용을 적어두세요." value={e.memo} onChange={(ev) => patch({ memo: ev.target.value })} />
            )}
          </div>

          {existing && (
            <div className="row" style={{ marginTop: 16 }}>
              <span className="spacer" />
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  deleteEvent(e.id);
                  close();
                  notify('일정을 휴지통으로 옮겼습니다.');
                }}
              >
                <Trash2 /> 일정 삭제
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
