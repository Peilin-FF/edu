# EduClaw - 个性化学习分析平台

基于知识图谱的课堂学习诊断系统，支持学生端个性化知识掌握追踪和教师端班级整体分析。包含班级分析 Agent（`workspace_analyst_class`）和个人学习诊断 Agent（`workspace_analyst_student`）两套分析后端。

## 项目结构

```
edu/
├── edu-claw/                          # 前端 React 应用（知识图谱 + 双端界面）
│   ├── src/
│   │   ├── pages/                     # 页面组件
│   │   │   ├── LandingPage.jsx        #   首页（学生端/教师端入口）
│   │   │   ├── StudentPortal.jsx      #   学生端（个人知识掌握图谱）
│   │   │   └── TeacherPortal.jsx      #   教师端（班级图谱 + 诊断报告）
│   │   ├── components/                # UI 组件
│   │   │   ├── MindMap.jsx            #   ECharts 知识图谱（支持掌握度着色）
│   │   │   ├── ClassReport.jsx        #   班级学习诊断报告
│   │   │   ├── StudentSelector.jsx    #   学生身份选择器
│   │   │   ├── WeakPointDrawer.jsx    #   错题详情侧边栏（学生端）
│   │   │   ├── NodeDetailPanel.jsx    #   知识点学生明细（教师端）
│   │   │   └── MasteryLegend.jsx      #   掌握度图例
│   │   └── utils/                     # 工具函数
│   │       ├── masteryCalculator.js   #   掌握度计算引擎
│   │       └── colorUtils.js          #   HSL 颜色渐变
│   ├── public/data/
│   │   ├── knowledge.json             # 课程知识点树形数据
│   │   └── students/                  # 学生作答 JSON（学生端数据源）
│   │       ├── index.json             #   学生文件清单
│   │       └── *.json                 #   各学生结构化作答数据
│   └── scripts/
│       └── parse_excel.py             # 知识点 Excel → knowledge.json
│
├── workspace_analyst_class/           # 班级分析 Agent 后端（Python 脚本）
│   ├── scripts/
│   │   ├── parse_student_md.py        #   MinerU 解析结果 → 学生 JSON
│   │   └── enrich_and_merge.py        #   LLM 标注知识点 + 生成双端 JSON
│   ├── student_grader_output/         #   学生端 JSON 输出
│   ├── grader_output/                 #   教师端 JSON 输出
│   └── skills/                        #   分析技能脚本（class_statistics / chart_generator / class_report_generator）
│
├── workspace_analyst_student/         # 个人诊断 Agent 后端（Python 脚本）
│   ├── grader_output/
│   │   └── content.json               #   当前学生批改结果（输入）
│   ├── statistical_data/              #   统计输出
│   │   ├── statistics.json            #     个人统计结果
│   │   └── charts/                    #     图表 HTML（score_breakdown / question_accuracy / knowledge_radar / score_trend）
│   ├── memory/                        #   历史报告与日志
│   │   ├── {stuID}_report_*.html      #     个人诊断报告
│   │   └── YYYY-MM-DD.md             #     每日日志
│   ├── SOUL.md                        #   Agent 身份定义
│   ├── AGENTS.md                      #   工作流定义
│   ├── MEMORY.md                      #   长期学习记录
│   └── skills/                        #   分析技能脚本（individual_statistics / chart_generator / individual_report_generator）
│
├── 物联网技术及应用-课程知识点-2.xlsx    # 课程知识点大纲（数据源）
├── *.pdf                               # 待处理的学生试卷 PDF
└── 五年新能源1801-*/                    # MinerU 解析后的学生文件夹
    ├── content.md                      #   试卷 Markdown
    ├── content.json                    #   结构化内容
    └── content.pdf                     #   原始 PDF
```

## 快速启动（前端网页）

### 环境要求
- Node.js >= 18
- npm >= 9

### 安装与启动

```bash
# 进入前端项目
cd edu/edu-claw

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

浏览器打开 http://localhost:5173/ 即可访问：
- **首页**：选择进入学生端或教师端
- **学生端** `/student`：选择学生身份 → 查看个人知识掌握图谱 → 点击薄弱节点查看错题
- **教师端** `/teacher`：知识图谱（班级掌握热力图）/ 班级报告（诊断分析）

### 生产部署

```bash
# 构建静态文件
npm run build

# 产出在 dist/ 目录，可部署到任意静态服务器
# 本地预览：
npx serve dist
```

### 公网访问（临时）

```bash
# 需要先安装 cloudflared: brew install cloudflared
cloudflared tunnel --url http://localhost:5173
```

## 数据处理流程

### 完整 Pipeline：PDF → 网页展示

```
学生试卷 PDF
    │
    ▼ (1) MinerU API 解析
    │
学生文件夹/content.md
    │
    ▼ (2) enrich_and_merge.py（LLM 标注知识点 + 扣分原因）
    │
├── student_grader_output/姓名_学号.json  （学生端数据）
└── grader_output/class_日期.json         （教师端数据）
    │
    ▼ (3) 拷贝到 edu-claw/public/data/students/
    │
网页端展示
```

### Step 1: PDF 解析（MinerU API）

```bash
# 编辑 mineru.py 中的 file_paths 和 files 列表，然后运行：
python mineru.py
```

自动上传 PDF → 等待解析 → 下载结果 → 解压为 content.md/json/pdf → 删除原始 PDF。

### Step 2: LLM 标注 + 生成结构化数据

```bash
cd workspace_analyst_class

# 处理指定学生文件夹（支持多个）
python scripts/enrich_and_merge.py \
  ../五年新能源1801-1840101020-牛子健 \
  ../五年新能源1801-1840301001-杨文聪
```

LLM 会自动：
- 匹配每道题对应的课程知识点（参考知识点 Excel）
- 生成专业的扣分原因分析（非简单"选错了"）
- 输出学生端 JSON 和教师端 JSON

生成的 `grader_output/content.json` 也可直接作为个人诊断 Agent 的输入，触发个人报告生成流程（见下）。

#### 个人诊断 Agent（workspace_analyst_student）

将目标学生的批改结果放入 `workspace_analyst_student/grader_output/content.json` 后，Agent 会自动运行完整 Pipeline：

- **individual_statistics**：逐题计算得分率、丢分、题目状态（满分/部分/零分），按知识点聚合掌握度，标记知识盲区（`has_zero_mark`）
- **chart_generator**：生成逐题得分率图、丢分图、知识点雷达图、历史得分率趋势图
- **individual_report_generator**：结合 `memory/` 中的历史报告进行趋势对比，输出个人学习诊断报告至 `memory/{stuID}_report_<日期>.html`

### Step 3: 更新前端数据

```bash
# 拷贝学生 JSON 到前端
cp workspace_analyst_class/student_grader_output/*.json edu-claw/public/data/students/

# 更新学生清单（手动编辑或脚本生成）
# edu-claw/public/data/students/index.json
```

### 更新知识点图谱

```bash
cd edu-claw
python scripts/parse_excel.py
```

从 `物联网技术及应用-课程知识点-2.xlsx` 重新生成 `public/data/knowledge.json`。

## 技术栈

| 模块 | 技术 |
|------|------|
| 前端框架 | React 19 + Vite 8 |
| 知识图谱 | ECharts 6（Tree 图） |
| 路由 | react-router-dom 7 |
| PDF 解析 | MinerU API (VLM 模型) |
| LLM 标注 | GPT-5.2 / Claude Sonnet (via API Gateway) |
| 知识点源 | openpyxl (Excel 解析) |

## 功能说明

### 学生端
- 选择身份后展示个人知识掌握图谱
- 节点颜色编码掌握度：空心=未掌握/部分掌握，实心=完全掌握，红色边框=全错
- 自动展开含错题的分支，快速定位薄弱点
- 点击薄弱节点弹出错题详情（题目、选项、答案对比、AI 扣分原因分析）
- "只看未掌握"模式过滤已完全掌握的知识点
- **个人诊断报告**：由 `workspace_analyst_student` Agent 生成，包含逐题得分诊断、知识点掌握评估（区分知识盲区与理解薄弱）、历史趋势对比及个性化学习建议

### 教师端
- **知识图谱视图**：班级整体掌握度热力图，节点大小编码掌握度
- **班级报告视图**：
  - 总体表现（均分、及格率、分数分布、学生成绩表）
  - 高错误率题目分析
  - 知识点掌握诊断（严重薄弱/中等薄弱/掌握良好）
  - 教学建议
- 点击知识点节点查看全班学生在该知识点的详细表现

## LLM 配置

`enrich_and_merge.py` 中的 API 配置：

```python
API_URL = 'https://api-gateway.glm.ai/v1/chat/completions'
API_KEY = 'your-api-key'
MODEL = 'gpt-5.2'
```

也可通过环境变量覆盖：
```bash
export ANTHROPIC_BASE_URL=https://api-gateway.glm.ai
export ANTHROPIC_AUTH_TOKEN=your-key
export ANTHROPIC_MODEL=anthropic:claude-sonnet-4-5-20250929
```
