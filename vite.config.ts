import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendPort = env.PORT ?? '3100';
  const apiProxyTarget = env.VITE_API_PROXY_TARGET ?? env.API_PROXY_TARGET ?? `http://localhost:${backendPort}`;
  const frontendPort = Number(env.VITE_FRONTEND_PORT ?? 5173);

  return {
    root: 'src/frontend',
    plugins: [react()],
    build: {
      outDir: '../../dist/frontend',
      emptyOutDir: true
    },
    server: {
      port: frontendPort,
      proxy: {
        '/api/v1': {
          target: apiProxyTarget,
          changeOrigin: true
        },
        '/ready': {
          target: apiProxyTarget,
          changeOrigin: true
        },
        '/health': {
          target: apiProxyTarget,
          changeOrigin: true
        }
      }
    },
  };
});
