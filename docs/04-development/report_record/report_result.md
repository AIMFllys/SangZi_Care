# 🧓 老年人软件需求深度分析报告

> **项目名称：** 桑梓智护·心驿耆年——智慧医养赋能计划
> **数据来源：** 7份实地采访记录（内蒙古人民医院保健中心、贵州罗甸县沫阳镇养老院、成都老年康疗院/东虹老年病医院等），覆盖老年人、家属、养老机构工作人员、医护人员四类角色
> **分析日期：** 2026年2月25日

---

## 一、调研数据核心发现

### 1.1 用户画像分析

#### 👴 老年人群体特征

| 特征维度 | 调研发现 | 出现频率 |
|---------|---------|---------|
| **视力退化** | "眼神不好看不清小的"、"字幕可能很多老年人不会太多关注" | 高频 |
| **不识字** | "我们不识字孩子又离得远"、"有一些老人不识字" | 中高频 |
| **操作能力弱** | "复杂功能弄不明白"、"步骤太复杂懒得用" | 高频 |
| **依赖他人** | "让我的孩子帮忙"、"工作人员帮忙看吃什么" | 高频 |
| **慢性病管理** | 高血压、糖尿病、关节疼、睡眠问题 | 高频 |
| **孤独感** | "也能陪我聊聊天什么的"、心理陪伴需求 | 中频 |
| **手机使用** | 部分使用老年机（仅接听）；部分用智能手机（仅打电话+刷视频）| 普遍 |

#### 👨‍👩‍👦 家属群体特征

| 特征维度 | 调研发现 |
|---------|---------|
| **远程焦虑** | "自己不在老人身边，要有啥事自己不能第一时间帮忙" |
| **信息不对称** | "不用每天打电话问"、希望在手机上看到父母健康/饮食情况 |
| **代操作需求** | "最好能有'远程帮她选'的功能" |
| **技术不信任** | "摔倒警报也不太准"、"担心设备不好操作" |

#### 🏥 机构/医护人员特征

| 特征维度 | 调研发现 |
|---------|---------|
| **纸质流程低效** | "手写《订餐明细》"、字迹潦草食堂看不清 |
| **信息传达断裂** | 临时改医嘱赶不及通知、个性化备注容易遗漏 |
| **智能化程度低** | "均没有较高的智能化程度"、大多仅有一键呼叫 |
| **人才困境** | 医疗人员无职称评定/上升通道，难留住人才 |

---

### 1.2 核心需求提炼（按优先级排序）

#### 🔴 P0 - 刚需（老年人直接表达的强烈需求）

1. **语音交互** → "能直接'说'想要啥就好了"、"能语音控制最好"、"字少点能说话最好"
2. **用药提醒** → "提醒我吃药"、按时用药是普遍需求
3. **简单问诊** → "能快速问医生小问题"、"简单问诊"
4. **一键呼叫/紧急求助** → 唯一接受度极高的现有智能设备，"一按就有人过来"
5. **健康知识科普** → "了解点健康知识"、但必须以**音频**形式呈现

#### 🟡 P1 - 重要需求（家属+机构的迫切需求）

6. **家属远程查看** → 健康状态、饮食情况、用药是否规范
7. **远程代操作** → 家属帮老人选餐、调整设置
8. **医嘱-餐食自动关联** → 自动屏蔽禁忌食材、推荐适宜饮食
9. **慢性病管理数据化** → 血压、血糖、用药记录的数字化追踪
10. **机构管理数字化** → 订餐明细标签化、特殊需求自动提醒

#### 🟢 P2 - 增值需求（提升体验的锦上添花）

11. **陪聊/心理陪伴** → AI聊天伴侣
12. **异地就医辅助** → 预约挂号、排队信息
13. **异常检测与报警** → 跌倒检测、血压异常自动通知家属
14. **健康讲座推送** → 定期推送养生内容

---

### 1.3 关键洞察（KEY INSIGHTS）

> **洞察 1：语音是唯一出路**
> 老年人视力退化+不识字+操作困难，三重障碍叠加意味着：
> **文字界面几乎无效，语音交互是唯一可行的主要交互方式。**
> 医护人员也明确指出："如果能把绝大多数内容以音频形式来呈现，会让老年群体更容易接受。"

> **洞察 2：简单到极致 = 一个按钮 + 一句话**
> 一键呼叫器是唯一使用率极高的智能设备，核心原因是极致简单——"一按就有人来"。
> 软件设计必须达到同等简单度："别弄太多按钮"、"字要大声音要响"、"坏了好修"。

> **洞察 3：双端设计是必须的**
> 老年人端 = 极简语音交互端（平板/手机上的大按钮+语音）
> 家属端 = 信息查看+远程代操作端
> **家属是"隐形用户"** —— 很多操作由家属代为完成。

> **洞察 4：AI不是噱头，而是桥梁**
> AI在这里的核心价值不是"高科技展示"，而是：
> - 将老年人的模糊语音需求**翻译为结构化指令**（如"我要软饭+不甜的汤" → 订餐系统标签）
> - 将专业医疗术语**翻译为老年人能理解的语言**（健康科普）
> - 将分散的健康数据**聚合为家属可看的简明报告**

> **洞察 5：信任比功能更重要**
> 老年人对新技术的最大障碍不是"学不会"，而是"信不过"。
> 设备出错（如摔倒警报不准）、操作失误（如按错送错餐）一旦发生，
> 会导致永久性抛弃。必须设计**容错机制和确认步骤**。

---

## 二、产品设计规范

### 2.1 适老化UI/UX设计规范

#### 📱 视觉规范

```
【强制规范】

1. 字体大小
   - 正文最小字号：20px（rem: 1.25rem）
   - 标题字号：28px-36px（rem: 1.75rem-2.25rem）
   - 按钮文字：24px（rem: 1.5rem）起
   - 禁止使用 14px 及以下字号

2. 颜色对比度
   - 文字与背景对比度 ≥ 7:1（WCAG AAA级别）
   - 主要操作按钮使用高饱和暖色（如 #FF6B35 橙色、#E63946 红色）
   - 背景色使用柔和低饱和色（如 #FFF8F0 暖白）
   - 禁止使用纯白(#FFF)背景+浅灰文字的低对比组合

3. 按钮设计
   - 最小触控区域：56px × 56px（推荐 64px × 64px）
   - 按钮间距 ≥ 16px，避免误触
   - 按钮必须有明确的视觉边界（边框/阴影/色块）
   - 重要操作按钮使用圆角矩形，充满整行宽度

4. 图标与配图
   - 所有功能必须配有直观的图标+文字标签
   - 图标尺寸 ≥ 48px
   - 使用实物图而非抽象图标（如"吃药"用药丸图片，非抽象icon）
   - 为不识字老人提供图片版引导

5. 布局规范
   - 单列布局为主，避免复杂的网格
   - 每屏最多 3-4 个可操作项
   - 关键操作置于屏幕中下部（拇指可达区域）
   - 避免需要滚动才能看到的关键操作
```

#### 🔊 交互规范

```
【强制规范】

1. 语音优先原则
   - 所有文字内容提供"朗读"按钮（TTS）
   - 核心功能支持语音输入触发
   - 系统提示/反馈优先使用语音+文字双通道
   - 健康知识内容以音频为主要载体

2. 操作简化原则
   - 任何核心任务 ≤ 3步完成
   - 首页只展示最核心的 2-3 个功能入口
   - 禁止使用"滑动操作"、"长按"、"双击"等高级手势
   - 仅使用"单击"作为主交互方式

3. 反馈即时原则
   - 每次操作必须有即时视觉+声音反馈
   - 按钮点击后有明确的状态变化（颜色/大小）
   - 加载过程使用语音提示（"正在为您查询，请稍候..."）
   - 操作成功/失败都有清晰的语音播报

4. 容错机制
   - 所有关键操作（如下单、确认）提供"撤销"按钮
   - 误操作不会产生不可逆后果
   - 重要操作需"二次确认"（但以语音确认为主）
   - 系统自动保存进度，支持断点恢复

5. 无障碍要求
   - 全面支持屏幕阅读器
   - 支持系统级字体缩放（至200%不破版）
   - 色彩不作为信息传达的唯一手段
   - 提供高对比度模式开关
```

#### 🧭 导航规范

```
【强制规范】

1. 导航结构
   - 底部Tab导航，最多 4 个Tab
   - Tab图标+文字，不可只有图标
   - 当前Tab有高亮强调
   - 不使用侧边栏、抽屉式导航

2. 页面层级
   - 最大页面深度：2层（首页 → 详情页）
   - 每个页面左上角必须有明确的"返回"按钮
   - 返回按钮 ≥ 48px，文字标识"返回"

3. 常驻功能
   - 紧急呼叫按钮在所有页面可见（悬浮按钮）
   - 语音助手入口在所有页面可触达
```

---

### 2.2 AI交互设计规范

```
【火山引擎AI集成规范】

1. 语音识别（ASR）
   - 使用火山引擎语音识别API
   - 支持方言识别（覆盖调研地区方言：蒙古口音普通话、西南官话、四川话）
   - 降噪处理：适配养老院嘈杂环境
   - 识别结果需展示确认："您是不是想说：XXX？"

2. 语音合成（TTS）
   - 使用火山引擎语音合成API
   - 语速默认降低20%（相比标准语速）
   - 音调偏低沉温暖，避免尖锐机械音
   - 支持语速调节（慢速/正常/稍快 三档）

3. 大模型对话（LLM）
   - 使用火山引擎豆包大模型
   - System Prompt 必须包含：
     a. 角色设定：亲切、耐心的健康助手，像子女一样交流
     b. 语言风格：口语化、简短、避免专业术语
     c. 安全边界：明确告知"我不是医生"，严重症状引导就医
     d. 回答长度：控制在 3 句话以内，关键信息突出
   - 敏感话题处理：涉及用药/治疗方案的问题，必须加注"请咨询医生"

4. AI功能清单
   - 语音点餐：老人语音 → AI解析 → 生成订餐标签
   - 用药提醒：结合用药记录，定时语音提醒
   - 健康问答：简单健康知识问答（非诊断）
   - 健康科普：将健康知识转为音频播放
   - 智能摘要：将老人健康数据生成家属可读的日报
```

---

## 三、技术架构与开发规范

### 3.1 技术栈概览

```
┌─────────────────────────────────────────────────────┐
│                    用户设备层                          │
│  ┌──────────────┐    ┌──────────────────────────┐     │
│  │  Android APK  │    │  浏览器 (H5 Fallback)    │     │
│  │  (WebView容器) │    │                          │     │
│  └──────┬───────┘    └──────────┬───────────────┘     │
│         │                       │                      │
│         └───────────┬───────────┘                      │
│                     │                                  │
│  ┌──────────────────┴──────────────────────────────┐  │
│  │        Next.js 16.x 静态导出 (Static Export)      │  │
│  │        TypeScript + React 19                      │  │
│  │        CSS Modules / Vanilla CSS                  │  │
│  └──────────────────┬──────────────────────────────┘  │
└─────────────────────┼─────────────────────────────────┘
                      │ HTTPS API Calls
┌─────────────────────┼─────────────────────────────────┐
│                 后端服务层                               │
│  ┌──────────────────┴──────────────────────────────┐  │
│  │           Python + FastAPI                        │  │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────────────┐   │  │
│  │  │ Auth    │ │ CRUD API │ │ AI Proxy        │   │  │
│  │  │ Module  │ │ Module   │ │ (火山引擎)       │   │  │
│  │  └────┬────┘ └─────┬────┘ └────────┬────────┘   │  │
│  └───────┼────────────┼───────────────┼────────────┘  │
│          │            │               │                │
│  ┌───────┴────────────┴───────┐  ┌───┴────────────┐  │
│  │      Supabase               │  │  火山引擎 API   │  │
│  │  ┌──────┐ ┌──────┐ ┌────┐ │  │  ┌────┐ ┌────┐ │  │
│  │  │ Auth │ │ DB   │ │ OSS│ │  │  │ ASR│ │ TTS│ │  │
│  │  └──────┘ └──────┘ └────┘ │  │  └────┘ └────┘ │  │
│  │           ┌──────┐         │  │  ┌────┐        │  │
│  │           │ Edge │         │  │  │ LLM│        │  │
│  │           │ Func │         │  │  │豆包 │        │  │
│  │           └──────┘         │  │  └────┘        │  │
│  └────────────────────────────┘  └────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### 3.2 前端架构规范 (Next.js 16.x + TypeScript)

#### 项目结构

```
app/
├── public/                          # 静态资源
│   ├── icons/                       # 应用图标 (PWA)
│   ├── sounds/                      # 音效文件 (点击反馈、提示音)
│   └── images/                      # 图片资源 (实物图标)
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx               # 根布局 (字体、主题)
│   │   ├── page.tsx                 # 首页 (大按钮入口)
│   │   ├── (elder)/                 # 老年人端路由组
│   │   │   ├── voice/               # 语音助手页
│   │   │   │   └── page.tsx
│   │   │   ├── health/              # 健康管理页
│   │   │   │   └── page.tsx
│   │   │   ├── meal/                # 点餐页
│   │   │   │   └── page.tsx
│   │   │   └── emergency/           # 紧急呼叫页
│   │   │       └── page.tsx
│   │   │
│   │   └── (family)/                # 家属端路由组
│   │       ├── dashboard/           # 家属仪表盘
│   │       │   └── page.tsx
│   │       ├── health-report/       # 健康报告查看
│   │       │   └── page.tsx
│   │       ├── meal-manage/         # 远程点餐管理
│   │       │   └── page.tsx
│   │       └── settings/            # 设置（代操作）
│   │           └── page.tsx
│   │
│   ├── components/                  # 组件库
│   │   ├── ui/                      # 基础UI组件（适老化）
│   │   │   ├── BigButton.tsx        # 大按钮组件
│   │   │   ├── BigCard.tsx          # 大卡片组件
│   │   │   ├── VoiceInput.tsx       # 语音输入组件
│   │   │   ├── AudioPlayer.tsx      # 音频播放器
│   │   │   ├── ConfirmDialog.tsx    # 确认对话框（大字+语音）
│   │   │   ├── EmergencyFAB.tsx     # 紧急呼叫浮动按钮
│   │   │   └── BackButton.tsx       # 返回按钮
│   │   ├── elder/                   # 老年人端专用组件
│   │   │   ├── VoiceAssistant.tsx   # 语音助手主组件
│   │   │   ├── MedicineReminder.tsx # 用药提醒组件
│   │   │   ├── HealthTips.tsx       # 健康科普音频组件
│   │   │   └── MealOrder.tsx        # 语音点餐组件
│   │   └── family/                  # 家属端专用组件
│   │       ├── HealthDashboard.tsx  # 健康看板
│   │       ├── RemoteMealPicker.tsx # 远程选餐
│   │       └── AlertHistory.tsx     # 异常告警历史
│   │
│   ├── hooks/                       # 自定义 Hooks
│   │   ├── useVoiceRecognition.ts   # 语音识别 Hook
│   │   ├── useTextToSpeech.ts       # 语音合成 Hook
│   │   ├── useApiClient.ts          # API 客户端 Hook
│   │   ├── useAccessibility.ts      # 无障碍辅助 Hook
│   │   └── useEmergency.ts          # 紧急呼叫 Hook
│   │
│   ├── lib/                         # 工具库
│   │   ├── api.ts                   # API 基础封装
│   │   ├── audio.ts                 # 音频处理工具
│   │   ├── accessibility.ts         # 无障碍工具函数
│   │   └── constants.ts             # 常量定义
│   │
│   ├── stores/                      # 状态管理
│   │   ├── userStore.ts             # 用户状态（Zustand）
│   │   ├── healthStore.ts           # 健康数据状态
│   │   └── voiceStore.ts            # 语音状态
│   │
│   ├── styles/                      # 样式系统
│   │   ├── globals.css              # 全局样式 + CSS变量
│   │   ├── elder-theme.css          # 老年人端主题
│   │   ├── family-theme.css         # 家属端主题
│   │   └── accessibility.css        # 无障碍增强样式
│   │
│   └── types/                       # TypeScript 类型
│       ├── user.ts
│       ├── health.ts
│       ├── meal.ts
│       └── ai.ts
│
├── next.config.ts                   # Next.js 配置（含 output: 'export'）
├── tsconfig.json
├── package.json
└── .env.local                       # 环境变量
```

#### Next.js 配置要点

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 🔑 关键：纯静态导出，用于WebView打包
  output: 'export',

  // 静态导出不支持图片优化，使用自定义loader
  images: {
    unoptimized: true,
  },

  // 禁用服务端特性（纯静态）
  // 所有数据通过客户端 API 调用获取

  // 尾部斜杠（WebView兼容性）
  trailingSlash: true,
};

export default nextConfig;
```

#### CSS 变量体系（适老化主题）

```css
/* globals.css */
:root {
  /* 字体系统 */
  --font-size-xs: 1rem;      /* 16px - 最小允许字号(仅辅助信息) */
  --font-size-sm: 1.125rem;  /* 18px */
  --font-size-base: 1.25rem; /* 20px - 正文基准 */
  --font-size-lg: 1.5rem;    /* 24px */
  --font-size-xl: 1.75rem;   /* 28px */
  --font-size-2xl: 2.25rem;  /* 36px */
  --font-size-3xl: 3rem;     /* 48px */

  --font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-weight-normal: 400;
  --font-weight-bold: 700;
  --line-height: 1.8;

  /* 色彩系统 - 暖色调 */
  --color-primary: #E85D2C;        /* 温暖橙红 */
  --color-primary-light: #FF8A5C;
  --color-primary-dark: #C44B20;
  --color-secondary: #2D7D46;      /* 健康绿 */
  --color-secondary-light: #4CAF6A;
  --color-danger: #D32F2F;         /* 紧急红 */
  --color-warning: #F9A825;        /* 警告黄 */
  --color-success: #388E3C;        /* 成功绿 */

  --color-bg: #FFF8F0;             /* 暖米白背景 */
  --color-bg-card: #FFFFFF;
  --color-bg-elevated: #FFF3E8;
  --color-text: #2C1810;           /* 深褐文字 */
  --color-text-secondary: #6D4C3D;
  --color-border: #E0C8B8;

  /* 间距系统 */
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;

  /* 圆角 */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* 触控区域 */
  --touch-target-min: 56px;
  --touch-target-recommended: 64px;

  /* 阴影 */
  --shadow-card: 0 2px 8px rgba(44, 24, 16, 0.08);
  --shadow-button: 0 4px 12px rgba(44, 24, 16, 0.12);
  --shadow-elevated: 0 8px 24px rgba(44, 24, 16, 0.16);

  /* 动画 */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}

/* 高对比度模式 */
[data-theme="high-contrast"] {
  --color-bg: #000000;
  --color-bg-card: #1A1A1A;
  --color-text: #FFFFFF;
  --color-text-secondary: #E0E0E0;
  --color-primary: #FF9B71;
  --color-border: #666666;
}

/* 字体缩放支持 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 3.3 后端架构规范 (Python + FastAPI)

#### 项目结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI 入口
│   ├── config.py                    # 配置管理
│   │
│   ├── api/                         # API 路由
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # 认证接口
│   │   │   ├── users.py             # 用户管理
│   │   │   ├── health.py            # 健康数据
│   │   │   ├── meals.py             # 餐食管理
│   │   │   ├── medications.py       # 用药管理
│   │   │   ├── ai_chat.py           # AI对话接口
│   │   │   ├── ai_voice.py          # 语音处理接口
│   │   │   ├── emergency.py         # 紧急呼叫
│   │   │   └── notifications.py     # 通知推送
│   │   └── deps.py                  # 依赖注入
│   │
│   ├── models/                      # 数据模型 (Pydantic)
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── health_record.py
│   │   ├── meal_order.py
│   │   ├── medication.py
│   │   └── ai_session.py
│   │
│   ├── services/                    # 业务逻辑
│   │   ├── __init__.py
│   │   ├── supabase_client.py       # Supabase 客户端
│   │   ├── ai_service.py            # 火山引擎AI服务封装
│   │   ├── voice_service.py         # 语音处理服务
│   │   ├── health_service.py        # 健康数据服务
│   │   ├── meal_service.py          # 餐食服务
│   │   └── notification_service.py  # 通知服务
│   │
│   ├── core/                        # 核心模块
│   │   ├── __init__.py
│   │   ├── security.py              # 安全相关
│   │   ├── exceptions.py            # 自定义异常
│   │   └── middleware.py            # 中间件
│   │
│   └── utils/                       # 工具函数
│       ├── __init__.py
│       └── helpers.py
│
├── requirements.txt
├── Dockerfile
└── .env
```

#### Supabase 数据库设计

```sql
-- 用户表（支持老年人+家属双角色）
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,        -- 手机号登录（老年人友好）
  role VARCHAR(20) NOT NULL CHECK (role IN ('elder', 'family', 'staff', 'admin')),
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  accessibility_settings JSONB DEFAULT '{
    "fontSize": "large",
    "highContrast": false,
    "voiceSpeed": "slow",
    "autoReadAloud": true
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 家属-老人绑定关系
CREATE TABLE elder_family_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  elder_id UUID REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES users(id) ON DELETE CASCADE,
  relation VARCHAR(50),                     -- 关系（如"儿子"、"女儿"）
  is_primary BOOLEAN DEFAULT FALSE,         -- 是否主要联系人
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(elder_id, family_id)
);

-- 健康记录
CREATE TABLE health_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  record_type VARCHAR(50) NOT NULL,         -- 'blood_pressure', 'blood_sugar', 'heart_rate', 'weight'
  value JSONB NOT NULL,                     -- 灵活存储：{"systolic": 130, "diastolic": 85}
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  measured_by VARCHAR(50),                  -- 'self', 'nurse', 'device'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用药计划
CREATE TABLE medication_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  medication_name VARCHAR(200) NOT NULL,
  dosage VARCHAR(100),                      -- 用量
  frequency VARCHAR(100),                   -- 频率
  time_slots JSONB NOT NULL,                -- ["08:00", "12:00", "20:00"]
  dietary_notes TEXT,                       -- 饮食禁忌
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用药记录
CREATE TABLE medication_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES medication_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  actual_time TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending',     -- 'pending', 'taken', 'missed', 'skipped'
  reminded_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 餐食订单
CREATE TABLE meal_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  meal_type VARCHAR(20) NOT NULL,           -- 'breakfast', 'lunch', 'dinner'
  order_date DATE NOT NULL,
  dietary_tags JSONB DEFAULT '[]',          -- ["无糖", "软饭", "剪碎", "低盐"]
  special_notes TEXT,                       -- 特殊备注
  ordered_by UUID REFERENCES users(id),     -- 谁下的单（老人自己/家属代下）
  order_method VARCHAR(20),                 -- 'voice', 'manual', 'family_remote'
  status VARCHAR(20) DEFAULT 'pending',     -- 'pending', 'confirmed', 'preparing', 'delivered'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI对话记录
CREATE TABLE ai_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_type VARCHAR(50),                 -- 'health_qa', 'meal_order', 'daily_chat', 'health_tips'
  messages JSONB DEFAULT '[]',
  voice_input_url TEXT,                     -- 原始语音文件URL
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 紧急呼叫记录
CREATE TABLE emergency_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  call_type VARCHAR(50),                    -- 'one_key', 'fall_detected', 'abnormal_vital'
  status VARCHAR(20) DEFAULT 'active',      -- 'active', 'responded', 'resolved', 'false_alarm'
  responded_by UUID REFERENCES users(id),
  response_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 通知记录
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50),            -- 'medication_reminder', 'health_alert', 'meal_ready', 'emergency'
  title VARCHAR(200),
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_voice_played BOOLEAN DEFAULT FALSE,    -- 是否已语音播报
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_orders ENABLE ROW LEVEL SECURITY;
-- ... 其他表类似

-- 索引优化
CREATE INDEX idx_health_records_user_date ON health_records(user_id, measured_at DESC);
CREATE INDEX idx_medication_logs_user_status ON medication_logs(user_id, status, scheduled_time);
CREATE INDEX idx_meal_orders_user_date ON meal_orders(user_id, order_date);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
```

### 3.4 API 设计规范

```yaml
# API 路径规范
/api/v1/
  # 认证
  POST   /auth/login-phone           # 手机号+验证码登录（老年人友好）
  POST   /auth/login-voice           # 语音登录（声纹识别，未来）
  POST   /auth/refresh               # Token刷新

  # 用户
  GET    /users/me                   # 获取当前用户
  PUT    /users/me/settings          # 更新无障碍设置
  GET    /users/me/elders            # 家属查看绑定的老人列表
  POST   /users/bind-family          # 绑定家属关系

  # 健康管理
  GET    /health/records             # 获取健康记录
  POST   /health/records             # 新增健康记录
  GET    /health/summary             # AI生成健康摘要（给家属看）
  GET    /health/medication-plans    # 获取用药计划
  POST   /health/medication-taken    # 标记已服药

  # 餐食
  GET    /meals/today                # 今日餐食
  POST   /meals/order                # 下单（含语音解析结果）
  POST   /meals/order-by-voice       # 语音点餐（上传音频）
  PUT    /meals/order/:id            # 修改订单（家属远程修改）

  # AI服务
  POST   /ai/chat                    # AI对话
  POST   /ai/voice-to-text           # 语音转文字
  POST   /ai/text-to-voice           # 文字转语音
  POST   /ai/health-tips             # 获取健康科普内容（音频）
  POST   /ai/parse-meal-order        # 解析语音点餐意图

  # 紧急服务
  POST   /emergency/call             # 发起紧急呼叫
  PUT    /emergency/call/:id/respond # 响应紧急呼叫
  GET    /emergency/history          # 呼叫历史

  # 通知
  GET    /notifications              # 获取通知列表
  PUT    /notifications/:id/read     # 标记已读
```

### 3.5 WebView APK 打包规范

```
【Android WebView容器要求】

1. 最低API级别：API 24 (Android 7.0)
   - 覆盖绝大多数老年人使用的中低端安卓设备

2. WebView配置
   - 启用JavaScript
   - 启用DOM Storage (localStorage)
   - 启用媒体自动播放（语音播报需要）
   - 配置音频焦点管理
   - 允许麦克风权限（语音输入）

3. 权限清单
   - INTERNET                    # 网络访问
   - RECORD_AUDIO               # 麦克风（语音输入）
   - VIBRATE                    # 振动反馈
   - WAKE_LOCK                  # 防止休眠（用药提醒）
   - RECEIVE_BOOT_COMPLETED     # 开机启动（用药提醒）
   - POST_NOTIFICATIONS         # 通知权限（Android 13+）

4. 离线支持策略
   - Service Worker 缓存核心页面
   - 本地缓存当日用药计划和餐食订单
   - 离线时仍可触发紧急呼叫（通过原生拨号）
   - 网络恢复后自动同步离线数据

5. 性能优化
   - 首屏加载 < 2s（静态文件本地加载）
   - 语音响应延迟 < 1s
   - 内存占用 < 150MB
   - APK体积 < 30MB
```

---

## 四、MVP 功能范围

### 4.1 MVP Phase 1（核心验证，4周）

| 功能模块 | 老年人端 | 家属端 | 优先级 |
|---------|---------|--------|--------|
| 用户注册/登录 | 手机号+验证码 | 手机号+验证码 | P0 |
| 家属绑定 | 展示绑定码 | 扫码/输入绑定 | P0 |
| 语音助手 | 语音问答（健康知识） | - | P0 |
| 用药提醒 | 语音提醒+大按钮确认 | 查看服药记录 | P0 |
| 紧急呼叫 | 一键呼叫按钮 | 接收紧急通知 | P0 |
| 健康记录 | 语音录入血压/血糖 | 查看健康报表 | P1 |

### 4.2 MVP Phase 2（价值扩展，4周）

| 功能模块 | 老年人端 | 家属端 | 优先级 |
|---------|---------|--------|--------|
| 语音点餐 | 语音下单+确认 | 远程代下单 | P1 |
| 健康科普 | 音频健康讲座 | - | P1 |
| AI健康摘要 | - | 每日健康日报 | P1 |
| 餐食管理 | 查看今日餐食 | 查看餐食是否符合医嘱 | P1 |
| 高对比度模式 | 开关切换 | - | P2 |

### 4.3 MVP Phase 3（生态完善，4周）

| 功能模块 | 描述 | 优先级 |
|---------|------|--------|
| 机构管理端 | 护士/护工查看订餐、管理用药 | P2 |
| 医嘱关联 | 自动根据医嘱过滤餐食选项 | P2 |
| 跌倒检测 | 通过手机传感器检测异常 | P2 |
| 方言扩展 | 扩展更多方言识别能力 | P2 |

---

## 五、开发编码规范

### 5.1 TypeScript 编码规范

```typescript
// ✅ 好的适老化组件示例
interface BigButtonProps {
  /** 按钮文字 - 必须简短明了 */
  label: string;
  /** 按钮图标 - 必须使用实物图 */
  icon?: React.ReactNode;
  /** 点击回调 */
  onPress: () => void;
  /** 语音播报文字（点击后TTS播放） */
  voiceFeedback?: string;
  /** 是否为紧急按钮（红色高亮） */
  isEmergency?: boolean;
}

const BigButton: React.FC<BigButtonProps> = ({
  label,
  icon,
  onPress,
  voiceFeedback,
  isEmergency = false,
}) => {
  const { speak } = useTextToSpeech();

  const handlePress = () => {
    // 1. 触觉反馈
    if (navigator.vibrate) navigator.vibrate(50);
    // 2. 语音反馈
    if (voiceFeedback) speak(voiceFeedback);
    // 3. 执行回调
    onPress();
  };

  return (
    <button
      className={`big-button ${isEmergency ? 'big-button--emergency' : ''}`}
      onClick={handlePress}
      aria-label={label}
      role="button"
    >
      {icon && <span className="big-button__icon">{icon}</span>}
      <span className="big-button__label">{label}</span>
    </button>
  );
};
```

### 5.2 Python 编码规范

```python
# ✅ 好的AI服务封装示例
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

class VoiceChatRequest(BaseModel):
    """语音对话请求"""
    audio_base64: str  # Base64编码的音频
    session_id: str | None = None  # 会话ID（续聊）

class VoiceChatResponse(BaseModel):
    """语音对话响应"""
    text_response: str      # 文字回复
    audio_url: str           # 语音回复URL
    session_id: str          # 会话ID
    intent: str | None = None  # 识别到的意图

# System Prompt 模板 - 适老化
ELDER_SYSTEM_PROMPT = """
你是一位亲切、耐心的健康助手，名字叫"小护"。
你正在和一位老年人对话，请遵守以下规则：

1. 语言风格：像孙子孙女一样亲切，说话简短通俗
2. 回答长度：每次回答不超过3句话
3. 专业术语：全部替换为通俗表达（如"高血压"说"血压偏高"）
4. 安全边界：你不是医生，涉及具体治疗请说"这个需要问问您的医生"
5. 关怀语气：在合适时加入"您别担心"、"慢慢来"等安慰语
6. 用药提醒：只提醒吃药时间，不建议药物/剂量
""".strip()
```

---

## 六、总结

### 核心设计原则（ELDER原则）

| 原则 | 英文 | 含义 |
|------|------|------|
| **E** | Easy | 极致简单，≤3步完成任务 |
| **L** | Loud & Large | 大字、大按钮、响声音 |
| **D** | Dual-channel | 语音+视觉双通道呈现 |
| **E** | Error-tolerant | 容错友好，误操作可撤销 |
| **R** | Relational | 关系导向，连接老人与家属 |

### 一句话总结

> **老年人不需要"智能"的软件，他们需要"聪明到感觉不到技术存在"的软件。**
> 最好的适老化设计，是让老年人觉得"我在跟人说话"，而不是"我在用手机"。