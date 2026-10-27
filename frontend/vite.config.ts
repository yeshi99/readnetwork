import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"
import process from "process"

// 云 IDE 沙箱（CloudStudio / e2b）环境探测
const isCloudIde = Boolean(process.env.X_IDE_SPACE_KEY)

// 后端地址：开发默认本地 :3000，容器/线上通过环境变量注入
const apiTarget = process.env.VITE_API_PROXY_TARGET || "http://localhost:3000"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // 静态资源用相对路径，产物可放在任意子目录 / CDN 下
  base: "./",

  build: {
    outDir: "dist",
    // 生产不生成 sourcemap，避免正文数据与业务逻辑被还原
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },

  // `vite preview` 用于本地验证生产构建，行为与线上反向代理保持一致
  preview: {
    port: 4173,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },

  server: {
    host: "::",
    port: 5173,
    allowedHosts: true,
    cors: true,
    // HMR：仅在具备云 IDE 空间变量时启用远程 wss，否则回退到默认（更稳定）
    ...(isCloudIde
      ? {
          hmr: {
            protocol: "wss" as const,
            // 必须走 e2b 子域名（沙箱实际对外地址），preview domain 会 302 到授权页
            host: `5173-${process.env.X_IDE_SPACE_KEY}.e2b.${process.env.X_IDE_SPACE_REGION}.${process.env.X_IDE_SPACE_HOST}`,
          },
        }
      : {}),
    watch: { usePolling: true, interval: 800 },
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
