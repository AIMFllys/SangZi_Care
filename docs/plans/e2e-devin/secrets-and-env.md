# Devin Secrets 与环境

> Updated: 2026-07-10

## Secrets（在 Devin 控制台配置，勿写入仓库）

与 [`.env.example`](../../../.env.example) **同名**：

| 键 | 用途 |
|----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 客户端 |
| `SUPABASE_SECRET_KEY` | 服务端 API（迁入后） |
| `NEXT_PUBLIC_APP_URL` | 可选，默认 `http://localhost:7742` |
| `NEXT_PUBLIC_API_BASE_URL` | 过渡期可设 `http://localhost:8000`；切流后**留空** |
| `JWT_SECRET` | Next auth 签发 |
| `SMTP_*` | 发验证码（E2E 登录需要） |
| `VOLCANO_*` | 可选；无则 AI 走降级 |

测试用邮箱账号密码也可作独立 Secret，供人工/脚本取信（勿提交）。

## 会话内启动

```bash
cp .env.example .env.local   # 再由 Secrets 注入覆盖
npm install
npm run dev                  # http://localhost:7742
```

探针：`GET http://localhost:7742/api/ping`

### 过渡期双进程（仅 API 未切流时）

```bash
# 终端 A：npm run dev
# 终端 B：按 backend/README 启动 FastAPI :8000
# .env.local: NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

**目标态**：只跑 Next。

## Playwright + CDP（可选）

Devin Chrome CDP：`http://localhost:29229`（见 [Computer Use](https://docs.devin.ai/work-with-devin/computer-use)）。

建议目录（实现时再建，本轮只规划）：

```
.agents/skills/devin-login/
  README.md
  login-via-cdp.mjs
```

脚本连接已有浏览器、写入测试 token 或走登录表单后断开；Cookie/localStorage 保留给 Computer Use 继续点。

## Nightly

- 有公网 staging：Automations → Nightly QA，对 staging URL 跑 smoke-p0。  
- **当前默认**：无 staging 时用会话内 `npm run dev`，按需手动或排期触发 playbook，不强制每日。

## 禁止

- 真实密钥进 git / 录像口述完整密钥  
- 在 Devin 中 `output: 'export'` 回退
