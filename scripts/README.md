# scripts/

开发、构建、部署辅助脚本。

## 目录

| 目录 | 用途 |
|------|------|
| [`setup/`](./setup/) | 环境检查（如 `test-env.bat`） |
| [`build/`](./build/) | 构建辅助（占位） |
| [`deploy/`](./deploy/) | EdgeOne 部署辅助（占位） |
| [`dev/`](./dev/) | 本地启停与联调脚本 |
| [`archive/`](./archive/) | 非现行统计脚本 |

## 日常开发（推荐）

```bash
# 仓库根目录
cp .env.example .env.local   # 首次
npm install
npm run dev                  # http://localhost:7742
```

探针：`http://localhost:7742/api/ping`

业务 API 全部由 Next.js 同源提供（`/api/v1/...`），无需独立后端进程。历史 Python `backend/` 已删除。  
详见 [docs/ops/local-setup.md](../docs/ops/local-setup.md)。

## Windows 批处理（dev/）

| 脚本 | 说明 |
|------|------|
| `dev/dev.bat` | 从仓库根目录启动 7742 端口的 Next.js 单进程开发服务 |
| `dev/start-dev.bat` / `stop-dev.bat` | 启动 / 停止 7742 端口服务 |
| `dev/check-status.bat` | 检查监听状态与同源 `/api/ping` |
| `dev/test-all.bat` | 运行 test、lint、tsc、build 四项交付门禁 |
| `dev/test-api.bat` | 检查本地 Next.js 同源 API 探针 |
| `setup/test-env.bat` | 环境变量检查 |

**端口以 7742 为准**（不是旧文档中的 3000）。

## 规范

- 新脚本用 kebab-case；Shell 用 `.sh`，Node 用 `.mjs`/`.ts`
- 危险操作需确认提示
- 部署步骤以 [docs/ops/deploy-edgeone.md](../docs/ops/deploy-edgeone.md) 为准
