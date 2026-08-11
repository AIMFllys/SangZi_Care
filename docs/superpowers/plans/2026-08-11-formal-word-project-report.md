# 智护银龄 APP 正式项目汇报 Word 文档实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 生成一份正式、克制、专业、图文并茂且可直接汇报使用的“智护银龄 APP 项目汇报”Word 文档。

**Architecture:** 使用一个可重复运行的 Python 文档生成脚本集中管理正文、样式、图片和页码；使用独立检查脚本验证必备章节、图片数量、禁用工程术语和 OOXML 结构；最后通过 LibreOffice 逐页渲染并人工检查全部页面。

**Tech Stack:** Bundled Python runtime、python-docx、Pillow、LibreOffice、项目现有应用截图与 Markdown 资料。

---

## 文件结构

- 新建 `scripts/reports/build_sangzi_project_report.py`：生成 Word 正式成稿并应用统一版式。
- 新建 `scripts/reports/check_sangzi_report.py`：检查内容、图片、样式、页码字段和禁用术语。
- 新建 `docs/reports/智护银龄APP项目汇报.docx`：最终可编辑交付文件。
- 使用 `output/docx-report-qa/`：存放内部逐页渲染图片和 PDF，不作为最终交付。

### Task 1: 核实资料和截图

**Files:**
- Read: `docs/详解/功能详解.md`
- Read: `docs/updates/v1.1.0.md`
- Read: `docs/archive/04-development/report_record/report_result.md`
- Read: `output/playwright/*.png`

- [ ] **Step 1: 核对当前功能边界**

逐项确认智能语音、健康记录、用药管理、家属看板、家庭消息、绑定权限、无障碍设置和紧急求助的当前状态。

- [ ] **Step 2: 核对调研表述边界**

只采用“7 份实地采访记录”及其稳定归纳，不采用旧资料中的技术方案、旧功能范围或已被当前项目替代的表述。

- [ ] **Step 3: 选择截图**

选用 `report-login-current.png`、`voice-390.png`、`family-home-fixed.png`、`family-health-390.png`、`family-medicine.png`、`medicine-plan-form.png`、`murmur-chat-390.png`、`settings-390.png`；所有业务截图在图注中标明“演示数据”。

### Task 2: 生成正式 Word 文档

**Files:**
- Create: `scripts/reports/build_sangzi_project_report.py`
- Create: `docs/reports/智护银龄APP项目汇报.docx`

- [ ] **Step 1: 建立 A4 与国标参照版式**

设置 A4 纸张，上 37 毫米、下 30 毫米、左 28 毫米、右 26 毫米；正文 3 号仿宋、固定 28 磅行距、首行缩进 2 字符；标题和页码采用真实 Word 样式与字段。

- [ ] **Step 2: 写入正文**

按设计文档的 10 个章节写入完整中文内容，不使用占位语句，不包含工程实现说明。

- [ ] **Step 3: 插入图片和图注**

将 8 张应用截图和 1 张调研环境图按章节插入，统一细灰边框和图号；应用截图统一添加“画面为功能演示，姓名和数值均为演示数据”。

- [ ] **Step 4: 写入资料来源**

列明项目现行资料、7 份调研记录以及 GB/T 148—1997、GB/T 9704—2012、GB/T 15834—2011、GB/T 15835—2011 的国家标准信息平台链接。

### Task 3: 建立自动检查

**Files:**
- Create: `scripts/reports/check_sangzi_report.py`

- [ ] **Step 1: 检查必备内容**

要求文档包含项目名称、核心功能、项目价值、当前进展、下一步工作、医疗边界和资料说明。

- [ ] **Step 2: 检查禁用内容**

拒绝包含 `Next.js`、`React`、`API`、`Supabase`、`数据库`、`接口`、`前端`、`后端`、`WebView` 等工程术语，并检查 `TODO`、`TBD`、乱码替换字符和虚构效果性表述。

- [ ] **Step 3: 检查文档结构**

确认图片不少于 8 张，所有图片具有非空替代文字，标题样式、页码字段和 A4 页面设置存在。

- [ ] **Step 4: 运行检查**

Run: `python scripts/reports/check_sangzi_report.py docs/reports/智护银龄APP项目汇报.docx`

Expected: `PASS`，并输出章节、图片、页面设置和禁用词检查结果。

### Task 4: 渲染并逐页检查

**Files:**
- Read: `docs/reports/智护银龄APP项目汇报.docx`
- Create: `output/docx-report-qa/page-*.png`

- [ ] **Step 1: 渲染文档**

Run: `python <documents-skill>/render_docx.py docs/reports/智护银龄APP项目汇报.docx --output_dir output/docx-report-qa --emit_pdf`

Expected: 生成非空 PDF 和连续编号的 `page-*.png`。

- [ ] **Step 2: 检查全部页面**

逐页检查标题、正文、图片、图注、表格、页眉和页码；重点排除裁切、重叠、图片过小、孤行标题、空白页和字体替换。

- [ ] **Step 3: 修正并重新渲染**

如发现任何问题，修改生成脚本并重新生成、检查、渲染，直到全部页面通过。

### Task 5: 项目级验证与提交

**Files:**
- Verify: `docs/reports/智护银龄APP项目汇报.docx`
- Verify: `scripts/reports/*.py`

- [ ] **Step 1: 运行项目检查**

Run: `npm run lint`

Expected: Exit code 0.

Run: `npm run tsc`

Expected: Exit code 0.

Run: `npm run build`

Expected: Exit code 0，并保持 `.next` 全栈输出。

- [ ] **Step 2: 检查仓库边界**

确认未修改 `next.config.ts`、未新增或提交 `.env*`、未触碰应用业务代码。

- [ ] **Step 3: 阶段提交**

只暂存本任务的计划、脚本和最终 Word 文档，使用明确的本地提交记录，不推送远端。
