import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, Eye, EyeOff, MailCheck } from 'lucide-react';
import { LogoMark } from './Logo';
import { appUrl, authMessage, initialAuthError, supabase } from '../lib/supabase';
import { useAuth } from '../lib/sync';

type Mode = 'login' | 'signup' | 'reset' | 'sent' | 'resetSent';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <LogoMark size={44} />
          <div>
            <div className="auth-name">DongDong</div>
            <div className="brand-sub">DIGITAL PLANNER</div>
          </div>
        </div>
        {children}
      </div>
      <p className="auth-tagline">종이의 온기, 디지털의 명료함 — 삶의 방향에서 오늘의 할 일까지.</p>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="auth-field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="rel">
        <input
          id={id}
          className="input auth-input"
          type={show ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={8}
        />
        <button type="button" className="auth-eye" aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'} onClick={() => setShow(!show)}>
          {show ? <EyeOff /> : <Eye />}
        </button>
      </div>
      {hint && <div className="auth-hint">{hint}</div>}
    </div>
  );
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialAuthError);
  const [notice, setNotice] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);

  const switchTo = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
    setUnconfirmed(false);
  };

  const run = async (fn: () => Promise<void>) => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const login = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setUnconfirmed(/not confirmed/i.test(error.message));
        throw error;
      }
    });
  };

  const signup = (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('비밀번호는 8자 이상이어야 합니다.');
    if (password !== password2) return setError('비밀번호가 서로 다릅니다.');
    void run(async () => {
      const { data, error } = await supabase!.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: appUrl() } });
      if (error) throw error;
      // With email confirmation on, no session comes back until the link is clicked.
      if (!data.session) {
        // An existing address returns a user without identities (to avoid leaking who has an account).
        if (data.user && data.user.identities?.length === 0) throw new Error('User already registered');
        switchTo('sent');
      }
    });
  };

  const resend = () =>
    void run(async () => {
      const { error } = await supabase!.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: appUrl() } });
      if (error) throw error;
      setNotice('인증 메일을 다시 보냈습니다.');
    });

  const reset = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl() });
      if (error) throw error;
      switchTo('resetSent');
    });
  };

  if (mode === 'sent' || mode === 'resetSent') {
    return (
      <Shell>
        <div className="auth-done">
          <MailCheck />
          <h1>메일을 확인해 주세요</h1>
          <p>
            <b>{email}</b>로 {mode === 'sent' ? '인증 메일' : '비밀번호 재설정 메일'}을 보냈습니다.
            <br />
            {mode === 'sent' ? '메일의 링크를 누르면 가입이 끝나고 바로 로그인됩니다.' : '메일의 링크를 눌러 새 비밀번호를 정하세요.'}
          </p>
          <p className="auth-hint">메일이 안 보이면 스팸함도 확인해 주세요.</p>
          {notice && <div className="auth-notice">{notice}</div>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <div className="auth-actions">
            {mode === 'sent' && (
              <button className="btn btn-outline btn-lg" disabled={busy} onClick={resend}>
                인증 메일 다시 보내기
              </button>
            )}
            <button className="btn btn-primary btn-lg" onClick={() => switchTo('login')}>
              로그인 화면으로
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (mode === 'reset') {
    return (
      <Shell>
        <button className="btn btn-ghost auth-back" onClick={() => switchTo('login')}>
          <ArrowLeft /> 로그인
        </button>
        <h1 className="auth-title">비밀번호 재설정</h1>
        <p className="auth-sub">가입한 이메일로 재설정 링크를 보내 드립니다.</p>
        <form onSubmit={reset}>
          <div className="auth-field">
            <label className="field-label" htmlFor="reset-email">
              이메일
            </label>
            <input id="reset-email" className="input auth-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-lg auth-submit" disabled={busy}>
            {busy ? '보내는 중…' : '재설정 메일 보내기'}
          </button>
        </form>
      </Shell>
    );
  }

  const isSignup = mode === 'signup';
  return (
    <Shell>
      <div className="seg auth-tabs" role="tablist">
        <button role="tab" aria-selected={!isSignup} className={!isSignup ? 'on' : ''} onClick={() => switchTo('login')}>
          로그인
        </button>
        <button role="tab" aria-selected={isSignup} className={isSignup ? 'on' : ''} onClick={() => switchTo('signup')}>
          회원가입
        </button>
      </div>
      <h1 className="auth-title">{isSignup ? '새 플래너 시작하기' : '다시 오신 것을 환영합니다'}</h1>
      <p className="auth-sub">{isSignup ? '이메일로 가입하면 어느 기기에서든 같은 플래너를 펼칠 수 있어요.' : '로그인하면 기기마다 같은 플래너가 이어집니다.'}</p>
      <form onSubmit={isSignup ? signup : login}>
        <div className="auth-field">
          <label className="field-label" htmlFor="auth-email">
            이메일
          </label>
          <input id="auth-email" className="input auth-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <PasswordField
          id="auth-password"
          label="비밀번호"
          value={password}
          onChange={setPassword}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          hint={isSignup ? '8자 이상' : undefined}
        />
        {isSignup && <PasswordField id="auth-password2" label="비밀번호 확인" value={password2} onChange={setPassword2} autoComplete="new-password" />}
        {error && (
          <div className="auth-error" role="alert">
            {error}
            {unconfirmed && (
              <button type="button" className="link-btn" style={{ marginLeft: 6 }} onClick={resend}>
                인증 메일 다시 보내기
              </button>
            )}
          </div>
        )}
        {notice && <div className="auth-notice">{notice}</div>}
        <button className="btn btn-primary btn-lg auth-submit" disabled={busy}>
          {busy ? (isSignup ? '가입하는 중…' : '로그인 중…') : isSignup ? '회원가입' : '로그인'}
        </button>
      </form>
      {!isSignup && (
        <button className="auth-link" onClick={() => switchTo('reset')}>
          비밀번호를 잊으셨나요?
        </button>
      )}
    </Shell>
  );
}

/** Shown after following a password-reset link. */
export function RecoveryScreen() {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('비밀번호는 8자 이상이어야 합니다.');
    if (password !== password2) return setError('비밀번호가 서로 다릅니다.');
    setBusy(true);
    setError(null);
    const { error } = await supabase!.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(authMessage(error));
    useAuth.getState().set({ status: 'signedIn' });
  };
  return (
    <Shell>
      <h1 className="auth-title">새 비밀번호 정하기</h1>
      <p className="auth-sub">앞으로 로그인할 때 쓸 비밀번호를 입력하세요.</p>
      <form onSubmit={submit}>
        <PasswordField id="new-password" label="새 비밀번호" value={password} onChange={setPassword} autoComplete="new-password" hint="8자 이상" />
        <PasswordField id="new-password2" label="새 비밀번호 확인" value={password2} onChange={setPassword2} autoComplete="new-password" />
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg auth-submit" disabled={busy}>
          {busy ? '저장 중…' : '비밀번호 저장'}
        </button>
      </form>
    </Shell>
  );
}

export function Splash({ text = '플래너를 펼치는 중…' }: { text?: string }) {
  return (
    <div className="auth-page">
      <div className="splash">
        <LogoMark size={52} />
        <div className="splash-text">{text}</div>
      </div>
    </div>
  );
}

export function NotConfigured() {
  return (
    <Shell>
      <h1 className="auth-title">서버 연결 설정이 필요합니다</h1>
      <p className="auth-sub">
        <code>VITE_SUPABASE_URL</code>과 <code>VITE_SUPABASE_ANON_KEY</code> 환경변수를 설정한 뒤 다시 빌드하세요. 로컬에서는 <code>vercel env pull .env.local</code>로 받을 수 있습니다.
      </p>
    </Shell>
  );
}
