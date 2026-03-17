#!/usr/bin/env python3
"""
解析 MinerU 提取的 content.md 考试文件，生成标准化 grader_output JSON。
用法: python parse_exam_md.py <content.md路径> [输出json路径]
"""

import re
import json
import sys
import os


def parse_header(lines):
    """解析头部信息：学生姓名、学号、考试时间等"""
    header_text = "\n".join(lines[:10])

    student_id = ""
    exam_time = None

    m = re.search(r"学号[：:](\d+)", header_text)
    if m:
        student_id = m.group(1)

    m = re.search(r"(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})", header_text)
    if m:
        exam_time = m.group(1)

    return student_id, exam_time


def split_sections(text):
    """按大题拆分：单选题、填空题、判断题、多选题"""
    # 匹配 "一.单选题" / "# 一.单选题" 等
    pattern = r"(?:^|\n)#*\s*([一二三四五六七八九十]+)[.．、](.*?题.*?）)"
    splits = list(re.finditer(pattern, text))

    sections = []
    for i, m in enumerate(splits):
        section_type = m.group(2).strip()
        start = m.end()
        end = splits[i + 1].start() if i + 1 < len(splits) else len(text)
        section_text = text[start:end]

        # 确定题型名称
        if "单选" in section_type:
            qtype = "单选题"
        elif "多选" in section_type:
            qtype = "多选题"
        elif "填空" in section_type:
            qtype = "填空题"
        elif "判断" in section_type:
            qtype = "判断题"
        else:
            qtype = section_type

        sections.append((qtype, section_text))

    return sections


def parse_choice_questions(text, qtype):
    """解析选择题（单选/多选）"""
    questions = []

    # 按题号拆分: "1." "2." ... "15."
    parts = re.split(r"(?:^|\n)\s*(\d+)\s*[.．]", text)
    # parts: ['前缀', '1', '内容', '2', '内容', ...]

    i = 1
    while i < len(parts) - 1:
        q_num = int(parts[i])
        q_body = parts[i + 1]
        i += 2

        q = parse_single_choice(q_num, q_body, qtype)
        if q:
            questions.append(q)

    return questions


def parse_single_choice(q_num, body, qtype):
    """解析单道选择题"""
    lines = body.strip().split("\n")

    # 提取题目文本（选项之前的文本）
    question_text = ""
    options = {}
    student_answer = ""
    correct_answer = ""
    score = None

    # 合并所有文本便于正则匹配
    full = "\n".join(lines)

    # 提取得分
    m = re.search(r"学生得分[：:]\s*(\d+)\s*分", full)
    if m:
        score = int(m.group(1))

    # 满分根据题型确定（得分只反映学生实际得分，不是满分）
    if qtype == "单选题":
        full_score = 3
    elif qtype == "多选题":
        full_score = 4
    else:
        full_score = 3

    # 提取选项 A、xxx B、xxx ...
    option_matches = re.findall(r"([A-D])\s*[、,]\s*(.+?)(?=\s*[A-D]\s*[、,]|\s*$|\n)", full)
    for letter, text in option_matches:
        options[letter] = text.strip()

    # 提取学生答案和正确答案
    # 格式1: "学生答案：A正确答案：A"
    m = re.search(r"学生答案[：:]([A-D]+)\s*正确答案[：:]([A-D]+)", full)
    if m:
        student_answer = m.group(1)
        correct_answer = m.group(2)
    else:
        # 格式2: 多选题可能是 "ABC ABC" 独立一行
        m = re.search(r"\n\s*([A-D]{2,})\s+([A-D]{2,})\s*$", full, re.MULTILINE)
        if m:
            student_answer = m.group(1)
            correct_answer = m.group(2)

    # 提取题目文本（得分行之前，去掉题号后的文本）
    # 找到第一个选项或得分之前的内容
    q_text_parts = []
    for line in lines:
        line_s = line.strip()
        if not line_s:
            continue
        if re.match(r"[A-D]\s*[、,]", line_s):
            break
        if re.search(r"学生得分", line_s):
            # 可能题目和得分在同一行
            m2 = re.match(r"(.+?)\s*学生得分", line_s)
            if m2:
                q_text_parts.append(m2.group(1).strip())
            break
        if re.search(r"学生答案", line_s):
            break
        q_text_parts.append(line_s)

    question_text = " ".join(q_text_parts).strip()
    # 去掉开头可能残留的换行/空白
    question_text = re.sub(r"^\s+", "", question_text)
    # 清理 markdown 残留的 # 符号
    question_text = re.sub(r"\s*#\s*$", "", question_text).strip()

    扣分原因 = "无" if student_answer == correct_answer else f"答案错误，正确答案为{correct_answer}"

    return {
        "题目ID": f"{q_num:03d}",
        "题型": qtype,
        "题目": question_text if question_text else None,
        "选项": options if options else None,
        "满分": full_score,
        "正确答案": correct_answer,
        "知识点": None,
        "评分细则": None,
        "学生答案": student_answer,
        "得分": score,
        "扣分原因": 扣分原因,
    }


def parse_fill_blank_questions(text):
    """解析填空题"""
    questions = []

    parts = re.split(r"(?:^|\n)\s*(\d+)\s*[.．]", text)

    i = 1
    while i < len(parts) - 1:
        q_num = int(parts[i])
        q_body = parts[i + 1]
        i += 2

        full = q_body.strip()

        # 提取得分
        score = None
        m = re.search(r"学生得分[：:]\s*(\d+)\s*分", full)
        if m:
            score = int(m.group(1))

        # 提取题目文本（得分之前或包含得分的行）
        question_text = ""
        m2 = re.search(r"^(.*?)(?:\s*学生得分)", full, re.DOTALL)
        if m2:
            question_text = m2.group(1).strip()
            question_text = re.sub(r"\n+", " ", question_text).strip()
        else:
            # 题目可能和得分在同一行
            first_line = full.split("\n")[0].strip()
            m3 = re.match(r"(.+?)\s*学生得分", first_line)
            if m3:
                question_text = m3.group(1).strip()

        # 提取学生答案
        student_answer = ""
        m = re.search(r"学生答案[：:]\s*\n*(?:第一空[：:]\s*)?(.+?)(?:\n|$)", full)
        if m:
            student_answer = m.group(1).strip()
            if student_answer.startswith("第一空"):
                m_sub = re.search(r"第一空[：:]\s*(.+)", student_answer)
                if m_sub:
                    student_answer = m_sub.group(1).strip()
        # 如果学生答案行后紧跟 "第一空：xxx"
        m_sa = re.search(r"学生答案[：:].*?\n+\s*第一空[：:]\s*(.+?)(?:\n|$)", full)
        if m_sa:
            student_answer = m_sa.group(1).strip()

        # 提取正确答案
        correct_answer = ""
        m = re.search(r"正确答案[：:].*?\n*\s*第一空[：:]\s*(.+?)(?:\n|$)", full)
        if m:
            correct_answer = m.group(1).strip()
        else:
            m = re.search(r"正确答案[：:]\s*(.+?)(?:\n|$)", full)
            if m:
                correct_answer = m.group(1).strip()

        扣分原因 = "无" if score and score > 0 else f"答案错误，正确答案为'{correct_answer}'"

        questions.append({
            "题目ID": f"{q_num:03d}",
            "题型": "填空题",
            "题目": question_text if question_text else None,
            "选项": None,
            "满分": 3,
            "正确答案": correct_answer,
            "知识点": None,
            "评分细则": None,
            "学生答案": student_answer,
            "得分": score,
            "扣分原因": 扣分原因,
        })

    return questions


def parse_judge_questions(text):
    """解析判断题"""
    questions = []

    parts = re.split(r"(?:^|\n)\s*(\d+)\s*[.．]", text)

    i = 1
    while i < len(parts) - 1:
        q_num = int(parts[i])
        q_body = parts[i + 1]
        i += 2

        full = q_body.strip()

        # 提取得分
        score = None
        m = re.search(r"学生得分[：:]\s*(\d+)\s*分", full)
        if m:
            score = int(m.group(1))

        # 提取题目（得分行之前的文本）
        question_text = ""
        m2 = re.search(r"^(.+?)(?:\n.*?学生得分|$)", full, re.DOTALL)
        if m2:
            # 取得分之前的行
            lines_before = []
            for line in full.split("\n"):
                if "学生得分" in line:
                    break
                if line.strip():
                    lines_before.append(line.strip())
            question_text = " ".join(lines_before).strip()

        # 解析学生答案和正确答案
        # $\mathcal { V }$ = √(对), $\times$ = ×(错)
        student_answer = ""
        correct_answer = ""

        m = re.search(r"学生答案[：:]\s*(.+?)\s*正确答案[：:]\s*(.+?)(?:\n|$)", full)
        if m:
            raw_student = m.group(1).strip()
            raw_correct = m.group(2).strip()

            student_answer = normalize_judge_answer(raw_student)
            correct_answer = normalize_judge_answer(raw_correct)

        扣分原因 = "无" if student_answer == correct_answer else f"答案错误，正确答案为{correct_answer}"

        questions.append({
            "题目ID": f"{q_num:03d}",
            "题型": "判断题",
            "题目": question_text if question_text else None,
            "选项": None,
            "满分": 2,
            "正确答案": correct_answer,
            "知识点": None,
            "评分细则": None,
            "学生答案": student_answer,
            "得分": score,
            "扣分原因": 扣分原因,
        })

    return questions


def normalize_judge_answer(raw):
    """将判断题答案标准化为 √ 或 ×"""
    if "mathcal" in raw or "V" in raw or "√" in raw:
        return "√"
    if "times" in raw or "×" in raw or "✕" in raw:
        return "×"
    return raw.strip()


def parse_md(md_path):
    """主解析函数"""
    with open(md_path, "r", encoding="utf-8") as f:
        text = f.read()

    lines = text.split("\n")
    student_id, exam_time = parse_header(lines)

    sections = split_sections(text)

    all_questions = []
    for qtype, section_text in sections:
        if qtype == "单选题" or qtype == "多选题":
            qs = parse_choice_questions(section_text, qtype)
            all_questions.extend(qs)
        elif qtype == "填空题":
            qs = parse_fill_blank_questions(section_text)
            all_questions.extend(qs)
        elif qtype == "判断题":
            qs = parse_judge_questions(section_text)
            all_questions.extend(qs)

    result = {
        "作业考试时间": exam_time,
        "学生ID": student_id,
        "题目列表": all_questions,
    }

    return result


def main():
    if len(sys.argv) < 2:
        # 默认处理当前目录下所有包含 content.md 的子目录
        base_dir = os.path.dirname(os.path.abspath(__file__))
        processed = 0
        for entry in sorted(os.listdir(base_dir)):
            md_path = os.path.join(base_dir, entry, "content.md")
            if os.path.isfile(md_path):
                result = parse_md(md_path)
                sid = result["学生ID"] or "unknown"
                out_path = os.path.join(base_dir, entry, f"grader_output_{sid}.json")
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(result, f, ensure_ascii=False, indent=2)
                total = sum(q["得分"] or 0 for q in result["题目列表"])
                print(f"[OK] {entry} -> {os.path.basename(out_path)} (共{len(result['题目列表'])}题, 总分{total})")
                processed += 1
        if processed == 0:
            print("用法: python parse_exam_md.py <content.md路径> [输出json路径]")
            print("  或: 将脚本放在含有 content.md 子目录的父目录中直接运行")
        else:
            print(f"\n共处理 {processed} 个学生")
    else:
        md_path = sys.argv[1]
        result = parse_md(md_path)

        if len(sys.argv) >= 3:
            out_path = sys.argv[2]
        else:
            sid = result["学生ID"] or "output"
            out_dir = os.path.dirname(md_path)
            out_path = os.path.join(out_dir, f"grader_output_{sid}.json")

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        total = sum(q["得分"] or 0 for q in result["题目列表"])
        print(f"已生成: {out_path}")
        print(f"学生ID: {result['学生ID']}, 共{len(result['题目列表'])}题, 总分{total}")


if __name__ == "__main__":
    main()
