import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Card, PageHead, PrevNext } from '../components/ui';
import { GoalsCard, PeriodEventsCard, PeriodTasksCard } from '../components/PlanCards';
import { useStore } from '../store/store';
import { diffDays, isLeapYear, MONTH_EN, monthGrid } from '../lib/date';
import { useMediaQuery, useToday } from '../lib/hooks';
import { go } from '../lib/router';
import { holidayName } from '../lib/holidays';

export function YearlyPage({ year }: { year: string }) {
  const today = useToday();
  const sundayLabel = useStore((s) => s.settings.sundayLabel);
  const dots = useMediaQuery('(max-width: 860px)');
  const [pick, setPick] = useState(today.slice(0, 4) === year ? today : `${year}-01-01`);
  const y = Number(year);
  const total = isLeapYear(y) ? 366 : 365;
  const ty = Number(today.slice(0, 4));
  const past = y < ty ? total : y > ty ? 0 : diffDays(`${year}-01-01`, today);
  const remaining = y < ty ? 0 : y > ty ? total : total - past - 1;
  const dowNames = ['주', '월', '화', '수', '목', '금', '토'];
  if (sundayLabel !== '주일') dowNames[0] = '일';

  return (
    <div className="page">
      <PageHead
        eyebrow="Yearly"
        title={`${year}년`}
        desc="한 해의 방향과 목표를 정하고, 올해의 성취와 변화를 기록합니다."
        side={
          <PrevNext onPrev={() => go(`yearly/${y - 1}`)} onNext={() => go(`yearly/${y + 1}`)}>
            <button className="btn btn-soft" onClick={() => go(`review/year/${year}`)}>
              <ClipboardCheck /> 연간 Review
            </button>
          </PrevNext>
        }
      />
      <div className="stack">
        <Card
          kicker="Year at a glance"
          title="한눈에 보는 한 해"
          actions={
            <span className="year-stats">
              총 {total}일 · 지나온 날 {past}일 · 남은 날 {remaining}일
            </span>
          }
        >
          <div className="year-legend">
            <span>
              <i className="lg-dot" style={{ background: 'var(--navy)' }} /> 지나온 날
            </span>
            <span>
              <i className="lg-dot" style={{ border: '2px solid var(--now)', width: 9, height: 9 }} /> 오늘
            </span>
            <span>
              <i className="lg-dot" style={{ background: 'var(--ink-4)', opacity: 0.5 }} /> 남은 날
            </span>
            <span>
              <i className="lg-dot" style={{ background: 'var(--sun-ink)', width: 4, height: 4 }} /> 공휴일
            </span>
          </div>
          <div className="year-grid">
            {Array.from({ length: 12 }, (_, i) => {
              const m = `${year}-${String(i + 1).padStart(2, '0')}`;
              const cells = monthGrid(m, 0);
              return (
                <div className="ymonth" key={m}>
                  <button className="ymonth-title" onClick={() => go(`monthly/${m}`)} title="Monthly 열기">
                    {String(i + 1).padStart(2, '0')} {MONTH_EN[i]}
                  </button>
                  <div className={`ygrid ${dots ? 'dots' : ''}`}>
                    {!dots && dowNames.map((d) => <div className="ydow" key={d}>{d}</div>)}
                    {cells.map((d) =>
                      d.slice(0, 7) !== m ? (
                        <span key={d} />
                      ) : (
                        <button
                          key={d}
                          className={['yday', d < today ? 'past' : '', d === today ? 'today' : '', holidayName(d) ? 'holiday' : ''].join(' ')}
                          title={holidayName(d) ?? undefined}
                          onClick={() => go(`daily/${d}`)}
                          aria-label={d}
                        >
                          {Number(d.slice(8))}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <details style={{ marginTop: 18 }}>
            <summary className="help-toggle" style={{ cursor: 'pointer' }}>
              날짜 직접 선택
            </summary>
            <div className="row" style={{ marginTop: 8 }}>
              <input className="input" style={{ width: 180 }} type="date" value={pick} onChange={(e) => setPick(e.target.value)} />
              <button className="btn btn-soft" onClick={() => pick && go(`daily/${pick}`)}>
                Daily 열기
              </button>
            </div>
          </details>
        </Card>
        <div className="grid-2">
          <GoalsCard scope="year" period={year} />
          <div className="stack">
            <PeriodTasksCard link={{ yearKey: year }} start={`${year}-01-01`} end={`${year}-12-31`} />
            <PeriodEventsCard start={`${year}-01-01`} end={`${year}-12-31`} defaultDate={ty === y ? today : `${year}-01-01`} />
          </div>
        </div>
      </div>
    </div>
  );
}
