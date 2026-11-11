import { addDays, monthOf, todayKey, weekStart, yearOf } from './date';
import { initialData, newEvent, newGoal, newTask, DEFAULT_SETTINGS } from '../store/store';
import { uid } from './id';
import type { PlannerData } from '../store/types';

/** Example planner content so every screen has something to show. */
export function sampleData(): PlannerData {
  const today = todayKey();
  const wk = weekStart(today);
  const month = monthOf(today);
  const year = yearOf(today);
  const d = initialData();
  d.settings = { ...DEFAULT_SETTINGS };
  const P = 'personal';
  const W = 'work';

  const proj1 = { id: uid(), title: '내년 사업 계획', track: W, deadline: addDays(today, 18), memo: '팀과 함께 내년 방향과 예산을 정한다.', order: 1, createdAt: new Date().toISOString(), deletedAt: null };
  const proj2 = { id: uid(), title: '가족 여행 준비', track: P, deadline: null, memo: '', order: 2, createdAt: new Date().toISOString(), deletedAt: null };
  d.projects = [proj1, proj2];

  const g1 = newGoal({ scope: 'month', period: month, title: '아침 루틴 20일 지키기', track: P, order: 1 });
  const g2 = newGoal({ scope: 'month', period: month, title: '분기 보고서 마무리', track: W, order: 2 });
  const gy = newGoal({
    scope: 'year',
    period: year,
    title: '건강한 몸 만들기',
    track: P,
    order: 1,
    milestones: [
      { id: uid(), text: '주 3회 걷기 습관', done: true },
      { id: uid(), text: '10km 완주', done: false },
      { id: uid(), text: '정기 검진', done: false },
    ],
    changes: [{ id: uid(), date: addDays(today, -40), text: '혼자보다 함께 걸을 때 오래 간다는 걸 알았다.' }],
  });
  d.goals = [g1, g2, gy];

  const t = (p: Parameters<typeof newTask>[0]) => newTask({ order: Date.now() + Math.random(), ...p });
  const seed = t({ title: '팀 회의 자료 정리', date: today, group: 'A', q: 1, track: W, projectId: proj1.id });
  const pre = t({ title: '예산안 초안 받기', date: addDays(today, -1), group: 'A', q: 1, track: W, projectId: proj1.id, status: 'done' });
  d.tasks = [
    seed,
    pre,
    t({ title: '내년 목표 초안 쓰기', date: today, group: 'A', q: 2, track: W, projectId: proj1.id, predecessorId: pre.id, monthKey: month }),
    t({ title: '아이와 책 읽기', date: today, group: 'B', q: 2, track: P, goalId: null }),
    t({ title: '운동 30분', date: today, group: 'B', q: 2, track: P, status: 'in_progress' }),
    t({ title: '서재 정리', date: today, group: 'C', q: 3, track: P }),
    t({ title: '항공권 가격 알아보기', date: today, group: '', track: P, projectId: proj2.id }),
    t({ title: '영수증 정리', date: today, group: '' }),
    t({ title: '디자인 시안 받기', date: today, group: 'B', track: W, status: 'delegated', delegateTo: '디자이너', checkDate: addDays(today, 2), history: [{ at: new Date().toISOString(), from: 'todo', to: 'delegated' }] }),
    t({ title: '보험 서류 제출', date: addDays(today, -2), group: 'A', q: 1, track: P, status: 'done' }),
    t({ title: '부모님께 전화', date: addDays(today, -1), group: 'B', q: 2, track: P, status: 'deferred', deferredTo: today }),
    t({ title: '부모님께 전화', date: today, group: 'B', q: 2, track: P }),
    t({ title: '분기 보고서 검토', monthKey: month, date: null, group: 'A', q: 2, track: W, goalId: g2.id }),
    t({ title: '건강검진 예약', yearKey: year, date: null, q: 2, track: P, goalId: gy.id }),
    t({ title: '주간 회고 공유', weekKey: wk, date: null, q: 2, track: W }),
    t({ title: '숙소 후보 3곳 비교', date: null, track: P, projectId: proj2.id }),
  ];

  d.events = [
    newEvent({ title: '주간 팀 회의', startDate: wk, startTime: '10:00', endTime: '11:00', track: W, repeat: 'weekly' }),
    newEvent({ title: '아침 운동', startDate: today, startTime: '06:30', endTime: '07:15', track: P }),
    newEvent({ title: '점심 약속', startDate: today, startTime: '12:00', endTime: '13:00', track: P, memo: '광화문' }),
    newEvent({ title: '집중 작업', startDate: today, startTime: '14:00', endTime: '16:30', track: W }),
    newEvent({ title: '저녁 모임', startDate: addDays(today, 2), startTime: '19:00', endTime: null, track: P }),
    newEvent({ title: '워크숍', startDate: addDays(today, 7), endDate: addDays(today, 8), allDay: true, startTime: null, endTime: null, track: W }),
  ];

  d.notes = {
    [today]: '오늘은 중요한 일부터. 오후에는 회의 대신 집중 시간을 지킨다.',
    [addDays(today, -1)]: '산책하며 떠오른 생각: 내년에는 일보다 사람을 먼저 챙기자.',
  };
  d.directions = { [`month:${month}`]: '서두르지 않고, 중요한 것에 먼저 시간을 쓴다.', [`year:${year}`]: '건강과 관계를 먼저 돌보는 한 해' };
  d.compass = {
    [wk]: {
      saw: { physical: '주 3회 30분 걷기', mental: '책 한 권 끝내기' },
      rocks: { 'r-self': '일기 매일 쓰기', 'r-partner': '수요일 저녁 산책', 'r-work': '사업 계획 초안 완성' },
    },
  };
  d.mos = {
    personal: {
      draft: {
        mission: '나는 내가 맡은 사람들을 성실히 돌보고, 배운 것을 나누며 살아간다.',
        objectives: [
          { id: uid(), text: '건강: 꾸준히 움직이는 몸', level: 0 },
          { id: uid(), text: '주 3회 운동', level: 1 },
          { id: uid(), text: '관계: 가족과 보내는 저녁', level: 0 },
        ],
        strategies: [{ id: uid(), text: '저녁 약속은 주 2회까지', level: 0 }],
      },
      draftUpdatedAt: new Date().toISOString(),
      versions: [],
    },
  };
  d.inbox = [
    { id: uid(), text: '사진 정리 앱 찾아보기', kind: 'idea', track: P, state: 'inbox', createdAt: new Date().toISOString(), resolvedAt: null, resolvedAs: null, deletedAt: null },
  ];
  return d;
}
