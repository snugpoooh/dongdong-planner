import type { PlannerData } from '../store/types';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type WithId = { id: string };

/**
 * Three-way merge of id-keyed lists. Items changed on this device since the last sync win;
 * otherwise the server's copy wins. New items from either side are kept, and an item removed
 * on one side stays removed unless the other side changed it.
 */
function mergeList<T extends WithId>(base: T[], local: T[], remote: T[]): T[] {
  const B = new Map(base.map((x) => [x.id, x]));
  const L = new Map(local.map((x) => [x.id, x]));
  const R = new Map(remote.map((x) => [x.id, x]));
  const out: T[] = [];
  const seen = new Set<string>();
  const decide = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const b = B.get(id);
    const l = L.get(id);
    const r = R.get(id);
    if (l && r) out.push(b && same(l, b) ? r : l);
    else if (l && !r) {
      if (!b || !same(l, b)) out.push(l); // new here, or edited here after the server removed it
    } else if (!l && r) {
      if (!b || !same(r, b)) out.push(r); // new on the server, or edited there after we removed it
    }
  };
  remote.forEach((x) => decide(x.id));
  local.forEach((x) => decide(x.id));
  return out;
}

function mergeRecord<V>(base: Record<string, V>, local: Record<string, V>, remote: Record<string, V>): Record<string, V> {
  const out: Record<string, V> = {};
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  for (const k of keys) {
    const b = base[k];
    const l = local[k];
    const r = remote[k];
    const inL = k in local;
    const inR = k in remote;
    if (inL && inR) out[k] = b !== undefined && same(l, b) ? r : l;
    else if (inL) {
      if (!(k in base) || !same(l, b)) out[k] = l;
    } else if (inR) {
      if (!(k in base) || !same(r, b)) out[k] = r;
    }
  }
  return out;
}

export function mergePlanner(base: PlannerData, local: PlannerData, remote: PlannerData): PlannerData {
  return {
    tasks: mergeList(base.tasks ?? [], local.tasks ?? [], remote.tasks ?? []),
    events: mergeList(base.events ?? [], local.events ?? [], remote.events ?? []),
    goals: mergeList(base.goals ?? [], local.goals ?? [], remote.goals ?? []),
    projects: mergeList(base.projects ?? [], local.projects ?? [], remote.projects ?? []),
    inbox: mergeList(base.inbox ?? [], local.inbox ?? [], remote.inbox ?? []),
    routines: mergeList(base.routines ?? [], local.routines ?? [], remote.routines ?? []),
    routineChecks: mergeRecord(base.routineChecks ?? {}, local.routineChecks ?? {}, remote.routineChecks ?? {}),
    directions: mergeRecord(base.directions ?? {}, local.directions ?? {}, remote.directions ?? {}),
    notes: mergeRecord(base.notes ?? {}, local.notes ?? {}, remote.notes ?? {}),
    compass: mergeRecord(base.compass ?? {}, local.compass ?? {}, remote.compass ?? {}),
    reviews: mergeRecord(base.reviews ?? {}, local.reviews ?? {}, remote.reviews ?? {}),
    mos: mergeRecord(base.mos ?? {}, local.mos ?? {}, remote.mos ?? {}),
    settings: same(local.settings, base.settings) ? remote.settings : local.settings,
  };
}

export function isEmptyPlanner(d: PlannerData): boolean {
  return (
    !d.tasks?.length &&
    !d.events?.length &&
    !d.goals?.length &&
    !d.projects?.length &&
    !d.inbox?.length &&
    !d.routines?.length &&
    !Object.values(d.notes ?? {}).some((v) => v?.trim()) &&
    !Object.keys(d.compass ?? {}).length &&
    !Object.keys(d.reviews ?? {}).length &&
    !Object.keys(d.mos ?? {}).length &&
    !Object.values(d.directions ?? {}).some((v) => v?.trim())
  );
}
