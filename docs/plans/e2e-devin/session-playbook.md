# Devin 会话剧本（Playbook）

> Updated: 2026-07-10

## 何时触发

1. **人工**：在 Devin 中开会话，粘贴下方提示词。  
2. **PR 后**：Devin 创建 PR 后点击 **Test the app**（见 [Testing & Video Recordings](https://docs.devin.ai/work-with-devin/testing-and-recordings)），并要求按本仓库 `smoke-p0.md` 执行。  
3. **域合并后**：只跑该域对应步骤（见各 `api-migration/0x-*.md` 第 7 节）。

## 提示词模板（中文）

```text
你在仓库 sangzi-smart-care（智护银龄）中做端到端验收。

必读：
- AGENTS.md
- docs/plans/e2e-devin/smoke-p0.md
- docs/plans/e2e-devin/secrets-and-env.md
- docs/issues/known-issues.md

环境：
1. 使用 Secrets 中的环境变量（与 .env.example 同名键）写入 .env.local
2. npm install
3. npm run dev（端口 7742）
4. 目标态只起 Next；若文档仍要求 Python 过渡期，再按 secrets-and-env 双进程

执行：
- 严格按 smoke-p0.md 的 P0 步骤 1–7 操作浏览器
- 每步用简短文字标注（便于录像）
- 失败时截图 + 说明是产品已知问题（known-issues）还是回归
- 全部通过后输出勾选清单与简短总结

不要：提交 .env；不要 force push；不要恢复 output: 'export'。
```

## 提示词模板（English short）

```text
E2E verify sangzi-smart-care per docs/plans/e2e-devin/smoke-p0.md.
Read AGENTS.md and known-issues.md. Start: npm i && npm run dev on :7742.
Record annotated video. Mark each P0 step pass/fail. No secrets in git.
```

## 录像要求

- 关键步骤加标注（如「P0-1 Login」「P0-4 Health input」）
- 结束后把录像附在会话中供人审

## 登录脚本（可选）

若 OTP 难自动化：用 Playwright 连接 CDP `http://localhost:29229` 预置 localStorage token（仅测试账号），脚本可放 `.agents/skills/devin-login/`（见 secrets-and-env）。预置后从 P0-3 开始测。
