import { useEffect, useRef, useState } from 'react';
import { nowMinutes, todayKey } from './date';
import { useStore } from '../store/store';
import type { ThemeMode } from '../store/types';

/** Re-renders every `ms` milliseconds aligned to the minute; returns current minutes since midnight. */
export function useNowMinutes(): number {
  const [now, setNow] = useState(nowMinutes());
  useEffect(() => {
    let timer: number;
    const tick = () => {
      setNow(nowMinutes());
      const d = new Date();
      timer = window.setTimeout(tick, (60 - d.getSeconds()) * 1000 + 50);
    };
    const d = new Date();
    timer = window.setTimeout(tick, (60 - d.getSeconds()) * 1000 + 50);
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

/** Today's date key, refreshed when the day rolls over. */
export function useToday(): string {
  const mins = useNowMinutes();
  const [today, setToday] = useState(todayKey());
  useEffect(() => {
    const t = todayKey();
    if (t !== today) setToday(t);
  }, [mins, today]);
  return today;
}

export function effectiveTheme(mode: ThemeMode, from: number, to: number): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode;
  const h = new Date().getHours();
  return h >= from && h < to ? 'light' : 'dark';
}

/** Applies data-theme on <html>; 'auto' follows the time of day. */
export function useThemeSync() {
  const { theme, autoLightFrom, autoLightTo } = useStore((s) => s.settings);
  const mins = useNowMinutes();
  useEffect(() => {
    const eff = effectiveTheme(theme, autoLightFrom, autoLightTo);
    document.documentElement.dataset.theme = eff;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', eff === 'dark' ? '#1d1d1d' : '#f5f3ee');
  }, [theme, autoLightFrom, autoLightTo, mins]);
}

/** Debounced text field bound to a store value (auto-save). */
export function useDraft(value: string, save: (v: string) => void, delay = 400) {
  const [draft, setDraft] = useState(value);
  const dirty = useRef(false);
  const latest = useRef(value);
  const timer = useRef<number>();
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!dirty.current) {
      setDraft(value);
      latest.current = value;
    }
  }, [value]);
  const flush = () => {
    if (dirty.current) {
      window.clearTimeout(timer.current);
      saveRef.current(latest.current);
      dirty.current = false;
    }
  };
  // Save pending edits when the field unmounts (e.g. navigating to another day).
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const update = (v: string) => {
    dirty.current = true;
    latest.current = v;
    setDraft(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, delay);
  };
  return [draft, update, flush] as const;
}

export function useMediaQuery(q: string) {
  const [match, setMatch] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mql = window.matchMedia(q);
    const on = () => setMatch(mql.matches);
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, [q]);
  return match;
}
