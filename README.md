# 夜读文库 · 付费阅读网站

一个「先试读一段，付费解锁全书」的在线阅读网站。试读部分是**真实正文**，读到截断处即被遮住，购买后立即展开。

> 演示项目：支付流程为模拟，不产生真实扣款。

## 功能

**书架首页 `/`**
- 6 部原创长篇（48 章，约 6 万字原创正文）
- 编辑推荐位、分类筛选、关键词搜索
- 每本书标注价格、折扣、评分、试读比例
- 有阅读记录时显示「继续阅读」条

**阅读页 `/read/:id`**
- 章节目录抽屉、章节跳转、阅读进度自动上报
- 试读正文结束后：模糊残影 + 渐变遮罩 + 付费解锁卡片
- 阅读设置：字号（15–28px）、米色 / 白纸 / 夜间三主题、版心宽度，偏好本地持久化

**结算弹窗**
- 订单明细（原价 − 限时特价 = 应付）
- 微信 / 支付宝 / 银行卡三种支付方式
- 支付中动画 → 成功动画 → 正文即时展开，无需刷新

**我的书房 `/mine`**
- 已购书籍、阅读进度条、模拟订单记录表

## 目录结构

```
.
├── backend/                  Node.js + Express + TypeScript
│   ├── src/
│   │   ├── data/books.ts     6 本书 / 48 章正文数据
│   │   ├── store/index.ts    用户、订单、已购、阅读进度（JSON 持久化）
│   │   ├── modules/books.ts  书籍接口（试读截断 / 购买解锁 / 进度）
│   │   ├── modules/system.ts 健康检查
│   │   ├── config/           环境变量与日志
│   │   ├── middleware/       错误处理、日志、校验
│   │   ├── app.ts            应用装配与路由注册
│   │   └── index.ts          启动入口
│   ├── Dockerfile            后端镜像（可独立部署到 Railway / Zeabur）
│   └── package.json
├── frontend/                 React 19 + Vite + Tailwind CSS 4
│   ├── src/
│   │   ├── pages/Index.tsx           书架首页
│   │   ├── pages/Reader.tsx          阅读页 + 付费墙
│   │   ├── pages/Shelf.tsx           我的书房
│   │   ├── components/CheckoutDialog.tsx  结算弹窗
│   │   ├── components/BookCover.tsx  纯 CSS 书封
│   │   ├── components/SiteHeader.tsx 站点头部
│   │   ├── lib/reader-api.ts         API 封装、类型、阅读偏好
│   │   └── App.tsx / index.css       路由与主题
│   ├── vite.config.ts
│   └── package.json
│
├── deploy/                   部署相关
│   ├── Dockerfile.backend    后端镜像（构建上下文=仓库根）
│   ├── Dockerfile.frontend   前端镜像（构建 → Nginx）
│   └── nginx.conf            容器内站点配置（SPA 回退 + /api 反代 + gzip）
│
├── docker-compose.yml        一键起前后端（端口 8080）
├── vercel.json               Vercel 前端配置（含 /api rewrites）
├── netlify.toml              Netlify 前端配置
├── railway.toml              Railway 后端配置
├── .dockerignore
├── DEPLOY.md                 部署指南（三种方式 + 上线前清单）
└── README.md
```

## 本地运行

需要 Node.js 18+ 与 pnpm。

```bash
# 终端 1：后端（http://localhost:3000）
cd backend
pnpm install
pnpm dev

# 终端 2：前端（http://localhost:5173）
cd frontend
pnpm install
pnpm dev
```

打开 http://localhost:5173 即可。前端已把 `/api` 代理到 `3000`，无需额外配置。

> 也支持 npm：把上面两处 `pnpm install` 换成 `npm ci`，`pnpm dev` 换成 `npm run dev` 即可。

## 部署

完整步骤见 **[DEPLOY.md](./DEPLOY.md)**，含三种方式与上线前改动清单。

| 方式 | 组成 | 命令 / 入口 |
|---|---|---|
| A · 全托管 | Vercel（前端）+ Railway（后端） | 导入仓库即可，配置见 `vercel.json`、`railway.toml` |
| B · 单机容器 | Nginx + Node，同域无跨域 | `docker compose up -d --build` → `http://IP:8080` |
| C · 纯静态 | 仅前端 | `cd frontend && npm run build`，产物 `frontend/dist` |

无论哪种方式，后端都必须长驻运行并对 `backend/data` 挂载持久卷 —— 付费判定和订单都存在那里。

## 付费逻辑

- 每本书设有 `previewRatio`（试读比例，如 `0.42`）。
- 后端按比例**裁剪正文后再返回**：未购买用户的响应里根本没有锁定段落，无法通过前端或浏览器调试绕过。
- 前端仅在截断处渲染模糊残影 + 遮罩 + 付费卡片，属于视觉层。
- `POST /api/books/:id/purchase` 为模拟支付；成功后写入已购状态，正文即时返回。
- 用户身份由请求头 `X-User-Id` 标识（前端本地生成随机 ID），仅用于演示，不含鉴权。

## 主要接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/books` | 书籍列表（`category` / `q` 筛选） |
| GET | `/api/books/mine` | 我的书架与订单 |
| GET | `/api/books/:id` | 书籍详情与目录 |
| GET | `/api/books/:id/chapters/:chapterId` | 章节正文（未购则截断） |
| POST | `/api/books/:id/purchase` | 模拟购买并解锁 |
| POST | `/api/books/:id/progress` | 保存阅读进度 |
| GET | `/api/health` | 健康检查 |

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19、Vite 7、TypeScript、Tailwind CSS 4、TanStack Query、Framer Motion |
| 后端 | Express 4、TypeScript、Zod、Pino |
| 数据 | 书籍内容内置 TypeScript 模块；用户/订单/进度落盘至 `backend/data/store.json` |

## 注意

- `node_modules/`、`backend/data/`、构建产物已在 `.gitignore` 中排除。
- 首次拉取代码后需分别执行 `pnpm install`。
