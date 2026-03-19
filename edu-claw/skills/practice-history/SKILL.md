---
name: practice-history
description: "获取学生的强化练习历史和学习进度。当学生问'我进步了吗'、'学习进度怎样'、'练了多少题'时使用。"
---

# 练习历史与进度分析

从学生 GitHub 仓库读取 `progress.json`，分析学习进度、练习趋势和成就。

## 数据格式

```json
{
  "practiceHistory": [
    { "date": "2026-03-19", "knowledgePoint": "光纤传感器", "total": 3, "correct": 2 }
  ],
  "pptViewed": ["光纤传感器", "热敏元件"],
  "chatCount": 15,
  "achievements": [
    { "id": "first_practice", "name": "初次练习", "icon": "🌱", "desc": "完成第一次强化练习", "unlockedAt": "2026-03-19T10:30:00Z" }
  ],
  "streak": 3,
  "lastPracticeDate": "2026-03-19"
}
```

## 使用方式

```bash
# 获取完整进度
gh api /repos/{owner}/edu-memory-{username}/contents/progress.json \
  --jq '.content' | base64 -d

# 分析练习趋势
gh api /repos/{owner}/edu-memory-{username}/contents/progress.json \
  --jq '.content' | base64 -d | python3 -c "
import json, sys
data = json.load(sys.stdin)
history = data.get('practiceHistory', [])
total_sessions = len(history)
total_correct = sum(h['correct'] for h in history)
total_questions = sum(h['total'] for h in history)
accuracy = round(total_correct / total_questions * 100) if total_questions else 0
print(f'练习次数: {total_sessions}')
print(f'总正确率: {accuracy}%')
print(f'连续学习: {data.get(\"streak\", 0)} 天')
print(f'已解锁成就: {len(data.get(\"achievements\", [)))} 个')

# 按知识点统计
from collections import defaultdict
kp_stats = defaultdict(lambda: {'total': 0, 'correct': 0})
for h in history:
    kp_stats[h['knowledgePoint']]['total'] += h['total']
    kp_stats[h['knowledgePoint']]['correct'] += h['correct']
print('\n各知识点正确率:')
for kp, s in sorted(kp_stats.items(), key=lambda x: x[1]['correct']/max(x[1]['total'],1)):
    pct = round(s['correct'] / s['total'] * 100) if s['total'] else 0
    print(f'  {kp}: {pct}% ({s[\"correct\"]}/{s[\"total\"]})')
"
```

## 分析维度

| 维度 | 数据来源 | 回答方式 |
|------|----------|----------|
| 总体进度 | practiceHistory 长度 + 正确率 | "你已经练了 X 次，总正确率 Y%" |
| 知识点趋势 | 同一知识点的多次练习对比 | "光纤传感器从 33% 提升到了 67%，进步明显！" |
| 连续学习 | streak 字段 | "你已经连续学习 X 天了，坚持住！" |
| 成就激励 | achievements 数组 | "你已经解锁了 X 个成就，离'练习达人'只差 Y 次了" |

## 回答模板

鼓励式回复：
- 有进步时："从你的练习数据来看，{知识点}从 X% 提升到 Y%，进步很明显！"
- 连续学习时："你已经连续学习 {streak} 天了，这个坚持的劲头很棒！"
- 正确率低时："别灰心，{知识点}目前正确率 X%，建议先回顾一下 PPT 讲解，然后再试试。"
