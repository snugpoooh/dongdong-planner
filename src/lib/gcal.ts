import { create } from 'zustand';
import { addDays, hhmm, toKey, todayKey, type DateKey } from './date';
import { supabase } from './supabase';
import { useStore } from '../store/store';
import type { GCalendar, Occurrence, PlanEvent } from '../store/types';

/** One expanded Google Calendar event instance. */
export interface GItem {
  id: string;
  cal: string;
  title: string;
  allDay: boolean;
  /** timed: epoch ms; all-day: date keys (end inclusive) */
  s: number;
  e: number;
  sd?: DateKey;
  ed?: DateKey;
  loc?: string;
  desc?: string;
}

export interface CalStatus {
  fetchedAt: number | null;
  error: string | null;
  count: number;
  feedName?: string;
}

interface GcalState {
  items: GItem[];
  status: Record<string, CalStatus>;
  loading: boolean;
  index: Record<DateKey, GSeg[]>;
}

/** The part of an item that falls on one day. */
export interface GSeg {
  item: GItem;
  date: DateKey;
  startMin: number | null; // null = all-day
  endMin: number | null;
  multiDay: boolean;
}

export const GCAL_CACHE_KEY = 'dongdong.gcal';
const STALE_MS = 10 * 60 * 1000;
const PAST_DAYS = 90;
const FUTURE_DAYS = 400;

export const CAL_COLORS = ['#3f6fd8', '#2e9a6b', '#d4793a', '#c0466b', '#7b5cc4', '#3a9db3'];

function loadCache(): Pick<GcalState, 'items' | 'status'> {
  try {
    const raw = localStorage.getItem(GCAL_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { items: [], status: {} };
}

const cached = loadCache();
export const useGcal = create<GcalState>(() => ({ ...cached, loading: false, index: buildIndex(cached.items) }));

function saveCache(items: GItem[], status: Record<string, CalStatus>) {
  try {
    localStorage.setItem(GCAL_CACHE_KEY, JSON.stringify({ items, status }));
  } catch {
    /* a very large calendar may not fit; it still shows until reload */
  }
}

export function clearGcalCache() {
  try {
    localStorage.removeItem(GCAL_CACHE_KEY);
  } catch {
    /* ignore */
  }
  useGcal.setState({ items: [], status: {}, index: {} });
}

// ---------------- parsing ----------------

type ICALModule = typeof import('ical.js').default;
type ICALTime = InstanceType<ICALModule['Time']>;

const dateKeyOf = (t: ICALTime) => `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;

/** Expand every event (repeats, moved and cancelled instances included) that touches [from, to]. */
export function expandIcs(ICAL: ICALModule, text: string, cal: string, from: Date, to: Date): { items: GItem[]; feedName?: string } {
  const root = new ICAL.Component(ICAL.parse(text));
  for (const tz of root.getAllSubcomponents('vtimezone')) {
    try {
      ICAL.TimezoneService.register(tz);
    } catch {
      /* already known */
    }
  }
  const feedName = (root.getFirstPropertyValue('x-wr-calname') as string | null) ?? undefined;
  const masters = new Map<string, InstanceType<ICALModule['Event']>>();
  const exceptions: InstanceType<ICALModule['Event']>[] = [];
  for (const ve of root.getAllSubcomponents('vevent')) {
    const ev = new ICAL.Event(ve);
    if (ev.isRecurrenceException()) exceptions.push(ev);
    else masters.set(ev.uid, ev);
  }
  for (const ex of exceptions) {
    const m = masters.get(ex.uid);
    if (m) m.relateException(ex);
    else masters.set(`${ex.uid}#${ex.recurrenceId?.toString()}`, ex);
  }

  const items: GItem[] = [];
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const push = (ev: InstanceType<ICALModule['Event']>, start: ICALTime, end: ICALTime | null) => {
    if ((ev.component.getFirstPropertyValue('status') as string | null)?.toUpperCase() === 'CANCELLED') return;
    const title = ev.summary?.trim() || '(제목 없음)';
    const loc = ev.location?.trim() || undefined;
    const desc = ev.description?.trim().slice(0, 600) || undefined;
    if (start.isDate) {
      const sd = dateKeyOf(start);
      const endExcl = end && end.compare(start) > 0 ? dateKeyOf(end) : addDays(sd, 1);
      const ed = addDays(endExcl, -1);
      if (ed < toKey(from) || sd > toKey(to)) return;
      items.push({ id: `${cal}:${ev.uid}:${sd}`, cal, title, allDay: true, s: 0, e: 0, sd, ed: ed < sd ? sd : ed, loc, desc });
      return;
    }
    const s = start.toJSDate().getTime();
    const e = end ? Math.max(end.toJSDate().getTime(), s) : s;
    if (e < fromMs || s > toMs) return;
    items.push({ id: `${cal}:${ev.uid}:${s}`, cal, title, allDay: false, s, e, loc, desc });
  };

  for (const ev of masters.values()) {
    try {
      if (!ev.isRecurring()) {
        push(ev, ev.startDate, ev.endDate);
        continue;
      }
      const it = ev.iterator();
      for (let n = 0, next = it.next(); next && n < 20000; n++, next = it.next()) {
        const d = ev.getOccurrenceDetails(next);
        if (d.startDate.toJSDate().getTime() > toMs) break;
        push(d.item, d.startDate, d.endDate);
      }
    } catch {
      /* skip a malformed event rather than the whole calendar */
    }
  }
  return { items, feedName };
}

function buildIndex(items: GItem[]): Record<DateKey, GSeg[]> {
  const idx: Record<DateKey, GSeg[]> = {};
  const add = (seg: GSeg) => (idx[seg.date] ??= []).push(seg);
  for (const item of items) {
    if (item.allDay && item.sd && item.ed) {
      for (let d = item.sd, i = 0; d <= item.ed && i < 400; d = addDays(d, 1), i++) add({ item, date: d, startMin: null, endMin: null, multiDay: item.sd !== item.ed });
      continue;
    }
    const s = new Date(item.s);
    const e = new Date(Math.max(item.e, item.s));
    const sd = toKey(s);
    const lastMoment = item.e > item.s ? new Date(item.e - 1) : s;
    const ed = toKey(lastMoment);
    for (let d = sd, i = 0; d <= ed && i < 60; d = addDays(d, 1), i++) {
      const startMin = d === sd ? s.getHours() * 60 + s.getMinutes() : 0;
      let endMin = d === ed ? (item.e > item.s ? lastMoment.getHours() * 60 + lastMoment.getMinutes() + 1 : startMin) : 24 * 60;
      if (d === ed && toKey(e) !== ed) endMin = 24 * 60; // ends exactly at midnight
      if (endMin <= startMin) endMin = Math.min(startMin + 15, 24 * 60);
      add({ item, date: d, startMin, endMin, multiDay: sd !== ed });
    }
  }
  for (const k of Object.keys(idx)) idx[k].sort((a, b) => (a.startMin ?? -1) - (b.startMin ?? -1));
  return idx;
}

// ---------------- fetching ----------------

let inflight: Promise<void> | null = null;

export function refreshCalendars(opts: { force?: boolean; only?: string } = {}): Promise<void> {
  if (inflight && !opts.force) return inflight;
  inflight = doRefresh(opts).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function fetchFeed(url: string): Promise<string> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  // The iCal address is a secret: send it in the body, never in the request URL.
  const r = await fetch('/api/ical', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ url }),
  });
  if (!r.ok) {
    let msg = `불러오지 못했습니다 (${r.status}).`;
    try {
      msg = ((await r.json()) as { error?: string }).error ?? msg;
    } catch {
      /* not json */
    }
    throw new Error(msg);
  }
  return r.text();
}

async function doRefresh({ force, only }: { force?: boolean; only?: string }) {
  const calendars = useStore.getState().settings.calendars ?? [];
  const state = useGcal.getState();
  const ids = new Set(calendars.map((c) => c.id));
  let items = state.items.filter((i) => ids.has(i.cal));
  const status: Record<string, CalStatus> = Object.fromEntries(Object.entries(state.status).filter(([k]) => ids.has(k)));
  const due = calendars.filter((c) => (!only || c.id === only) && (force || !status[c.id]?.fetchedAt || Date.now() - status[c.id].fetchedAt! > STALE_MS || status[c.id].error));
  if (!due.length) {
    if (items.length !== state.items.length) useGcal.setState({ items, status, index: buildIndex(items) });
    return;
  }
  useGcal.setState({ loading: true });
  const ICAL = (await import('ical.js')).default;
  const from = new Date(`${addDays(todayKey(), -PAST_DAYS)}T00:00:00`);
  const to = new Date(`${addDays(todayKey(), FUTURE_DAYS)}T23:59:59`);
  for (const c of due) {
    try {
      const text = await fetchFeed(c.url);
      const { items: got, feedName } = expandIcs(ICAL, text, c.id, from, to);
      items = [...items.filter((i) => i.cal !== c.id), ...got];
      status[c.id] = { fetchedAt: Date.now(), error: null, count: got.length, feedName };
    } catch (err) {
      status[c.id] = { ...(status[c.id] ?? { fetchedAt: null, count: 0 }), error: err instanceof Error ? err.message : String(err) };
    }
  }
  saveCache(items, status);
  useGcal.setState({ items, status, loading: false, index: buildIndex(items) });
}

// ---------------- reading ----------------

/** Google events on a day, shaped like planner occurrences (read-only, `ext` set). */
export function gcalOccurrencesOn(index: Record<DateKey, GSeg[]>, calendars: GCalendar[], date: DateKey): Occurrence[] {
  const segs = index[date];
  if (!segs?.length) return [];
  const byId = new Map(calendars.filter((c) => c.enabled).map((c) => [c.id, c]));
  const out: Occurrence[] = [];
  for (const seg of segs) {
    const cal = byId.get(seg.item.cal);
    if (!cal) continue;
    const allDay = seg.startMin == null;
    const event: PlanEvent = {
      id: `${seg.item.id}@${date}`,
      title: seg.item.title,
      startDate: date,
      endDate: null,
      allDay,
      startTime: allDay ? null : hhmm(seg.startMin!),
      endTime: allDay ? null : hhmm(seg.endMin!),
      track: null,
      repeat: 'none',
      memo: seg.item.desc ?? '',
      createdAt: '',
      deletedAt: null,
    };
    out.push({
      event,
      date,
      startMin: seg.startMin,
      endMin: seg.endMin,
      multiDay: seg.multiDay,
      ext: { cal: cal.id, calName: cal.name, color: cal.color, location: seg.item.loc, description: seg.item.desc, item: seg.item },
    });
  }
  return out;
}

export function useGcalOn(date: DateKey): Occurrence[] {
  const index = useGcal((s) => s.index);
  const calendars = useStore((s) => s.settings.calendars);
  return gcalOccurrencesOn(index, calendars ?? [], date);
}
