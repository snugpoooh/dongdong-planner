import { handleIcal } from './_lib/icalProxy';

// Vercel Function (Node.js runtime, Web-standard handler): GET /api/ical?url=<google ical address>
export function GET(request: Request) {
  const env = ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}) as Record<string, string | undefined>;
  return handleIcal(request, env);
}
