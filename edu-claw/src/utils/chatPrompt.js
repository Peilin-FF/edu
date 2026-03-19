/**
 * Build system prompt for the AI tutor chat.
 * @param {object} context - Student context
 * @param {string} context.studentName - Student name
 * @param {Array} context.wrongQuestions - All wrong questions
 * @param {Map|null} context.masteryMap - Knowledge mastery data
 * @param {object|null} context.knowledgeTree - Full knowledge graph tree
 */
export function buildChatSystemPrompt(context) {
  const { studentName, wrongQuestions, masteryMap, knowledgeTree } = context;

  // Build knowledge graph outline with mastery
  let graphSummary = '';
  if (knowledgeTree && masteryMap) {
    graphSummary = '\n\n## 课程知识图谱（含该学生掌握情况）\n';
    graphSummary += buildTreeText(knowledgeTree, masteryMap, 0);
  }

  // Build weak points with full wrong question details
  let weakDetail = '';
  if (masteryMap) {
    const weakEntries = [];
    for (const [name, data] of masteryMap.entries()) {
      if (data.wrongQuestions.length > 0) {
        const pct = Math.round(data.mastery * 100);
        let entry = `### ${name}（掌握度 ${pct}%，错 ${data.wrongQuestions.length} 题）`;
        for (const q of data.wrongQuestions) {
          entry += `\n- 题目：${q['题目']}`;
          entry += `\n  题型：${q['题型']}`;
          if (q['选项']) {
            entry += `\n  选项：${Object.entries(q['选项']).map(([k, v]) => `${k}.${v}`).join(' / ')}`;
          }
          entry += `\n  学生答案：${q['学生答案']} | 正确答案：${q['正确答案']}`;
          if (q['扣分原因'] && q['扣分原因'] !== '无') {
            entry += `\n  错因分析：${q['扣分原因']}`;
          }
        }
        weakEntries.push(entry);
      }
    }
    if (weakEntries.length > 0) {
      weakDetail = '\n\n## 该学生的所有错题详情\n' + weakEntries.join('\n\n');
    }
  }

  return `你是一位耐心、温暖的 AI 学习伙伴"小智老师"。你正在陪伴学生${studentName || '同学'}学习"${knowledgeTree?.name || '课程'}"这门课。

你的性格特点：
- 亲切友善，像一个学长/学姐一样陪伴学生
- 善于鼓励，发现学生的每一点进步
- 讲解时深入浅出，喜欢用生活化的例子和类比
- 会主动关心学生的学习状态，适时给予情感支持
- 回答简洁清晰，不啰嗦，每次回复控制在 3-5 句话

你能做的事情：
- 你拥有这门课的完整知识图谱，可以告诉学生知识之间的关系和脉络
- 你知道学生每个知识点的掌握情况和所有错题的详细信息
- 针对学生的具体错误进行个性化讲解
- 帮学生梳理知识脉络，指出"学好 A 知识点才能理解 B"的依赖关系
- 给出针对性的复习建议和学习路径规划

重要规则：
- 始终用中文回答
- 当学生问某个知识点时，先从知识图谱中定位它属于哪个章节，再结合他的掌握情况回答
- 如果学生问到他做错过的题目，要引用他的具体错误（选了什么、为什么错）来讲解
- 当学生问"我哪里薄弱"时，从知识图谱中按掌握度排序，优先推荐最需要补强的知识点
- 不要一次说太多，保持对话感
- 适当使用"你看"、"其实"、"简单来说"等口语化表达
- 在合适的时候鼓励学生
${graphSummary}${weakDetail}`;
}

/**
 * Recursively build a text outline of the knowledge tree with mastery info.
 */
function buildTreeText(node, masteryMap, depth) {
  const indent = '  '.repeat(depth);
  const tags = node.tags?.length ? `【${node.tags.join('、')}】` : '';
  let line = '';

  if (node.type === '知识点') {
    const data = masteryMap.get(node.name);
    if (data) {
      const pct = Math.round(data.mastery * 100);
      const status = pct === 100 ? 'OK' : pct > 0 ? `${pct}%` : 'X';
      const wrongCount = data.wrongQuestions.length;
      line = `${indent}- [${status}] ${node.name}${tags}${wrongCount > 0 ? ` (错${wrongCount}题)` : ''}\n`;
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
