# Devin 云端 E2E 验收

> Created: 2026-07-10  
> Status: planned

用 **Devin 云端会话**做端到端验收：起栈 → 浏览器走用户路径 → **录像回传**。  
仓库内 Playwright 为增强项，非本轮必须先写满。

## 官方能力依据

| 能力 | 文档 |
|------|------|
| PR 后 Test the app + 标注录像 | [Testing & Video Recordings](https://docs.devin.ai/work-with-devin/testing-and-recordings) |
| 桌面点击 / 起本地应用 | [Computer Use](https://docs.devin.ai/work-with-devin/computer-use) |
| Playwright 挂 Devin Chrome（CDP `http://localhost:29229`） | 同上 Computer Use |
| 定时冒烟自动化模板 | Devin Automations → Nightly QA & Smoke Tests（控制台模板；URL 可能调整） |
| Secrets + 自然语言 QA 参考 | [CognitionAI/qa-devin](https://github.com/CognitionAI/qa-devin) |

## 本目录

| 文档 | 内容 |
|------|------|
| [smoke-p0.md](./smoke-p0.md) | P0/P1/P2 路径与通过标准 |
| [session-playbook.md](./session-playbook.md) | 给 Devin 的固定提示词 |
| [secrets-and-env.md](./secrets-and-env.md) | Secrets、启动命令、CDP |

## 与 API 迁移的耦合

每完成一个 [api-migration](../api-migration/) 域，用该域 md 第 7 节「Devin」路径跑一次短验，**不要**等 12-cleanup 才测。

## 验收权威

1. Devin 按 playbook 执行  
2. 录像中关键步骤有标注  
3. smoke-p0 清单全部勾选或注明跳过原因（见 [known-issues](../../issues/known-issues.md)）

## 默认环境策略

当前无稳定公网 staging 时：**在 Devin 会话内** `npm install && npm run dev`（端口 7742），目标态**仅 Next 单进程**。过渡期双进程见 secrets-and-env。
