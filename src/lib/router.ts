import { useSyncExternalStore } from 'react';

export type RouteName =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'routines'
  | 'compass'
  | 'mos'
  | 'projects'
  | 'delegation'
  | 'review'
  | 'notes'
  | 'trash'
  | 'settings';

export interface Route {
  name: RouteName;
  params: string[];
  query: URLSearchParams;
}

const NAMES: RouteName[] = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'routines',
  'compass',
  'mos',
  'projects',
  'delegation',
  'review',
  'notes',
  'trash',
  'settings',
];

function parse(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const name = (NAMES as string[]).includes(parts[0]) ? (parts[0] as RouteName) : 'daily';
  return { name, params: name === parts[0] ? parts.slice(1) : [], query: new URLSearchParams(qs ?? '') };
}

let current = parse(window.location.hash);
const listeners = new Set<() => void>();

window.addEventListener('hashchange', () => {
  current = parse(window.location.hash);
  listeners.forEach((l) => l());
  const main = document.querySelector('.main-scroll');
  if (main) main.scrollTop = 0;
});

export function useRoute(): Route {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

export function go(path: string) {
  const target = path.startsWith('#') ? path : `#/${path.replace(/^\//, '')}`;
  if (window.location.hash === target) return;
  window.location.hash = target;
}

export function href(path: string) {
  return `#/${path.replace(/^\//, '')}`;
}
