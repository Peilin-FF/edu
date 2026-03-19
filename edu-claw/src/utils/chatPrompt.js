/**
 * Build system prompt for 小智老师 Agent.
 *
 * Data source priority:
 * 1. GitHub data (githubData) — pulled from student's private repo
 * 2. Local props (masteryMap, wrongQuestions, knowledgeTree) — fallback
 */
export function buildAgentSystemPrompt(context) {
  const {
    studentName, chatHistory,
    // GitHub data (preferred)
    githubData,
    // Local fallback
    knowledgeTree, masteryMap, wrongQuestions,
  } = context;

  // Determine data source
  const useGithub = !!(githubData?.knowledgeMastery || githubData?.wrongQuestions);

  // 1. Build knowledge tree section
  let treeSummary = '';
  if (useGithub && githubData.knowledgeMastery) {
    const gd = githubData.knowledgeMastery;
    treeSummary = `\n\n## 课程知识图谱（来自 GitHub 仓库）\n`;
    treeSummary += `课程：${gd.courseName || '未知课程'}\n\n`;
    if (gd.mastery) {
      const entries = Object.entries(gd.mastery).sort((a, b) => a[1].mastery - b[1].mastery);
      for (const [name, d] of entries) {
        const pct = Math.round(d.mastery * 100);
        const status = pct === 100 ? 'OK' : pct > 0 ? `${pct}%` : 'X';
        treeSummary += `- [${status}] ${name}${d.wrongCount > 0 ? ` (错${d.wrongCount}题)` : ''}\n`;
      }
    }
  } else if (knowledgeTree && masteryMap) {
    treeSummary = `\n\n## 课程知识图谱\n`;
    treeSummary += `课程：${knowledgeTree.name}\n\n`;
    treeSummary += buildTreeText(knowledgeTree, masteryMap, 0);
  }

  // 2. Build wrong questions section
  let wrongSection = '';
  const wrongs = useGithub ? githubData.wrongQuestions : wrongQuestions;
  if (wrongs && wrongs.length > 0) {
    const source = useGithub ? '（来自 GitHub 仓库）' : '';
    const items = wrongs.map((q) => {
      let s = `- **[${q['知识点']}]** ${q['题目']}`;
      s += `\n  题型：${q['题型']}`;
      if (q['选项']) {
        s += ` | 选项：${Object.entries(q['选项']).map(([k, v]) => `${k}.${v}`).join(' / ')}`;
      }
      s += `\n  学生答案：${q['学生答案']} → 正确答案：${q['正确答案']}`;
      if (q['扣分原因'] && q['扣分原因'] !== '无') {
        s += `\n  错因：${q['扣分原因']}`;
      }
      return s;
    });
    wrongSection = `\n\n## 错题本${source}（共${wrongs.length}道）\n${items.join('\n\n')}`;
  }

  // 3. Learning progress
  let progressSection = '';
  const prog = useGithub ? githubData.progress : null;
  if (!prog) {
    // Try local
    try {
      const all = JSON.parse(localStorage.getItem('edu_progress') || '{}');
      const sid = Object.keys(all)[0];
      if (sid && all[sid]) {
        const p = all[sid];
        const total = (p.practiceHistory || []).reduce((s, h) => s + h.total, 0);
        const correct = (p.practiceHistory || []).reduce((s, h) => s + h.correct, 0);
        progressSection = `\n\n## 学习进度\n- 练习${p.practiceHistory?.length || 0}次，正确率${total > 0 ? Math.round(correct / total * 100) : 0}%\n- 连续学习${p.streak || 0}天`;
      }
    } catch {}
  } else {
    const total = (prog.practiceHistory || []).reduce((s, h) => s + h.total, 0);
    const correct = (prog.practiceHistory || []).reduce((s, h) => s + h.correct, 0);
    progressSection = `\n\n## 学习进度（来自 GitHub 仓库）\n- 练习${prog.practiceHistory?.length || 0}次，正确率${total > 0 ? Math.round(correct / total * 100) : 0}%\n- 连续学习${prog.streak || 0}天`;
  }

  const dataSource = useGithub
    ? '你的数据来自学生的 GitHub 私有仓库（通过 OpenClaw Skills 获取）。'
    : '你的数据来自本地学习系统。';

  const courseName = useGithub
    ? (githubData.knowledgeMastery?.courseName || knowledgeTree?.name || '课程')
    : (knowledgeTree?.name || '课程');

  return `你是"小智老师"，学生${studentName || '同学'}的 AI 学习伙伴。这门课是"${courseName}"。

## 性格
亲切友善，像学长/学姐。善于鼓励，讲解深入浅出，喜欢用类比。每次回复 3-5 句话。

## 数据来源
${dataSource}

## 重要规则
- 始终用中文
- **严格基于下方提供的数据回答**，不要编造任何不在数据中的知识点、课程名称、题目或成绩
- 当学生问"我哪里薄弱"→ 从知识图谱中找掌握度最低的知识点列出来
- 当学生问某道题 → 从错题本中精确找到那道题，引用具体选项和错因
- 如果数据中没有相关信息，诚实说"我这边暂时没有这方面的记录"
- 用"你看"、"其实"、"简单来说"等口语化表达
${chatHistory ? `\n## 之前的对话记录\n${chatHistory}` : ''}${treeSummary}${wrongSection}${progressSection}`;
}

function buildTreeText(node, masteryMap, depth) {
  const indent = '  '.repeat(depth);
  const tags = node.tags?.length ? `【${node.tags.join('、')}】` : '';
  let line = '';

  if (node.type === '知识点') {
    const data = masteryMap.get(node.name);
    if (data) {
      const pct = Math.round(data.mastery * 100);
      const status = pct === 100 ? 'OK' : pct > 0 ? `${pct}%` : 'X';
      line = `${indent}- [${status}] ${node.name}${tags}${data.wrongQuestions.length > 0 ? ` (错${data.wrongQuestions.length}题)` : ''}\n`;
    } else {
      line = `${indent}- [未考] ${node.name}${tags}\n`;
    }
  } else {
    line = `${indent}${depth === 0 ? '' : '- '}${node.name}${tags}\n`;
  }

  if (node.children) {
    for (const child of node.children) {
      line += buildTreeText(child, masteryMap, depth + 1);
    }
  }
  return line;
}
