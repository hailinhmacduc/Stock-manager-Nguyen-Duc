import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Chỉ bật HTTPS ở local dev để test camera
    https: mode === "development",
  },
  plugins: [
    react(),
    mode === "development" && basicSsl(), // Chỉ dùng SSL tự ký ở local dev
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
    "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
}));
