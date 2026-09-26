import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function apiDevMiddleware(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = urlObj.pathname;

        if (pathname === '/api/auth' || pathname === '/api/send-email') {
          try {
            let body: any = {};
            if (req.method === 'POST') {
              const buffers: Buffer[] = [];
              for await (const chunk of req) {
                buffers.push(chunk);
              }
              const rawData = Buffer.concat(buffers).toString();
              if (rawData) {
                try {
                  body = JSON.parse(rawData);
                } catch {
                  body = rawData;
                }
              }
            }

            const modulePath = pathname === '/api/auth' ? './api/auth.ts' : './api/send-email.ts';
            const { default: handler } = await server.ssrLoadModule(modulePath);

            const query: Record<string, string> = {};
            urlObj.searchParams.forEach((val, key) => {
              query[key] = val;
            });

            const vercelReq = Object.assign(req, {
              query,
              body,
              cookies: {}
            });

            const vercelRes = Object.assign(res, {
              status(code: number) {
                res.statusCode = code;
                return vercelRes;
              },
              json(data: any) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return vercelRes;
              },
              send(data: any) {
                res.end(data);
                return vercelRes;
              }
            });

            await handler(vercelReq, vercelRes);
          } catch (err: any) {
            console.error(`API ${pathname} dev error:`, err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal error' }));
          }
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      apiDevMiddleware(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'logo-rayca.png', 'templates/*.xlsx'],
        manifest: {
          name: 'RaycaDoc - RAYCA Ingeniería',
          short_name: 'RaycaDoc',
          description: 'RaycaDoc — Emisión y firma de ART Mantención, ART Normal y Charla Inicial',
          theme_color: '#001E59',
          background_color: '#FFFFFF',
          display: 'standalone',
          orientation: 'portrait',
          start_url: './',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 5000000,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,xlsx}']
        }
      })
    ],
    build: {
      chunkSizeWarningLimit: 2000
    }
  };
});
