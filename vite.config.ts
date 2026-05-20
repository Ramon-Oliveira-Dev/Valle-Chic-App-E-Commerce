import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa'; // Adicionado para PWA

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Substitua as cores abaixo pelas cores oficiais da Valle Chic
  const BRAND_COLOR = '#000000'; // Ex: Preto, Dourado, etc.
  const BACKGROUND_COLOR = '#ffffff'; // Cor de fundo da splash screen

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Adicionado: Configuração completa do PWA
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: 'Valle Chic - E-commerce de Moda',
          short_name: 'Valle Chic',
          description: 'A sua loja de moda e estilo online.',
          theme_color: BRAND_COLOR,
          background_color: BACKGROUND_COLOR,
          display: 'standalone',
          orientation: 'portrait',
          lang: 'pt-BR',
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
              purpose: 'maskable' // Permite que o Android arredonde o ícone
            }
          ]
        },
        workbox: {
          // Garante que todas as rotas e arquivos sejam cacheados corretamente
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
          navigateFallback: 'index.html',
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});