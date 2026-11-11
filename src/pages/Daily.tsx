import { useMemo, useRef, useState } from 'react';
import { BellRing, CircleCheck, Clock, Compass, LayoutList, NotebookPen, Plus, Search, X } from 'lucide-react';
import { Card, DatePickButton, PageHead, PrevNext, Seg } from '../components/ui';
import { TaskRow } from '../components/tasks';
import { DayTimeline, EventList } from '../components/Timeline';
import { useStore } from '../store/store';
import { openEvent, openTask, useUi } from '../store/ui';
import { GROUP_LABEL, occurrencesOn, progressOf, tasksOnDate } from '../store/selectors';
import { addDays, dowLong, mdDow, mdKorean } from '../lib/date';
import { useDraft, useToday } from '../lib/hooks';
import { go } from '../lib/router';
import { dueReviews } from '../lib/reminders';
import type { PriorityGroup, Task } from '../store/types';

export function DailyPage({ date }: { date: string }) {
  const today = useToday();
  const isToday = date === today;
  return (
    <div className="page">
      <PageHead
        eyebrow={isToday ? 'Daily / Today' : 'Daily'}
        title={mdKorean(date)}
        sub={dowLong(date)}
        desc="오늘의 할 일과 일정을 정리하고, 하루를 기록하세요."
        side={
          <PrevNext onPrev={() => go(`daily/${addDays(date, -1)}`)} onNext={() => go(`daily/${addDays(date, 1)}`)}>
            <DatePickButton value={date} onChange={(v) => go(`daily/${v}`)} />
          </PrevNext>
        }
      />
      {isToday && <ReviewBanner today={today} />}
      <div className="grid-2">
        <div className="stack">
          <PrioritiesCard date={date} />
          <NotesCard key={date} date={date} />
        </div>
        <div className="stack">
          <ScheduleCard date={date} isToday={isToday} />
          <DelegationCheckCard date={date} />
        </div>
      </div>
    </div>
  );
}

function ReviewBanner({ today }: { today: string }) {
  const reviews = useStore((s) => s.reviews);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  if (!settings.reviewReminders) return null;
  const due = dueReviews(today, reviews, settings.dismissedReminders);
  if (!due.length) return null;
  return (
    <>
      {due.map((r) => (
        <div className="banner" key={r.key}>
          <BellRing />
          <span>
            <b>{r.label}.</b> <span className="muted">돌아보고 다음 계획으로 이어가세요.</span>
          </span>
          <span className="spacer" />
          <button className="btn btn-soft btn-sm" onClick={() => go(r.path)}>
            Review 열기
          </button>
          <button
            className="icon-btn plain sm"
            aria-label="알림 닫기"
            onClick={() => updateSettings({ dismissedReminders: [...settings.dismissedReminders, r.key] })}
          >
            <X />
          </button>
        </div>
      ))}
    </>
  );
}

function PrioritiesCard({ date }: { date: string }) {
  const tasksAll = useStore((s) => s.tasks);
  const addTasksFromText = useStore((s) => s.addTasksFromText);
  const setUi = useUi((s) => s.set);
  const [text, setText] = useState('');
  const tasks = useMemo(() => tasksOnDate(tasksAll, date), [tasksAll, date]);
  const [helpOpen, setHelpOpen] = useState<boolean | null>(null);
  const showHelp = helpOpen ?? tasks.length === 0;

  const active = tasks.filter((t) => t.status !== 'delegated');
  const openish = (t: Task) => t.status === 'todo' || t.status === 'in_progress';
  // The dashed box only holds open, unclassified work; anything already handled moves below the groups.
  const unsorted = active.filter((t) => !t.group && openish(t));
  const handledUnsorted = active.filter((t) => !t.group && !openish(t));
  const delegated = tasks.filter((t) => t.status === 'delegated');
  const prog = progressOf(tasks.filter((t) => t.status !== 'delegated'));

  const submit = () => {
    if (!text.trim()) return;
    addTasksFromText(text, { date });
    setText('');
  };

  return (
    <Card
      icon={<LayoutList />}
      kicker="01 · Priorities"
      title="오늘 할 일"
      actions={
        tasks.length > 0 ? (
          <button className="btn btn-ghost btn-sm" onClick={() => setUi({ triage: { date, onlyUnsorted: false } })}>
            <Compass /> 분류 다시 보기
          </button>
        ) : null
      }
    >
      <div className="quick-add">
        <textarea
          className="textarea"
          rows={1}
          placeholder="오늘 할 일 적기..."
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
              addTasksFromText(text + pasted, { date });
              setText('');
            }
          }}
          aria-label="오늘 할 일 입력"
        />
        <button className="btn btn-primary" onClick={submit}>
          <Plus /> 추가
        </button>
      </div>
      {tasks.length > 0 && (
        <div className="counter-row">
          <span>
            {prog.done} / {prog.total} 완료
          </span>
          <button className="help-toggle" onClick={() => setHelpOpen(!showHelp)}>
            {showHelp ? '▼' : '▶'} 입력·상태 도움말
          </button>
        </div>
      )}
      {showHelp && (
        <div className="help-box">
          {tasks.length === 0 && <div style={{ fontWeight: 600, marginBottom: 4 }}>▼ 입력·상태 도움말</div>}
          <div>Enter로 추가하고, 여러 줄을 붙여넣어 한 번에 담을 수 있어요.</div>
          <div>체크칸을 눌러 상태를 선택하세요. 분류는 나중에 해도 괜찮아요.</div>
          <div className="legend">
            <span>✓ 완료</span>
            <span>→ 연기</span>
            <span>✕ 취소</span>
            <span>⊘ 위임</span>
            <span>● 진행 중</span>
            <span>☐ 미시작</span>
          </div>
        </div>
      )}

      {unsorted.length > 0 && (
        <div className="unsorted">
          <div className="unsorted-head">
            <div className="unsorted-title">
              아직 정리하지 않은 일<small>{unsorted.length}</small>
            </div>
            <span className="spacer" />
            <button className="btn btn-outline btn-sm" onClick={() => setUi({ triage: { date, onlyUnsorted: true } })}>
              <Compass /> 정리하기
            </button>
          </div>
          {unsorted.map((t) => (
            <TaskRow key={t.id} task={t} showUnsortedQ compact />
          ))}
        </div>
      )}

      <div style={{ marginTop: 6 }}>
        {(['A', 'B', 'C'] as Exclude<PriorityGroup, ''>[]).map((g) => (
          <GroupSection key={g} g={g} date={date} tasks={active.filter((t) => t.group === g)} />
        ))}
      </div>

      {handledUnsorted.length > 0 && (
        <>
          <div className="section-label" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            분류 없이 처리한 일
          </div>
          {handledUnsorted.map((t) => (
            <TaskRow key={t.id} task={t} compact />
          ))}
        </>
      )}

      {delegated.length > 0 && (
        <>
          <div className="section-label" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            이날 위임한 일
          </div>
          {delegated.map((t) => (
            <TaskRow key={t.id} task={t} showUnsortedQ compact />
          ))}
        </>
      )}
    </Card>
  );
}

function GroupSection({ g, date, tasks }: { g: Exclude<PriorityGroup, ''>; date: string; tasks: Task[] }) {
  const ids = tasks.map((t) => t.id);
  return (
    <div>
      <div className="group-head">
        <span className={`group-letter ${g}`}>{g}</span>
        <span className="group-name">{GROUP_LABEL[g]}</span>
        {tasks.length > 0 && <span className="group-count">{tasks.length}개</span>}
        <button
          className="icon-btn soft"
          style={{ marginLeft: tasks.length ? 6 : 'auto' }}
          aria-label={`${GROUP_LABEL[g]}에 추가`}
          onClick={() => openTask({ date, group: g })}
        >
          <Plus />
        </button>
      </div>
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} reorder={{ siblings: ids }} />
      ))}
    </div>
  );
}

function NotesCard({ date }: { date: string }) {
  const value = useStore((s) => s.notes[date] ?? '');
  const setNote = useStore((s) => s.setNote);
  const [draft, update, flush] = useDraft(value, (v) => setNote(date, v));
  return (
    <Card
      icon={<NotebookPen />}
      kicker="03 · Notes"
      title="자유 노트"
      actions={
        <button className="icon-btn" aria-label="노트 검색" onClick={() => go('notes')}>
          <Search />
        </button>
      }
    >
      <textarea
        className="lined"
        rows={Math.max(3, draft.split('\n').length + 1)}
        placeholder="오늘 남겨두고 싶은 생각, 기도, 메모..."
        value={draft}
        onChange={(e) => update(e.target.value)}
        onBlur={flush}
        aria-label="자유 노트"
      />
      <div className="tiny muted" style={{ marginTop: 10 }}>
        자동 저장
      </div>
    </Card>
  );
}

function ScheduleCard({ date, isToday }: { date: string; isToday: boolean }) {
  const events = useStore((s) => s.events);
  const occ = useMemo(() => occurrencesOn(events, date), [events, date]);
  const [mode, setMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('dongdong.scheduleMode') as 'grid' | 'list') || 'grid');
  const tlRef = useRef<HTMLDivElement>(null);
  const changeMode = (m: 'grid' | 'list') => {
    setMode(m);
    try {
      localStorage.setItem('dongdong.scheduleMode', m);
    } catch {
      /* ignore */
    }
  };
  const scrollToNow = () => {
    if (mode !== 'grid') changeMode('grid');
    window.setTimeout(() => {
      const el = tlRef.current?.querySelector('[data-now]') ?? tlRef.current?.querySelector(`[data-hour="${new Date().getHours()}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 30);
  };
  return (
    <Card
      icon={<Clock />}
      kicker="02 · Schedule"
      title="시간표"
      actions={
        <button className="btn btn-soft" onClick={() => openEvent({ startDate: date })}>
          <Plus /> 일정 추가
        </button>
      }
    >
      <div className="schedule-tools">
        <Seg
          value={mode}
          onChange={changeMode}
          options={[
            { value: 'grid', label: '24시간' },
            { value: 'list', label: '목록' },
          ]}
        />
        <span className="spacer" />
        {occ.length > 0 && <span className="tiny muted">{occ.length}개 일정</span>}
        <button className="icon-btn" aria-label="현재 시각으로 이동" title="현재 시각으로" onClick={scrollToNow}>
          <Clock />
        </button>
      </div>
      <div className="tiny" style={{ color: 'var(--ink-2)', marginBottom: 8 }}>
        빈 시간대를 눌러 일정 추가 · ◇ 종료 시간 미정
      </div>
      {mode === 'grid' ? <DayTimeline date={date} occurrences={occ} isToday={isToday} scrollRef={tlRef} /> : <EventList occurrences={occ} date={date} />}
    </Card>
  );
}

function DelegationCheckCard({ date }: { date: string }) {
  const tasksAll = useStore((s) => s.tasks);
  const due = useMemo(
    () => tasksAll.filter((t) => !t.deletedAt && t.status === 'delegated' && t.checkDate && t.checkDate <= date),
    [tasksAll, date],
  );
  if (!due.length) return null;
  return (
    <Card
      icon={<CircleCheck />}
      kicker="Waiting for"
      title="위임 확인"
      actions={
        <button className="link-btn" onClick={() => go('delegation')}>
          전체 보기
        </button>
      }
      hint={`${mdDow(date)}까지 확인일이 된 위임 업무입니다.`}
    >
      {due.map((t) => (
        <TaskRow key={t.id} task={t} withDate compact showUnsortedQ />
      ))}
    </Card>
  );
}
