import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Download } from 'lucide-react';
import { Modal, ModalHead, Seg } from './ui';
import { useStore } from '../store/store';
import { useUi, type PrintKind } from '../store/ui';
import { GROUP_LABEL, occurrencesOn, progressOf, statusLine, tasksInRange, tasksOnDate, timeRange } from '../store/selectors';
import {
  addDays,
  addMonths,
  dow,
  dowLong,
  DOW_SHORT,
  mdDot,
  mdDow,
  mdKorean,
  MONTH_EN,
  monthDays,
  monthGrid,
  monthLabel,
  weekDays,
  weekRangeLabel,
  weekStart,
} from '../lib/date';
import { holidayName } from '../lib/holidays';
import type { PlannerData, Task } from '../store/types';

const KIND_LABEL: Record<PrintKind, string> = { daily: '일간', weekly: '주간', monthly: '월간', yearly: '연간' };
const ORIENT: Record<PrintKind, 'portrait' | 'landscape'> = { daily: 'portrait', weekly: 'landscape', monthly: 'landscape', yearly: 'portrait' };
const GLYPH: Record<Task['status'], string> = { todo: '☐', in_progress: '●', done: '✓', deferred: '→', cancelled: '✕', delegated: '⊘' };
const MAX_PAGES = 62;

function periods(kind: PrintKind, start: string, end: string): string[] {
  const out: string[] = [];
  if (kind === 'daily') for (let d = start; d <= end && out.length < MAX_PAGES; d = addDays(d, 1)) out.push(d);
  if (kind === 'weekly') for (let w = weekStart(start); w <= end && out.length < MAX_PAGES; w = addDays(w, 7)) out.push(w);
  if (kind === 'monthly') for (let m = start.slice(0, 7); m <= end.slice(0, 7) && out.length < MAX_PAGES; m = addMonths(m, 1)) out.push(m);
  if (kind === 'yearly') for (let y = Number(start.slice(0, 4)); y <= Number(end.slice(0, 4)) && out.length < 10; y++) out.push(String(y));
  return out;
}

export function PrintModal() {
  const print = useUi((s) => s.print);
  const set = useUi((s) => s.set);
  if (!print || print.stage !== 'setup') return null;
  const close = () => set({ print: null });
  const upd = (p: Partial<typeof print>) => set({ print: { ...print, ...p } });
  const count = periods(print.kind, print.start, print.end < print.start ? print.start : print.end).length;
  const inputType = print.kind === 'monthly' ? 'month' : print.kind === 'yearly' ? 'number' : 'date';
  const toInput = (v: string) => (print.kind === 'monthly' ? v.slice(0, 7) : print.kind === 'yearly' ? v.slice(0, 4) : v);
  const fromInput = (v: string) => (print.kind === 'monthly' ? `${v}-01` : print.kind === 'yearly' ? `${v}-01-01` : v);
  return (
    <Modal onClose={close} size="md" label="PDF 내보내기">
      <ModalHead kicker="PDF" title="기간을 정해 출력하기" onClose={close} />
      <div className="modal-body" style={{ paddingTop: 8 }}>
        <label className="field-label">종류</label>
        <Seg
          value={print.kind}
          onChange={(k) => upd({ kind: k })}
          options={(['daily', 'weekly', 'monthly', 'yearly'] as PrintKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))}
        />
        <div className="two-col" style={{ marginTop: 14, gap: 12 }}>
          <div>
            <label className="field-label">시작</label>
            <input
              className="input"
              type={inputType}
              min={inputType === 'number' ? 2000 : undefined}
              max={inputType === 'number' ? 2100 : undefined}
              value={toInput(print.start)}
              onChange={(e) => e.target.value && upd({ start: fromInput(e.target.value) })}
            />
          </div>
          <div>
            <label className="field-label">끝</label>
            <input
              className="input"
              type={inputType}
              min={inputType === 'number' ? 2000 : undefined}
              max={inputType === 'number' ? 2100 : undefined}
              value={toInput(print.end)}
              onChange={(e) => e.target.value && upd({ end: fromInput(e.target.value) })}
            />
          </div>
        </div>
        <div className="panel-note" style={{ paddingTop: 10 }}>
          {KIND_LABEL[print.kind]} 플래너 · {count}쪽 · A4 {ORIENT[print.kind] === 'landscape' ? '가로' : '세로'}
          {count >= MAX_PAGES ? ` (최대 ${MAX_PAGES}쪽)` : ''}
        </div>
      </div>
      <div className="modal-foot">
        <span className="spacer" />
        <button className="btn btn-ghost" onClick={close}>
          취소
        </button>
        <button className="btn btn-primary" onClick={() => upd({ stage: 'preview', end: print.end < print.start ? print.start : print.end })}>
          미리보기
        </button>
      </div>
    </Modal>
  );
}

export function PrintRoot() {
  const print = useUi((s) => s.print);
  const set = useUi((s) => s.set);
  const data = useStore();
  useEffect(() => {
    if (!print || print.stage !== 'preview') return;
    const style = document.createElement('style');
    style.textContent = `@page { size: A4 ${ORIENT[print.kind]}; margin: 9mm; }`;
    document.head.appendChild(style);
    const prevTitle = document.title;
    document.title = `동동 - ${KIND_LABEL[print.kind]} 플래너 - ${print.start.slice(0, print.kind === 'monthly' ? 7 : print.kind === 'yearly' ? 4 : 10)}`;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && set({ print: null });
    window.addEventListener('keydown', onKey);
    return () => {
      style.remove();
      document.title = prevTitle;
      window.removeEventListener('keydown', onKey);
    };
  }, [print, set]);
  const list = useMemo(() => (print ? periods(print.kind, print.start, print.end) : []), [print]);
  if (!print || print.stage !== 'preview') return null;
  const orient = ORIENT[print.kind];
  return createPortal(
    <div className={`print-preview ${orient}`}>
      <div className="pp-bar">
        <div>
          <div className="pp-title">PDF 미리보기</div>
          <div className="pp-sub">
            {KIND_LABEL[print.kind]} 플래너 · {list.length}
            {print.kind === 'daily' ? '일' : print.kind === 'weekly' ? '주' : print.kind === 'monthly' ? '개월' : '년'} · A4 {orient === 'landscape' ? '가로' : '세로'}
          </div>
          <div className="pp-sub">인쇄 화면에서 ‘PDF로 저장’을 선택하세요.</div>
        </div>
        <span className="spacer" />
        <button className="btn pp-btn" onClick={() => set({ print: { ...print, stage: 'setup' } })}>
          설정 수정
        </button>
        <button className="btn pp-btn" onClick={() => set({ print: null })}>
          닫기
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Download /> 인쇄 · PDF 저장
        </button>
      </div>
      <div className="pp-pages">
        {list.map((p) => (
          <div className={`sheet ${orient}`} key={p}>
            {print.kind === 'daily' && <DailySheet date={p} data={data} />}
            {print.kind === 'weekly' && <WeeklySheet week={p} data={data} />}
            {print.kind === 'monthly' && <MonthlySheet month={p} data={data} />}
            {print.kind === 'yearly' && <YearlySheet year={p} data={data} />}
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

function SheetHead({ kind, title, sub }: { kind: string; title: string; sub?: string }) {
  return (
    <div className="sh-head">
      <div className="sh-kicker">동동 · {kind}</div>
      <div className="sh-title">
        {title} {sub ? <small>{sub}</small> : null}
      </div>
    </div>
  );
}

function TaskLine({ t }: { t: Task }) {
  return (
    <div className={`sh-task s-${t.status}`}>
      <span className="g">{GLYPH[t.status]}</span>
      <span className="n">{t.title}</span>
      {t.q ? <span className="q">Q{t.q}</span> : null}
      {t.status === 'delegated' || t.status === 'deferred' ? <span className="m">{statusLine(t, mdDot)}</span> : null}
    </div>
  );
}

function DailySheet({ date, data }: { date: string; data: PlannerData }) {
  const tasks = tasksOnDate(data.tasks, date);
  const occ = occurrencesOn(data.events, date);
  const prog = progressOf(tasks.filter((t) => t.status !== 'delegated'));
  const groups: [string, Task[]][] = [
    ...(['A', 'B', 'C'] as const).map((g) => [`${g} · ${GROUP_LABEL[g]}`, tasks.filter((t) => t.group === g && t.status !== 'delegated')] as [string, Task[]]),
    ['정리하지 않은 일', tasks.filter((t) => !t.group && t.status !== 'delegated')],
    ['위임한 일', tasks.filter((t) => t.status === 'delegated')],
  ];
  return (
    <>
      <SheetHead kind="일간 플래너" title={mdKorean(date)} sub={`${date.slice(0, 4)} · ${dowLong(date)}`} />
      <div className="sh-cols daily">
        <div>
          <div className="sh-sec">
            오늘 할 일 <span>{prog.done} / {prog.total} 완료</span>
          </div>
          {groups.map(([label, list]) =>
            list.length ? (
              <div key={label} className="sh-group">
                <div className="sh-glabel">{label}</div>
                {list.map((t) => (
                  <TaskLine key={t.id} t={t} />
                ))}
              </div>
            ) : null,
          )}
          {!tasks.length && <div className="sh-lines" style={{ height: 180 }} />}
          <div className="sh-sec" style={{ marginTop: 14 }}>
            자유 노트
          </div>
          <div className="sh-note">{data.notes[date] || ''}</div>
          <div className="sh-lines" style={{ height: 120 }} />
        </div>
        <div>
          <div className="sh-sec">시간표</div>
          <div className="sh-hours">
            {Array.from({ length: 24 }, (_, h) => {
              const evs = occ.filter((o) => o.startMin != null && Math.floor(o.startMin / 60) === h);
              return (
                <div className="sh-hour" key={h}>
                  <span className="hh">{String(h).padStart(2, '0')}</span>
                  <span className="ev">
                    {evs.map((o) => (
                      <span key={o.event.id}>
                        <b>{timeRange(o)}</b> {o.event.title}
                      </span>
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
          {occ.some((o) => o.startMin == null) && (
            <div className="sh-small" style={{ marginTop: 6 }}>
              종일: {occ.filter((o) => o.startMin == null).map((o) => o.event.title).join(', ')}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function WeeklySheet({ week, data }: { week: string; data: PlannerData }) {
  const days = weekDays(week);
  const compass = data.compass[week];
  const rocks = data.settings.roles.map((r) => [r.name, compass?.rocks?.[r.id]] as const).filter(([, v]) => v);
  const weekTasks = data.tasks.filter((t) => !t.deletedAt && t.weekKey === week);
  return (
    <>
      <SheetHead kind="주간 플래너" title={weekRangeLabel(week)} />
      <div className="sh-week">
        {days.map((d) => {
          const occ = occurrencesOn(data.events, d);
          const tasks = tasksOnDate(data.tasks, d);
          const hol = holidayName(d);
          return (
            <div className={`sh-wday ${dow(d) === 0 || hol ? 'sun' : dow(d) === 6 ? 'sat' : ''}`} key={d}>
              <div className="sh-wdate">
                {mdDot(d)} <small>{dowLong(d)}</small>
              </div>
              {hol && <div className="sh-small red">{hol}</div>}
              {occ.map((o) => (
                <div className="sh-ev" key={o.event.id}>
                  <b>{o.event.allDay ? '종일' : o.event.startTime}</b> {o.event.title}
                </div>
              ))}
              <div className="sh-wtasks">
                {tasks.map((t) => (
                  <TaskLine key={t.id} t={t} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="sh-cols" style={{ marginTop: 10 }}>
        <div>
          <div className="sh-sec">역할별 Big Rock</div>
          {rocks.length ? rocks.map(([n, v]) => <div className="sh-small" key={n}><b>{n}</b> {v}</div>) : <div className="sh-lines" style={{ height: 60 }} />}
        </div>
        <div>
          <div className="sh-sec">이번 주 업무</div>
          {weekTasks.length ? weekTasks.map((t) => <TaskLine key={t.id} t={t} />) : <div className="sh-lines" style={{ height: 60 }} />}
        </div>
      </div>
    </>
  );
}

function MonthlySheet({ month, data }: { month: string; data: PlannerData }) {
  const start = data.settings.monthStartsOn;
  const grid = monthGrid(month, start);
  const days = monthDays(month);
  const goals = data.goals.filter((g) => !g.deletedAt && g.scope === 'month' && g.period === month);
  const tasks = data.tasks.filter((t) => !t.deletedAt && t.monthKey === month);
  const dir = data.directions[`month:${month}`];
  const evs = days.flatMap((d) => occurrencesOn(data.events, d).map((o) => ({ ...o, d })));
  return (
    <>
      <SheetHead kind="월간 플래너" title={monthLabel(month)} />
      <div className="sh-month">
        <div>
          <div className="sh-mgrid">
            {Array.from({ length: 7 }, (_, i) => (i + start) % 7).map((d) => (
              <div className="sh-mdow" key={d}>
                {DOW_SHORT[d]}
              </div>
            ))}
            {grid.map((d) => {
              const inMonth = d.slice(0, 7) === month;
              const occ = inMonth ? occurrencesOn(data.events, d) : [];
              const n = inMonth ? tasksOnDate(data.tasks, d).length : 0;
              return (
                <div className={`sh-mcell ${inMonth ? '' : 'out'}`} key={d}>
                  {inMonth && (
                    <>
                      <div className={`d ${dow(d) === 0 || holidayName(d) ? 'red' : ''}`}>{Number(d.slice(8))}</div>
                      {occ.slice(0, 2).map((o) => (
                        <div className="e" key={o.event.id}>
                          {o.event.startTime ? `${o.event.startTime} ` : ''}
                          {o.event.title}
                        </div>
                      ))}
                      {n > 0 && <div className="e muted">할 일 {n}개</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="sh-side">월간 목표</div>
          {dir && <div className="sh-small" style={{ marginBottom: 6 }}>{dir}</div>}
          {goals.length ? goals.map((g) => <div className="sh-small" key={g.id}>{g.done ? '✓' : '○'} {g.title}</div>) : <div className="sh-small muted">기록 없음</div>}
          <div className="sh-side" style={{ marginTop: 12 }}>
            월간 주요업무
          </div>
          {tasks.length ? tasks.map((t) => <TaskLine key={t.id} t={t} />) : <div className="sh-small muted">등록된 업무 없음</div>}
        </div>
      </div>
      <div className="sh-side wide" style={{ marginTop: 12 }}>
        월간 일정 목록
      </div>
      <div className="sh-evlist">
        {evs.length ? (
          evs.map((o) => (
            <div key={`${o.event.id}-${o.d}`} className="sh-small">
              <b>{o.event.allDay ? '종일' : timeRange(o)}</b> {o.event.title} <span className="muted">{mdDow(o.d)}</span>
            </div>
          ))
        ) : (
          <div className="sh-small muted">일정 없음</div>
        )}
      </div>
    </>
  );
}

function YearlySheet({ year, data }: { year: string; data: PlannerData }) {
  const goals = data.goals.filter((g) => !g.deletedAt && g.scope === 'year' && g.period === year);
  const dir = data.directions[`year:${year}`];
  const tasks = tasksInRange(data.tasks, `${year}-01-01`, `${year}-12-31`);
  const done = tasks.filter((t) => t.status === 'done').length;
  return (
    <>
      <SheetHead kind="연간 플래너" title={`${year}년`} sub={`마친 업무 ${done}개`} />
      <div className="sh-year">
        {Array.from({ length: 12 }, (_, i) => {
          const m = `${year}-${String(i + 1).padStart(2, '0')}`;
          return (
            <div key={m}>
              <div className="sh-ymt">
                {String(i + 1).padStart(2, '0')} {MONTH_EN[i]}
              </div>
              <div className="sh-ygrid">
                {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                  <span key={d} className="h">
                    {d}
                  </span>
                ))}
                {monthGrid(m, 0).map((d) => (
                  <span key={d} className={d.slice(0, 7) !== m ? 'o' : dow(d) === 0 || holidayName(d) ? 'red' : ''}>
                    {d.slice(0, 7) === m ? Number(d.slice(8)) : ''}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="sh-cols" style={{ marginTop: 14 }}>
        <div>
          <div className="sh-sec">올해의 방향</div>
          <div className="sh-note">{dir || ''}</div>
          {!dir && <div className="sh-lines" style={{ height: 60 }} />}
        </div>
        <div>
          <div className="sh-sec">연간 목표</div>
          {goals.length ? (
            goals.map((g) => (
              <div key={g.id} className="sh-small" style={{ marginBottom: 4 }}>
                {g.done ? '✓' : '○'} <b>{g.title}</b>
                {g.milestones.length > 0 && (
                  <span className="muted">
                    {' '}
                    · 단계 {g.milestones.filter((x) => x.done).length}/{g.milestones.length}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="sh-lines" style={{ height: 60 }} />
          )}
        </div>
      </div>
    </>
  );
}
