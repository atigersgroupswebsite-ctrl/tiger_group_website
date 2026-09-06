import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { paymentApiPlugin } from './src/server/vitePaymentPlugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), paymentApiPlugin()],
})

