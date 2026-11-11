import { useMemo, type ReactNode } from 'react';
import {
  Briefcase,
  CalendarDays,
  CalendarRange,
  Calendar,
  Check,
  CloudOff,
  RefreshCw,
  Repeat,
  UserRound,
  TriangleAlert,
  CircleCheck,
  ClipboardCheck,
  Compass,
  Download,
  Inbox,
  Layers,
  LayoutList,
  Menu,
  Monitor,
  Moon,
  NotebookText,
  Search,
  Settings as SettingsIcon,
  Sun,
  Trash2,
} from 'lucide-react';
import { LogoMark } from './Logo';
import { useStore } from '../store/store';
import { useUi } from '../store/ui';
import { go, useRoute, type RouteName } from '../lib/router';
import { addDays, todayKey, weekStart } from '../lib/date';
import { retrySync, useAuth } from '../lib/sync';
import type { ThemeMode } from '../store/types';

interface NavDef {
  route: RouteName;
  label: string;
  icon: ReactNode;
  path: () => string;
}

const SECTIONS: { title: string; items: NavDef[] }[] = [
  {
    title: 'Foundation',
    items: [
      { route: 'mos', label: 'M/O/S', icon: <Layers />, path: () => 'mos' },
      { route: 'compass', label: 'Weekly Compass', icon: <Compass />, path: () => `compass/${weekStart(todayKey())}` },
    ],
  },
  {
    title: 'Planner',
    items: [
      { route: 'daily', label: 'Daily', icon: <LayoutList />, path: () => `daily/${todayKey()}` },
      { route: 'weekly', label: 'Weekly', icon: <CalendarRange />, path: () => `weekly/${weekStart(todayKey())}` },
      { route: 'monthly', label: 'Monthly', icon: <Calendar />, path: () => `monthly/${todayKey().slice(0, 7)}` },
      { route: 'yearly', label: 'Yearly', icon: <CalendarDays />, path: () => `yearly/${todayKey().slice(0, 4)}` },
      { route: 'routines', label: '루틴', icon: <Repeat />, path: () => 'routines' },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { route: 'projects', label: '프로젝트', icon: <Briefcase />, path: () => 'projects' },
      { route: 'delegation', label: '위임한 일', icon: <CircleCheck />, path: () => 'delegation' },
      { route: 'review', label: 'Review', icon: <ClipboardCheck />, path: () => 'review' },
      { route: 'notes', label: '노트 검색', icon: <NotebookText />, path: () => 'notes' },
    ],
  },
];

export const ROUTE_LABEL: Record<RouteName, [string, string]> = {
  mos: ['Foundation', 'M/O/S'],
  compass: ['Foundation', 'Weekly Compass'],
  daily: ['Planner', 'Daily'],
  weekly: ['Planner', 'Weekly'],
  monthly: ['Planner', 'Monthly'],
  yearly: ['Planner', 'Yearly'],
  routines: ['Planner', '루틴'],
  projects: ['Workspace', '프로젝트'],
  delegation: ['Workspace', '위임한 일'],
  review: ['Workspace', 'Review'],
  notes: ['Workspace', '노트 검색'],
  trash: ['Workspace', '휴지통'],
  settings: ['Workspace', '설정'],
};

export function Sidebar() {
  const route = useRoute();
  const setUi = useUi((s) => s.set);
  const tasks = useStore((s) => s.tasks);
  const theme = useStore((s) => s.settings.theme);
  const updateSettings = useStore((s) => s.updateSettings);
  const trashCount = useStore(
    (s) =>
      s.tasks.filter((x) => x.deletedAt).length +
      s.events.filter((x) => x.deletedAt).length +
      s.goals.filter((x) => x.deletedAt).length +
      s.projects.filter((x) => x.deletedAt).length +
      s.inbox.filter((x) => x.deletedAt).length +
      s.routines.filter((x) => x.deletedAt).length,
  );
  const delegatedCount = useMemo(() => tasks.filter((t) => !t.deletedAt && t.status === 'delegated').length, [tasks]);
  const navTo = (p: string) => {
    go(p);
    setUi({ navOpen: false });
  };
  const themes: { mode: ThemeMode; icon: ReactNode; label: string }[] = [
    { mode: 'auto', icon: <Monitor />, label: '자동 (시간대에 따라)' },
    { mode: 'light', icon: <Sun />, label: '라이트' },
    { mode: 'dark', icon: <Moon />, label: '다크' },
  ];
  return (
    <aside className="sidebar" aria-label="메뉴">
      <button className="brand" onClick={() => navTo(`daily/${todayKey()}`)} style={{ textAlign: 'left' }}>
        <LogoMark />
        <div>
          <div className="brand-name">DongDong</div>
          <div className="brand-sub">DIGITAL PLANNER</div>
        </div>
      </button>
      {SECTIONS.map((sec) => (
        <nav key={sec.title}>
          <div className="nav-section">{sec.title}</div>
          {sec.items.map((it) => (
            <button
              key={it.route}
              className={`nav-item ${route.name === it.route ? 'active' : ''}`}
              onClick={() => navTo(it.path())}
              aria-current={route.name === it.route ? 'page' : undefined}
            >
              {it.icon}
              {it.label}
              {it.route === 'delegation' && delegatedCount > 0 && <span className="nav-count">{delegatedCount}</span>}
            </button>
          ))}
        </nav>
      ))}
      <div className="sidebar-foot">
        <div className="theme-label">테마</div>
        <div className="theme-switch" role="radiogroup" aria-label="테마">
          {themes.map((t) => (
            <button
              key={t.mode}
              className={theme === t.mode ? 'on' : ''}
              title={t.label}
              aria-label={t.label}
              role="radio"
              aria-checked={theme === t.mode}
              onClick={() => updateSettings({ theme: t.mode })}
            >
              {t.icon}
            </button>
          ))}
        </div>
        <button className="foot-link" onClick={() => setUi({ print: defaultPrint(route.name, route.params), navOpen: false })}>
          <Download /> PDF 내보내기
        </button>
        <button className={`foot-link ${route.name === 'trash' ? 'active' : ''}`} onClick={() => navTo('trash')}>
          <Trash2 /> 휴지통 <span className="muted">{trashCount}</span>
        </button>
        <button className="foot-link" onClick={() => navTo('settings')}>
          <SettingsIcon /> 설정
        </button>
        <SyncBadge />
      </div>
    </aside>
  );
}

function SyncBadge() {
  const sync = useAuth((s) => s.sync);
  const email = useAuth((s) => s.session?.user.email);
  const setUi = useUi((s) => s.set);
  const view: Record<string, [ReactNode, string]> = {
    loading: [<RefreshCw className="spin" />, '불러오는 중…'],
    saving: [<RefreshCw className="spin" />, '저장 중…'],
    saved: [<Check />, '동기화 완료'],
    offline: [<CloudOff />, '오프라인 · 연결되면 저장'],
    error: [<TriangleAlert />, '동기화 오류 · 다시 시도'],
    idle: [<Check />, '동기화 대기'],
  };
  const [icon, label] = view[sync];
  return (
    <>
      <button
        className="foot-link"
        title={email ? `${email} · 계정 설정` : '계정 설정'}
        onClick={() => {
          go('settings');
          setUi({ navOpen: false });
        }}
      >
        <UserRound /> <span className="ellipsis">{email ?? '계정'}</span>
      </button>
      {sync === 'error' || sync === 'offline' ? (
        <button className={`foot-link sync-${sync}`} onClick={retrySync} title="지금 다시 동기화">
          {icon} {label}
        </button>
      ) : (
        <div className={`foot-link sync-${sync}`} style={{ cursor: 'default' }} title="로그인한 모든 기기에서 같은 플래너가 보입니다">
          {icon} {label}
        </div>
      )}
    </>
  );
}

export function defaultPrint(name: RouteName, params: string[]) {
  const today = todayKey();
  switch (name) {
    case 'weekly':
    case 'compass': {
      const wk = params[0] ?? weekStart(today);
      return { kind: 'weekly' as const, start: wk, end: wk, stage: 'setup' as const };
    }
    case 'monthly': {
      const m = params[0] ?? today.slice(0, 7);
      return { kind: 'monthly' as const, start: `${m}-01`, end: `${m}-01`, stage: 'setup' as const };
    }
    case 'yearly': {
      const y = params[0] ?? today.slice(0, 4);
      return { kind: 'yearly' as const, start: `${y}-01-01`, end: `${y}-01-01`, stage: 'setup' as const };
    }
    default: {
      const d = name === 'daily' && params[0] ? params[0] : today;
      return { kind: 'daily' as const, start: d, end: addDays(d, 0), stage: 'setup' as const };
    }
  }
}

export function Topbar() {
  const route = useRoute();
  const setUi = useUi((s) => s.set);
  const [section, label] = ROUTE_LABEL[route.name];
  return (
    <div className="topbar">
      <button className="icon-btn hamburger" aria-label="메뉴 열기" onClick={() => setUi({ navOpen: true })}>
        <Menu />
      </button>
      <div className="crumb">
        {section} / <span style={{ textTransform: 'none' }}>{label}</span>
      </div>
      <div className="topbar-actions">
        <button className="icon-btn" aria-label="검색" title="검색 (⌘K)" onClick={() => setUi({ searchOpen: true })}>
          <Search />
        </button>
        <button className="btn btn-soft" onClick={() => go(`daily/${todayKey()}`)}>
          <Sun /> 오늘
        </button>
      </div>
    </div>
  );
}

export function InboxFab() {
  const setUi = useUi((s) => s.set);
  const count = useStore((s) => s.inbox.filter((i) => !i.deletedAt && i.state === 'inbox').length);
  return (
    <button className="fab" aria-label={`Inbox${count ? ` ${count}개` : ''}`} title="Inbox · 빠르게 수집" onClick={() => setUi({ inboxOpen: true })}>
      <Inbox />
      {count > 0 && <span className="count">{count}</span>}
    </button>
  );
}
