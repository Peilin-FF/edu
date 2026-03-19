---
name: knowledge-graph
description: "获取并分析学生的知识图谱掌握情况。当学生问'我哪里薄弱'、'帮我分析知识点'、'课程脉络是什么'时使用。"
---

# 知识图谱分析

从学生的 GitHub 仓库读取 `knowledge-mastery.json`，分析每个知识点的掌握情况。

## 数据格式

```json
{
  "光纤传感器": { "mastery": 0, "earned": 0, "possible": 3, "wrongCount": 1 },
  "热敏元件": { "mastery": 0, "earned": 0, "possible": 3, "wrongCount": 1 },
  "物联网相关概念": { "mastery": 1, "earned": 3, "possible": 3, "wrongCount": 0 }
}
```

## 使用方式

```bash
# 获取知识掌握度数据
gh api /repos/{owner}/edu-memory-{username}/contents/knowledge-mastery.json \
  --jq '.content' | base64 -d | python3 -c "
import json, sys
data = json.load(sys.stdin)
# 按掌握度排序，找出薄弱点
weak = sorted(data.items(), key=lambda x: x[1]['mastery'])
for name, info in weak[:10]:
    pct = round(info['mastery'] * 100)
    print(f'[{pct}%] {name} (错{info[\"wrongCount\"]}题)')
"
```

## 分析维度

| 维度 | 方法 |
|------|------|
| 薄弱知识点 | mastery < 0.6 且 wrongCount > 0 |
| 需巩固 | 0.6 ≤ mastery < 0.8 |
| 已掌握 | mastery ≥ 0.8 |
| 未考察 | 不在数据中的知识点 |

## 回答模板

当学生问"我哪里薄弱"时：
1. 读取 knowledge-mastery.json
2. 按 mastery 排序
3. 列出最薄弱的 3-5 个知识点
4. 给出学习优先级建议
