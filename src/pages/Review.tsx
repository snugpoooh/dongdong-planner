import { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronRight, ClipboardCheck, Compass, Repeat2, Search } from 'lucide-react';
import { Card, PageHead, PrevNext } from '../components/ui';
import { TaskRow } from '../components/tasks';
import { reviewOf, useStore } from '../store/store';
import { useUi } from '../store/ui';
import { tasksInRange } from '../store/selectors';
import { addDays, addMonths, daysInMonth, mdDot, monthLabel, todayKey, toKey, weekRangeLabel, weekStart } from '../lib/date';
import { go } from '../lib/router';
import type { ReviewType } from '../store/types';

const QUESTIONS: Record<ReviewType, [string, string][]> = {
  week: [
    ['이번 주에 의미 있게 이룬 것은 무엇인가요?', '이번 주의 계획과 역할을 돌아보며, 감사하고 의미 있었던 일을 기록해 보세요.'],
    ['무엇을 놓쳤고, 삶의 균형은 어떠했나요?', '중요했지만 돌보지 못한 일과 관계는 없었는지, 몸과 마음, 일과 쉼의 균형을 돌아보세요.'],
    ['무엇을 계속하고, 수정하고, 내려놓을까요?', '이번 주에 배운 것을 바탕으로 다음 주의 방향을 생각해 보세요.'],
  ],
  month: [
    ['이번 달에 의미 있게 이룬 것은 무엇인가요?', '이달의 방향과 중요한 목표를 돌아보며, 의미 있었던 성취와 경험을 기록해 보세요.'],
    ['이번 달의 방향을 얼마나 지켰고, 무엇을 놓쳤나요?', '중요하게 생각했던 일과 관계에 충분히 마음을 두었는지 돌아보세요.'],
    ['다음 달에 무엇을 이어가고 바꿀까요?', '계속할 일과 수정할 일, 내려놓을 일을 생각하며 다음 달의 방향을 정리해 보세요.'],
  ],
  year: [
    ['올해 가장 의미 있었던 성취와 변화는 무엇인가요?', '한 해 동안 중요하게 여겼던 목표와 경험을 돌아보며 의미 있었던 일을 기록해 보세요.'],
    ['올해의 경험을 통해 무엇을 배우고, 무엇이 달라졌나요?', '예상과 달랐던 일, 어려움 속에서 배운 것, 삶의 방향이 달라진 지점을 돌아보세요.'],
    ['새해에는 무엇을 이어가고, 새롭게 선택하고, 내려놓을까요?', '한 해의 경험을 바탕으로 다음 해에 중요하게 여길 것을 생각해 보세요.'],
  ],
};

const TYPE_LABEL: Record<ReviewType, string> = { week: '주간', month: '월간', year: '연간' };

function normalize(type?: string, period?: string): { type: ReviewType; period: string } {
  const t: ReviewType = type === 'month' || type === 'year' ? type : 'week';
  const today = todayKey();
  if (t === 'week') return { type: t, period: weekStart(period && /^\d{4}-\d{2}-\d{2}$/.test(period) ? period : today) };
  if (t === 'month') return { type: t, period: period && /^\d{4}-\d{2}$/.test(period) ? period : today.slice(0, 7) };
  return { type: t, period: period && /^\d{4}$/.test(period) ? period : today.slice(0, 4) };
}

function rangeOf(type: ReviewType, period: string): [string, string] {
  if (type === 'week') return [period, addDays(period, 6)];
  if (type === 'month') return [`${period}-01`, `${period}-${String(daysInMonth(period)).padStart(2, '0')}`];
  return [`${period}-01-01`, `${period}-12-31`];
}

function shift(type: ReviewType, period: string, n: number) {
  if (type === 'week') return addDays(period, 7 * n);
  if (type === 'month') return addMonths(period, n);
  return String(Number(period) + n);
}

function labelOf(type: ReviewType, period: string) {
  if (type === 'week') return weekRangeLabel(period);
  if (type === 'month') return monthLabel(period);
  return `${period}년`;
}

export function ReviewPage(props: { type?: string; period?: string }) {
  const { type, period } = normalize(props.type, props.period);
  const key = `${type}:${period}`;
  const [start, end] = rangeOf(type, period);
  const next = shift(type, period, 1);
  const setUi = useUi((s) => s.set);

  const switchType = (t: ReviewType) => {
    const today = todayKey();
    const p = t === 'week' ? (type === 'week' ? period : weekStart(start <= today && today <= end ? today : start)) : t === 'month' ? start.slice(0, 7) : start.slice(0, 4);
    go(`review/${t}/${p}`);
  };

  return (
    <div className="page narrow">
      <PageHead
        eyebrow="Review"
        title={`${TYPE_LABEL[type]} Review`}
        desc={labelOf(type, period)}
        side={
          <>
            <div className="tabs-text">
              {(['week', 'month', 'year'] as ReviewType[]).map((t) => (
                <button key={t} className={t === type ? 'on' : ''} onClick={() => switchType(t)}>
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            <PrevNext onPrev={() => go(`review/${type}/${shift(type, period, -1)}`)} onNext={() => go(`review/${type}/${next}`)} />
          </>
        }
      />
      <div className="stack">
        <LookBack type={type} period={period} />
        <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)' }}>
          <Reflection key={key} type={type} reviewKey={key} />
          <ExecutionLog start={start} end={end} label={type === 'week' ? '이번 주' : type === 'month' ? '이번 달' : '올해'} />
        </div>
        <Card icon={<Compass />} title="다음 기간 계획">
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <span className="small" style={{ color: 'var(--ink-2)' }}>
              {labelOf(type, next)}
            </span>
            <span className="spacer" />
            {type !== 'week' && (
              <button className="btn btn-outline" onClick={() => setUi({ carry: { scope: type === 'month' ? 'month' : 'year', from: period, to: next } })}>
                <Repeat2 /> 이어갈 목표 고르기
              </button>
            )}
            <button className="btn btn-primary btn-lg" onClick={() => go(type === 'week' ? `compass/${next}` : type === 'month' ? `monthly/${next}` : `yearly/${next}`)}>
              <ArrowRight /> {type === 'week' ? '다음 주 Compass 열기' : type === 'month' ? '다음 달 계획 열기' : '다음 해 계획 열기'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function LookBack({ type, period }: { type: ReviewType; period: string }) {
  const compass = useStore((s) => s.compass[period]);
  const settings = useStore((s) => s.settings);
  const direction = useStore((s) => s.directions[`${type}:${period}`] ?? '');
  const goalsAll = useStore((s) => s.goals);
  const reviews = useStore((s) => s.reviews);
  const [open, setOpen] = useState(false);
  const goals = useMemo(() => goalsAll.filter((g) => !g.deletedAt && g.scope === type && g.period === period), [goalsAll, type, period]);

  if (type === 'week') {
    const entries = [
      ...settings.sawAreas.map((a) => [a.name, compass?.saw?.[a.id]] as const),
      ...settings.roles.map((r) => [r.name, compass?.rocks?.[r.id]] as const),
    ].filter(([, v]) => v && v.trim());
    return (
      <Card
        icon={<Compass />}
        kicker="Look back"
        title="이번 주의 Compass"
        actions={
          <button className="link-btn" onClick={() => go(`compass/${period}`)}>
            <ArrowRight /> Compass 열기
          </button>
        }
      >
        {entries.length === 0 ? (
          <div className="empty">이 주의 Compass에 작성한 계획이 없습니다.</div>
        ) : (
          <div className="two-col" style={{ gap: '6px 24px' }}>
            {entries.map(([name, v]) => (
              <div key={name} className="small" style={{ padding: '4px 0' }}>
                <b>{name}</b> <span style={{ color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }

  const M = type === 'month';
  return (
    <Card
      icon={<Compass />}
      kicker="Look back"
      title={M ? '이달의 계획' : '올해의 계획'}
      actions={
        <button className="link-btn" onClick={() => go(M ? `monthly/${period}` : `yearly/${period}`)}>
          <ArrowRight /> {M ? 'Monthly 열기' : 'Yearly 열기'}
        </button>
      }
    >
      <div style={{ fontWeight: 800, fontSize: 13.5 }}>{M ? '이달의 방향' : '올해의 방향'}</div>
      <div className="small" style={{ color: 'var(--ink-2)', whiteSpace: 'pre-wrap', margin: '2px 0 4px' }}>
        {direction || '작성한 방향이 없습니다.'}
      </div>
      {!M && goals.length === 0 && <div className="small" style={{ color: 'var(--ink-2)' }}>이 기간에 작성한 목표가 없습니다.</div>}
      <div className="divider" style={{ margin: '12px 0 4px' }} />
      {(M || goals.length > 0) && (
        <button className="help-toggle" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)', padding: '6px 0' }} onClick={() => setOpen(!open)}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {M ? '월간' : '연간'} 중요 목표와 결과 <span className="muted">{goals.length}개</span>
        </button>
      )}
      {open &&
        goals.map((g) => (
          <div key={g.id} style={{ padding: '6px 0 6px 18px', borderTop: '1px solid var(--line)' }}>
            <div className="row">
              {g.done ? <Check size={14} color="var(--ok)" /> : null}
              <b className="small">{g.title}</b>
            </div>
            <div className="tiny" style={{ color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>
              {g.result || '결과 기록 없음'}
            </div>
          </div>
        ))}
      {!M && <YearMonthReviews year={period} reviews={reviews} />}
    </Card>
  );
}

function YearMonthReviews({ year, reviews }: { year: string; reviews: Record<string, { answers: string[] }> }) {
  const [open, setOpen] = useState(false);
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  return (
    <>
      <button className="help-toggle" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)', padding: '6px 0' }} onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} 한 해의 월간 Review
      </button>
      {open &&
        months.map((m) => {
          const r = reviews[`month:${m}`];
          const first = r?.answers.find((a) => a.trim());
          return (
            <button key={m} className="row small" style={{ width: '100%', padding: '6px 0 6px 18px', borderTop: '1px solid var(--line)', textAlign: 'left' }} onClick={() => go(`review/month/${m}`)}>
              <b style={{ minWidth: 34 }}>{Number(m.slice(5))}월</b>
              <span style={{ color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{first ?? '미작성'}</span>
            </button>
          );
        })}
    </>
  );
}

function Reflection({ type, reviewKey }: { type: ReviewType; reviewKey: string }) {
  const review = useStore((s) => reviewOf(s.reviews, reviewKey));
  const setAnswer = useStore((s) => s.setReviewAnswer);
  const setDone = useStore((s) => s.setReviewDone);
  const notify = useUi((s) => s.notify);
  const [answers, setAnswers] = useState(review.answers);
  const written = answers.some((a) => a.trim());
  const status = review.completedAt ? `마침 · ${mdDot(toKey(new Date(review.completedAt)))}` : written ? '작성 중 · 자동 저장' : '미작성';
  return (
    <Card
      icon={<ClipboardCheck />}
      kicker="Reflection"
      title="돌아보고 다시 정렬하기"
      actions={
        <button className="icon-btn" aria-label="지난 기록 검색" title="지난 기록 검색" onClick={() => go('notes')}>
          <Search />
        </button>
      }
    >
      {QUESTIONS[type].map(([q, hint], i) => (
        <div className="q-block" key={i}>
          <div className="q-title">{q}</div>
          <div className="q-hint">{hint}</div>
          <textarea
            className="textarea soft"
            rows={3}
            value={answers[i]}
            onChange={(e) => {
              const next = [...answers] as typeof answers;
              next[i] = e.target.value;
              setAnswers(next);
              setAnswer(reviewKey, i as 0 | 1 | 2, e.target.value);
            }}
          />
        </div>
      ))}
      <div className="review-foot">
        <span>{status}</span>
        <span className="spacer" />
        {review.completedAt ? (
          <button className="btn btn-ghost btn-sm" onClick={() => setDone(reviewKey, false)}>
            다시 열기
          </button>
        ) : (
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--ink)', fontWeight: 800 }}
            onClick={() => {
              setDone(reviewKey, true);
              notify('Review를 마쳤습니다. 다음 계획으로 이어가세요.');
            }}
          >
            Review 마치기
          </button>
        )}
      </div>
    </Card>
  );
}

function ExecutionLog({ start, end, label }: { start: string; end: string; label: string }) {
  const tasksAll = useStore((s) => s.tasks);
  const tasks = useMemo(() => tasksInRange(tasksAll, start, end), [tasksAll, start, end]);
  const [openKey, setOpenKey] = useState<string | null>('check');
  const groups = [
    { key: 'check', title: '확인할 업무', list: tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress' || t.status === 'delegated') },
    { key: 'done', title: '마친 업무', list: tasks.filter((t) => t.status === 'done') },
    { key: 'moved', title: '연기·취소한 업무', list: tasks.filter((t) => t.status === 'deferred' || t.status === 'cancelled') },
  ].filter((g) => g.list.length);
  return (
    <Card icon={<Check />} title="실행 기록" hint={`${label}의 배정과 상태 변경을 함께 봅니다.`}>
      {groups.length === 0 && <div className="empty">이 기간에 날짜가 남은 업무 기록이 없습니다.</div>}
      {groups.map((g) => (
        <div key={g.key}>
          <button className="help-toggle" style={{ fontWeight: 800, fontSize: 12.5, color: 'var(--ink)', padding: '8px 0 4px' }} onClick={() => setOpenKey(openKey === g.key ? null : g.key)}>
            {openKey === g.key ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {g.title} <span className="muted">{g.list.length}개</span>
          </button>
          {openKey === g.key && g.list.map((t) => <TaskRow key={t.id} task={t} withDate compact />)}
        </div>
      ))}
    </Card>
  );
}
