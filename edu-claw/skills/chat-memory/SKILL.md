---
name: chat-memory
description: "读写小智老师的对话记忆。每次对话结束时保存摘要，下次对话开始时加载历史摘要，保持对话连续性。"
---

# 对话记忆管理

小智老师的对话记忆存储在 GitHub 仓库的 `chat-summary.md` 文件中。这是跨会话的长期记忆。

## 文件格式

`chat-summary.md` 是一个 Markdown 文件，按日期记录对话摘要：

```markdown
# 对话记忆

## 2026-03-19
- 学生问了光纤传感器和超声波传感器的区别，已详细讲解
- 学生对"全反射"概念还不太清楚，下次可以主动追问
- 学生情绪不错，对传感器课程有兴趣

## 2026-03-18
- 首次对话，学生自我介绍：牛子健，物联网专业
- 主要薄弱点：光纤传感器、热敏元件、车联网概念
- 学生倾向于通过类比来理解概念
```

## 使用方式

### 读取历史对话

```bash
gh api /repos/{owner}/edu-memory-{username}/contents/chat-summary.md \
  --jq '.content' | base64 -d
```

### 更新对话记忆

对话结束时，将本次对话的关键信息追加到 chat-summary.md：

```bash
# 获取当前内容和 SHA
CURRENT=$(gh api /repos/{owner}/edu-memory-{username}/contents/chat-summary.md --jq '.content' | base64 -d)
SHA=$(gh api /repos/{owner}/edu-memory-{username}/contents/chat-summary.md --jq '.sha')

# 追加新摘要
NEW_CONTENT="$CURRENT

## $(date +%Y-%m-%d)
- 本次讨论要点1
- 本次讨论要点2
"

ENCODED=$(echo "$NEW_CONTENT" | base64)
gh api --method PUT /repos/{owner}/edu-memory-{username}/contents/chat-summary.md \
  -f message="对话记忆更新 $(date +%Y-%m-%d)" \
  -f content="$ENCODED" \
  -f sha="$SHA"
```

## 记忆策略

### 应该记住的
- 学生问过什么知识点（避免重复讲解）
- 学生的理解偏好（喜欢类比？喜欢公式？）
- 学生的情绪状态（焦虑？自信？）
- 上次遗留的问题（"下次继续讲 XX"）
- 学生提到的个人信息（专业、兴趣）

### 不应该记住的
- 完整的对话原文（太长）
- 临时的闲聊内容
- 与学习无关的个人隐私

### 更新时机
- 每次对话面板关闭时
- 对话超过 10 轮时自动中间保存
- 学生明确说"记住这个"时
