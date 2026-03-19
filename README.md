# EduClaw - AI 赋能的个性化学习分析平台

> 基于 OpenClaw 的教育智能体系统，融合知识图谱、AI 批改、个性化陪伴和 Git-Based Memory 安全存储

---

### 在线体验（评委体验用）

为了方便评审体验功能，我们提供了一个公网网站：

**https://pappose-impishly-inga.ngrok-free.dev**

> 建议使用 Edge 或 Google Chrome 浏览器打开（无法访问可联系作者）

| 学号 | 姓名 | 密码 | 说明 |
|------|------|------|------|
| 1840101020 | 牛子健 | 1234 | 有完整考试数据，可体验全部功能 |
| 1840301001 | 杨文聪 | 1234 | 有完整考试数据 |
| 1840301053 | 刘于搏 | 1234 | 有完整考试数据 |

登录后选择课程「传感器原理与应用」进入学习。

---

## 项目概览

EduClaw 是一个面向高等院校的 AI 教育平台，围绕**个性化**和**陪伴性**两大核心理念，为学生提供从错题分析、知识讲解到互动练习的全链路学习体验，为教师提供班级学情分析和教学管理工具。

### 技术栈

- **前端**：React 19 + Vite 8 + ECharts（知识图谱可视化）
- **AI 模型**：大语言模型（通过 OpenAI 兼容 API 接入）
- **语音合成**：有道云 TTS API（真人语音）
- **文档解析**：MinerU VLM（PDF → 结构化数据）
- **数据存储**：Git-Based Memory（GitHub 私有仓库，借鉴 gitagent 项目）
- **Agent 框架**：OpenClaw（多 Agent 协作，Skills 能力注入）
- **PPT 生成**：pptxgenjs（浏览器端导出 .pptx）

---

## 功能架构

```
┌─────────────────────────────────────────────────────────┐
│                     EduClaw 平台                         │
├──────────────────────┬──────────────────────────────────┤
│      学生端          │           教师端                   │
├──────────────────────┼──────────────────────────────────┤
│ ✅ 知识图谱可视化     │ ✅ 班级知识图谱热力图              │
│ ✅ 错题分析与回顾     │ ✅ 班级学习诊断报告                │
│ ✅ AI PPT 讲解(含语音)│ ✅ 作业提交情况管理                │
│ ✅ 同类题强化练习     │ ✅ 小雷助教 Agent                  │
│ ✅ 互动模拟实验       │   - 班级薄弱点分析                 │
│ ✅ 小智老师 Agent     │   - 高错率题目分析                 │
│   - 知识图谱问答      │   - 学生个体分析                   │
│   - 错题个性化讲解    │   - 发送通知提醒                   │
│ ✅ 学习进度追踪       │ ✅ 多班级管理                      │
│ ✅ 成就系统           │                                   │
│ ✅ 作业提交(PDF上传)  │                                   │
│ ✅ MinerU + AI 批改   │                                   │
│ ✅ GitHub 云端存储     │                                   │
│ ✅ 通知铃铛           │                                   │
└──────────────────────┴──────────────────────────────────┘
```

---

## 核心功能详解

### 1. 知识图谱可视化

基于 ECharts 树形图，展示课程知识点的层级结构。每个节点根据学生掌握度染色（红色→黄色→绿色），点击薄弱节点可查看该知识点的全部错题。

### 2. AI PPT 讲解（含真人语音）

针对每道错题，AI 生成 6 页结构化讲解 PPT：
- 标题页 → 题目回顾 → 知识点讲解 → 解题思路 → 常见误区 → 总结

每页配有**教师角色的口头讲解词**，通过有道云 TTS API 合成真人语音自动朗读。支持 PPTX 文件下载。

### 3. 同类题强化练习

基于错题自动生成 3 道难度梯度的同类练习题（基础→中等→提高），即时判分并展示详细解析。做错的练习题自动加入错题本。

### 4. 互动模拟实验

AI 判断错题是否适合互动模拟，若适合则生成完整的 HTML5 交互页面。学生通过拖拽、滑块、点击等操作**自己发现**正确答案，而不是被动接受讲解。

### 5. 小智老师（OpenClaw Agent）

学生端的 AI 学习伙伴，具备 5 个 OpenClaw Skills：

| Skill | 能力 |
|-------|------|
| `knowledge-graph` | 访问知识图谱，分析薄弱知识点 |
| `wrong-questions` | 查看错题详情，个性化讲解 |
| `practice-history` | 分析学习进度和趋势 |
| `chat-memory` | 跨会话对话记忆（存储在 GitHub） |
| `github-memory` | 读写 GitHub 仓库数据 |

### 6. 小雷助教（教师端 OpenClaw Agent）

教师端的 AI 教学助理，具备 5 个 Skills：

| Skill | 能力 |
|-------|------|
| `class-knowledge-analysis` | 分析班级知识图谱薄弱点 |
| `high-error-questions` | 分析高错率题目 |
| `student-detail-analysis` | 查看个别学生学情 |
| `submission-status` | 查看作业提交情况 |
| `send-notification` | 向学生端发送提醒通知 |

### 7. 学习进度追踪 + 成就系统

记录每次练习的知识点、得分、日期。11 个成就勋章激励学习（初次练习、满分通关、连续 7 天等）。

### 8. PDF 作业提交 + AI 自动批改

完整的作业闭环：
```
学生上传 PDF → MinerU VLM 解析试卷 → 正则提取题目结构
→ LLM 标注知识点 + 生成扣分原因 → 存入 GitHub → 知识图谱实时更新
```

### 9. 多课程 + 多班级

支持多门课程独立管理，每门课程有独立的知识图谱、作业和数据。教师端支持按班级查看学情。

---

## 安全设计（Git-Based Memory）

借鉴 [gitagent](https://github.com/anthropics/gitagent) 项目的设计理念，采用 **GitHub 私有仓库**作为学生数据存储后端：

### 设计原则

| 原则 | 实现 |
|------|------|
| **仓库级隔离** | 每个学生一个独立私有仓库 `edu-memory-{姓名拼音}-{学号}` |
| **零服务器存储** | 所有学生数据存在 GitHub，服务器不保存任何学生信息 |
| **Token 绑定账户** | GitHub PAT 与学号绑定，切换账号不会泄露 |
| **审计追溯** | 每次数据变更都是 git commit，可查看完整历史 |
| **可回滚** | 数据被误删/篡改可通过 git revert 恢复 |
| **无中心数据库** | 没有 SQL 注入、数据库泄露等风险 |
| **前端直连** | GitHub API 从浏览器直接调用，不经过中间服务器 |

### 仓库结构

```
edu-memory-niuzijian-1840101020/
├── profile.json                    # 学生基本信息
├── courses/
│   └── sensor/                     # 传感器原理与应用
│       ├── knowledge-mastery.json  # 知识图谱 + 掌握度
│       ├── wrong-questions.json    # 完整错题本
│       ├── chat-summary.md         # 对话记录（全文）
│       ├── submissions/            # 作业提交（PDF）
│       └── graded_*.json           # AI 批改结果
├── progress.json                   # 学习进度 + 成就
└── gen-cache/                      # AI 生成缓存
```

---

## 项目结构

```
edu-claw/
├── public/data/
│   └── courses/
│       └── sensor/                 # 传感器原理与应用
│           ├── knowledge.json      # 知识图谱树
│           ├── assignments.json    # 作业列表
│           └── students/           # 学生考试数据
├── server/
│   ├── youdao-tts.js              # 有道 TTS 代理
│   ├── mineru-proxy.js            # MinerU PDF 解析代理
│   └── proxy.js                   # 生产环境代理
├── skills/                         # OpenClaw Agent Skills
│   ├── AGENTS.md                  # Agent 定义
│   ├── github-memory/             # GitHub 存储读写
│   ├── knowledge-graph/           # 知识图谱分析
│   ├── wrong-questions/           # 错题查询
│   ├── practice-history/          # 练习历史
│   ├── chat-memory/               # 对话记忆
│   └── teacher-assistant/         # 小雷助教 Skills
├── src/
│   ├── pages/
│   │   ├── LandingPage.jsx        # 首页
│   │   ├── LoginPage.jsx          # 登录
│   │   ├── CoursePage.jsx         # 课程选择
│   │   ├── StudentPortal.jsx      # 学生端主页
│   │   ├── TeacherPortal.jsx      # 教师端主页
│   │   ├── TeacherCoursePage.jsx  # 教师课程+班级选择
│   │   └── SettingsPage.jsx       # GitHub 设置
│   ├── components/
│   │   ├── MindMap.jsx            # 知识图谱（ECharts）
│   │   ├── WeakPointDrawer.jsx    # 错题抽屉
│   │   ├── NotificationBell.jsx   # 通知铃铛
│   │   ├── SyncStatus.jsx         # GitHub 同步状态
│   │   ├── ppt/                   # PPT 讲解系统
│   │   ├── practice/              # 强化练习系统
│   │   ├── interactive/           # 互动模拟实验
│   │   ├── chat/                  # 小智老师（学生 Agent）
│   │   ├── teacher-chat/          # 小雷助教（教师 Agent）
│   │   ├── assignment/            # 作业提交 + 提交管理
│   │   └── progress/              # 学习进度 + 成就
│   └── utils/
│       ├── githubStore.js         # GitHub API 存储层
│       ├── accountStore.js        # 账户系统
│       ├── progressStore.js       # 学习进度（localStorage + GitHub）
│       ├── notificationStore.js   # 通知系统
│       ├── genCache.js            # AI 生成缓存
│       ├── llmClient.js           # LLM API 调用
│       ├── chatPrompt.js          # 小智老师 Agent Prompt
│       ├── pptPrompt.js           # PPT 讲解提示词
│       ├── practicePrompt.js      # 练习题提示词
│       ├── interactivePrompt.js   # 互动实验提示词
│       ├── mdParser.js            # MinerU content.md 解析器
│       ├── questionEnricher.js    # LLM 批改（知识点标注）
│       ├── useSpeech.js           # TTS 语音引擎
│       ├── masteryCalculator.js   # 掌握度计算
│       └── pptxExport.js          # PPTX 导出
└── package.json
```

---

## 快速开始

### 环境要求

- Node.js 20+
- npm

### 安装

```bash
cd edu-claw
npm install
```

### 配置

创建 `.env` 文件：

```bash
LLM_API_KEY=你的API密钥               # LLM API Key
LLM_BASE_URL=你的API地址/v1            # OpenAI 兼容 API 地址
LLM_MODEL=模型名称                     # 使用的模型（如 gpt-4o-mini）
YOUDAO_APP_KEY=你的有道AppKey          # 有道 TTS 语音合成
YOUDAO_APP_SECRET=你的有道AppSecret    # 有道 TTS 密钥
MINERU_TOKEN=你的MinerU_JWT_Token      # MinerU PDF 文档解析
```

### 启动

```bash
npm run dev
```

访问 http://localhost:5173

### 公网访问（评委体验）

```bash
# 方式一：ngrok
ngrok http 5173

# 方式二：Cloudflare Tunnel
cloudflared tunnel --url http://localhost:5173
```

---

## 默认账号

所有学生已预注册，默认密码 `1234`。使用学号登录即可。

---

## 致谢

- [OpenClaw](https://github.com/anthropics/openclaw) — Agent 框架与 Skills 系统
- [gitagent](https://github.com/anthropics/gitagent) — Git-Based Memory 设计理念
- [OpenMAIC](https://github.com/OpenMAIC/OpenMAIC) — 互动课堂生成参考
- [MinerU](https://mineru.net) — PDF 文档智能解析
- [shadcn/ui](https://ui.shadcn.com) — UI 设计风格参考
