import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Electron 22 (آخر إصدار يدعم ويندوز 7/8/8.1) يستخدم Chromium 108
    // لذلك نجبر عملية البناء على عدم توليد صياغة JS أحدث من ذلك
    target: 'chrome108',
  },
})
