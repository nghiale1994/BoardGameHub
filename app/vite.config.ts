import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/BoardGameHub/' : '/',
  server: {
    host: "localhost",
    port: 5173
  },
  define: {
    // Inject PeerJS configuration from environment variables
    // These will be set via GitHub repository secrets during CI/CD
    'import.meta.env.VITE_PEERJS_HOST': JSON.stringify(process.env.VITE_PEERJS_HOST || ''),
    'import.meta.env.VITE_PEERJS_PORT': JSON.stringify(process.env.VITE_PEERJS_PORT || ''),
    'import.meta.env.VITE_PEERJS_PATH': JSON.stringify(process.env.VITE_PEERJS_PATH || ''),
    'import.meta.env.VITE_PEERJS_SECURE': JSON.stringify(process.env.VITE_PEERJS_SECURE || ''),
    'import.meta.env.VITE_PEERJS_KEY': JSON.stringify(process.env.VITE_PEERJS_KEY || '')
  }
});
