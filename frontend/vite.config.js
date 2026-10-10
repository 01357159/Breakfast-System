import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 👈 加上這行，允許區網內的其他裝置連線
    port: 5173,
  }
})
