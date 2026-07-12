# 🔑 如何获取 Supabase Access Token

## 问题

Supabase MCP Server 需要 **Personal Access Token (PAT)**，而不仅仅是 Service Role Key。

错误信息：
```
Please provide a personal access token (PAT) with the --access-token flag 
or set the SUPABASE_ACCESS_TOKEN environment variable
```

## 解决方案

### 步骤 1：生成 Supabase Access Token

1. **登录 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard

2. **进入 Account Settings**
   - 点击右上角头像
   - 选择 "Account Settings"

3. **生成 Access Token**
   - 左侧菜单选择 "Access Tokens"
   - 点击 "Generate New Token"
   - 输入 Token 名称（例如：`kiro-mcp-token`）
   - 选择权限范围（建议选择 "All"）
   - 点击 "Generate Token"

4. **复制 Token**
   - ⚠️ **重要：** Token 只会显示一次，请立即复制保存！
   - Token 格式类似：`sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 步骤 2：更新配置文件

打开 `.kiro/settings/mcp.json`，找到 `supabase` 配置，替换 `YOUR_SUPABASE_ACCESS_TOKEN`：

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--access-token",
        "sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  // ← 替换为你的 Access Token
      ],
      "env": {
        "SUPABASE_URL": "https://rithloxzperfgiqyquch.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### 步骤 3：重启 Kiro

保存配置文件后，重启 Kiro。

## 备选方案：使用环境变量

如果你不想在配置文件中直接写 Token，可以使用环境变量：

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase"
      ],
      "env": {
        "SUPABASE_URL": "https://rithloxzperfgiqyquch.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "SUPABASE_ACCESS_TOKEN": "sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## 验证连接

重启后，你应该看到：

```
[supabase] Successfully connected and synced tools
```

然后可以测试：

```bash
"请列出 Supabase Power 的所有可用工具"
```

## 故障排查

### 如果还是无法连接

#### 方案 A：尝试社区包 `supabase-mcp`

这个包可能不需要 Access Token：

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "supabase-mcp"
      ],
      "env": {
        "SUPABASE_URL": "https://rithloxzperfgiqyquch.supabase.co",
        "SUPABASE_ANON_KEY": "你的 Anon Key",
        "SUPABASE_SERVICE_ROLE_KEY": "你的 Service Role Key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

#### 方案 B：尝试另一个社区包 `mcp-supabase`

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-supabase"
      ],
      "env": {
        "SUPABASE_URL": "https://rithloxzperfgiqyquch.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "你的 Service Role Key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## 获取其他凭证

### Anon Key（公开密钥）

1. 登录 Supabase Dashboard
2. 选择项目
3. 进入 Settings → API
4. 复制 "Project API keys" 下的 "anon public" key

### Service Role Key（服务端密钥）

1. 登录 Supabase Dashboard
2. 选择项目
3. 进入 Settings → API
4. 复制 "Project API keys" 下的 "service_role" key
5. ⚠️ **保密！** 这个 key 拥有完全权限

## 安全建议

- ✅ 将 Access Token 和 Service Role Key 添加到 `.gitignore`
- ✅ 不要分享给他人
- ✅ 定期轮换密钥
- ✅ 使用环境变量而不是硬编码

## 参考资源

- [Supabase Access Tokens 文档](https://supabase.com/docs/guides/platform/access-tokens)
- [Supabase MCP Server GitHub](https://github.com/supabase-community/supabase-mcp)
- [NPM: @supabase/mcp-server-supabase](https://www.npmjs.com/package/@supabase/mcp-server-supabase)

---

*配置文件位置：`.kiro/settings/mcp.json`*
