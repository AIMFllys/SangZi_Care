# EdgeOne Pages 部署

> Updated: 2026-07-10  
> 官方参考：[Next.js 框架指南](https://pages.edgeone.ai/zh/document/framework-nextjs)

## 前提

- 仓库为**全栈** Next（**无** `output: 'export'`）
- 根目录存在 [edgeone.json](../../edgeone.json)
- 控制台已配置与 [.env.example](../../.env.example) **同名**的环境变量

## 推荐流程：Git 连接

1. EdgeOne Makers / Pages 控制台 → 导入 Git 仓库  
2. 构建设置：`npm install` + `npm run build`  
3. 全栈输出目录：**`.next`**（与官方 SSR/全栈说明一致；勿填 `out`）  
4. 同步环境变量（含 `SUPABASE_SECRET_KEY` 等服务端密钥）  
5. 部署完成后用 https 域名验证页面与 `GET /api/ping`

## CLI（可选）

```bash
# 需已安装并登录 EdgeOne CLI
edgeone pages deploy
```

## 注意

- Next 的 redirects/rewrites 请写在 `edgeone.json`，不要写在 `next.config.ts`
- 单文件 ≤ 25MB；大媒体走 COS/CDN，勿塞进 `public/`
- Android / 浏览器直接打开该 https 域名（模式 B）

## 相关

- [env-config.md](./env-config.md)
- [target-architecture.md](../designs/target-architecture.md)
