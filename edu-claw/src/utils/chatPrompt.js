/**
 * Build system prompt for 小智老师 OpenClaw Agent.
 * The agent uses skills to access GitHub-stored student data.
 */

/**
 * @param {object} context
 * @param {string} context.studentName
 * @param {string} context.chatHistory - Previous chat summary from GitHub
 * @param {object} context.githubData - Pre-fetched data from GitHub skills
 * @param {object} context.githubData.knowledgeMastery - Knowledge graph mastery
 * @param {object} context.githubData.wrongQuestions - Wrong questions list
 * @param {object} context.githubData.progress - Practice history & achievements
 */
export function buildAgentSystemPrompt(context) {
  const { studentName, chatHistory, githubData } = context;

  // Build knowledge mastery section from GitHub data
  let masterySection = '';
  if (githubData?.knowledgeMastery) {
    const entries = Object.entries(githubData.knowledgeMastery)
      .sort((a, b) => a[1].mastery - b[1].mastery);
    const lines = entries.map(([name, d]) => {
      const pct = Math.round(d.mastery * 100);
      const status = pct === 100 ? 'OK' : pct > 0 ? `${pct}%` : 'X';
      return `- [${status}] ${name}${d.wrongCount > 0 ? ` (错${d.wrongCount}题)` : ''}`;
    });
    masterySection = `\n\n## 知识图谱掌握情况（来自 GitHub 仓库）\n${lines.join('\n')}`;
  }

  // Build wrong questions section
  let wrongSection = '';
  if (githubData?.wrongQuestions?.length > 0) {
    const items = githubData.wrongQuestions.map((q) => {
      let s = `### [${q['知识点']}] ${q['题目']}`;
      s += `\n- 题型：${q['题型']} | 满分：${q['满分']}`;
      if (q['选项']) {
        s += `\n- 选项：${Object.entries(q['选项']).map(([k, v]) => `${k}.${v}`).join(' / ')}`;
      }
      s += `\n- 学生答案：${q['学生答案']} | 正确答案：${q['正确答案']}`;
      if (q['扣分原因'] && q['扣分原因'] !== '无') {
        s += `\n- 错因：${q['扣分原因']}`;
      }
      return s;
    });
    wrongSection = `\n\n## 错题本（来自 GitHub 仓库）\n${items.join('\n\n')}`;
  }

  // Build progress section
  let progressSection = '';
  if (githubData?.progress) {
    const p = githubData.progress;
    const totalSessions = p.practiceHistory?.length || 0;
    const totalCorrect = (p.practiceHistory || []).reduce((s, h) => s + h.correct, 0);
    const totalQuestions = (p.practiceHistory || []).reduce((s, h) => s + h.total, 0);
    const accuracy = totalQuestions > 0 ? Math.round(totalCorrect / totalQuestions * 100) : 0;
    const achievementNames = (p.achievements || []).map((a) => `${a.icon}${a.name}`).join('、');

    progressSection = `\n\n## 学习进度（来自 GitHub 仓库）
- 练习次数：${totalSessions}
- 总正确率：${accuracy}%
- 连续学习：${p.streak || 0} 天
- 已看 PPT：${(p.pptViewed || []).length} 个知识点
- 与你对话：${p.chatCount || 0} 次
- 已解锁成就：${achievementNames || '暂无'}`;
  }

  return `你是"小智老师"，一个运行在 OpenClaw 平台上的 AI 学习伙伴 Agent。你正在陪伴学生${studentName || '同学'}学习。

## 你的性格
- 亲切友善，像一个学长/学姐一样
- 善于鼓励，发现学生的每一点进步
- 讲解时深入浅出，喜欢用生活化的例子和类比
- 回答简洁清晰，每次 3-5 句话

## 你的数据来源
你的所有学生数据来自学生自己的 GitHub 私有仓库（edu-memory-{username}），通过 OpenClaw Skills 获取。
这意味着：
- 你只能看到当前学生的数据，无法访问其他学生
- 数据变更都有 git commit 审计记录
- 学生完全掌控自己的数据

## 回答原则
- **数据驱动**：引用具体数据回答，如"从你的错题记录来看..."、"你的练习数据显示..."
- **个性化**：基于学生的实际错题和掌握度给建议
- **鼓励优先**：先肯定进步，再指出不足
- **引导思考**：不直接给答案，引导学生自己推理
- 始终用中文
- 适当使用"你看"、"其实"、"简单来说"等口语化表达
${chatHistory ? `\n## 之前的对话记忆（来自 GitHub chat-summary.md）\n${chatHistory}` : ''}${masterySection}${wrongSection}${progressSection}`;
}
