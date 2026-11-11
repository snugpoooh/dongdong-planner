import type { DateKey, MonthKey, YearKey } from '../lib/date';

/** Franklin-style task states: ✓ 완료, → 연기, ✕ 취소, ⊘ 위임, ● 진행 중, ☐ 미시작 */
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'deferred' | 'cancelled' | 'delegated';
export type Quadrant = 0 | 1 | 2 | 3; // 0 = 미분류
export type PriorityGroup = '' | 'A' | 'B' | 'C'; // '' = 미분류 (아직 정리하지 않은 일)

export interface StatusChange {
  at: string; // ISO timestamp
  from: TaskStatus;
  to: TaskStatus;
  note?: string;
}

export interface Task {
  id: string;
  title: string;
  memo: string;
  status: TaskStatus;
  q: Quadrant;
  group: PriorityGroup;
  order: number;
  track: string | null; // track id, null = 나중에 지정
  date: DateKey | null; // Daily 배정일
  weekKey: DateKey | null; // 주간 업무 연결 (월요일)
  monthKey: MonthKey | null; // 월간 주요업무 연결
  yearKey: YearKey | null; // 연간 주요업무 연결
  goalId: string | null; // 월간/연간 목표 연결
  projectId: string | null;
  predecessorId: string | null; // 선행 업무
  delegateTo: string | null; // 위임 담당자
  checkDate: DateKey | null; // 위임 확인일
  deferredTo: DateKey | null; // 연기한 날짜 (이 업무는 → 로 남는다)
  deferredFrom: string | null; // 연기로 생긴 업무의 원본 id
  history: StatusChange[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface PlanEvent {
  id: string;
  title: string;
  startDate: DateKey;
  endDate: DateKey | null; // null = 하루 일정
  allDay: boolean;
  startTime: string | null; // HH:MM
  endTime: string | null; // null = 종료 시간 미정 (◇)
  track: string | null;
  repeat: Repeat;
  memo: string;
  createdAt: string;
  deletedAt: string | null;
}

/** A concrete occurrence of an event on a given day. */
export interface Occurrence {
  event: PlanEvent;
  date: DateKey;
  startMin: number | null;
  endMin: number | null;
  multiDay: boolean;
}

export interface Milestone {
  id: string;
  text: string;
  done: boolean;
}

export interface ChangeLog {
  id: string;
  date: DateKey;
  text: string;
}

export interface Goal {
  id: string;
  scope: 'month' | 'year';
  period: string; // MonthKey or YearKey
  title: string;
  track: string | null;
  result: string; // 결과 기록
  done: boolean;
  milestones: Milestone[]; // 진행 단계
  changes: ChangeLog[]; // 변화 기록
  carriedFrom: string | null; // 이어가기 원본
  order: number;
  createdAt: string;
  deletedAt: string | null;
}

export interface Project {
  id: string;
  title: string;
  track: string | null;
  deadline: DateKey | null;
  memo: string;
  order: number;
  createdAt: string;
  deletedAt: string | null;
}

export interface OutlineItem {
  id: string;
  text: string;
  level: number; // 0..3
}

export interface MosContent {
  mission: string;
  objectives: OutlineItem[];
  strategies: OutlineItem[];
}

export interface MosVersion {
  id: string;
  label: string;
  confirmedAt: string;
  content: MosContent;
}

export interface MosTrack {
  draft: MosContent;
  draftUpdatedAt: string | null;
  versions: MosVersion[];
}

export interface CompassWeek {
  saw: Record<string, string>; // 자기계발 영역 id → 실천할 한 가지
  rocks: Record<string, string>; // 역할 id → Big Rock
}

export type ReviewType = 'week' | 'month' | 'year';

export interface Review {
  answers: [string, string, string];
  completedAt: string | null;
  updatedAt: string | null;
}

export type InboxKind = 'idea' | 'request' | 'task' | 'event' | 'memo';
export type InboxState = 'inbox' | 'held' | 'done';

export interface InboxItem {
  id: string;
  text: string;
  kind: InboxKind;
  track: string | null;
  state: InboxState;
  createdAt: string;
  resolvedAt: string | null;
  resolvedAs: string | null; // '업무' | '일정' | '프로젝트' | '처리'
  deletedAt: string | null;
}

export interface Track {
  id: string;
  name: string;
}

export interface Role {
  id: string;
  name: string;
}

export type ThemeMode = 'auto' | 'light' | 'dark';

export interface Settings {
  theme: ThemeMode;
  autoLightFrom: number; // hour
  autoLightTo: number; // hour
  tracks: Track[];
  roles: Role[];
  sawAreas: Role[];
  monthStartsOn: 0 | 1; // 월간 달력 시작 요일
  sundayLabel: string; // '주일' | '일요일'
  reviewReminders: boolean;
  dismissedReminders: string[];
}

/** A habit repeated on chosen weekdays; it shows up in each matching day automatically. */
export interface Routine {
  id: string;
  title: string;
  days: number[]; // 0 = 일 … 6 = 토
  time: string | null; // HH:MM, places it on the 24h timetable
  duration: number; // minutes
  track: string | null;
  memo: string;
  startDate: DateKey; // counts from this day
  endDate: DateKey | null; // 중단한 날 (inclusive); null = 진행 중
  order: number;
  createdAt: string;
  deletedAt: string | null;
}

/** 'done' = 했음, 'skipped' = 건너뜀 (쉬는 날, 달성률에서 제외). No entry = 안 함. */
export type RoutineMark = 'done' | 'skipped';

export interface PlannerData {
  tasks: Task[];
  events: PlanEvent[];
  goals: Goal[];
  projects: Project[];
  directions: Record<string, string>; // 'month:2026-11' | 'year:2026' → 이달/올해의 방향
  notes: Record<DateKey, string>; // 자유 노트
  compass: Record<DateKey, CompassWeek>;
  reviews: Record<string, Review>; // 'week:2026-11-09' | 'month:2026-11' | 'year:2026'
  mos: Record<string, MosTrack>; // track id → M/O/S
  inbox: InboxItem[];
  routines: Routine[];
  routineChecks: Record<string, RoutineMark>; // `${date}|${routineId}`
  settings: Settings;
}
