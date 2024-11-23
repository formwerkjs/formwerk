import { defineConfig } from 'vite';
import { join } from 'path';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@/': join(__dirname, 'src/'),
    },
  },
  plugins: [vue()],
  optimizeDeps: {
    exclude: ['@formwerk/core'],
  },
});
