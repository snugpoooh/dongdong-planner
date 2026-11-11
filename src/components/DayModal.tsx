import { useMemo } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { Modal, ModalHead } from './ui';
import { TaskList } from './tasks';
import { EventList } from './Timeline';
import { useStore } from '../store/store';
import { openEvent, openTask, useUi } from '../store/ui';
import { occurrencesOn, tasksOnDate } from '../store/selectors';
import { dowLong, mdKorean } from '../lib/date';
import { holidayName } from '../lib/holidays';
import { go } from '../lib/router';

/** Monthly cell → 계획 확인과 추가 */
export function DayModal() {
  const date = useUi((s) => s.dayModal);
  const set = useUi((s) => s.set);
  const tasksAll = useStore((s) => s.tasks);
  const events = useStore((s) => s.events);
  const tasks = useMemo(() => (date ? tasksOnDate(tasksAll, date) : []), [tasksAll, date]);
  const occ = useMemo(() => (date ? occurrencesOn(events, date) : []), [events, date]);
  if (!date) return null;
  const close = () => set({ dayModal: null });
  const hol = holidayName(date);
  return (
    <Modal onClose={close} size="md" label="하루 계획">
      <ModalHead kicker={hol ?? dowLong(date)} title={`${mdKorean(date)} ${dowLong(date)}`} onClose={close} />
      <div className="modal-body" style={{ paddingTop: 8 }}>
        <div className="row" style={{ marginBottom: 4 }}>
          <div style={{ fontWeight: 800 }}>할 일</div>
          <span className="spacer" />
          <button
            className="btn btn-soft btn-sm"
            onClick={() => {
              close();
              openTask({ date });
            }}
          >
            <Plus /> 업무 추가
          </button>
        </div>
        <TaskList tasks={tasks} compact withGroup empty="이 날에 배정한 업무가 없습니다." />
        <div className="row" style={{ margin: '16px 0 4px' }}>
          <div style={{ fontWeight: 800 }}>일정</div>
          <span className="spacer" />
          <button
            className="btn btn-soft btn-sm"
            onClick={() => {
              close();
              openEvent({ startDate: date });
            }}
          >
            <Plus /> 일정 추가
          </button>
        </div>
        <EventList occurrences={occ} date={date} />
      </div>
      <div className="modal-foot">
        <span className="spacer" />
        <button
          className="btn btn-primary"
          onClick={() => {
            close();
            go(`daily/${date}`);
          }}
        >
          Daily 열기 <ArrowRight />
        </button>
      </div>
    </Modal>
  );
}
