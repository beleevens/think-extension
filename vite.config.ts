import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json',
          dest: ''
        },
        {
          src: 'public/icons/*',
          dest: 'icons'
        },
        {
          src: 'public/branding/*',
          dest: 'branding'
        },
        {
          src: 'README.md',
          dest: ''
        }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'sidepanel/index': resolve(__dirname, 'src/sidepanel/index.html'),
        'settings/settings': resolve(__dirname, 'src/settings/settings.html'),
        'notes/notes': resolve(__dirname, 'src/notes/notes.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.includes('sidepanel')) {
            return 'sidepanel/[name].[ext]';
          }
          if (assetInfo.name?.includes('settings')) {
            return 'settings/[name].[ext]';
          }
          if (assetInfo.name?.includes('notes')) {
            return 'notes/[name].[ext]';
          }
          return '[name].[ext]';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
