import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import App from './App';
import { AuthScreen, NotConfigured, RecoveryScreen, Splash } from './components/Auth';
import { initialIsRecovery, supabase, supabaseConfigured } from './lib/supabase';
import { retrySync, startSync, stopSync, useAuth } from './lib/sync';
import { useThemeSync } from './lib/hooks';

/** Auth gate: the planner opens only for a signed-in account. */
export default function Root() {
  useThemeSync();
  const status = useAuth((s) => s.status);
  const ready = useAuth((s) => s.ready);
  const sync = useAuth((s) => s.sync);

  useEffect(() => {
    if (!supabase) return;
    let recovery = initialIsRecovery;
    const handle = (session: Session | null) => {
      const s = useAuth.getState();
      if (session) {
        s.set({ session, status: recovery ? 'recovery' : 'signedIn' });
        // Don't call Supabase from inside the auth callback; defer to the next tick.
        window.setTimeout(() => void startSync(session.user.id), 0);
      } else {
        stopSync();
        s.set({ session: null, status: 'signedOut', ready: false, sync: 'idle' });
      }
    };
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') recovery = true;
      if (event === 'USER_UPDATED') recovery = false;
      handle(session);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabaseConfigured) return <NotConfigured />;
  if (status === 'loading') return <Splash />;
  if (status === 'recovery') return <RecoveryScreen />;
  if (status === 'signedOut') return <AuthScreen />;
  if (!ready) {
    if (sync === 'offline' || sync === 'error') {
      return (
        <div className="auth-page">
          <div className="splash">
            <div className="splash-text">{sync === 'offline' ? '인터넷에 연결되어 있지 않습니다.' : '플래너를 불러오지 못했습니다.'}</div>
            <button className="btn btn-primary" onClick={retrySync}>
              다시 시도
            </button>
          </div>
        </div>
      );
    }
    return <Splash text="플래너를 불러오는 중…" />;
  }
  return <App />;
}
