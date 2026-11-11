import { create } from 'zustand';
import type { PlanEvent, Task } from './types';

export type PrintKind = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface UiState {
  taskModal: { id?: string; defaults?: Partial<Task> } | null;
  eventModal: { id?: string; defaults?: Partial<PlanEvent>; occurrenceDate?: string } | null;
  statusFor: string | null;
  inboxOpen: boolean;
  searchOpen: boolean;
  print: { kind: PrintKind; start: string; end: string; stage: 'setup' | 'preview' } | null;
  triage: { date: string; onlyUnsorted: boolean } | null;
  goalModal: string | null;
  dayModal: string | null;
  carry: { scope: 'month' | 'year'; from: string; to: string } | null;
  navOpen: boolean;
  toast: string | null;
  set: (patch: Partial<Omit<UiState, 'set' | 'notify'>>) => void;
  notify: (msg: string) => void;
}

let toastTimer: number | undefined;

export const useUi = create<UiState>((set) => ({
  taskModal: null,
  eventModal: null,
  statusFor: null,
  inboxOpen: false,
  searchOpen: false,
  print: null,
  triage: null,
  goalModal: null,
  dayModal: null,
  carry: null,
  navOpen: false,
  toast: null,
  set: (patch) => set(patch),
  notify: (msg) => {
    window.clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = window.setTimeout(() => set({ toast: null }), 2400);
  },
}));

export const openTask = (defaults?: Partial<Task>, id?: string) => useUi.getState().set({ taskModal: { id, defaults } });
export const openEvent = (defaults?: Partial<PlanEvent>, id?: string, occurrenceDate?: string) =>
  useUi.getState().set({ eventModal: { id, defaults, occurrenceDate } });
export const openStatus = (id: string) => useUi.getState().set({ statusFor: id });
