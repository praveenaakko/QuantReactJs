import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      // keep your allowed hosts, just remove the trailing slash
      allowedHosts: ['labs.quantcure.com', '5ded17683bf5.ngrok-free.app'],

      // REQUIRED: proxy /auth to backend
      proxy: {
        '/auth': {
          target: env.BACKEND_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '^/(docking|proteins|ligands|ml|users|dashboard)': {
          target: env.BACKEND_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.BACKEND_URL': JSON.stringify(env.BACKEND_URL),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});