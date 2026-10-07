import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa + HashRouter: o mesmo build funciona no GitHub Pages (/urna-em-camadas/) e em domínio próprio
export default defineConfig({
  plugins: [react()],
  base: './',
})
