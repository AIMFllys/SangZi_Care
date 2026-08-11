from __future__ import annotations

import argparse
import io
import re
import sys
import zipfile
from pathlib import Path

from lxml import etree
from PIL import Image


NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
}

REQUIRED_PHRASES = [
    "APP 概况",
    "一款 APP，两种使用角色",
    "核心功能总览",
    "智能语音助手",
    "健康记录与照护看板",
    "用药管理",
    "家庭联系",
    "适老化与无障碍",
    "紧急求助",
    "典型使用方式",
    "APP 的核心价值",
    "当前完成度与后续完善",
    "使用边界与资料说明",
    "不提供疾病诊断",
    "不替代 120",
    "均为演示数据",
]

BANNED_TERMS = [
    "Next.js",
    "React",
    "Supabase",
    "WebView",
    "API",
    "数据库",
    "接口",
    "前端",
    "后端",
    "技术栈",
    "服务器",
    "代码",
    "静态导出",
    "实地调研",
    "采访记录",
    "调研路线",
    "活动照片",
    "TODO",
    "TBD",
    "�",
]


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    raise SystemExit(1)


def text_content(root: etree._Element) -> str:
    return "".join(root.xpath("//w:t/text()", namespaces=NS))


def int_attr(element: etree._Element, local_name: str) -> int:
    value = element.get(f"{{{NS['w']}}}{local_name}")
    if value is None:
        fail(f"缺少属性 {local_name}")
    return int(value)


def check_page_setup(document_root: etree._Element) -> None:
    sections = document_root.xpath("//w:sectPr", namespaces=NS)
    if not sections:
        fail("文档没有节设置")
    sect = sections[-1]
    pg_sz = sect.find("w:pgSz", NS)
    pg_mar = sect.find("w:pgMar", NS)
    if pg_sz is None or pg_mar is None:
        fail("文档缺少页面尺寸或页边距")

    width = int_attr(pg_sz, "w")
    height = int_attr(pg_sz, "h")
    expected = {
        "page width": (width, 11906),
        "page height": (height, 16838),
        "top margin": (int_attr(pg_mar, "top"), 2098),
        "bottom margin": (int_attr(pg_mar, "bottom"), 1701),
        "left margin": (int_attr(pg_mar, "left"), 1587),
        "right margin": (int_attr(pg_mar, "right"), 1474),
    }
    for label, (actual, target) in expected.items():
        if abs(actual - target) > 5:
            fail(f"{label} 不符合设计值：{actual}，期望约 {target}")
    if sect.find("w:titlePg", NS) is None:
        fail("未启用首页不同页眉页脚")


def check_tables(document_root: etree._Element) -> int:
    tables = document_root.xpath("//w:tbl", namespaces=NS)
    for index, table in enumerate(tables, start=1):
        tbl_w = table.find("w:tblPr/w:tblW", NS)
        grid_cols = table.findall("w:tblGrid/w:gridCol", NS)
        if tbl_w is None or tbl_w.get(f"{{{NS['w']}}}type") != "dxa":
            fail(f"第 {index} 个表格没有使用固定 DXA 宽度")
        if not grid_cols:
            fail(f"第 {index} 个表格缺少固定列网格")
        grid_widths = [int_attr(col, "w") for col in grid_cols]
        table_width = int_attr(tbl_w, "w")
        if sum(grid_widths) != table_width:
            fail(f"第 {index} 个表格列宽总和与表格总宽不一致")
        for cell in table.xpath(".//w:tc", namespaces=NS):
            tc_w = cell.find("w:tcPr/w:tcW", NS)
            if tc_w is None or tc_w.get(f"{{{NS['w']}}}type") != "dxa":
                fail(f"第 {index} 个表格存在未固定宽度的单元格")
    return len(tables)


def check_images(archive: zipfile.ZipFile, document_root: etree._Element) -> int:
    media = sorted(name for name in archive.namelist() if name.startswith("word/media/"))
    if len(media) < 8:
        fail(f"应用截图不足 8 张，当前为 {len(media)} 张")
    if len(media) != 8:
        fail(f"最终文档应只包含 8 张 APP 运行截图，当前为 {len(media)} 张")

    for name in media:
        with Image.open(io.BytesIO(archive.read(name))) as image:
            width, height = image.size
            if height <= width:
                fail(f"发现非竖屏 APP 截图：{name} ({width}x{height})")

    doc_prs = document_root.xpath("//wp:docPr", namespaces=NS)
    image_doc_prs = [node for node in doc_prs if node.get("descr") is not None]
    if len(image_doc_prs) != len(media):
        fail(f"图片替代文字数量不匹配：图片 {len(media)}，替代文字 {len(image_doc_prs)}")
    for node in image_doc_prs:
        if not (node.get("title") or "").strip() or not (node.get("descr") or "").strip():
            fail("存在空的图片标题或替代文字")
    return len(media)


def check_styles(archive: zipfile.ZipFile) -> None:
    styles_root = etree.fromstring(archive.read("word/styles.xml"))
    styles_xml = etree.tostring(styles_root, encoding="unicode")
    for font in ("FangSong", "SimHei", "KaiTi", "SimSun", "Times New Roman"):
        if font not in styles_xml:
            fail(f"样式中缺少指定字体：{font}")
    heading_ids = set(
        styles_root.xpath(
            "//w:style[@w:type='paragraph' and (w:name/@w:val='heading 1' or w:name/@w:val='heading 2')]/@w:styleId",
            namespaces=NS,
        )
    )
    if len(heading_ids) < 2:
        fail("未找到完整的一级、二级标题样式")


def check_document(path: Path) -> None:
    if not path.exists() or path.stat().st_size < 50_000:
        fail(f"DOCX 不存在或文件过小：{path}")

    with zipfile.ZipFile(path) as archive:
        required_parts = {
            "word/document.xml",
            "word/styles.xml",
            "word/header1.xml",
            "word/footer1.xml",
        }
        missing = required_parts.difference(archive.namelist())
        if missing:
            fail("DOCX 缺少必要部件：" + ", ".join(sorted(missing)))

        document_root = etree.fromstring(archive.read("word/document.xml"))
        text = text_content(document_root)
        compact_text = re.sub(r"\s+", "", text)

        for phrase in REQUIRED_PHRASES:
            if re.sub(r"\s+", "", phrase) not in compact_text:
                fail(f"缺少必备内容：{phrase}")
        for term in BANNED_TERMS:
            if term.lower() in text.lower():
                fail(f"出现禁用术语或旧实践内容：{term}")
        if text.count("实践") > 3:
            fail("实践背景出现次数过多，APP 介绍主线被稀释")
        if "华中科技大学基础医学院" not in text:
            fail("封面缺少项目归属")
        if text.count("演示数据") < 6:
            fail("演示数据说明不足")

        heading1_count = len(document_root.xpath("//w:p[w:pPr/w:pStyle[@w:val='Heading1']]", namespaces=NS))
        heading2_count = len(document_root.xpath("//w:p[w:pPr/w:pStyle[@w:val='Heading2']]", namespaces=NS))
        if heading1_count < 15:
            fail(f"一级章节不足，当前为 {heading1_count}")
        if heading2_count < 8:
            fail(f"二级章节不足，当前为 {heading2_count}")

        check_page_setup(document_root)
        table_count = check_tables(document_root)
        image_count = check_images(archive, document_root)
        check_styles(archive)

        footer_xml = archive.read("word/footer1.xml").decode("utf-8")
        if " PAGE " not in footer_xml:
            fail("页脚缺少真实 PAGE 字段")

    print("PASS: 智护银龄 APP 正式介绍文档结构检查通过")
    print(f"  一级章节：{heading1_count}")
    print(f"  二级章节：{heading2_count}")
    print(f"  表格数量：{table_count}")
    print(f"  APP 截图：{image_count}")
    print("  页面设置：A4；上37mm、下30mm、左28mm、右26mm")
    print("  禁用工程术语、旧实践图片与占位符：未发现")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="检查智护银龄 APP 正式介绍 Word 文档")
    parser.add_argument("docx", type=Path, help="待检查的 DOCX 文件")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    try:
        check_document(args.docx.resolve())
    except (zipfile.BadZipFile, etree.XMLSyntaxError, OSError) as exc:
        fail(str(exc))
