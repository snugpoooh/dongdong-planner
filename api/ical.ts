import { handleIcal } from './_lib/icalProxy.js'; // Node ESM needs the extension

// Vercel Function (Node.js runtime, Web-standard handler): POST /api/ical  { "url": "<google ical address>" }
export function POST(request: Request) {
  const env = ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}) as Record<string, string | undefined>;
  return handleIcal(request, env);
}
