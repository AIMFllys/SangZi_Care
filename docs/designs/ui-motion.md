# UI 动效与加载契约

> Created: 2026-09-10
> Updated: 2026-09-10
> Status: accepted

## 问题陈述

页面切换硬切、Tab 与按钮缓动不一致、晚加载只显示「加载中...」，观感不整齐。

## 最终决策

| 项 | 决策 |
|----|------|
| 页面切换 | 内容区透明度淡入 280ms；`PageFade` 动画结束立刻去掉 animation，避免 Android WebView 白屏 |
| 按下 | `scale(var(--press-scale))`，默认 `0.97`，150ms |
| 默认缓动 | 只用 `--ease-out-smooth`；`--ease-spring` 不再用于导航 |
| 晚加载 | 骨架屏（shimmer），不用弹跳圆点 |
| 提交中 | 按钮内 `LoadingSpinner` |
| 减弱动效 | `prefers-reduced-motion: reduce` 下关闭淡入与循环动画 |
| 实现 | `app/template.tsx` + `styles/globals.css`；不引入动画库、不用 View Transitions |
| CSS 预算 | 聊天/广播改用共享 `PageHeader` 后，公共 CSS chunk 略增；单文件上限 128KiB，总量仍 ≤200KiB |

## 决策理由

适老化优先：只改透明度、短时长，避免位移造成晕眩。Android WebView 对 View Transitions 支持不稳定。
