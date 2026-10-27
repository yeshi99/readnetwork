# ============================================================
# 夜读文库 · 后端服务镜像
# 多阶段构建：builder 装依赖并编译 TS，runner 只保留运行时文件
# 构建上下文：backend/ 目录（backend/ 作为根目录时使用本文件）
# ============================================================

# ---------- Stage 1: 构建 ----------
FROM node:22-alpine AS builder

WORKDIR /app

# 先只复制依赖清单，利用 Docker 层缓存
COPY package.json package-lock.json ./

# npm ci 保证可复现安装（lockfileVersion 3，与 Node 22 兼容）
RUN npm ci --no-audit --no-fund

# 再复制源码并编译（tsconfig 输出 ESM，与 package.json 的 type: module 一致）
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# 剔除 devDependencies，只留生产依赖
RUN npm prune --omit=dev

# ---------- Stage 2: 运行 ----------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    API_PREFIX=/api \
    DATA_DIR=/app/data

# 以非 root 用户运行，降低容器逃逸风险
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nodejs

# 从 builder 拷贝产物与生产依赖
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# 数据目录（订单 / 阅读进度持久化）。
# 生产环境必须挂载持久卷到此路径，否则重建容器会丢数据。
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app/data
VOLUME ["/app/data"]

USER nodejs

EXPOSE 3000

# 健康检查：/api/health 由 systemRouter 提供
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+(process.env.API_PREFIX||'/api')+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
