import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Render hosts this app at /; GitHub Pages hosts it at /neo-system/.
  base: process.env.RENDER === 'true' ? '/' : '/neo-system/',
})
