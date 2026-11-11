import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CompassWeek,
  Goal,
  InboxItem,
  MosContent,
  MosTrack,
  PlanEvent,
  PlannerData,
  Project,
  Review,
  Routine,
  RoutineMark,
  Settings,
  Task,
  TaskStatus,
} from './types';
import { uid } from '../lib/id';
import { toKey } from '../lib/date';

const nowIso = () => new Date().toISOString();

export const STORAGE_KEY = 'dongdong-planner-v1';
const LEGACY_STORAGE_KEY = 'folio-planner-v1';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  autoLightFrom: 7,
  autoLightTo: 19,
  tracks: [
    { id: 'personal', name: 'Personal' },
    { id: 'work', name: 'Work' },
  ],
  roles: [
    { id: 'r-self', name: '나 자신' },
    { id: 'r-partner', name: '배우자' },
    { id: 'r-parent', name: '부모' },
    { id: 'r-work', name: '직업인' },
    { id: 'r-friend', name: '친구 · 이웃' },
  ],
  sawAreas: [
    { id: 'physical', name: '신체적' },
    { id: 'social', name: '사회적 / 감정적' },
    { id: 'mental', name: '정신적' },
    { id: 'spiritual', name: '영적' },
  ],
  monthStartsOn: 0,
  sundayLabel: '주일',
  reviewReminders: true,
  dismissedReminders: [],
};

export const emptyMos = (): MosContent => ({ mission: '', objectives: [], strategies: [] });
const emptyMosTrack = (): MosTrack => ({ draft: emptyMos(), draftUpdatedAt: null, versions: [] });
const emptyReview = (): Review => ({ answers: ['', '', ''], completedAt: null, updatedAt: null });

export function initialData(): PlannerData {
  return {
    tasks: [],
    events: [],
    goals: [],
    projects: [],
    directions: {},
    notes: {},
    compass: {},
    reviews: {},
    mos: {},
    inbox: [],
    routines: [],
    routineChecks: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function newTask(partial: Partial<Task> = {}): Task {
  const t = nowIso();
  return {
    id: uid(),
    title: '',
    memo: '',
    status: 'todo',
    q: 0,
    group: '',
    order: Date.now(),
    track: null,
    date: null,
    weekKey: null,
    monthKey: null,
    yearKey: null,
    goalId: null,
    projectId: null,
    predecessorId: null,
    delegateTo: null,
    checkDate: null,
    deferredTo: null,
    deferredFrom: null,
    history: [],
    createdAt: t,
    updatedAt: t,
    deletedAt: null,
    ...partial,
  };
}

export function newEvent(partial: Partial<PlanEvent> = {}): PlanEvent {
  return {
    id: uid(),
    title: '',
    startDate: '',
    endDate: null,
    allDay: false,
    startTime: '09:00',
    endTime: '10:00',
    track: null,
    repeat: 'none',
    memo: '',
    createdAt: nowIso(),
    deletedAt: null,
    ...partial,
  };
}

export function newGoal(partial: Partial<Goal> & Pick<Goal, 'scope' | 'period'>): Goal {
  return {
    id: uid(),
    title: '',
    track: null,
    result: '',
    done: false,
    milestones: [],
    changes: [],
    carriedFrom: null,
    order: Date.now(),
    createdAt: nowIso(),
    deletedAt: null,
    ...partial,
  };
}

export type TrashKind = 'task' | 'event' | 'goal' | 'project' | 'inbox' | 'routine';

export interface StatusOptions {
  deferTo?: string | null;
  delegateTo?: string | null;
  checkDate?: string | null;
  note?: string;
}

interface Actions {
  // tasks
  addTask: (partial: Partial<Task>) => string;
  addTasksFromText: (text: string, defaults: Partial<Task>) => string[];
  updateTask: (id: string, patch: Partial<Task>) => void;
  setStatus: (id: string, status: TaskStatus, opts?: StatusOptions) => void;
  moveTask: (id: string, dir: -1 | 1, siblings: string[]) => void;
  deleteTask: (id: string) => void;
  // events
  addEvent: (partial: Partial<PlanEvent>) => string;
  updateEvent: (id: string, patch: Partial<PlanEvent>) => void;
  deleteEvent: (id: string) => void;
  // goals
  addGoal: (g: Partial<Goal> & Pick<Goal, 'scope' | 'period'>) => string;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  carryGoals: (ids: string[], toPeriod: string) => void;
  setDirection: (key: string, text: string) => void;
  // projects
  addProject: (p: Partial<Project>) => string;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  // notes / compass / reviews
  setNote: (date: string, text: string) => void;
  setCompass: (weekKey: string, kind: keyof CompassWeek, id: string, text: string) => void;
  setReviewAnswer: (key: string, idx: 0 | 1 | 2, text: string) => void;
  setReviewDone: (key: string, done: boolean) => void;
  // M/O/S
  updateMosDraft: (track: string, patch: Partial<MosContent>) => void;
  confirmMos: (track: string, label: string) => void;
  restoreMos: (track: string, versionId: string) => void;
  // inbox
  addInbox: (item: Pick<InboxItem, 'text' | 'kind' | 'track'>) => void;
  updateInbox: (id: string, patch: Partial<InboxItem>) => void;
  resolveInbox: (id: string, as: string) => void;
  deleteInbox: (id: string) => void;
  // routines
  addRoutine: (r: Partial<Routine>) => string;
  updateRoutine: (id: string, patch: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;
  moveRoutine: (id: string, dir: -1 | 1) => void;
  setRoutineMark: (date: string, id: string, mark: RoutineMark | null) => void;
  // settings
  updateSettings: (patch: Partial<Settings>) => void;
  // trash
  restore: (kind: TrashKind, id: string) => void;
  purge: (kind: TrashKind, id: string) => void;
  emptyTrash: () => void;
  // backup
  replaceAll: (data: PlannerData) => void;
}

export type Store = PlannerData & Actions;

const COLLECTION: Record<TrashKind, 'tasks' | 'events' | 'goals' | 'projects' | 'inbox' | 'routines'> = {
  task: 'tasks',
  event: 'events',
  goal: 'goals',
  project: 'projects',
  inbox: 'inbox',
  routine: 'routines',
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialData(),

      addTask: (partial) => {
        const t = newTask(partial);
        set((s) => ({ tasks: [...s.tasks, t] }));
        return t.id;
      },

      addTasksFromText: (text, defaults) => {
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.replace(/^\s*(?:[-*•·]|\d+[.)]|\[\s?\])\s+/, '').trim())
          .filter(Boolean);
        const base = Date.now();
        const created = lines.map((title, i) => newTask({ ...defaults, title, order: base + i }));
        set((s) => ({ tasks: [...s.tasks, ...created] }));
        return created.map((t) => t.id);
      },

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: nowIso() } : t)),
        })),

      setStatus: (id, status, opts = {}) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;
        const change = { at: nowIso(), from: task.status, to: status, note: opts.note };
        const patch: Partial<Task> = { status, history: [...task.history, change], updatedAt: nowIso() };
        const extra: Task[] = [];
        if (status === 'delegated') {
          patch.delegateTo = opts.delegateTo ?? task.delegateTo;
          patch.checkDate = opts.checkDate ?? task.checkDate;
        }
        if (status === 'deferred') {
          patch.deferredTo = opts.deferTo ?? null;
          // Franklin style: the original stays on its day marked →, a fresh copy lands on the new day.
          if (opts.deferTo && opts.deferTo !== task.date) {
            extra.push(
              newTask({
                ...task,
                id: uid(),
                status: 'todo',
                date: opts.deferTo,
                deferredTo: null,
                deferredFrom: task.id,
                delegateTo: null,
                checkDate: null,
                history: [{ at: nowIso(), from: 'deferred', to: 'todo', note: `${task.date ?? ''}에서 연기됨` }],
                order: Date.now(),
                createdAt: nowIso(),
                updatedAt: nowIso(),
                deletedAt: null,
              }),
            );
          }
        }
        set((s) => ({
          tasks: [...s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)), ...extra],
        }));
      },

      moveTask: (id, dir, siblings) => {
        const idx = siblings.indexOf(id);
        const swapWith = siblings[idx + dir];
        if (idx < 0 || !swapWith) return;
        const tasks = get().tasks;
        const a = tasks.find((t) => t.id === id);
        const b = tasks.find((t) => t.id === swapWith);
        if (!a || !b) return;
        let ao = a.order;
        let bo = b.order;
        if (ao === bo) bo = ao + dir;
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, order: bo } : t.id === b.id ? { ...t, order: ao } : t)),
        }));
      },

      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, deletedAt: nowIso() } : t)) })),

      addEvent: (partial) => {
        const e = newEvent(partial);
        set((s) => ({ events: [...s.events, e] }));
        return e.id;
      },
      updateEvent: (id, patch) =>
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteEvent: (id) =>
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, deletedAt: nowIso() } : e)) })),

      addGoal: (g) => {
        const goal = newGoal(g);
        set((s) => ({ goals: [...s.goals, goal] }));
        return goal.id;
      },
      updateGoal: (id, patch) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      deleteGoal: (id) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, deletedAt: nowIso() } : g)) })),
      carryGoals: (ids, toPeriod) => {
        const src = get().goals.filter((g) => ids.includes(g.id));
        const base = Date.now();
        const copies = src.map((g, i) =>
          newGoal({
            scope: g.scope,
            period: toPeriod,
            title: g.title,
            track: g.track,
            milestones: g.milestones.map((m) => ({ ...m, id: uid() })),
            changes: [],
            carriedFrom: g.id,
            order: base + i,
          }),
        );
        set((s) => ({ goals: [...s.goals, ...copies] }));
      },
      setDirection: (key, text) => set((s) => ({ directions: { ...s.directions, [key]: text } })),

      addProject: (p) => {
        const project: Project = {
          id: uid(),
          title: '',
          track: null,
          deadline: null,
          memo: '',
          order: Date.now(),
          createdAt: nowIso(),
          deletedAt: null,
          ...p,
        };
        set((s) => ({ projects: [...s.projects, project] }));
        return project.id;
      },
      updateProject: (id, patch) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deleteProject: (id) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, deletedAt: nowIso() } : p)) })),

      setNote: (date, text) => set((s) => ({ notes: { ...s.notes, [date]: text } })),

      setCompass: (weekKey, kind, id, text) =>
        set((s) => {
          const week = s.compass[weekKey] ?? { saw: {}, rocks: {} };
          return { compass: { ...s.compass, [weekKey]: { ...week, [kind]: { ...week[kind], [id]: text } } } };
        }),

      setReviewAnswer: (key, idx, text) =>
        set((s) => {
          const r = s.reviews[key] ?? emptyReview();
          const answers = [...r.answers] as Review['answers'];
          answers[idx] = text;
          return { reviews: { ...s.reviews, [key]: { ...r, answers, updatedAt: nowIso() } } };
        }),
      setReviewDone: (key, done) =>
        set((s) => {
          const r = s.reviews[key] ?? emptyReview();
          return { reviews: { ...s.reviews, [key]: { ...r, completedAt: done ? nowIso() : null } } };
        }),

      updateMosDraft: (track, patch) =>
        set((s) => {
          const m = s.mos[track] ?? emptyMosTrack();
          return { mos: { ...s.mos, [track]: { ...m, draft: { ...m.draft, ...patch }, draftUpdatedAt: nowIso() } } };
        }),
      confirmMos: (track, label) =>
        set((s) => {
          const m = s.mos[track] ?? emptyMosTrack();
          const version = {
            id: uid(),
            label: label || `v${m.versions.length + 1}`,
            confirmedAt: nowIso(),
            content: JSON.parse(JSON.stringify(m.draft)) as MosContent,
          };
          return { mos: { ...s.mos, [track]: { ...m, versions: [version, ...m.versions] } } };
        }),
      restoreMos: (track, versionId) =>
        set((s) => {
          const m = s.mos[track] ?? emptyMosTrack();
          const v = m.versions.find((x) => x.id === versionId);
          if (!v) return {};
          return {
            mos: {
              ...s.mos,
              [track]: { ...m, draft: JSON.parse(JSON.stringify(v.content)), draftUpdatedAt: nowIso() },
            },
          };
        }),

      addInbox: (item) =>
        set((s) => ({
          inbox: [
            {
              id: uid(),
              state: 'inbox',
              createdAt: nowIso(),
              resolvedAt: null,
              resolvedAs: null,
              deletedAt: null,
              ...item,
            },
            ...s.inbox,
          ],
        })),
      updateInbox: (id, patch) =>
        set((s) => ({ inbox: s.inbox.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      resolveInbox: (id, as) =>
        set((s) => ({
          inbox: s.inbox.map((i) => (i.id === id ? { ...i, state: 'done', resolvedAt: nowIso(), resolvedAs: as } : i)),
        })),
      deleteInbox: (id) =>
        set((s) => ({ inbox: s.inbox.map((i) => (i.id === id ? { ...i, deletedAt: nowIso() } : i)) })),

      addRoutine: (r) => {
        const routine: Routine = {
          id: uid(),
          title: '',
          days: [0, 1, 2, 3, 4, 5, 6],
          time: null,
          duration: 30,
          track: null,
          memo: '',
          startDate: toKey(new Date()),
          endDate: null,
          order: Date.now(),
          createdAt: nowIso(),
          deletedAt: null,
          ...r,
        };
        set((s) => ({ routines: [...s.routines, routine] }));
        return routine.id;
      },
      updateRoutine: (id, patch) => set((s) => ({ routines: s.routines.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRoutine: (id) => set((s) => ({ routines: s.routines.map((r) => (r.id === id ? { ...r, deletedAt: nowIso() } : r)) })),
      moveRoutine: (id, dir) =>
        set((s) => {
          const list = s.routines.filter((r) => !r.deletedAt).sort((a, b) => a.order - b.order);
          const i = list.findIndex((r) => r.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= list.length) return {};
          const a = list[i];
          const b = list[j];
          return { routines: s.routines.map((r) => (r.id === a.id ? { ...r, order: b.order } : r.id === b.id ? { ...r, order: a.order } : r)) };
        }),
      setRoutineMark: (date, id, mark) =>
        set((s) => {
          const key = `${date}|${id}`;
          const next = { ...s.routineChecks };
          if (mark) next[key] = mark;
          else delete next[key];
          return { routineChecks: next };
        }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      restore: (kind, id) =>
        set((s) => {
          const key = COLLECTION[kind];
          const list = s[key] as Array<{ id: string; deletedAt: string | null }>;
          return { [key]: list.map((x) => (x.id === id ? { ...x, deletedAt: null } : x)) } as Partial<Store>;
        }),
      purge: (kind, id) =>
        set((s) => {
          const key = COLLECTION[kind];
          const list = s[key] as Array<{ id: string }>;
          return { [key]: list.filter((x) => x.id !== id) } as Partial<Store>;
        }),
      emptyTrash: () =>
        set((s) => ({
          tasks: s.tasks.filter((x) => !x.deletedAt),
          events: s.events.filter((x) => !x.deletedAt),
          goals: s.goals.filter((x) => !x.deletedAt),
          projects: s.projects.filter((x) => !x.deletedAt),
          inbox: s.inbox.filter((x) => !x.deletedAt),
          routines: s.routines.filter((x) => !x.deletedAt),
        })),

      replaceAll: (data) => set(() => ({ ...initialData(), ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings } })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      // Read the pre-rename key once so earlier records carry over.
      storage: createJSONStorage(() => ({
        getItem: (name) => localStorage.getItem(name) ?? localStorage.getItem(LEGACY_STORAGE_KEY),
        setItem: (name, value) => localStorage.setItem(name, value),
        removeItem: (name) => localStorage.removeItem(name),
      })),
      partialize: (s) => dataOf(s),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PlannerData>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } };
      },
    },
  ),
);

/**
 * Every data section in the store (anything that isn't an action). Sections this version doesn't
 * know about (written by a newer version on another device) are carried along instead of dropped.
 */
export function dataOf(s: Store): PlannerData {
  return Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'function')) as unknown as PlannerData;
}

export function exportData(): PlannerData {
  return dataOf(useStore.getState());
}

/** Sections every saved copy of this version must contain. */
export const DATA_SECTIONS = Object.keys(initialData()) as (keyof PlannerData)[];

export function emptyMosTrackFor(): MosTrack {
  return emptyMosTrack();
}

export function reviewOf(reviews: Record<string, Review>, key: string): Review {
  return reviews[key] ?? emptyReview();
}
