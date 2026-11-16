/**
 * Fetches a Google Calendar iCal feed on behalf of a signed-in DongDong user.
 * Browsers can't read these feeds directly (no CORS), so the app asks this function.
 * Only Google Calendar iCal addresses are allowed, so it can't be used as an open proxy.
 * The address is a secret, so it travels in the POST body (never in the URL, which ends up in logs).
 */

const ALLOWED_HOSTS = new Set(['calendar.google.com', 'www.google.com']);
const MAX_BYTES = 15 * 1024 * 1024;

type Env = Record<string, string | undefined>;

export function normalizeIcalUrl(raw: string | null): URL | null {
  if (!raw) return null;
  let s = raw.trim();
  if (s.startsWith('webcal://')) s = `https://${s.slice('webcal://'.length)}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || !ALLOWED_HOSTS.has(u.hostname)) return null;
  if (!u.pathname.startsWith('/calendar/ical/') || !u.pathname.endsWith('.ics')) return null;
  if (u.username || u.password || u.port) return null;
  return u;
}

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

async function signedIn(request: Request, env: Env): Promise<boolean> {
  const auth = request.headers.get('authorization');
  const base = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;
  if (!auth?.startsWith('Bearer ') || !base || !key) return false;
  try {
    const r = await fetch(`${base}/auth/v1/user`, { headers: { authorization: auth, apikey: key }, signal: AbortSignal.timeout(8000) });
    return r.ok;
  } catch {
    return false;
  }
}

export async function handleIcal(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json(405, 'POST만 지원합니다.');
  let raw: string | null = null;
  try {
    const body = (await request.json()) as { url?: unknown };
    raw = typeof body.url === 'string' ? body.url : null;
  } catch {
    raw = null;
  }
  const target = normalizeIcalUrl(raw);
  if (!target) return json(400, '구글 캘린더의 iCal 주소(…/calendar/ical/…/basic.ics)만 쓸 수 있습니다.');
  if (!(await signedIn(request, env))) return json(401, '로그인이 필요합니다.');

  let upstream: Response;
  try {
    upstream = await fetch(target, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { accept: 'text/calendar, */*;q=0.5' } });
  } catch {
    return json(502, '구글 캘린더에 연결하지 못했습니다.');
  }
  if (!ALLOWED_HOSTS.has(new URL(upstream.url).hostname)) return json(502, '예상하지 못한 곳으로 연결되었습니다.');
  if (upstream.status === 404) return json(404, '주소를 찾을 수 없습니다. 비공개 주소가 바뀌었는지 확인해 주세요.');
  if (!upstream.ok) return json(502, `구글 캘린더가 응답하지 않습니다 (${upstream.status}).`);
  const len = Number(upstream.headers.get('content-length') ?? 0);
  if (len > MAX_BYTES) return json(413, '캘린더가 너무 큽니다.');
  const text = await upstream.text();
  if (text.length > MAX_BYTES) return json(413, '캘린더가 너무 큽니다.');
  if (!text.trimStart().startsWith('BEGIN:VCALENDAR')) return json(422, 'iCal 형식이 아닙니다. 주소가 맞는지 확인해 주세요.');
  return new Response(text, { status: 200, headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'private, no-store' } });
}
