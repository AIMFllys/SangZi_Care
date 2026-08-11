# 智护银龄 APP 正式介绍 Word 文档实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 生成一份以“智护银龄 APP 本身”为唯一主线、可直接用于正式汇报展示的图文 Word 介绍文档。

**Architecture:** 使用一个可重复运行的 Python 文档生成脚本统一管理正文、样式、应用截图和页码；使用独立检查脚本验证 APP 必备章节、图片数量、禁用工程术语和文档结构；最后通过 LibreOffice 逐页渲染并人工检查全部页面。

**Tech Stack:** Bundled Python runtime、python-docx、Pillow、LibreOffice、项目现有应用运行截图与现行产品资料。

---

## 文件结构

- 新建 `scripts/reports/build_sangzi_app_intro.py`：生成正式 APP 介绍 Word 文档。
- 新建 `scripts/reports/check_sangzi_app_intro.py`：检查内容、图片、样式、页码字段和禁用术语。
- 新建 `docs/reports/智护银龄APP项目介绍.docx`：最终可编辑交付文件。
- 使用 `output/docx-app-intro-qa/`：存放内部逐页渲染图片和 PDF，不作为最终交付。

### Task 1: 核实 APP 内容和截图

**Files:**
- Read: `docs/详解/功能详解.md`
- Read: `docs/updates/v1.1.0.md`
- Read: `app/settings/about/page.tsx`
- Read: `output/playwright/*.png`

- [ ] **Step 1: 核对 APP 当前功能**

确认智能语音、健康记录、用药管理、家属看板、家庭消息、绑定权限、无障碍设置和紧急求助的真实状态。

- [ ] **Step 2: 排除非 APP 内容**

不使用实践活动照片、采访过程、调研路线、团队活动或旧产品设想；实践项目名称只在封面和概况中各出现一次。

- [ ] **Step 3: 选择运行截图**

选用 `report-login-current.png`、`voice-390.png`、`family-home-fixed.png`、`family-health-390.png`、`family-medicine.png`、`medicine-plan-form.png`、`murmur-chat-390.png`、`settings-390.png`；所有业务截图在图注中标明“演示数据”。

### Task 2: 生成正式 APP 介绍 Word 文档

**Files:**
- Create: `scripts/reports/build_sangzi_app_intro.py`
- Create: `docs/reports/智护银龄APP项目介绍.docx`

- [ ] **Step 1: 建立 A4 与国标参照版式**

设置 A4 纸张，上 37 毫米、下 30 毫米、左 28 毫米、右 26 毫米；正文 3 号仿宋、固定 28 磅行距、首行缩进 2 字符；标题和页码采用真实 Word 样式与字段。

- [ ] **Step 2: 写入 APP 介绍正文**

按设计文档的 15 个部分写入完整中文内容，重点解释每项功能“用户看见什么、可以做什么、带来什么实际帮助”。

- [ ] **Step 3: 插入应用截图和图注**

将 8 张真实运行截图按功能章节插入，统一使用细灰边框和图号；所有含姓名和数值的截图统一添加演示数据说明。

- [ ] **Step 4: 写入资料来源**

列明项目现行功能资料、版本说明，以及 GB/T 148—1997、GB/T 9704—2012、GB/T 15834—2011、GB/T 15835—2011 的国家标准信息平台链接。

### Task 3: 建立自动检查

**Files:**
- Create: `scripts/reports/check_sangzi_app_intro.py`

- [ ] **Step 1: 检查 APP 必备内容**

要求文档包含 APP 定位、双角色、八项核心功能、典型使用方式、核心价值、当前完成度、下一步完善和使用边界。

- [ ] **Step 2: 检查禁用内容**

拒绝包含 `Next.js`、`React`、`API`、`Supabase`、`数据库`、`接口`、`前端`、`后端`、`WebView` 等工程术语，并检查 `TODO`、`TBD`、乱码替换字符、实践过程大篇幅叙述和虚构效果性表述。

- [ ] **Step 3: 检查文档结构**

确认图片不少于 8 张，所有图片具有非空替代文字，标题样式、页码字段和 A4 页面设置存在。

- [ ] **Step 4: 运行检查**

Run: `python scripts/reports/check_sangzi_app_intro.py docs/reports/智护银龄APP项目介绍.docx`

Expected: `PASS`，并输出章节、图片、页面设置和禁用词检查结果。

### Task 4: 渲染并逐页检查

**Files:**
- Read: `docs/reports/智护银龄APP项目介绍.docx`
- Create: `output/docx-app-intro-qa/page-*.png`

- [ ] **Step 1: 渲染文档**

Run: `python <documents-skill>/render_docx.py docs/reports/智护银龄APP项目介绍.docx --output_dir output/docx-app-intro-qa --emit_pdf`

Expected: 生成非空 PDF 和连续编号的 `page-*.png`。

- [ ] **Step 2: 检查全部页面**

逐页检查标题、正文、图片、图注、表格、页眉和页码；重点排除裁切、重叠、图片过小、孤行标题、空白页和字体替换。

- [ ] **Step 3: 修正并重新渲染**

发现问题时修改生成脚本并重新生成、检查、渲染，直到全部页面通过。

### Task 5: 项目级验证与提交

**Files:**
- Verify: `docs/reports/智护银龄APP项目介绍.docx`
- Verify: `scripts/reports/*.py`

- [ ] **Step 1: 运行项目检查**

Run: `npm run lint`

Expected: Exit code 0.

Run: `npm run tsc`

Expected: Exit code 0.

Run: `npm run build`

Expected: Exit code 0，并保持现有正式构建方式。

- [ ] **Step 2: 检查仓库边界**

确认未修改 APP 业务代码、正式构建设置和任何环境变量文件。

- [ ] **Step 3: 阶段提交**

只暂存本任务的计划、脚本和最终 Word 文档，使用明确的本地提交记录，不推送远端。
