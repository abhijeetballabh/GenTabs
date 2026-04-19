// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default {
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: "index.html"
      }
    }
  }
};
