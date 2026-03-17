"""
LLM 标注知识点 + 生成扣分原因，并输出学生端/教师端 JSON。

用法:
  python enrich_and_merge.py <学生文件夹1> [<学生文件夹2> ...]

输出:
  student_grader_output/姓名_学号.json  (学生端)
  grader_output/class_YYYY-MM-DD.json   (教师端)
"""
import os
import sys
import json
import re
import time
import requests as req
import openpyxl

# ============ 配置 ============
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_DIR = os.path.join(SCRIPT_DIR, '..')
XLSX_PATH = os.path.join(WORKSPACE_DIR, '..', '物联网技术及应用-课程知识点-2.xlsx')

API_URL = 'https://api-gateway.glm.ai/v1/chat/completions'
API_KEY = 'sk-2srhBUrGycFLstk3bzP3CjxiTN9MFmFm'
MODEL = 'gpt-5.2'


# ============ 加载知识点 ============
def load_knowledge_points():
    """从 Excel 中提取所有知识点，构建平铺列表"""
    wb = openpyxl.load_workbook(XLSX_PATH)
    ws = wb['课程知识点']
    knowledge_points = []
    path = [''] * 8

    for row in ws.iter_rows(min_row=3, values_only=True):
        node_type = row[0]
        names = row[1:8]
        tags = row[11]

        if not node_type:
            continue

        for i, n in enumerate(names):
            if n is not None and str(n).strip():
                path[i] = str(n).strip()
                for j in range(i + 1, len(path)):
                    path[j] = ''
                break

        if str(node_type).strip() == '知识点':
            kp_name = ''
            kp_path = []
            for p in path:
                if p:
                    kp_path.append(p)
                    kp_name = p
            tag_str = str(tags).strip() if tags else ''
            knowledge_points.append({
                'name': kp_name,
                'path': ' > '.join(kp_path),
                'tags': tag_str,
            })

    return knowledge_points


def format_kp_reference(kps):
    lines = []
    for kp in kps:
        tag_part = f" [{kp['tags']}]" if kp['tags'] else ''
        lines.append(f"- {kp['path']}{tag_part}")
    return '\n'.join(lines)


# ============ LLM 调用 (requests 直连，禁用代理) ============
def call_llm(prompt, max_tokens=4096):
    """通过 OpenAI 兼容接口调用 LLM"""
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json',
    }
    data = {
        'model': MODEL,
        'max_tokens': max_tokens,
        'messages': [{'role': 'user', 'content': prompt}],
    }
    resp = req.post(API_URL, headers=headers, json=data,
                    proxies={'http': None, 'https': None}, timeout=120)
    resp.raise_for_status()
    return resp.json()['choices'][0]['message']['content']


def enrich_questions_batch(questions, kp_reference):
    """批量调用 LLM，为题目标注知识点和扣分原因。"""
    items = []
    for q in questions:
        items.append({
            '题目ID': q['题目ID'],
            '题型': q['题型'],
            '题目': q['题目'],
            '选项': q['选项'],
            '满分': q['满分'],
            '正确答案': q['正确答案'],
            '学生答案': q['学生答案'],
            '得分': q['得分'],
        })

    prompt = f"""你是一位教育分析专家。请为以下考试题目标注知识点和扣分原因。

## 课程知识点参考（从课程大纲中提取）
{kp_reference}

## 待标注的题目
{json.dumps(items, ensure_ascii=False, indent=2)}

## 任务要求

请为每道题返回一个 JSON 数组，每个元素包含：
1. "题目ID": 原题目ID
2. "知识点": 从上面的课程知识点参考中选择最匹配的知识点名称（只写知识点名，不写路径）
3. "扣分原因":
   - 如果学生答对（得分=满分），填"无"
   - 如果学生答错，给出针对该学生具体答案的专业解析。要求：
     a) 解释正确答案为什么正确（简要说明知识原理）
     b) 分析学生的错误答案反映了什么认知偏差或知识盲点
     c) 不要简单说"选了A应该选B"，要说明知识层面的原因
     d) 50-100字左右
4. "评分细则":
   - 选择题/判断题填 null
   - 填空题：描述评分标准，如"完全答对得3分，意思相近但表述不标准酌情扣分"

只返回 JSON 数组，不要其他文字。确保是合法 JSON。"""

    content = call_llm(prompt)

    # 提取 JSON
    json_match = re.search(r'\[.*\]', content, re.DOTALL)
    if json_match:
        content = json_match.group(0)

    try:
        enriched = json.loads(content)
    except json.JSONDecodeError:
        print(f"  警告: LLM JSON 解析失败，使用默认值")
        print(f"  响应片段: {content[:300]}")
        return questions

    enrich_map = {item['题目ID']: item for item in enriched}
    for q in questions:
        if q['题目ID'] in enrich_map:
            e = enrich_map[q['题目ID']]
            q['知识点'] = e.get('知识点', None)
            if q['得分'] < q['满分']:
                q['扣分原因'] = e.get('扣分原因', q.get('扣分原因', ''))
            q['评分细则'] = e.get('评分细则', None)

    return questions


# ============ 解析 content.md ============
sys.path.insert(0, SCRIPT_DIR)
from parse_student_md import parse_content_md


# ============ 生成教师端 JSON ============
def merge_to_class(all_students):
    """将多个学生的数据合并为教师端格式（按题目组织）"""
    if not all_students:
        return None

    exam_date = all_students[0]['作业考试时间']
    template_questions = all_students[0]['题目列表']
    class_questions = []

    for i, tq in enumerate(template_questions):
        question = {
            '题目ID': tq['题目ID'],
            '题型': tq['题型'],
            '题目': tq['题目'],
            '选项': tq['选项'],
            '满分': tq['满分'],
            '参考答案': tq['正确答案'],
            '知识点': tq['知识点'],
            '评分细则': tq['评分细则'],
            '学生作答': [],
        }

        for student in all_students:
            if i < len(student['题目列表']):
                sq = student['题目列表'][i]
                question['学生作答'].append({
                    '学生ID': student['学生ID'],
                    '答案': sq['学生答案'],
                    '得分': sq['得分'],
                    '扣分原因': sq['扣分原因'],
                })

        class_questions.append(question)

    return {
        '作业考试时间': exam_date,
        '题目列表': class_questions,
    }


# ============ 主流程 ============
def main():
    if len(sys.argv) < 2:
        print("用法: python enrich_and_merge.py <学生文件夹1> [<学生文件夹2> ...]")
        sys.exit(1)

    print("加载课程知识点...")
    kps = load_knowledge_points()
    kp_ref = format_kp_reference(kps)
    print(f"共 {len(kps)} 个知识点")

    student_output_dir = os.path.join(WORKSPACE_DIR, 'student_grader_output')
    class_output_dir = os.path.join(WORKSPACE_DIR, 'grader_output')
    os.makedirs(student_output_dir, exist_ok=True)
    os.makedirs(class_output_dir, exist_ok=True)

    all_students = []

    for folder in sys.argv[1:]:
        md_path = os.path.join(folder, 'content.md')
        if not os.path.exists(md_path):
            print(f"跳过: {folder} (无 content.md)")
            continue

        print(f"\n处理: {os.path.basename(folder)}")

        with open(md_path, 'r', encoding='utf-8') as f:
            md_text = f.read()
        result = parse_content_md(md_text)

        # LLM 标注
        print(f"  LLM 标注中...")
        try:
            enrich_questions_batch(result['题目列表'], kp_ref)
            print(f"  标注完成")
        except Exception as e:
            print(f"  LLM 标注失败: {e}，使用默认值")

        # 保存学生端
        name = result['姓名'] or 'unknown'
        sid = result['学生ID'] or 'unknown'
        stu_path = os.path.join(student_output_dir, f"{name}_{sid}.json")
        with open(stu_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"  学生端: {stu_path}")

        all_students.append(result)
        time.sleep(1)

    # 生成教师端
    if all_students:
        exam_date = all_students[0]['作业考试时间'] or 'unknown'
        class_data = merge_to_class(all_students)
        class_path = os.path.join(class_output_dir, f"class_{exam_date}.json")
        with open(class_path, 'w', encoding='utf-8') as f:
            json.dump(class_data, f, ensure_ascii=False, indent=2)
        print(f"\n教师端: {class_path} ({len(all_students)} 名学生)")

    print("\n全部完成！")


if __name__ == '__main__':
    main()
