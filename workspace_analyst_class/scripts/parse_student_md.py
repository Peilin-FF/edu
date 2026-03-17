"""
将 MinerU 解析出的学生 content.md 转换为 student_grader_output JSON。
用法: python parse_student_md.py <学生文件夹路径> [<学生文件夹路径2> ...]
输出: student_grader_output/学生姓名_学号.json

输出格式与 workspace_analyst_class 对齐:
{
  "作业考试时间": "2022-10-25",
  "学生ID": "1840101020",
  "姓名": "牛子健",
  "总分": 76,
  "题目列表": [
    {
      "题目ID": "001",
      "题型": "单选题",
      "题目": "...",
      "选项": {"A": "...", "B": "..."},
      "满分": 3,
      "正确答案": "A",
      "知识点": null,
      "评分细则": null,
      "学生答案": "A",
      "得分": 3,
      "扣分原因": "无"
    }
  ]
}
"""
import re
import json
import sys
import os


def normalize_answer(text):
    """标准化判断题答案符号"""
    text = text.strip()
    if '$' in text:
        if 'times' in text or '×' in text:
            return '×'
        return '√'
    if text in ('√', '✓', 'V', 'v', '对', '正确'):
        return '√'
    if text in ('×', 'X', 'x', '错', '错误'):
        return '×'
    return text


def clean_q_text(text):
    """清理题目文本中混入的得分信息"""
    text = re.sub(r'#*\s*学生得分[：:]\s*\d+\s*分?\s*', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def make_deduction_reason(student_ans, correct_ans, score, full_score):
    """生成扣分原因"""
    if score >= full_score:
        return "无"
    if not student_ans:
        return "未作答"
    return f"学生答案「{student_ans}」，正确答案「{correct_ans}」"


def parse_header(lines):
    """解析头部信息"""
    header_text = '\n'.join(lines[:10])
    name_match = re.search(r'答题人[：:]\s*(\S+)', header_text)
    id_match = re.search(r'学号[：:]\s*(\S+)', header_text)
    score_match = re.search(r'考试得分[：:]\s*(\d+)', header_text)
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', header_text)

    return {
        '姓名': name_match.group(1) if name_match else None,
        '学生ID': id_match.group(1) if id_match else None,
        '作业考试时间': date_match.group(1) if date_match else None,
        '总分': int(score_match.group(1)) if score_match else None,
    }


def parse_content_md(md_text):
    """解析整个 content.md"""
    lines = md_text.split('\n')
    header = parse_header(lines)

    # 识别各大题的分界
    sections = []
    current_section = None

    for line in lines:
        section_match = re.match(
            r'^#*\s*[一二三四五六七八九十]+[.．、]\s*(单选题|多选题|填空题|判断题)',
            line
        )
        if section_match:
            current_section = {'type': section_match.group(1), 'lines': []}
            sections.append(current_section)
            continue
        if current_section is not None:
            current_section['lines'].append(line)

    questions = []
    for section in sections:
        q_type = section['type']
        raw = '\n'.join(section['lines'])

        if q_type in ('单选题', '多选题'):
            questions += parse_choice_questions(raw, q_type)
        elif q_type == '填空题':
            questions += parse_fill_questions(raw)
        elif q_type == '判断题':
            questions += parse_judge_questions(raw)

    return {
        '作业考试时间': header['作业考试时间'],
        '学生ID': header['学生ID'],
        '姓名': header['姓名'],
        '总分': header['总分'],
        '题目列表': questions,
    }


def parse_choice_questions(raw, q_type):
    """解析选择题（单选/多选）"""
    questions = []
    parts = re.split(r'\n(?=\d+[.．、])', '\n' + raw)

    for part in parts:
        part = part.strip()
        if not part:
            continue

        num_match = re.match(r'(\d+)[.．、]', part)
        if not num_match:
            continue

        q_id = num_match.group(1).zfill(3)

        # 题目文本
        q_text_match = re.match(r'\d+[.．、]\s*(.*?)(?=\n\s*A[、．.：:])', part, re.DOTALL)
        q_text = clean_q_text(q_text_match.group(1)) if q_text_match else ''

        # 得分
        score_match = re.search(r'学生得分[：:]\s*(\d+)\s*分?', part)
        score = int(score_match.group(1)) if score_match else 0

        # 选项
        options = {}
        for opt_match in re.finditer(r'([A-D])[、．.：:]\s*(.+?)(?=\s*[A-D][、．.：:]|\n学生|$)', part, re.DOTALL):
            options[opt_match.group(1)] = opt_match.group(2).strip().replace('\n', ' ').strip()

        # 学生答案和正确答案
        ans_match = re.search(r'学生答案[：:]\s*([A-D]+)\s*正确答案[：:]\s*([A-D]+)', part)
        if ans_match:
            student_ans = ans_match.group(1)
            correct_ans = ans_match.group(2)
        else:
            bare_match = re.search(r'\n\s*([A-D]+)\s+([A-D]+)\s*$', part)
            if bare_match:
                student_ans = bare_match.group(1)
                correct_ans = bare_match.group(2)
            else:
                student_ans = None
                correct_ans = None

        full_score = 4 if q_type == '多选题' else 3

        questions.append({
            '题目ID': q_id,
            '题型': q_type,
            '题目': q_text or None,
            '选项': options if options else None,
            '满分': full_score,
            '正确答案': correct_ans,
            '知识点': None,
            '评分细则': None,
            '学生答案': student_ans,
            '得分': score,
            '扣分原因': make_deduction_reason(student_ans, correct_ans, score, full_score),
        })

    return questions


def parse_fill_questions(raw):
    """解析填空题"""
    questions = []
    parts = re.split(r'\n(?=\d+[.．、])', '\n' + raw)

    for part in parts:
        part = part.strip()
        if not part:
            continue

        num_match = re.match(r'(\d+)[.．、]', part)
        if not num_match:
            continue

        q_id = num_match.group(1).zfill(3)

        # 得分
        score_match = re.search(r'学生得分[：:]\s*(\d+)\s*分?', part)
        score = int(score_match.group(1)) if score_match else 0

        # 题目文本：取到"学生答案"或"学生得分"之前
        q_text_raw = re.split(r'学生得分|学生答案', part)[0]
        q_text_m = re.match(r'\d+[.．、]\s*(.*)', q_text_raw, re.DOTALL)
        q_text = clean_q_text(q_text_m.group(1)) if q_text_m else ''

        # 学生答案
        stu_match = re.search(r'学生答案[：:]\s*\n*\s*第一空[：:]\s*(.+)', part)
        student_ans = stu_match.group(1).strip() if stu_match else None

        # 正确答案
        cor_match = re.search(r'正确答案[：:]\s*\n*\s*第一空[：:]\s*(.+)', part)
        correct_ans = cor_match.group(1).strip() if cor_match else None

        full_score = 3

        questions.append({
            '题目ID': q_id,
            '题型': '填空题',
            '题目': q_text or None,
            '选项': None,
            '满分': full_score,
            '正确答案': correct_ans,
            '知识点': None,
            '评分细则': None,
            '学生答案': student_ans,
            '得分': score,
            '扣分原因': make_deduction_reason(student_ans, correct_ans, score, full_score),
        })

    return questions


def parse_judge_questions(raw):
    """解析判断题"""
    questions = []
    parts = re.split(r'\n(?=\d+[.．、])', '\n' + raw)

    for part in parts:
        part = part.strip()
        if not part:
            continue

        num_match = re.match(r'(\d+)[.．、]', part)
        if not num_match:
            continue

        q_id = num_match.group(1).zfill(3)

        # 得分
        score_match = re.search(r'学生得分[：:]\s*(\d+)\s*分?', part)
        score = int(score_match.group(1)) if score_match else 0

        # 题目
        first_line = part.split('\n')[0]
        q_text = re.sub(r'^\d+[.．、]\s*', '', first_line).strip()

        # 学生答案和正确答案
        ans_match = re.search(r'学生答案[：:]\s*(.+?)\s*正确答案[：:]\s*(.+)', part)
        if ans_match:
            student_ans = normalize_answer(ans_match.group(1))
            correct_ans = normalize_answer(ans_match.group(2))
        else:
            student_ans = None
            correct_ans = None

        full_score = 2

        questions.append({
            '题目ID': q_id,
            '题型': '判断题',
            '题目': q_text or None,
            '选项': None,
            '满分': full_score,
            '正确答案': correct_ans,
            '知识点': None,
            '评分细则': None,
            '学生答案': student_ans,
            '得分': score,
            '扣分原因': make_deduction_reason(student_ans, correct_ans, score, full_score),
        })

    return questions


def process_student_folder(folder_path, output_dir):
    """处理一个学生文件夹，生成 JSON"""
    md_path = os.path.join(folder_path, 'content.md')
    if not os.path.exists(md_path):
        print(f"跳过: {folder_path} (无 content.md)")
        return None

    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()

    result = parse_content_md(md_text)

    name = result['姓名'] or 'unknown'
    sid = result['学生ID'] or 'unknown'
    filename = f"{name}_{sid}.json"
    out_path = os.path.join(output_dir, filename)

    os.makedirs(output_dir, exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    q_count = len(result['题目列表'])
    print(f"已生成: {out_path} ({q_count}题, 总分{result['总分']})")
    return result


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python parse_student_md.py <学生文件夹> [<学生文件夹2> ...]")
        print("示例: python parse_student_md.py ../五年新能源1801-1840101020-牛子健")
        sys.exit(1)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, '..', 'student_grader_output')

    for folder in sys.argv[1:]:
        process_student_folder(folder, output_dir)
