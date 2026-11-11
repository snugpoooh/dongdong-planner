import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = import.meta.env as Record<string, string | undefined>;
const url = env.VITE_SUPABASE_URL ?? env.VITE_PUBLIC_SUPABASE_URL;
const key =
  env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_PUBLIC_SUPABASE_ANON_KEY ?? env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = !!(url && key);

/**
 * Auth redirects (email confirmation, password reset) come back as `#access_token=…` or `#error=…`.
 * Read any error before the client clears the fragment so the login screen can explain it.
 */
function readHashError(): string | null {
  const h = window.location.hash;
  if (!h.includes('error')) return null;
  const p = new URLSearchParams(h.replace(/^#\/?/, ''));
  const code = p.get('error_code');
  if (!p.get('error') && !code) return null;
  if (code === 'otp_expired') return '인증 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해 주세요.';
  return p.get('error_description')?.replace(/\+/g, ' ') ?? '인증에 실패했습니다.';
}
export const initialAuthError = readHashError();
export const initialIsRecovery = window.location.hash.includes('type=recovery');

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, key!, {
      auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'dongdong-auth' },
    })
  : null;

/** Where auth emails should send people back to (this deployment, without the in-app hash route). */
export function appUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, '이메일 또는 비밀번호가 맞지 않습니다.'],
  [/email not confirmed/i, '이메일 인증을 먼저 마쳐 주세요. 받은편지함의 인증 메일을 확인하세요.'],
  [/user already registered|already been registered/i, '이미 가입된 이메일입니다. 로그인해 주세요.'],
  [/password should be at least|password.*(short|length)/i, '비밀번호는 8자 이상이어야 합니다.'],
  [/weak.?password|password.*(weak|common|pwned)/i, '더 안전한 비밀번호를 써 주세요. 흔한 비밀번호는 쓸 수 없습니다.'],
  [/rate limit|too many|security purposes/i, '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.'],
  [/unable to validate email|invalid.*email|email address.*invalid/i, '올바른 이메일 주소를 입력해 주세요.'],
  [/new password should be different/i, '지금과 다른 비밀번호를 입력해 주세요.'],
  [/signups not allowed|signup.*disabled/i, '지금은 회원가입을 받지 않습니다.'],
  [/failed to fetch|network/i, '네트워크에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.'],
];

export function authMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  for (const [re, ko] of MESSAGES) if (re.test(msg)) return ko;
  return msg || '알 수 없는 오류가 발생했습니다.';
}
