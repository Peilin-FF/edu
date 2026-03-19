---
name: github-memory
description: "读写学生 GitHub 私有仓库中的学习记忆数据。当需要访问或保存学生的学习数据时使用此技能。"
---

# GitHub Memory 读写

学生的所有学习数据存储在 GitHub 私有仓库 `edu-memory-{username}` 中。此技能提供对该仓库的读写能力。

## 仓库结构

```
edu-memory-{username}/
├── profile.json               # 学生基本信息
├── progress.json              # 学习进度 + 成就 + 连续天数
├── knowledge-mastery.json     # 知识图谱每个节点的掌握度
├── wrong-questions.json       # 完整错题本
├── chat-summary.md            # 对话记忆摘要
└── gen-cache/                 # AI 生成缓存（练习题、互动实验）
```

## 使用方式

### 读取文件

```bash
# 读取学生个人信息
gh api /repos/{owner}/edu-memory-{username}/contents/profile.json \
  --jq '.content' | base64 -d

# 读取学习进度
gh api /repos/{owner}/edu-memory-{username}/contents/progress.json \
  --jq '.content' | base64 -d

# 读取知识图谱掌握度
gh api /repos/{owner}/edu-memory-{username}/contents/knowledge-mastery.json \
  --jq '.content' | base64 -d

# 读取错题本
gh api /repos/{owner}/edu-memory-{username}/contents/wrong-questions.json \
  --jq '.content' | base64 -d

# 读取对话记忆
gh api /repos/{owner}/edu-memory-{username}/contents/chat-summary.md \
  --jq '.content' | base64 -d
```

### 写入文件

```bash
# 更新对话记忆（需要先获取 sha）
SHA=$(gh api /repos/{owner}/edu-memory-{username}/contents/chat-summary.md --jq '.sha')
CONTENT=$(echo '新的对话摘要内容' | base64)
gh api --method PUT /repos/{owner}/edu-memory-{username}/contents/chat-summary.md \
  -f message="对话记忆更新" -f content="$CONTENT" -f sha="$SHA"
```

## 安全说明

- 每个学生独立私有仓库，天然隔离
- 只能访问当前学生自己的仓库
- 所有变更通过 git commit 记录，可追溯可回滚
