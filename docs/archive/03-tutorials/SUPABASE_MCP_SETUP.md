# 🔧 Supabase MCP Server 配置说明

## 问题解决

### 错误：`@supabase/mcp-server` 包不存在

**原因：** 包名错误

**解决方案：** 使用正确的包名

## 正确的配置

### 方案 1：官方包（推荐）

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
        "SUPABASE_URL": "https://xxxxx.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### 方案 2：社区包（备选）

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
        "SUPABASE_URL": "https://xxxxx.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### 方案 3：另一个社区包

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
        "SUPABASE_URL": "https://xxxxx.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## 当前配置状态

✅ 已更新为：`@supabase/mcp-server-supabase`（官方包）

## 验证步骤

1. **保存配置文件**
2. **重启 Kiro**
3. **查看 MCP 日志**
   - 应该看到：`[supabase] Successfully connected`
   - 不应该看到：`404 Not Found` 错误

## 测试连接

重启后，尝试以下命令测试连接：

```bash
"请列出 Supabase Power 的所有可用工具"
```

或

```bash
"请使用 Supabase Power 查询 users 表的结构"
```

## 可用的 MCP 工具

成功连接后，你可以使用以下工具：

### 数据库操作
- `query_database` - 执行 SQL 查询
- `list_tables` - 列出所有表
- `describe_table` - 查看表结构
- `create_table` - 创建新表
- `alter_table` - 修改表结构
- `drop_table` - 删除表

### Storage 操作
- `list_buckets` - 列出所有存储桶
- `upload_file` - 上传文件
- `download_file` - 下载文件
- `delete_file` - 删除文件

### 项目管理
- `get_project_info` - 获取项目信息
- `list_functions` - 列出 Edge Functions
- `get_logs` - 查看日志

## 故障排查

### 如果仍然无法连接

1. **检查包名是否正确**
   ```bash
   # 在终端运行，验证包是否存在
   npx -y @supabase/mcp-server-supabase --version
   ```

2. **检查凭证是否正确**
   - SUPABASE_URL 格式：`https://xxxxx.supabase.co`
   - SERVICE_ROLE_KEY 应该是一个很长的 JWT token

3. **查看完整日志**
   - 打开 Kiro 的 MCP Logs 面板
   - 查找具体的错误信息

4. **尝试备选方案**
   - 如果官方包不行，尝试社区包 `supabase-mcp` 或 `mcp-supabase`

## 参考资源

- [Supabase MCP 官方文档](https://supabase.com/docs/guides/getting-started/mcp)
- [NPM 包：@supabase/mcp-server-supabase](https://www.npmjs.com/package/@supabase/mcp-server-supabase)
- [NPM 包：supabase-mcp](https://www.npmjs.com/package/supabase-mcp)
- [NPM 包：mcp-supabase](https://www.npmjs.com/package/mcp-supabase)

---

*配置文件位置：`.kiro/settings/mcp.json`*
