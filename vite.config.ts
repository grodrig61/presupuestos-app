import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // Esto permite probar la PWA en local (npm run dev)
      },
      manifest: {
        name: 'Presupuestos App',
        short_name: 'Presupuestos',
        description: 'Calculadora de materiales y presupuestos para profesionales',
        theme_color: '#4CAF50',
        background_color: '#ffffff',
        display: 'standalone', // Hace que se vea como app nativa sin barra de navegador
        icons: [
          // Vamos a usar íconos de prueba por ahora
          {
            src: 'https://cdn-icons-png.flaticon.com/512/2662/2662503.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})