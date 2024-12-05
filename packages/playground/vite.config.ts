import { defineConfig } from 'vite';
import { join } from 'path';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@/': join(__dirname, 'src/'),
      '@starter/minimal/': join(__dirname, '../starter-kits/minimal/src/'),
    },
  },
  plugins: [vue()],
  optimizeDeps: {
    exclude: ['@formwerk/core'],
  },
});
