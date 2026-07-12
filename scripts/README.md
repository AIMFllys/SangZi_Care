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

过渡期若仍需 Python API：另开终端启动 `backend/`，并保持 `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`。  
详见 [docs/ops/local-setup.md](../docs/ops/local-setup.md)。

## Windows 批处理（dev/）

| 脚本 | 说明 |
|------|------|
| `dev/dev.bat` | 历史一键启停（可能仍尝试双开前后端；以 npm 单进程为准逐步简化） |
| `dev/start-dev.bat` / `stop-dev.bat` | 启停 |
| `dev/check-status.bat` | 状态检查 |
| `dev/test-all.bat` / `test-api.bat` | 测试相关 |
| `setup/test-env.bat` | 环境变量检查 |

**端口以 7742 为准**（不是旧文档中的 3000）。

## 规范

- 新脚本用 kebab-case；Shell 用 `.sh`，Node 用 `.mjs`/`.ts`
- 危险操作需确认提示
- 部署步骤以 [docs/ops/deploy-edgeone.md](../docs/ops/deploy-edgeone.md) 为准
