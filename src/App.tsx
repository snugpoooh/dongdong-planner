import { useEffect } from 'react';
import { InboxFab, Sidebar, Topbar } from './components/Shell';
import { TaskModal } from './components/TaskModal';
import { StatusModal } from './components/StatusModal';
import { EventModal } from './components/EventModal';
import { InboxModal } from './components/InboxModal';
import { SearchModal } from './components/SearchModal';
import { TriageModal } from './components/TriageModal';
import { GoalModal, CarryModal } from './components/GoalModal';
import { DayModal } from './components/DayModal';
import { RoutineModal } from './components/RoutineModal';
import { RoutinesPage } from './pages/Routines';
import { PrintModal, PrintRoot } from './components/Print';
import { DailyPage } from './pages/Daily';
import { WeeklyPage } from './pages/Weekly';
import { MonthlyPage } from './pages/Monthly';
import { YearlyPage } from './pages/Yearly';
import { CompassPage } from './pages/Compass';
import { MosPage } from './pages/Mos';
import { ProjectsPage, ProjectDetailPage } from './pages/Projects';
import { DelegationPage } from './pages/Delegation';
import { ReviewPage } from './pages/Review';
import { NotesPage } from './pages/Notes';
import { TrashPage } from './pages/Trash';
import { SettingsPage } from './pages/Settings';
import { useRoute } from './lib/router';
import { useToday } from './lib/hooks';
import { setSundayLabel, todayKey, weekStart } from './lib/date';
import { useStore } from './store/store';
import { useUi } from './store/ui';

const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isMonth = (s?: string) => !!s && /^\d{4}-\d{2}$/.test(s);
const isYear = (s?: string) => !!s && /^\d{4}$/.test(s);

function Page() {
  const route = useRoute();
  const today = useToday();
  const p = route.params;
  switch (route.name) {
    case 'weekly':
      return <WeeklyPage week={weekStart(isDate(p[0]) ? p[0] : today)} />;
    case 'monthly':
      return <MonthlyPage month={isMonth(p[0]) ? p[0] : today.slice(0, 7)} />;
    case 'yearly':
      return <YearlyPage year={isYear(p[0]) ? p[0] : today.slice(0, 4)} />;
    case 'routines':
      return <RoutinesPage />;
    case 'compass':
      return <CompassPage week={weekStart(isDate(p[0]) ? p[0] : today)} />;
    case 'mos':
      return <MosPage track={p[0]} />;
    case 'projects':
      return p[0] ? <ProjectDetailPage id={p[0]} /> : <ProjectsPage />;
    case 'delegation':
      return <DelegationPage />;
    case 'review':
      return <ReviewPage type={p[0]} period={p[1]} />;
    case 'notes':
      return <NotesPage />;
    case 'trash':
      return <TrashPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DailyPage date={isDate(p[0]) ? p[0] : today} />;
  }
}

export default function App() {
  const navOpen = useUi((s) => s.navOpen);
  const setUi = useUi((s) => s.set);
  const toast = useUi((s) => s.toast);
  const sundayLabel = useStore((s) => s.settings.sundayLabel);
  setSundayLabel(sundayLabel);

  useEffect(() => {
    if (!window.location.hash) window.location.replace(`#/daily/${todayKey()}`);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setUi({ searchOpen: true });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setUi]);

  return (
    <>
      <div className={`app ${navOpen ? 'nav-open' : ''}`}>
        <Sidebar />
        <div className="nav-scrim" onClick={() => setUi({ navOpen: false })} />
        <main className="main">
          <Topbar />
          <div className="main-scroll">
            <Page />
          </div>
        </main>
        <InboxFab />
      </div>
      <TaskModal />
      <StatusModal />
      <EventModal />
      <InboxModal />
      <SearchModal />
      <TriageModal />
      <GoalModal />
      <CarryModal />
      <DayModal />
      <RoutineModal />
      <PrintModal />
      <PrintRoot />
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
