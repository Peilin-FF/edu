---
name: wrong-questions
description: "获取学生的错题本详情。当学生问某道具体题目、请求讲解错题、分析错误原因时使用。"
---

# 错题本查询

从学生的 GitHub 仓库读取 `wrong-questions.json`，获取完整的错题信息。

## 数据格式

```json
[
  {
    "题目ID": "004",
    "题型": "单选题",
    "题目": "医疗上的内窥镜是应用（）传感器。",
    "选项": { "A": "超声波传感器", "B": "光纤传感器", "C": "电阻传感器" },
    "满分": 3,
    "正确答案": "B",
    "知识点": "光纤传感器",
    "学生答案": "A",
    "得分": 0,
    "扣分原因": "内窥镜利用光纤的导光与成像传输能力..."
  }
]
```

## 使用方式

```bash
# 获取全部错题
gh api /repos/{owner}/edu-memory-{username}/contents/wrong-questions.json \
  --jq '.content' | base64 -d

# 按知识点过滤
gh api /repos/{owner}/edu-memory-{username}/contents/wrong-questions.json \
  --jq '.content' | base64 -d | python3 -c "
import json, sys
data = json.load(sys.stdin)
kp = '光纤传感器'  # 目标知识点
for q in data:
    if q['知识点'] == kp:
        print(f\"题目: {q['题目']}\")
        print(f\"学生答案: {q['学生答案']} | 正确答案: {q['正确答案']}\")
        print(f\"错因: {q['扣分原因']}\")
        print()
"
```

## 回答模板

当学生问某道错题时：
1. 读取 wrong-questions.json
2. 找到对应题目
3. 引用学生的具体错误："你选了 A（超声波传感器），但正确答案是 B（光纤传感器）"
4. 结合扣分原因讲解为什么错
5. 给出记忆口诀或类比帮助理解
