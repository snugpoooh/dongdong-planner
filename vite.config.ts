import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleIcal } from './api/_lib/icalProxy';

/** Serves /api/ical during `vite dev` with the same handler Vercel runs in production. */
function devIcalProxy(env: Record<string, string>): Plugin {
  return {
    name: 'dev-ical-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ical', async (req, res) => {
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const body = req.method === 'POST' ? Buffer.concat(chunks) : undefined;
        const r = await handleIcal(new Request(`http://localhost${req.originalUrl ?? req.url}`, { method: req.method, headers, body }), env);
        res.statusCode = r.status;
        r.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(Buffer.from(await r.arrayBuffer()));
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), devIcalProxy(loadEnv(mode, process.cwd(), ''))],
  server: { port: 5173, host: true },
}));
