# 📋 桑梓智护 · 开发计划 (Development Plan)

> **创建日期：** 2026-02-25
> **文档关联：** `docs/PRODUCT_SPEC.md`（产品规格书）、`docs/PROJECT_DEEP_ANALYSIS.md`（深度分析）、`docs/report_result`（调研报告）

---
****重要补充****
增加一个AI总结对话机制，提炼出家属/老年人更盼望的一些事情，并同步到双方亲属看板中，最后这里展示时明确表明心灵上相通是最好的医学治疗

## 一、已确认决策清单

### ✅ D1: 语音唤醒分期策略

| 阶段 | 方案 | 状态 |
|------|------|------|
| **MVP** | 下滑拉出语音面板 + 点击语音球 | ✅ 确认，当前做 |
| **V2** | Android原生层唤醒词检测（JSBridge通知WebView） | ⏭️ 后续做 |

### ✅ D2: 紧急呼叫方案

| 阶段 | 方案 | 状态 |
|------|------|------|
| **MVP** | 自动拨打亲属电话 → 失败后弹出页面倒数5秒，这5秒可以点击取消，倒计时结束后自动拨打110 | ✅ 确认，当前做 |
| **V2** | 方案C完整版（见下方"紧急呼叫V2方案"） | ⏭️ 后续做，详见§1.1 |

### ✅ D3: 语音识别/合成技术选型

| 能力 | 优先方案 | 降级方案 |
|------|---------|---------|
| **实时语音识别** | 浏览器 Web Speech API / Android SpeechRecognizer | Doubao-流式语音识别 |
| **语音合成** | 浏览器 SpeechSynthesis API / Android TTS | Doubao-语音合成 |
| **录音文件转写** | Doubao-录音文件识别2.0（唯一方案） | — |
| **AI实时对话** | Doubao-实时语音交互（唯一方案） | — |

**技术优先级链：**

```
实时语音识别: Web Speech API → Android Native → Doubao-流式语音识别
语音合成:     SpeechSynthesis API → Android Native TTS → Doubao-语音合成
录音转写:     Doubao-录音文件识别2.0（捂话语音转文字等）
AI实时对话: Doubao-实时语音交互（语音助手核心）
```

### ✅ D4: 双向关怀模式

老年人可看到家属的基础健康状态、最近在线时间、天气所在地、用药提醒状态（简）。
家属可看到老人的完整健康数据+代操作。

### ✅ D5: 捂话功能

新增语音留言+文字聊天功能：
- 默认语音留言（按住录音、松开发送）
- 可切换文字输入
- AI可识别捂话意图，自动发送
- 语音消息自动用 Doubao-录音文件识别2.0 转写文字版

---

## §1.1 紧急呼叫V2方案（暂不实现，记录备忘）

> **状态：⏭️ 暂不做，仅记录方案设计**

### 完整紧急呼叫流程（V2）

```
用户触发紧急呼叫（按钮/语音"救命"/AI判断）
        │
        ▼
┌──────────────────┐
│ Step 1: 拨打电话  │
│ 自动拨打亲属电话  │
└────────┬─────────┘
         │
    ┌────┴────┐
    │ 能打通？ │
    └────┬────┘
    YES  │  NO
    │    │
    ▼    ▼
 完成  ┌──────────────────────────────────┐
       │ Step 2: 自动拨打110              │
       └────────┬─────────────────────────┘
                │
           ┌────┴────┐
           │ 能打通？ │
           └────┬────┘
           YES  │  NO（无电话权限/无SIM卡等）
           │    │
           ▼    ▼
        完成  ┌──────────────────────────────────────┐
              │ Step 3: 录音备份模式（仅老人已绑家属） │
              │                                      │
              │ 触发条件：                              │
              │ - 电话全部无法打通                       │
              │ - 老年人已绑定至少1位家属                 │
              │                                      │
              │ 老年人端：                              │
              │ ① 自动开启录音模式                       │
              │ ② 每录音1分钟 → 自动保存到Supabase Storage│
              │ ③ 保存后继续录音（下一个1分钟片段）        │
              │ ④ 录音持续直到家属远程停止 或 老人手动停止  │
              │                                      │
              │ 家属端：                               │
              │ ① 强制弹窗（即使App在后台也要弹）         │
              │ ② 弹窗内容：                            │
              │    "⚠️ [爸爸/妈妈]触发了紧急呼叫！         │
              │     电话未能打通，目前正在录音中。          │
              │     请尽快联系或前往查看。"               │
              │ ③ 功能按钮：                            │
              │    [🔴 停止录音]  [📞 回拨电话]            │
              │    [📋 查看情况]                         │
              │                                      │
              │ AI自动分析（每1分钟录音段完成后）：        │
              │ ① 将每段1分钟录音 → ASR转文字             │
              │ ② 文字 → 豆包LLM分析：                   │
              │    - 老人当前状态（紧急程度评估）           │
              │    - 关键词提取（摔倒、疼痛、呼救等）      │
              │    - 简要总结推送给家属                   │
              │ ③ 分析结果实时更新到家属端弹窗             │
              │                                      │
              │ 未绑定家属的老人：                       │
              │ → 不触发录音模式                        │
              │ → 停留在拨打110的步骤                    │
              └──────────────────────────────────────┘
```

### V2方案数据库需求

```sql
-- 紧急录音记录表（V2时创建）
CREATE TABLE emergency_recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  emergency_id UUID REFERENCES emergency_calls(id),  -- 关联紧急呼叫记录
  user_id UUID REFERENCES users(id),                  -- 老年人ID
  segment_index INT NOT NULL,                          -- 录音段序号(1,2,3...)
  audio_url TEXT NOT NULL,                             -- Supabase Storage URL
  duration_seconds INT DEFAULT 60,                     -- 录音时长
  transcript TEXT,                                     -- ASR转写文本
  ai_summary TEXT,                                     -- AI分析总结
  ai_severity VARCHAR(20),                             -- AI评估紧急程度: low/medium/high/critical
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### V2方案技术难点备忘

| 难点 | 说明 | 可能方案 |
|------|------|---------|
| 后台弹窗 | WebView App在后台时无法弹窗 | Android原生Notification + 高优先级Channel |
| 持续录音 | 浏览器标签页后台时录音可能被暂停 | Android原生Foreground Service录音 |
| 录音上传 | 1分钟音频文件大小约1MB，需可靠上传 | 分段上传 + 断点续传 + 本地缓存 |
| 实时推送 | 家属端需实时收到录音分析结果 | Supabase Realtime / WebSocket |

---

## 二、MVP功能清单（Phase 1）

### 2.1 按优先级排列

| # | 功能 | 优先级 | 估时 | 依赖 |
|---|------|--------|------|------|
| 1 | 项目初始化（Next.js 16 + TS + 静态导出配置） | P0 | 0.5天 | — |
| 2 | CSS设计系统（适老化变量 + 全局样式） | P0 | 1天 | #1 |
| 3 | 基础组件库（BigButton, BigCard, BackButton等） | P0 | 1.5天 | #2 |
| 4 | 登录页（手机号+验证码） | P0 | 1天 | #3 |
| 5 | 角色选择页（长辈/家属） | P0 | 0.5天 | #4 |
| 6 | FastAPI后端初始化 + Supabase连接 | P0 | 1天 | — |
| 7 | 用户认证API（注册/登录/Token） | P0 | 1天 | #6 |
| 8 | 首页框架（语音球 + 手势系统 + 懒加载）| P0 | 2天 | #3, #5 |
| 9 | 语音输入组件（Web Speech API → 豆包降级）| P0 | 2天 | #8 |
| 10 | 语音合成组件（SpeechSynthesis → 豆包降级）| P0 | 1天 | #9 |
| 11 | AI语音助手面板（下滑拉出 + 全功能路由）| P0 | 3天 | #9, #10 |
| 12 | 豆包大模型对话API（FastAPI封装） | P0 | 1.5天 | #6 |
| 13 | 家属绑定系统（绑定码 + 双向关联） | P0 | 2天 | #7 |
| 14 | 左右滑家属卡片轮播 | P0 | 1.5天 | #13 |
| 15 | 用药管家 — 数据模型+API | P0 | 1.5天 | #6 |
| 16 | 用药管家 — 提醒弹窗 + 确认流程 | P0 | 2天 | #10, #15 |
| 17 | 用药管家 — 管理页面（家属端可设置） | P0 | 1.5天 | #15 |
| 18 | 健康记录 — 语音录入 + API | P0 | 2天 | #9, #6 |
| 19 | 健康记录 — 双方可见 + 趋势图 | P0 | 1.5天 | #18, #14 |
| 20 | 捂话功能 — 语音留言+文字聊天+API | P0 | 2.5天 | #9, #10, #13 |
| 21 | 紧急呼叫（MVP：拨亲属电话 → 5秒倒计时 → 拨110）| P0 | 1天 | #13 |
| 22 | 紧急呼叫FAB（全局悬浮按钮） | P0 | 0.5天 | #3 |
| 23 | 健康广播 — AI生成内容 + 播放器 | P1 | 2天 | #12 |
| 24 | 设置页（个人信息 + 绑定管理 + 无障碍）| P1 | 1.5天 | #13 |
| 25 | WebView APK打包 | P1 | 1天 | 全部前端完成 |

### 2.2 任务依赖图

```
#1 项目初始化 ──→ #2 CSS设计系统 ──→ #3 基础组件库
                                         │
                          ┌──────────────┤
                          ▼              ▼
                    #4 登录页      #8 首页框架
                          │              │
                          ▼              ├──→ #9 语音输入
                    #5 角色选择    │         │
                                 │         ▼
                                 │    #10 语音合成
                                 │         │
                                 ▼         ▼
                           #14 家属卡片 #11 AI助手面板
                                 │
                                 ▼
                           #20 紧急呼叫

#6 FastAPI初始化 ──→ #7 用户认证API ──→ #13 家属绑定
                          │
                    ┌─────┼──────┐
                    ▼     ▼      ▼
              #12 豆包API #15 用药API #18 健康API
                    │       │          │
                    ▼       ▼          ▼
              #22 广播  #16 用药提醒  #19 健康趋势
                        #17 用药管理
```

---

## 三、语音技术降级链详细方案

### 3.1 ASR（语音识别）降级链

```typescript
// hooks/useVoiceRecognition.ts 核心逻辑

async function recognize(audioBlob?: Blob): Promise<string> {
  // 层级1: Web Speech API（浏览器原生）
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    try {
      return await useWebSpeechRecognition();
    } catch (e) {
      console.warn('Web Speech API失败，降级到豆包ASR');
    }
  }

  // 层级2: Android Native（WebView JSBridge）
  if (window.AndroidBridge?.startSpeechRecognition) {
    try {
      return await useAndroidNativeSpeechRecognition();
    } catch (e) {
      console.warn('Android Native ASR失败，降级到豆包ASR');
    }
  }

  // 层级3: 豆包ASR（火山引擎API，通过FastAPI中转）
  const audio = audioBlob || await recordAudio();
  return await callDoubaoASR(audio);
}
```

### 3.2 TTS（语音合成）降级链

```typescript
// hooks/useTextToSpeech.ts 核心逻辑

async function speak(text: string): Promise<void> {
  // 层级1: 浏览器 SpeechSynthesis API
  if ('speechSynthesis' in window) {
    const voices = speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh'));
    if (zhVoice) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = zhVoice;
      utterance.rate = 0.8;  // 老年人语速偏慢
      utterance.pitch = 0.9;
      speechSynthesis.speak(utterance);
      return;
    }
  }

  // 层级2: Android Native TTS
  if (window.AndroidBridge?.speak) {
    window.AndroidBridge.speak(text, 0.8); // rate=0.8
    return;
  }

  // 层级3: 豆包TTS（火山引擎API）
  const audioUrl = await callDoubaoTTS(text);
  await playAudio(audioUrl);
}
```

### 3.3 能力检测与状态展示

```typescript
// lib/voiceCapabilities.ts

interface VoiceCapabilities {
  asr: 'web' | 'android' | 'doubao';
  tts: 'web' | 'android' | 'doubao';
  llm: 'doubao'; // 始终是豆包
}

function detectCapabilities(): VoiceCapabilities {
  return {
    asr: detectASR(),
    tts: detectTTS(),
    llm: 'doubao',
  };
}

// 启动时检测一次，结果存入store
// 在设置页可展示当前使用的语音引擎
```

---

## 四、紧急呼叫MVP实现方案

### 4.1 流程（当前做）

```
用户触发紧急呼叫
  │
  ├── 方式1: 点击红色FAB按钮（全局可见）
  ├── 方式2: 语音说"紧急呼叫" / "救命"
  └── 方式3: AI助手判断到紧急关键词
      │
      ▼
┌──────────────────────────┐
│ 确认弹窗（3秒自动倒计时） │
│ "即将拨打紧急电话"         │
│ [取消]          [立即拨打] │
│ 3秒后自动拨打...           │
└──────────┬───────────────┘
           │
           ▼
  读取绑定亲属电话号码列表
  按优先级排序（主要联系人优先）
           │
    ┌──────┴──────┐
    │ 有亲属电话？ │
    └──────┬──────┘
      YES  │  NO
      │    │
      ▼    ▼
  拨打亲属  直接拨打110
  (tel:)
      │
      ├── 用户手动挂断/通话结束 → 完成
      └── 无法拨打（无SIM/无权限）→ 尝试拨打110
                                        │
                                        ├── 成功 → 完成
                                        └── 失败 → 显示大字提示
                                             "请周围的人帮忙拨打110"
```

### 4.2 实现代码骨架

```typescript
// hooks/useEmergency.ts

function triggerEmergency() {
  // 1. 记录到数据库
  api.post('/emergency/call', { call_type: 'one_key' });

  // 2. 获取亲属电话列表
  const familyPhones = store.getState().familyMembers
    .filter(m => m.phone)
    .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));

  // 3. 尝试拨打
  if (familyPhones.length > 0) {
    window.location.href = `tel:${familyPhones[0].phone}`;
  } else {
    window.location.href = 'tel:110';
  }
}
```

---

## 五、Supabase数据库表清单（MVP）

| 表名 | 用途 | Phase |
|------|------|-------|
| `users` | 用户（老年人/家属，含无障碍设置） | MVP |
| `elder_family_binds` | 家属绑定关系 | MVP |
| `medication_plans` | 用药计划 | MVP |
| `medication_logs` | 用药记录（是否按时吃）| MVP |
| `health_records` | 健康记录（血压/血糖等）| MVP |
| `messages` | 捂话语音留言+文字消息 | MVP |
| `ai_sessions` | AI对话记录 | MVP |
| `emergency_calls` | 紧急呼叫记录 | MVP |
| `meal_orders` | 餐食订单 | Phase 2 |
| `notifications` | 通知记录 | Phase 2 |
| `emergency_recordings` | 紧急录音（V2方案）| Phase 3 |

---

## 六、项目文件结构（Next.js 16.x 前端）

```
src/
├── app/
│   ├── layout.tsx                    # 根布局
│   ├── page.tsx                      # 首页（语音球+手势）
│   ├── login/page.tsx                # 登录
│   ├── onboarding/page.tsx           # 角色选择
│   ├── voice/page.tsx                # 语音助手全屏面板
│   ├── messages/
│   │   ├── page.tsx                  # 捂话列表
│   │   └── [id]/page.tsx             # 对话详情
│   ├── medicine/
│   │   ├── page.tsx                  # 用药管家主页
│   │   └── history/page.tsx          # 用药历史
│   ├── health/
│   │   ├── page.tsx                  # 健康记录
│   │   └── input/page.tsx            # 录入数据
│   ├── radio/page.tsx                # 健康广播
│   ├── family/
│   │   └── [id]/page.tsx             # 家属详情
│   └── settings/
│       ├── page.tsx                  # 设置主页
│       ├── bind/page.tsx             # 绑定管理
│       └── accessibility/page.tsx    # 无障碍设置
│
├── components/
│   ├── ui/                           # 适老化基础组件
│   │   ├── BigButton.tsx
│   │   ├── BigCard.tsx
│   │   ├── BackButton.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── EmergencyFAB.tsx
│   ├── voice/                        # 语音相关
│   │   ├── VoiceBall.tsx             # 语音球
│   │   ├── VoiceAssistantPanel.tsx   # 语音助手面板
│   │   ├── VoiceInput.tsx            # 语音输入
│   │   └── AudioPlayer.tsx           # 音频播放器
│   ├── home/                         # 首页专用
│   │   ├── FamilyCardCarousel.tsx    # 左右滑家属卡片
│   │   ├── FunctionCardList.tsx      # 上滑功能列表
│   │   └── SwipeGestureContainer.tsx # 手势容器
│   ├── messages/                     # 捂话专用
│   │   ├── VoiceMessage.tsx          # 语音留言录制+播放条
│   │   ├── MessageBubble.tsx         # 聊天气泡（语音条/文字）
│   │   └── MessageInput.tsx          # 录音按钮+文字切换
│   ├── medicine/                     # 用药专用
│   │   ├── MedicineReminderPopup.tsx # 用药提醒弹窗
│   │   ├── MedicineTimeline.tsx      # 今日用药时间线
│   │   └── MedicinePlanEditor.tsx    # 用药计划编辑(家属)
│   └── health/                       # 健康专用
│       ├── HealthInputForm.tsx       # 健康数据录入
│       └── HealthTrendChart.tsx      # 趋势图
│
├── hooks/
│   ├── useVoiceRecognition.ts        # ASR（三级降级）
│   ├── useTextToSpeech.ts            # TTS（三级降级）
│   ├── useAIChat.ts                  # 豆包对话
│   ├── useMessages.ts                # 捂话消息
│   ├── useEmergency.ts               # 紧急呼叫
│   ├── useSwipeGesture.ts            # 滑动手势
│   └── useApiClient.ts              # API封装
│
├── stores/                           # Zustand
│   ├── userStore.ts
│   ├── familyStore.ts
│   ├── medicineStore.ts
│   ├── healthStore.ts
│   ├── messageStore.ts
│   └── voiceStore.ts
│
├── lib/
│   ├── api.ts                        # API基础
│   ├── voiceCapabilities.ts          # 语音能力检测
│   └── constants.ts
│
├── styles/
│   ├── globals.css                   # 全局+CSS变量
│   ├── elder-theme.css               # 老年人端主题
│   └── family-theme.css              # 家属端主题
│
└── types/
    ├── user.ts
    ├── medicine.ts
    ├── health.ts
    ├── message.ts
    └── voice.ts
```

---

## 七、后端文件结构（Python + FastAPI）

```
backend/
├── app/
│   ├── main.py                       # FastAPI入口
│   ├── config.py                     # 配置
│   ├── api/v1/
│   │   ├── auth.py                   # 认证
│   │   ├── users.py                  # 用户
│   │   ├── family.py                 # 家属绑定
│   │   ├── messages.py               # 捂话留言
│   │   ├── medicine.py               # 用药管理
│   │   ├── health.py                 # 健康记录
│   │   ├── ai_chat.py                # AI对话
│   │   ├── ai_voice.py               # 语音处理(豆包降级)
│   │   ├── emergency.py              # 紧急呼叫
│   │   └── radio.py                  # 健康广播
│   ├── services/
│   │   ├── supabase_client.py
│   │   ├── doubao_service.py         # 豆包AI封装
│   │   ├── voice_service.py          # 语音处理(ASR/TTS降级)
│   │   └── health_broadcast.py       # 健康广播内容生成
│   ├── models/
│   │   ├── user.py
│   │   ├── medicine.py
│   │   ├── health.py
│   │   ├── message.py
│   │   └── emergency.py
│   └── core/
│       ├── security.py
│       └── middleware.py
├── requirements.txt
└── .env
```

---

*本文档为项目正式开发计划，所有决策已确认。*
