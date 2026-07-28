import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const apiProxy = {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy },
  // `npm run preview` serves the production build. It needs the same proxy as
  // the dev server, otherwise every /api call 404s against the static server.
  preview: { proxy: apiProxy },
})
