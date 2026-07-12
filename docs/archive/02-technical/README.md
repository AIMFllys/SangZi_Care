# 🔧 技术文档

> **用途**：技术架构、数据库设计、API 文档、配置说明  
> **受众**：开发人员、技术负责人、DevOps

---

## 📄 文档列表

### DATABASE_SCHEMA.md（数据库设计文档）⭐
**数据库完整设计**，包含：
- 所有表结构（10 张核心表）
- ER 图和关系说明
- 索引优化策略
- RLS 安全策略
- 数据迁移记录

**适合阅读对象**：
- 后端开发者（必读）
- 数据库管理员
- 需要了解数据模型的前端开发者

**何时查阅**：
- 开发数据库相关功能时
- 编写 SQL 查询时
- 设计 API 接口时
- 优化数据库性能时

---

### MCP_POWERS_RECOMMENDATIONS.md（MCP 配置推荐）
**开发工具配置指南**，包含：
- 推荐的 MCP Servers（Supabase、Filesystem、Git 等）
- 每个 MCP Server 的用途和优先级
- 完整的配置文件示例
- 分阶段安装建议

**适合阅读对象**：
- 新加入的开发者
- 需要配置开发环境的人
- DevOps 工程师

**何时查阅**：
- 初次配置开发环境时
- 需要添加新的开发工具时
- 遇到 MCP 配置问题时

---

### SUPABASE_SETUP_COMPLETE.md（Supabase 配置完成报告）
**Supabase 配置状态报告**，包含：
- 已完成的配置工作
- 数据库表创建状态
- TypeScript 类型定义
- 可用功能清单
- 下一步操作建议

**适合阅读对象**：
- 需要了解 Supabase 配置状态的人
- 新加入的后端开发者

**何时查阅**：
- 了解项目当前状态时
- 验证 Supabase 配置时
- 开始数据库开发前

---

## 📝 待添加的文档

### API_DOCUMENTATION.md（API 文档）⏳
**后端 API 接口文档**，应包含：
- 所有 API 端点
- 请求/响应格式
- 认证方式
- 错误码说明
- 使用示例

### ARCHITECTURE.md（架构文档）⏳
**系统架构设计**，应包含：
- 整体架构图
- 前后端交互流程
- 第三方服务集成
- 部署架构

### SECURITY.md（安全文档）⏳
**安全策略和最佳实践**，应包含：
- 认证授权机制
- 数据加密方案
- API 安全策略
- 常见安全问题防范

---

## 🔄 文档维护

### 更新频率

- **DATABASE_SCHEMA.md**：每次数据库变更后立即更新
- **MCP_POWERS_RECOMMENDATIONS.md**：添加新工具时更新
- **SUPABASE_SETUP_COMPLETE.md**：重大配置变更时更新

### 文档同步

- 数据库变更必须同步更新文档
- 使用 Supabase MCP 自动生成 TypeScript 类型
- 定期检查文档与代码的一致性

---

## 💡 使用建议

### 开发前必读

1. 阅读 `DATABASE_SCHEMA.md` 了解数据模型
2. 阅读 `MCP_POWERS_RECOMMENDATIONS.md` 配置开发环境
3. 查看 `SUPABASE_SETUP_COMPLETE.md` 确认配置状态

### 开发中参考

- 编写数据库查询 → 查看 `DATABASE_SCHEMA.md`
- 遇到配置问题 → 查看 `MCP_POWERS_RECOMMENDATIONS.md`
- 需要 API 文档 → 查看 `API_DOCUMENTATION.md`（待创建）

---

*技术文档 · 桑梓智护*
