# ============================================================
# 夜读文库 · 部署指南
#
# 三种落地方式，按「省事程度」从高到低排列：
#   A. Vercel（前端）+ Railway（后端）—— 全托管，零运维，免费额度可用
#   B. 单台服务器 + Docker Compose —— 一次构建，前后端同域，免跨域配置
#   C. 纯静态托管 —— 只想看页面效果（后端另找地方放）
#
# 推荐 A：前后端各自最擅长的平台，改动最小。
# ============================================================


## 0. 前置检查

确认仓库里已经有这些文件：

```
vercel.json                 # Vercel 前端配置（含 /api 反代）
railway.toml                # Railway 后端配置
docker-compose.yml          # 方式 B 的编排文件
backend/Dockerfile          # 后端镜像（自包含，可直接部署）
deploy/Dockerfile.backend   # 同上，构建上下文为仓库根
deploy/Dockerfile.frontend  # 前端镜像（Nginx）
deploy/nginx.conf           # 前端容器内的 Nginx 站点配置
.dockerignore
frontend/vite.config.ts     # 已支持 preview 代理与相对资源路径
backend/.env.example
frontend/.env.example
```

关键约束，部署前务必理解：

| 约束 | 原因 |
|---|---|
| 后端必须长驻进程 | 付费判定在服务端做，正文按 `previewRatio` 截断后才下发，静态托管无法实现 |
| 订单数据需要持久卷 | `store.json` 落在磁盘上，容器无卷重建即丢失全部订单 |
| 前端走同域 `/api` | 避开 CORS 与 Cookie 问题，也避免把后端地址硬编码进构建产物 |


## A. Vercel（前端）+ Railway（后端）

### A-1 先部署后端（拿到域名，前端要用）

1. 打开 https://railway.app → New Project → **Deploy from GitHub repo** → 选 `yeshi99/readnetwork`
2. Railway 会自动读到 `railway.toml`，用 `backend/Dockerfile` 构建
3. 进 **Variables**，逐条添加上下文变量：

   ```
   NODE_ENV      = production
   PORT          = 3000
   API_PREFIX    = /api
   CORS_ORIGIN   = *
   LOG_LEVEL     = info
   DATA_DIR      = /app/data
   ```

4. 进 **Settings → Volumes**，新增一个卷挂载到 `/app/data`
   （**这一步不能省**，否则每次重新部署订单全部清零）
5. 进 **Settings → Networking → Generate Domain**，得到类似
   `readnetwork-production.up.railway.app`
6. 验证后端活了：

   ```bash
   curl https://你的后端域名/api/health
   # 期望：{"status":"ok","timestamp":"..."}

   curl https://你的后端域名/api/books | head -c 300
   # 期望：返回书籍列表 JSON
   ```

### A-2 再部署前端

1. 打开 https://vercel.com/new → Import 同一个仓库
2. Framework 会自动识别为 Vite；**Root Directory 保持仓库根**（不要设成 frontend），
   因为 `vercel.json` 里的 `buildCommand` 已经 `cd frontend`
3. **部署前必须先改一个地方**：打开 `vercel.json`，把

   ```json
   "destination": "https://REPLACE-WITH-YOUR-BACKEND-DOMAIN/api/:path*"
   ```

   替换成 A-1 第 5 步拿到的真实后端域名：

   ```json
   "destination": "https://readnetwork-production.up.railway.app/api/:path*"
   ```

   提交这次修改后再点 Deploy。
4. 部署完成后访问 Vercel 域名，逐项验收：
   - 首页六本书卡片正常显示
   - 点进任意一本书，能读到预览部分，之后出现模糊正文 + 解锁卡片
   - 点「解锁全书」→ 选支付方式 → 支付完成后正文立即全部展开
   - 刷新页面，付费状态仍然保持
   - 直接访问 `https://你的域名/mine` 不出现 404（rewrites 生效）

### A-3 自定义域名（可选）

- Vercel：Settings → Domains → 添加域名，按提示配 CNAME
- Railway：Settings → Networking → Custom Domain，配 CNAME 到 Railway 给的地址
- 加了域名后建议把后端 `CORS_ORIGIN` 从 `*` 改成前端正式域名（如 `https://read.yourdomain.com`），
  这样会启用 credentials，安全边界更清晰


## B. 单台服务器 + Docker Compose（推荐给自有 VPS）

一条命令起前后端，同域无跨域，Nginx 内置反代与 gzip 压缩。

### B-1 服务器要求

- 任意 Linux（Ubuntu 22.04 / Debian 12 均可），1 核 1G 起
- 已装 Docker 与 Docker Compose 插件：

  ```bash
  curl -fsSL https://get.docker.com | sh
  docker compose version   # 应输出 v2.x
  ```

### B-2 部署

```bash
git clone https://github.com/yeshi99/readnetwork.git
cd readnetwork

# 构建并启动（首次约 3-5 分钟，主要是装依赖）
docker compose up -d --build

# 看状态，两个服务都应为 healthy
docker compose ps

# 看后端日志
docker compose logs -f backend
```

访问 `http://服务器IP:8080`。

### B-3 数据与运维

```bash
# 数据卷位置（订单与阅读进度）
docker volume inspect readnetwork-data

# 备份
docker run --rm -v readnetwork-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/store-$(date +%F).tar.gz -C /data .

# 更新代码后重新部署
git pull && docker compose up -d --build

# 停服（数据保留）
docker compose down
```

### B-4 配 HTTPS（用 Caddy 自动签证书，比手写 Nginx+Certbot 省事）

在 `docker-compose.yml` 同级新建 `Caddyfile`：

```
read.yourdomain.com {
    reverse_proxy frontend:80
}
```

然后在 compose 里加一个 caddy 服务，把 80/443 给它，frontend 不再暴露端口：

```yaml
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    networks:
      - readnetwork
```

记得在 `volumes:` 段补上 `caddy-data:` 和 `caddy-config:`，并把 frontend 的
`ports` 改为 `expose: ["80"]`。


## C. 纯静态托管（只看前端效果）

适合只想让别人点开看看排版，不需要真实付费流程。

### C-1 本地构建后上传

```bash
cd frontend
npm ci
npm run build          # 产物在 frontend/dist
```

把 `dist/` 整个目录拖到 Netlify Drop（https://app.netlify.com/drop）即可。
仓库里的 `netlify.toml` 已配好 SPA 回退，用 Git 连接方式部署也能直接用。

### C-2 注意

没有后端时页面能打开，但书架数据请求会失败、显示空列表。
若要「有内容但不可付费」，最简做法是把 `backend/src/data/books.ts` 的书籍数据
在前端做一次静态快照 —— 但这等于把全文交给了客户端，**付费墙形同虚设**，
仅可用于演示。


## D. 平台对照

| 方案 | 前端 | 后端 | 需持久卷 | 免费额度 | 适用场景 |
|---|---|---|---|---|---|
| A | Vercel | Railway | 是 | 有（够测试） | 想最快上线，不想碰服务器 |
| B | 自建 Nginx | 自建 Node | 是（Docker Volume） | 无（服务器自付） | 有 VPS、要完全掌控、要备案 |
| C | Netlify / Vercel | 无 | — | 有 | 纯展示、原型评审 |

国内访问速度：Vercel 默认域名在国内不稳定，**面向国内用户建议用方式 B** ，
或者 Vercel 绑定已备案域名 + 国内 CDN。


## E. 上线前必改清单

| 项 | 位置 | 为什么 |
|---|---|---|
| 后端域名占位符 | `vercel.json` 的 `destination` | 不改则 `/api` 全部 404 |
| 持久卷挂载 | Railway Volumes / compose volume | 不挂则重启丢订单 |
| `CORS_ORIGIN` | 后端环境变量 | 从 `*` 收窄到前端正式域名 |
| 支付渠道 | `backend/src/modules/books.ts` 的 purchase 分支 | 当前是模拟支付，直接写 `status: 'paid'`；接真实支付需校验回调签名 |
| 用户身份 | `X-User-Id` 请求头 | 当前由前端生成随机 ID，**任何人都能伪造**；接入正式登录后应改为服务端签发的会话 |
| `backend/data/` | `.gitignore` / `.dockerignore` | 已排除，别把订单数据推到公开仓库 |


## F. 上线前请务必知道的三个事实

这三条不是配置问题，是当前实现的能力边界，公开运营前必须处理：

1. **支付是模拟的。** `POST /api/books/:id/purchase` 收到请求就直接标记为已付款，
   没有对接微信/支付宝，也没有校验任何支付回调签名。任何人用 curl 打一次这个接口
   就能白拿全书。接真实支付时，订单状态必须由支付平台的异步回调驱动，
   而不是由前端调用决定。

2. **身份是客户端自报的。** 后端从 `X-User-Id` 请求头取用户，而这个值由浏览器
   `localStorage` 生成。改一个请求头就能变成别人，也能反复领新用户优惠。
   正式运营需要服务端签发会话（JWT 或 session cookie）。

3. **正文确实没下发给未付费用户。** 这一点是扎实的：`buildChapterPayload()`
   在服务端按 `previewRatio` 截断，未购买时锁定段落根本不会出现在响应里，
   抓包也拿不到。所以「防白嫖」的关键防线是有效的，薄弱点在 1 和 2 的
   准入环节，而不在内容分发环节。

换句话说：**这套代码适合当产品原型和付费阅读的技术骨架，不适合直接收真钱。**
把上面 1、2 两处补上，它就能真正商用。
