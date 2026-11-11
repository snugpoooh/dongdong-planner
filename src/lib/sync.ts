import { create } from 'zustand';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { DATA_SECTIONS, exportData, initialData, STORAGE_KEY, useStore } from '../store/store';
import { isEmptyPlanner, mergePlanner } from './merge';
import type { PlannerData } from '../store/types';

export type SyncStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'offline' | 'error';
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'recovery';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  sync: SyncStatus;
  /** true once this device holds the signed-in account's data (cache or first download). */
  ready: boolean;
  lastSyncedAt: string | null;
  set: (p: Partial<Omit<AuthState, 'set'>>) => void;
}

export const useAuth = create<AuthState>((set) => ({
  status: 'loading',
  session: null,
  sync: 'idle',
  ready: false,
  lastSyncedAt: null,
  set: (p) => set(p),
}));

const TABLE = 'planner_data';
const OWNER_KEY = 'dongdong.owner';
const metaKey = (uid: string) => `dongdong.sync:${uid}`;

interface Meta {
  rev: number;
  base: PlannerData | null;
  pending: boolean;
}

interface Engine extends Meta {
  uid: string;
  busy: boolean;
  again: boolean;
  dirty: number;
  timer?: number;
  retry?: number;
  poll?: number;
  channel?: RealtimeChannel;
  unsub?: () => void;
  onOnline?: () => void;
  onVisible?: () => void;
}

let eng: Engine | null = null;
let applying = false;

const status = (sync: SyncStatus) => useAuth.getState().set({ sync, ...(sync === 'saved' ? { lastSyncedAt: new Date().toISOString() } : {}) });

function apply(data: PlannerData) {
  applying = true;
  try {
    useStore.getState().replaceAll(data);
  } finally {
    applying = false;
  }
}

function readMeta(uid: string): Meta | null {
  try {
    const raw = localStorage.getItem(metaKey(uid));
    return raw ? (JSON.parse(raw) as Meta) : null;
  } catch {
    return null;
  }
}

function saveMeta() {
  if (!eng) return;
  try {
    localStorage.setItem(metaKey(eng.uid), JSON.stringify({ rev: eng.rev, base: eng.base, pending: eng.pending }));
  } catch {
    /* storage full: sync still works in memory */
  }
}

const SLICES = ['tasks', 'events', 'goals', 'projects', 'directions', 'notes', 'compass', 'reviews', 'mos', 'inbox', 'routines', 'routineChecks', 'settings'] as const;

function schedulePush(delay = 1200) {
  if (!eng) return;
  window.clearTimeout(eng.timer);
  eng.timer = window.setTimeout(() => void push(), delay);
}

function offlineOrError(retryIn = 15000) {
  if (!eng) return;
  status(navigator.onLine ? 'error' : 'offline');
  window.clearTimeout(eng.retry);
  eng.retry = window.setTimeout(() => (eng?.pending ? void push() : void pull()), retryIn);
}

/** Fetch the account copy and reconcile it with this device. */
async function pull(): Promise<void> {
  if (!supabase || !eng) return;
  const e = eng;
  const { data: row, error } = await supabase.from(TABLE).select('data, rev').eq('user_id', e.uid).maybeSingle();
  if (eng !== e) return;
  if (error) return offlineOrError();

  if (!row) {
    // First sign-in for this account: whatever is on this device becomes the account's planner.
    const local = exportData();
    const { error: insErr } = await supabase.from(TABLE).insert({ user_id: e.uid, data: local, rev: 1 });
    if (eng !== e) return;
    if (insErr) {
      if (insErr.code === '23505') return pull(); // another device created it first
      return offlineOrError();
    }
    Object.assign(e, { rev: 1, base: local, pending: false });
    saveMeta();
    useAuth.getState().set({ ready: true });
    status('saved');
    return;
  }

  const remote = row.data as PlannerData;
  if (row.rev === e.rev && e.base) {
    useAuth.getState().set({ ready: true });
    if (e.pending) schedulePush(0);
    else status('saved');
    return;
  }
  if (e.pending && e.base) {
    apply(mergePlanner(e.base, exportData(), remote));
    Object.assign(e, { rev: row.rev, base: remote });
    saveMeta();
    useAuth.getState().set({ ready: true });
    schedulePush(0);
    return;
  }
  apply(remote);
  Object.assign(e, { rev: row.rev, base: remote, pending: false });
  saveMeta();
  useAuth.getState().set({ ready: true });
  status('saved');
}

/** Save this device's planner to the account, guarded by the revision we last saw. */
async function push(): Promise<void> {
  if (!supabase || !eng || !eng.pending) return;
  const e = eng;
  if (e.busy) {
    e.again = true;
    return;
  }
  e.busy = true;
  status('saving');
  const data = exportData();
  const dirtyAtStart = e.dirty;
  const next = e.rev + 1;
  const { data: rows, error } = await supabase
    .from(TABLE)
    .update({ data, rev: next, updated_at: new Date().toISOString() })
    .eq('user_id', e.uid)
    .eq('rev', e.rev)
    .select('rev');
  e.busy = false;
  if (eng !== e) return;
  if (error) return offlineOrError();
  if (!rows?.length) {
    // Another device saved in between: merge its copy with ours, then save again.
    await pull();
    return;
  }
  e.rev = next;
  e.base = data;
  if (e.dirty === dirtyAtStart) e.pending = false;
  saveMeta();
  if (e.pending || e.again) {
    e.again = false;
    schedulePush(300);
  } else status('saved');
}

export async function startSync(uid: string) {
  if (!supabase || eng?.uid === uid) return;
  stopSync();
  const owner = localStorage.getItem(OWNER_KEY);
  let meta = readMeta(uid);
  if (owner && owner !== uid) {
    // This device last held another account's planner: never show it to this account.
    apply(initialData());
    meta = null;
  } else if (!owner && !meta && !isEmptyPlanner(exportData())) {
    // Records made on this device before accounts existed: fold them into the account.
    meta = { rev: 0, base: initialData(), pending: true };
  }
  if (meta?.base && !cacheIsComplete()) {
    // The device copy was last written by an older version (it lacks sections this version has):
    // don't trust it; take the account copy instead.
    meta = { rev: 0, base: null, pending: false };
  }
  try {
    localStorage.setItem(OWNER_KEY, uid);
  } catch {
    /* ignore */
  }
  eng = { uid, rev: meta?.rev ?? 0, base: meta?.base ?? null, pending: meta?.pending ?? false, busy: false, again: false, dirty: 0 };
  const e = eng;
  useAuth.getState().set({ ready: !!meta?.base && owner === uid, sync: 'loading' });

  e.unsub = useStore.subscribe((s, prev) => {
    if (applying || eng !== e) return;
    if (!SLICES.some((k) => s[k] !== prev[k])) return;
    e.pending = true;
    e.dirty++;
    saveMeta();
    status('saving');
    schedulePush();
  });

  e.channel = supabase
    .channel(`planner:${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${uid}` }, (payload) => {
      const rev = (payload.new as { rev?: number } | null)?.rev;
      if (eng === e && rev && rev > e.rev && !e.busy) void pull();
    })
    .subscribe();

  e.onOnline = () => (e.pending ? void push() : void pull());
  e.onVisible = () => {
    if (document.visibilityState === 'visible') void (e.pending ? push() : pull());
  };
  window.addEventListener('online', e.onOnline);
  document.addEventListener('visibilitychange', e.onVisible);
  e.poll = window.setInterval(() => {
    if (document.visibilityState === 'visible' && !e.busy) void (e.pending ? push() : pull());
  }, 60000);

  await pull();
  void verifyAccount(e);
}

/**
 * A stored session can outlive its account (deleted elsewhere, revoked). Ask the server once;
 * if it no longer knows this user, sign out instead of showing a stale planner with sync errors.
 * Network failures are ignored so offline use keeps working.
 */
async function verifyAccount(e: Engine) {
  if (!supabase) return;
  const { error } = await supabase.auth.getUser();
  if (!error || eng !== e) return;
  const status = (error as { status?: number }).status;
  if (status === 401 || status === 403 || /not exist|not found|invalid (jwt|token)|session/i.test(error.message)) {
    await signOutAndClear();
  }
}

function cacheIsComplete(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const state = (JSON.parse(raw) as { state?: Record<string, unknown> }).state ?? {};
    return DATA_SECTIONS.every((k) => k in state);
  } catch {
    return false;
  }
}

export function stopSync() {
  if (!eng) return;
  const e = eng;
  eng = null;
  window.clearTimeout(e.timer);
  window.clearTimeout(e.retry);
  window.clearInterval(e.poll);
  e.unsub?.();
  if (e.channel) void supabase?.removeChannel(e.channel);
  if (e.onOnline) window.removeEventListener('online', e.onOnline);
  if (e.onVisible) document.removeEventListener('visibilitychange', e.onVisible);
}

export function hasUnsyncedChanges() {
  return !!eng?.pending;
}

/** Try to save pending edits right now (used before signing out). */
export async function flushSync(): Promise<boolean> {
  if (!eng) return true;
  window.clearTimeout(eng.timer);
  for (let i = 0; i < 3 && eng?.pending; i++) await push();
  return !eng?.pending;
}

/** Sign out and remove this account's planner from the device. */
export async function signOutAndClear() {
  const uid = eng?.uid;
  stopSync();
  apply(initialData());
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('folio-planner-v1'); // pre-rename cache
    localStorage.removeItem(OWNER_KEY);
    if (uid) localStorage.removeItem(metaKey(uid));
  } catch {
    /* ignore */
  }
  useAuth.getState().set({ ready: false, sync: 'idle', lastSyncedAt: null });
  await supabase?.auth.signOut();
}

/** Manually retry after an offline/error state. */
export function retrySync() {
  if (eng) void (eng.pending ? push() : pull());
}
