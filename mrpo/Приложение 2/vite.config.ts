import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/exec': {
          target: 'https://script.google.com/macros/s/AKfycbxrcsmywNcAyPRLhitdoGZpAohHQpJLYWjhS6vZm6clHvZvjVMG-EjorP8uDu_7xqoluQ/exec',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/exec/, ''),
        }
      }
    },
    base: '/Приложение 2/',
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
