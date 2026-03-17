import openpyxl
import json
import os

xlsx_path = os.path.join(os.path.dirname(__file__), '..', '..', '物联网技术及应用-课程知识点-2.xlsx')
output_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'knowledge.json')

wb = openpyxl.load_workbook(xlsx_path)
ws = wb['课程知识点']

# 根节点
root = {"name": "物联网技术及应用", "type": "root", "tags": [], "children": []}

# 跟踪当前各层级的父节点
# 列B=1, C=2, D=3, E=4, F=5, G=6, H=7 (0-indexed from col B)
level_stack = [root]  # level_stack[0] = root

rows = list(ws.iter_rows(min_row=3, values_only=True))  # 跳过前2行表头

for row in rows:
    node_type = row[0]  # 列A: 分类/知识点
    names = row[1:8]    # 列B~H: 各层级名称
    tags_str = row[11]  # 列L: 标签

    if not node_type:
        continue

    # 找到这行数据所在的层级（哪一列有值）
    level = None
    name = None
    for i, n in enumerate(names):
        if n is not None and str(n).strip():
            level = i + 1  # 1-based，root 是 0
            name = str(n).strip()

    if level is None or name is None:
        continue

    # 解析标签
    tags = []
    if tags_str:
        tag_text = str(tags_str).strip()
        if '重点' in tag_text:
            tags.append('重点')
        if '难点' in tag_text:
            tags.append('难点')
        if '课程思政' in tag_text:
            tags.append('课程思政')

    node = {
        "name": name,
        "type": str(node_type).strip(),
        "tags": tags,
        "children": [],
    }

    # 确保 level_stack 足够长
    while len(level_stack) <= level:
        level_stack.append(None)

    # 截断更深层级
    level_stack = level_stack[:level + 1]
    level_stack[level] = node

    # 找到父节点并添加
    parent = None
    for i in range(level - 1, -1, -1):
        if level_stack[i] is not None:
            parent = level_stack[i]
            break

    if parent:
        parent["children"].append(node)

# 清理空 children
def clean(node):
    if not node.get("children"):
        del node["children"]
    else:
        for child in node["children"]:
            clean(child)

clean(root)

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(root, f, ensure_ascii=False, indent=2)

print(f"已生成: {output_path}")
print(f"章节数: {len(root.get('children', []))}")
