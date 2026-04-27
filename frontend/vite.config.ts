import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

// https://vite.dev/config/
export default defineConfig({
  server: {
    https: {
      key: fs.readFileSync("../backend/api/localhost+1-key.pem"),
      cert: fs.readFileSync("../backend/api/localhost+1.pem"),
    },
    proxy: {
      "/api": {
        target: "https://localhost:8443",
        changeOrigin: true,
        secure: false, // accept self-signed cert
      },
    },
  },
  plugins: [react()],
});
