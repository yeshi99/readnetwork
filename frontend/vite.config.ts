import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react-swc"
import {defineConfig} from "vite"
import process from "process"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '::',
    port: 5173,
    allowedHosts: true,
    cors: true,
    // HMR：仅在具备云 IDE 空间变量时启用远程 wss，否则回退到默认（更稳定）
    ...(process.env.X_IDE_SPACE_KEY
      ? {
          hmr: {
            protocol: 'wss' as const,
            // 必须走 e2b 子域名（沙箱实际对外地址），preview domain 会 302 到授权页
            host: `5173-${process.env.X_IDE_SPACE_KEY}.e2b.${process.env.X_IDE_SPACE_REGION}.${process.env.X_IDE_SPACE_HOST}`,
          },
        }
      : {}),
    watch: { usePolling: true, interval: 800 },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true
      },
    },
  },
})
